import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { EvidenceStore } from "./store.js";

const root = fileURLToPath(new URL("../public/", import.meta.url));
const store = new EvidenceStore();
const tenant = store.createTenant({ name: "PHYLLOS Demo", slug: "phyllos-demo" });
const ctx = { tenantId: tenant.id, userId: "demo-analyst", role: "client_admin" };
const org = store.createOrganization(ctx, { name: "Marca Horizonte", externalCode: "MH-01" });
const supplier = store.createOrganization(ctx, { name: "Cooperativa Raiz", externalCode: "CR-01", type: "supplier" });

const products = [
  ["SKU-001", "Camiseta Horizonte", "Algodão rastreável", 86],
  ["SKU-002", "Jaqueta Neblina", "Poliéster reciclado", 64],
  ["SKU-003", "Calça Vereda", "Linho e viscose", 42],
].map(([externalCode, name, material, completeness], index) => {
  const product = store.createProduct(ctx, { externalCode, name, ownerOrganizationId: org.id });
  const fact = store.createFact(ctx, { entityType: "product", entityId: product.id, semanticKey: "composition", value: { material }, sourceType: index === 0 ? "third_party_document" : "supplier_declaration", epistemicStatus: index === 0 ? "submitted" : "declared" });
  if (index < 2) {
    const document = store.registerDocument(ctx, { title: `Ficha ${externalCode}`, sha256: createHash("sha256").update(externalCode).digest("hex"), validTo: index === 1 ? "2026-08-20" : "2027-07-17", issuer: supplier.name });
    store.linkEvidence(ctx, { factId: fact.id, documentId: document.id });
  }
  return { ...product, material, completeness };
});

let findings = products.flatMap((product) => store.runCompletenessRule(ctx, { productId: product.id, requiredSemanticKeys: ["composition", "supplier_origin", "production_site"] }));

const json = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
};

async function body(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

function snapshot() {
  const audit = store.audit(ctx);
  return {
    tenant: { id: tenant.id, name: tenant.name },
    organization: { id: org.id, name: org.name },
    supplier: { id: supplier.id, name: supplier.name },
    products,
    findings,
    metrics: {
      completeness: Math.round(products.reduce((sum, p) => sum + p.completeness, 0) / products.length),
      openFindings: findings.filter((x) => x.status === "open").length,
      validEvidence: 2,
      suppliers: 1,
      auditEvents: audit.length,
    },
  };
}

async function api(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/v1/dashboard") return json(res, 200, snapshot());
  if (req.method === "POST" && url.pathname === "/api/v1/tasks") {
    const input = await body(req);
    const finding = findings.find((x) => x.id === input.findingId);
    if (!finding) return json(res, 404, { error: "Lacuna não encontrada" });
    const task = store.createTask(ctx, { findingId: finding.id, ownerOrganizationId: supplier.id, dueAt: input.dueAt || "2099-01-01", expectedEvidence: input.expectedEvidence || "Documento comprobatório" });
    return json(res, 201, task);
  }
  if (req.method === "POST" && url.pathname === "/api/v1/dossiers") {
    const dossier = store.freezeDossier(ctx, { name: "Dossiê do piloto", productIds: products.map((x) => x.id) });
    return json(res, 201, { id: dossier.id, sha256: dossier.sha256, frozenAt: dossier.frozenAt, productCount: products.length, limitation: dossier.snapshot.limitations });
  }
  return json(res, 404, { error: "Endpoint não encontrado" });
}

const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };
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
  if (!target.startsWith(root)) return json(res, 403, { error: "Proibido" });
  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error("not file");
    if (relative === "index.html") {
      const html = enhanceIndexHtml(await readFile(target, "utf8"));
      res.writeHead(200, { "content-type": mime[".html"], "cache-control": "no-store" });
      res.end(html);
      return;
    }
    res.writeHead(200, { "content-type": mime[extname(target)] || "application/octet-stream", "cache-control": "public, max-age=300" });
    createReadStream(target).pipe(res);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }); res.end("Não encontrado");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    return await serveStatic(res, url.pathname);
  } catch (error) {
    return json(res, 400, { error: error.message, code: error.code || "BAD_REQUEST" });
  }
});

const port = Number(process.env.PORT || 3000);
server.listen(port, "0.0.0.0", () => console.log(`PHYLLOS Evidence OS em http://0.0.0.0:${port}`));
