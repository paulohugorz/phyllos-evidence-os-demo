import { createServer } from "node:http";
import { PI5TrainingOperations } from "./pi5-training-operations.js";
import { PI5TrainingPostgresStore } from "./pi5-training-postgres.js";

const port = Number(process.env.PI5_TRAINING_PORT || 3001);
const apiKey = process.env.PI5_TRAINING_API_KEY || "";
const allowMemory = String(process.env.PI5_TRAINING_ALLOW_MEMORY || "").toLowerCase() === "true";

if (!apiKey) {
  console.error("PI5_TRAINING_API_KEY é obrigatória");
  process.exit(1);
}

let store;
if (process.env.DATABASE_URL) {
  store = new PI5TrainingPostgresStore();
} else if (allowMemory) {
  console.warn("ATENÇÃO: base de treinamento em memória; dados serão perdidos ao encerrar.");
  store = new PI5TrainingOperations();
} else {
  console.error("DATABASE_URL é obrigatória. Para testes temporários, defina PI5_TRAINING_ALLOW_MEMORY=true.");
  process.exit(1);
}

function send(res, status, value, contentType = "application/json; charset=utf-8") {
  res.writeHead(status, { "content-type": contentType, "cache-control": "no-store" });
  res.end(contentType.startsWith("application/json") ? JSON.stringify(value) : value);
}

async function readBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > 2_000_000) throw new Error("Corpo excede 2 MB");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function authorized(req) {
  const supplied = req.headers["x-pi5-training-key"] || String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  return supplied === apiKey;
}

function route(pathname, pattern) {
  const match = pathname.match(pattern);
  return match ? match.groups || match.slice(1) : null;
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (req.method === "GET" && url.pathname === "/api/v1/training/health") {
    const status = await store.status();
    return send(res, 200, { ok: true, service: "phyllos-pi5-training", ...status });
  }
  if (!authorized(req)) return send(res, 401, { error: "Não autorizado" });

  if (req.method === "POST" && url.pathname === "/api/v1/training/organizations") return send(res, 201, await store.createOrganization(await readBody(req)));
  if (req.method === "POST" && url.pathname === "/api/v1/training/actors") return send(res, 201, await store.createActor(await readBody(req)));
  if (req.method === "POST" && url.pathname === "/api/v1/training/experts/qualify") return send(res, 201, await store.qualifyExpert(await readBody(req)));
  if (req.method === "POST" && url.pathname === "/api/v1/training/products") return send(res, 201, await store.createProduct(await readBody(req)));
  if (req.method === "POST" && url.pathname === "/api/v1/training/samples") return send(res, 201, await store.registerSample(await readBody(req)));
  if (req.method === "POST" && url.pathname === "/api/v1/training/evidence") return send(res, 201, await store.addEvidence(await readBody(req)));
  if (req.method === "POST" && url.pathname === "/api/v1/training/measurements") return send(res, 201, await store.addMeasurement(await readBody(req)));
  if (req.method === "POST" && url.pathname === "/api/v1/training/predictions") return send(res, 201, await store.registerPrediction(await readBody(req)));
  if (req.method === "POST" && url.pathname === "/api/v1/training/labeling-sessions") return send(res, 201, await store.openLabelingSession(await readBody(req)));
  if (req.method === "POST" && url.pathname === "/api/v1/training/assignments") return send(res, 201, await store.assignReviewer(await readBody(req)));
  if (req.method === "POST" && url.pathname === "/api/v1/training/labels") return send(res, 201, await store.submitLabel(await readBody(req)));
  if (req.method === "POST" && url.pathname === "/api/v1/training/adjudications") return send(res, 201, await store.adjudicate(await readBody(req)));
  if (req.method === "POST" && url.pathname === "/api/v1/training/gold-labels/freeze") return send(res, 201, await store.freezeGoldLabel(await readBody(req)));

  let params = route(url.pathname, /^\/api\/v1\/training\/labeling-sessions\/(?<id>[^/]+)\/packet$/);
  if (req.method === "GET" && params) return send(res, 200, await store.getBlindReviewPacket(decodeURIComponent(params.id)));
  params = route(url.pathname, /^\/api\/v1\/training\/labeling-sessions\/(?<id>[^/]+)\/consensus$/);
  if (req.method === "GET" && params) return send(res, 200, await store.consensus(decodeURIComponent(params.id)));
  params = route(url.pathname, /^\/api\/v1\/training\/samples\/(?<id>[^/]+)\/reliability$/);
  if (req.method === "GET" && params) return send(res, 200, await store.sampleReliability(decodeURIComponent(params.id)));

  if (req.method === "GET" && url.pathname === "/api/v1/training/export/eligible") {
    const rows = await store.exportEligibleRecords();
    const content = rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : "");
    return send(res, 200, content, "application/x-ndjson; charset=utf-8");
  }
  if (req.method === "GET" && url.pathname === "/api/v1/training/status") return send(res, 200, await store.status());
  return send(res, 404, { error: "Endpoint não encontrado" });
}

const server = createServer(async (req, res) => {
  try {
    await handle(req, res);
  } catch (error) {
    const status = /não encontrad|obrigatór|inválid|bloquead|conflito|insuficiente|não autorizad/i.test(error.message) ? 400 : 500;
    send(res, status, { error: error.message, code: error.code || "TRAINING_API_ERROR" });
  }
});

let closing = false;
async function shutdown(signal) {
  if (closing) return;
  closing = true;
  console.log(`Encerrando base de treinamento PI5 por ${signal}`);
  try { await store.close?.(); }
  finally { server.close(() => process.exit(0)); }
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

server.listen(port, "127.0.0.1", () => {
  console.log(`PHYLLOS PI5 Training API em http://127.0.0.1:${port}`);
  console.log(`Modo: ${process.env.DATABASE_URL ? "PostgreSQL" : "memória temporária"}`);
});
