import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { assertOperatorAuthConfigured, authenticateRequest } from "./auth.js";
import { EvidenceStore } from "./store.js";

const root = fileURLToPath(new URL("../public/", import.meta.url));
const store = new EvidenceStore();
const tenant = store.createTenant({ name: "PHYLLOS Demo", slug: "phyllos-demo" });
const seedCtx = { tenantId: tenant.id, userId: "demo-analyst", role: "client_admin" };
const org = store.createOrganization(seedCtx, { name: "Marca Horizonte", externalCode: "MH-01" });
const supplier = store.createOrganization(seedCtx, { name: "Cooperativa Raiz", externalCode: "CR-01", type: "supplier" });
const collection = store.createCollection(seedCtx, {
  externalCode: "COL-2026-01",
  name: "Coleção Horizonte",
  ownerOrganizationId: org.id,
  status: "active",
  season: "2026",
});

const products = [
  ["SKU-001", "Camiseta Horizonte", "Algodão rastreável", 86],
  ["SKU-002", "Jaqueta Neblina", "Poliéster reciclado", 64],
  ["SKU-003", "Calça Vereda", "Linho e viscose", 42],
].map(([externalCode, name, material, completeness], index) => {
  const product = store.createProduct(seedCtx, {
    externalCode,
    name,
    ownerOrganizationId: org.id,
    collectionId: collection.id,
  });
  const sku = store.createSku(seedCtx, {
    productId: product.id,
    externalCode,
    name,
    status: "active",
  });
  const fact = store.createFact(seedCtx, {
    entityType: "product",
    entityId: product.id,
    semanticKey: "composition",
    value: { material },
    sourceType: index === 0 ? "third_party_document" : "supplier_declaration",
    epistemicStatus: index === 0 ? "submitted" : "declared",
  });
  if (index < 2) {
    const document = store.registerDocument(seedCtx, {
      title: `Ficha ${externalCode}`,
      sha256: createHash("sha256").update(externalCode).digest("hex"),
      validTo: index === 1 ? "2026-08-20" : "2027-07-17",
      issuer: supplier.name,
    });
    store.linkEvidence(seedCtx, { factId: fact.id, documentId: document.id });
  }
  return { ...product, sku, material, completeness };
});

let findings = products.flatMap((product) =>
  store.runCompletenessRule(seedCtx, {
    productId: product.id,
    requiredSemanticKeys: ["composition", "supplier_origin", "production_site"],
  }),
);

const securityHeaders = Object.freeze({
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
});

const json = (res, status, responseBody) => {
  res.writeHead(status, {
    ...securityHeaders,
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(responseBody));
};

async function body(req, maxBytes = 1024 * 1024) {
  const chunks = [];
  let received = 0;
  for await (const chunk of req) {
    received += chunk.length;
    if (received > maxBytes) {
      const error = new Error("Payload excede 1 MB");
      error.code = "PAYLOAD_TOO_LARGE";
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("JSON inválido");
    error.code = "INVALID_JSON";
    throw error;
  }
}

function snapshot(ctx) {
  const currentProducts = store.listProducts(ctx);
  const currentSkus = store.listSkus(ctx);
  const audit = store.audit(ctx);
  return {
    tenant: { id: tenant.id, name: tenant.name },
    organization: { id: org.id, name: org.name },
    supplier: { id: supplier.id, name: supplier.name },
    collections: store.listCollections(ctx),
    products: products.map((product) => ({
      ...product,
      ...currentProducts.find((current) => current.id === product.id),
    })),
    skus: currentSkus,
    findings,
    metrics: {
      completeness: Math.round(products.reduce((sum, product) => sum + product.completeness, 0) / products.length),
      openFindings: findings.filter((finding) => finding.status === "open").length,
      validEvidence: 2,
      suppliers: 1,
      auditEvents: audit.length,
    },
  };
}

function queryFilter(url, name) {
  const value = url.searchParams.get(name);
  return value?.trim() || null;
}

async function api(req, res, url, ctx) {
  if (req.method === "GET" && url.pathname === "/api/v1/dashboard") {
    return json(res, 200, snapshot(ctx));
  }
  if (req.method === "GET" && url.pathname === "/api/v1/organizations") {
    return json(res, 200, { items: store.listOrganizations(ctx) });
  }
  if (req.method === "GET" && url.pathname === "/api/v1/collections") {
    return json(res, 200, {
      items: store.listCollections(ctx, {
        ownerOrganizationId: queryFilter(url, "ownerOrganizationId"),
      }),
    });
  }
  if (req.method === "POST" && url.pathname === "/api/v1/collections") {
    return json(res, 201, store.createCollection(ctx, await body(req)));
  }
  if (req.method === "GET" && url.pathname === "/api/v1/products") {
    return json(res, 200, {
      items: store.listProducts(ctx, {
        collectionId: queryFilter(url, "collectionId"),
        ownerOrganizationId: queryFilter(url, "ownerOrganizationId"),
      }),
    });
  }
  if (req.method === "POST" && url.pathname === "/api/v1/products") {
    return json(res, 201, store.createProduct(ctx, await body(req)));
  }
  if (req.method === "GET" && url.pathname === "/api/v1/skus") {
    return json(res, 200, {
      items: store.listSkus(ctx, { productId: queryFilter(url, "productId") }),
    });
  }
  if (req.method === "POST" && url.pathname === "/api/v1/skus") {
    return json(res, 201, store.createSku(ctx, await body(req)));
  }
  if (req.method === "POST" && url.pathname === "/api/v1/tasks") {
    const input = await body(req);
    const finding = findings.find((item) => item.id === input.findingId);
    if (!finding) return json(res, 404, { error: "Lacuna não encontrada", code: "NOT_FOUND" });
    const task = store.createTask(ctx, {
      findingId: finding.id,
      ownerOrganizationId: supplier.id,
      dueAt: input.dueAt || "2099-01-01",
      expectedEvidence: input.expectedEvidence || "Documento comprobatório",
    });
    return json(res, 201, task);
  }
  if (req.method === "POST" && url.pathname === "/api/v1/dossiers") {
    const dossier = store.freezeDossier(ctx, {
      name: "Dossiê do piloto",
      productIds: store.listProducts(ctx).map((product) => product.id),
    });
    return json(res, 201, {
      id: dossier.id,
      sha256: dossier.sha256,
      frozenAt: dossier.frozenAt,
      productCount: dossier.snapshot.products.length,
      limitation: dossier.snapshot.limitations,
    });
  }
  return json(res, 404, { error: "Endpoint não encontrado", code: "NOT_FOUND" });
}

function statusFor(error) {
  if (error.code === "AUTH_REQUIRED" || error.code === "AUTH_INVALID") return 401;
  if (error.code === "ACCESS_DENIED") return 403;
  if (error.code === "NOT_FOUND") return 404;
  if (error.code?.startsWith("DUPLICATE_")) return 409;
  if (error.code === "PAYLOAD_TOO_LARGE") return 413;
  if (error.code === "AUTH_NOT_CONFIGURED") return 503;
  return 400;
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
};
const productionAssetsVersion = "20260717-1";

function enhanceIndexHtml(html) {
  if (html.includes("production-cards.js")) return html;
  return html
    .replace("</head>", `  <link rel="stylesheet" href="/production-cards.css?v=${productionAssetsVersion}">\n</head>`)
    .replace("</body>", `  <script type="module" src="/production-cards.js?v=${productionAssetsVersion}"></script>\n</body>`);
}

async function serveStatic(res, pathname) {
  const relative = pathname === "/" ? "index.html" : pathname.slice(1);
  const target = normalize(join(root, relative));
  if (!target.startsWith(root)) return json(res, 403, { error: "Proibido", code: "ACCESS_DENIED" });
  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error("not file");
    if (relative === "index.html") {
      const html = enhanceIndexHtml(await readFile(target, "utf8"));
      res.writeHead(200, {
        ...securityHeaders,
        "content-type": mime[".html"],
        "cache-control": "no-store",
      });
      res.end(html);
      return;
    }
    res.writeHead(200, {
      ...securityHeaders,
      "content-type": mime[extname(target)] || "application/octet-stream",
      "cache-control": "public, max-age=300",
    });
    createReadStream(target).pipe(res);
  } catch {
    res.writeHead(404, {
      ...securityHeaders,
      "content-type": "text/plain; charset=utf-8",
    });
    res.end("Não encontrado");
  }
}

assertOperatorAuthConfigured();

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (req.method === "GET" && url.pathname === "/healthz") {
      return json(res, 200, {
        status: "ok",
        service: "phyllos-evidence-os-demo",
        persistence: "memory",
      });
    }
    if (url.pathname.startsWith("/api/")) {
      const ctx = authenticateRequest(req, { tenantId: tenant.id });
      return await api(req, res, url, ctx);
    }
    return await serveStatic(res, url.pathname);
  } catch (error) {
    return json(res, statusFor(error), {
      error: error.message,
      code: error.code || "BAD_REQUEST",
    });
  }
});

const port = Number(process.env.PORT || 3000);
server.listen(port, "0.0.0.0", () =>
  console.log(`PHYLLOS Evidence OS em http://0.0.0.0:${port}`),
);
