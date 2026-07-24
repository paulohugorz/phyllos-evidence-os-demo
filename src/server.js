import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { EvidenceStore } from "./store.js";
import { createMaterialsApi } from "./materials-api.js";
import { PI5MLOpsStore } from "./pi5-mlops.js";
import { createUsageRepository } from "./usage-telemetry.js";
import { CollaborationStore, IAMError, iamPhase0Enabled } from "./iam-collaboration.js";
import { createDppPi5Api } from "./dpp-pi5-api.js";

const root = fileURLToPath(new URL("../public/", import.meta.url));
const store = new EvidenceStore();
const pi5MLOps = new PI5MLOpsStore();
const usageRepository = createUsageRepository();
const materialsApi = createMaterialsApi();
const collaboration = new CollaborationStore();
const dppPi5Api = createDppPi5Api();
const iamEnabled = iamPhase0Enabled();
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
  if (await dppPi5Api.handle({ req, res, url, json, body })) return;
  if (await materialsApi.handle({ req, res, url, json })) return;
  if (req.method === "GET" && url.pathname === "/api/v1/iam/status") {
    return json(res, 200, { enabled: iamEnabled, phase: "phase-0", persistence: "process-local", production_ready: false });
  }
  if (url.pathname.startsWith("/api/v1/iam/phase0/")) {
    if (!iamEnabled) return json(res, 404, { error: "Endpoint não encontrado", code: "IAM_PHASE0_DISABLED" });
    const actorUserId = req.headers["x-phyllos-test-user"];
    if (!actorUserId || process.env.NODE_ENV === "production") {
      return json(res, 401, { error: "Identidade de teste indisponível", code: "PHASE0_IDENTITY_REQUIRED" });
    }
    const match = url.pathname.match(/^\/api\/v1\/iam\/phase0\/workspaces\/([^/]+)\/resources(?:\/([^/]+))?$/);
    if (match && req.method === "GET" && !match[2]) {
      return json(res, 200, collaboration.listResources({ workspaceId: match[1], updatedSince: url.searchParams.get("updated_since") }));
    }
    if (match && req.method === "POST" && !match[2]) {
      const result = collaboration.createResource({ workspaceId: match[1], actorUserId, idempotencyKey: req.headers["idempotency-key"], input: await body(req) });
      res.setHeader("idempotency-replayed", String(result.replay));
      return json(res, result.status, result.body);
    }
    if (match && req.method === "PATCH" && match[2]) {
      const input = await body(req);
      const ifMatch = String(req.headers["if-match"] || "").replace(/^W\//, "").replace(/^\"|\"$/g, "");
      const expectedVersion = Number(ifMatch || input.expected_version);
      return json(res, 200, collaboration.updateResource({ workspaceId: match[1], resourceId: match[2], actorUserId, expectedVersion, input }));
    }
  }
  if (req.method === "GET" && url.pathname === "/api/v1/dashboard") return json(res, 200, snapshot());
  if (req.method === "POST" && url.pathname === "/api/v1/usage-events") {
    const event = await usageRepository.append(await body(req));
    return json(res, 202, { accepted: true, duplicate: Boolean(event.duplicate), eventId: event.eventId });
  }
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
  if (req.method === "GET" && url.pathname === "/api/v1/pi5/dashboard") {
    return json(res, 200, { version: "2.0-mvp", benchmark: { label: "ITM Brasil 2025", overall: 24, dimensions: { traceability: 30, ghg: 40, decarbonization: 16, renewable: 33, justTransition: 9 } }, warning: "Transparency does not equal environmental performance or certification" });
  }
  if (req.method === "GET" && url.pathname === "/api/v1/pi5/health") return json(res, 200, await pi5MLOps.health());
  if (req.method === "GET" && url.pathname === "/api/v1/pi5/model") return json(res, 200, await pi5MLOps.currentModel());
  if (req.method === "GET" && url.pathname === "/api/v1/pi5/summary") return json(res, 200, await pi5MLOps.summary());
  if (req.method === "POST" && url.pathname === "/api/v1/pi5/predict") return json(res, 201, await pi5MLOps.predict(await body(req)));
  if (req.method === "POST" && url.pathname === "/api/v1/pi5/events") return json(res, 201, await pi5MLOps.append("production_event", await body(req)));
  if (req.method === "POST" && url.pathname === "/api/v1/pi5/feedback") return json(res, 201, await pi5MLOps.feedback(await body(req)));
  if (req.method === "GET" && url.pathname === "/api/v1/pi5/export") {
    const content = await pi5MLOps.exportJsonl();
    res.writeHead(200, { "content-type": "application/x-ndjson; charset=utf-8", "content-disposition": "attachment; filename=phyllos-pi5-events.jsonl", "cache-control": "no-store" });
    res.end(content);
    return;
  }
  return json(res, 404, { error: "Endpoint não encontrado" });
}

const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };
const productionAssetsVersion = "20260717-2";
const pi5AssetsVersion = "20260718-pi5-1";
const accessibilityAssetsVersion = "20260717-visual-2";

const onboardingAssetsVersion = "20260718-onboarding-1";
const usageAssetsVersion = "20260721-usage-1";
const iamAssetsVersion = "20260722-iam-1";

const moduleArchitectureAssetsVersion = "20260724-six-modules-1";

const pi5V2AssetsVersion = "20260724-pi5-v2-itm-1";
const platformFlowAssetsVersion = "20260724-platform-flow-v2";
const dppAssetsVersion = "20260724-dpp-pi5-mvp-1";

function enhanceIndexHtml(html) {
  let next = html;
  if (!next.includes("platform-flow-fixes.css")) next = next.replace("</head>", `  <link rel="stylesheet" href="/platform-flow-fixes.css?v=${platformFlowAssetsVersion}">\n</head>`);
  if (!next.includes("platform-flow-fixes.js")) next = next.replace("</body>", `  <script type="module" src="/platform-flow-fixes.js?v=${platformFlowAssetsVersion}"></script>\n</body>`);
  if (!next.includes("dpp-console.css")) next = next.replace("</head>", `  <link rel="stylesheet" href="/dpp-console.css?v=${dppAssetsVersion}">\n</head>`);
  if (!next.includes("dpp-console.js")) next = next.replace("</body>", `  <script type="module" src="/dpp-console.js?v=${dppAssetsVersion}"></script>\n</body>`);
  if (!next.includes("pi5-v2-itm.css")) {
    next = next.replace("</head>", `  <link rel="stylesheet" href="/pi5-v2-itm.css?v=${pi5V2AssetsVersion}">
</head>`);
  }
  if (!next.includes("module-architecture.css")) {
    next = next.replace("</head>", `  <link rel="stylesheet" href="/module-architecture.css?v=${moduleArchitectureAssetsVersion}">
</head>`);
  }
  if (!next.includes("production-cards.css")) {
    next = next.replace("</head>", `  <link rel="stylesheet" href="/production-cards.css?v=${productionAssetsVersion}">
</head>`);
  }
  if (!next.includes("production-accessibility.css")) {
    next = next.replace("</head>", `  <link rel="stylesheet" href="/production-accessibility.css?v=${accessibilityAssetsVersion}">
</head>`);
  }
  if (!next.includes("production-cards.js")) {
    next = next.replace("</body>", `  <script type="module" src="/production-cards.js?v=${productionAssetsVersion}"></script>
</body>`);
  }
  if (!next.includes("production-accessibility.js")) {
    next = next.replace("</body>", `  <script type="module" src="/production-accessibility.js?v=${accessibilityAssetsVersion}"></script>
</body>`);
  }
  if (!next.includes("pi5-mlops.css")) {
    next = next.replace("</head>", `  <link rel="stylesheet" href="/pi5-mlops.css?v=${pi5AssetsVersion}">
</head>`);
  }
  if (!next.includes("pi5-methodology.js")) {
    next = next.replace("</body>", `  <script type="module" src="/pi5-methodology.js?v=${pi5AssetsVersion}"></script>
</body>`);
  }
  if (!next.includes("pi5-mlops-ui.js")) {
    next = next.replace("</body>", `  <script type="module" src="/pi5-mlops-ui.js?v=${pi5AssetsVersion}"></script>
</body>`);
  }
  if (!next.includes("onboarding.css")) {
    next = next.replace("</head>", `  <link rel="stylesheet" href="/onboarding.css?v=${onboardingAssetsVersion}">
</head>`);
  }
  if (!next.includes("onboarding.js")) {
    next = next.replace("</body>", `  <script type="module" src="/onboarding.js?v=${onboardingAssetsVersion}"></script>
</body>`);
  }
  if (!next.includes("usage-telemetry.js")) {
    next = next.replace("</body>", `  <script type="module" src="/usage-telemetry.js?v=${usageAssetsVersion}"></script>
</body>`);
  }
  if (!next.includes("iam-workspaces.css")) {
    next = next.replace("</head>", `  <link rel="stylesheet" href="/iam-workspaces.css?v=${iamAssetsVersion}">
</head>`);
  }
  if (!next.includes("iam-workspaces.js")) {
    next = next.replace("</body>", `  <script type="module" src="/iam-workspaces.js?v=${iamAssetsVersion}"></script>
</body>`);
  }

  if (!next.includes("materials-knowledge.css")) {
    next = next.replace("</head>", '  <link rel="stylesheet" href="/materials-knowledge.css?v=20260723-materials-api-1">\n</head>');
  }
  if (!next.includes("materials-knowledge.js")) {
    next = next.replace("</body>", '  <script type="module" src="/materials-knowledge.js?v=20260723-materials-api-1"></script>\n</body>');
  }

  if (!next.includes("module-architecture.js")) {
    next = next.replace("</body>", `  <script type="module" src="/module-architecture.js?v=${moduleArchitectureAssetsVersion}"></script>
</body>`);
  }

  if (!next.includes("pi5-v2-itm.js")) {
    next = next.replace("</body>", `  <script type="module" src="/pi5-v2-itm.js?v=${pi5V2AssetsVersion}"></script>
</body>`);
  }

  return next;
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
    if (error instanceof IAMError) return json(res, error.status, { error: error.code, message: error.message, ...error.details });
    return json(res, 400, { error: error.message, code: error.code || "BAD_REQUEST" });
  }
});


let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Encerrando PHYLLOS por ${signal}`);
  try { await Promise.all([pi5MLOps.close(), usageRepository.close(), materialsApi.close()]); }
  finally { server.close(() => process.exit(0)); }
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

const port = Number(process.env.PORT || 3000);
server.listen(port, "0.0.0.0", () => console.log(`PHYLLOS Evidence OS em http://0.0.0.0:${port}`));
