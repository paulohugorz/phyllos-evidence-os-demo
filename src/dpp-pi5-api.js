import { createHash, generateKeyPairSync, sign, verify } from "node:crypto";
import { randomUUID } from "node:crypto";

const ITM = Object.freeze({
  version: "itm-brasil-2025",
  label: "ITM Brasil 2025",
  dimensions: { traceability: 30, ghg: 40, decarbonization: 16, renewable: 33, justTransition: 9 },
});

const now = () => new Date().toISOString();
const clone = (value) => structuredClone(value);
const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};
const sha256 = (value) => createHash("sha256").update(typeof value === "string" ? value : canonical(value)).digest("hex");
const score = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

export class DppPi5Store {
  constructor() {
    this.drafts = new Map();
    this.versions = new Map();
    this.batches = new Map();
    this.calculations = [];
    const keys = generateKeyPairSync("ed25519");
    this.privateKey = keys.privateKey;
    this.publicKey = keys.publicKey;
  }

  createDraft(input = {}) {
    const id = `dpp-draft:${randomUUID()}`;
    const draft = {
      id, status: "draft", version: 1, scope: input.scope || "batch",
      product: input.product || {}, batch: input.batch || {},
      materials: input.materials || [], evidence: input.evidence || [],
      impact: input.impact || {}, transparency: input.transparency || {},
      care: input.care || {}, circularity: input.circularity || {},
      visibility: input.visibility || {}, createdAt: now(), updatedAt: now(),
    };
    this.drafts.set(id, draft);
    return clone(draft);
  }

  listDrafts() { return [...this.drafts.values()].map(clone); }
  getDraft(id) {
    const value = this.drafts.get(id);
    if (!value) throw Object.assign(new Error("Rascunho não encontrado"), { code: "DPP_DRAFT_NOT_FOUND", status: 404 });
    return value;
  }

  updateDraft(id, patch = {}) {
    const current = this.getDraft(id);
    if (current.status === "published") throw Object.assign(new Error("DPP publicado é imutável"), { code: "DPP_IMMUTABLE", status: 409 });
    const next = { ...current, ...patch, id, version: current.version + 1, updatedAt: now() };
    this.drafts.set(id, next);
    return clone(next);
  }

  validateDraft(id) {
    const d = this.getDraft(id);
    const checks = [
      ["product.name", Boolean(d.product?.name), "Produto sem nome"],
      ["product.sku", Boolean(d.product?.sku), "Produto sem SKU"],
      ["batch.code", d.scope === "model" || Boolean(d.batch?.code), "Lote obrigatório"],
      ["batch.approvedUnits", d.scope === "model" || Number(d.batch?.approvedUnits) > 0, "Unidades aprovadas devem ser maiores que zero"],
      ["materials", Array.isArray(d.materials) && d.materials.length > 0, "Composição ausente"],
      ["evidence", Array.isArray(d.evidence) && d.evidence.length > 0, "Nenhuma evidência vinculada"],
    ];
    const composition = d.materials.reduce((s, x) => s + Number(x.percentage || 0), 0);
    checks.push(["composition.total", Math.abs(composition - 100) <= 0.5, `Composição soma ${composition}%`]);
    const items = checks.map(([field, ok, message]) => ({ field, ok, severity: ok ? "ok" : "critical", message }));
    const valid = items.every((x) => x.ok);
    return { valid, readiness: Math.round(items.filter((x) => x.ok).length / items.length * 100), items };
  }

  preview(id, profile = "consumer") {
    const d = clone(this.getDraft(id));
    return { preview: true, profile, banner: "PRÉ-VISUALIZAÇÃO — este passaporte ainda não foi publicado.", draft: d, validation: this.validateDraft(id), pi5: this.calculateDraft(d) };
  }

  calculateDraft(d) {
    const units = Math.max(1, Number(d.batch?.approvedUnits || 1));
    const total = {
      co2eKg: Number(d.impact?.co2eKg || 0),
      waterLiters: Number(d.impact?.waterLiters || 0),
      energyKwh: Number(d.impact?.energyKwh || 0),
      wasteKg: Number(d.impact?.wasteKg || 0),
    };
    const perPiece = Object.fromEntries(Object.entries(total).map(([k,v]) => [k, Number((v / units).toFixed(4))]));
    const t = d.transparency || {};
    const dimensions = {
      traceability: score(t.traceability),
      ghg: score(t.ghg),
      decarbonization: score(t.decarbonization),
      renewable: score(t.renewable),
      justTransition: score(t.justTransition),
    };
    const transparencyScore = Math.round(Object.values(dimensions).reduce((a,b)=>a+b,0)/5);
    const coverage = score(t.coverage ?? (d.evidence.length ? 70 : 0));
    const confidence = score(t.confidence ?? (d.evidence.length ? 65 : 20));
    return { total, perPiece, dimensions, transparencyScore, coverage, confidence, benchmark: ITM };
  }

  publish(id) {
    const validation = this.validateDraft(id);
    if (!validation.valid) throw Object.assign(new Error("Evidence Gates bloquearam a publicação"), { code: "DPP_PUBLICATION_BLOCKED", status: 409, details: validation });
    const d = this.getDraft(id);
    const pi5 = this.calculateDraft(d);
    const identifier = `dpp:phyllos:${sha256(`${d.product.sku}:${d.batch?.code || "model"}`).slice(0,24)}`;
    const previous = [...this.versions.values()].filter((v) => v.identifier === identifier).sort((a,b)=>b.version-a.version)[0];
    const manifest = {
      schemaVersion: "phyllos-dpp-1.0", identifier,
      version: (previous?.version || 0) + 1, previousVersionHash: previous?.contentHash || null,
      issuedAt: now(), status: "published", product: d.product, batch: d.batch,
      materials: d.materials, evidenceSummary: d.evidence.map((e)=>({ id:e.id, type:e.type, status:e.status || "supported" })),
      impact: d.impact, pi5Snapshot: pi5, care: d.care, circularity: d.circularity,
    };
    const contentHash = sha256(manifest);
    const signature = sign(null, Buffer.from(contentHash), this.privateKey).toString("base64url");
    const version = { ...manifest, contentHash, signature, verificationMethod: "phyllos-demo-ed25519" };
    this.versions.set(`${identifier}:v${version.version}`, version);
    this.drafts.set(id, { ...d, status: "published", publishedIdentifier: identifier, updatedAt: now() });
    if (d.batch?.code) this.upsertBatch({ ...d.batch, product: d.product, impact: d.impact, transparency: d.transparency, evidenceCount: d.evidence.length, status: "completed" });
    return clone(version);
  }

  getPublic(identifier) {
    const versions = [...this.versions.values()].filter((v)=>v.identifier === identifier).sort((a,b)=>b.version-a.version);
    if (!versions.length) throw Object.assign(new Error("Passaporte não encontrado"), { status: 404, code: "DPP_NOT_FOUND" });
    return clone(versions[0]);
  }

  history(identifier) {
    return [...this.versions.values()].filter((v)=>v.identifier===identifier).sort((a,b)=>a.version-b.version).map(clone);
  }

  verify(identifier) {
    const v = this.getPublic(identifier);
    const unsigned = { ...v }; delete unsigned.contentHash; delete unsigned.signature; delete unsigned.verificationMethod;
    const hashMatches = sha256(unsigned) === v.contentHash;
    const signatureValid = verify(null, Buffer.from(v.contentHash), this.publicKey, Buffer.from(v.signature, "base64url"));
    return { identifier, version: v.version, status: v.status, hashMatches, signatureValid, valid: hashMatches && signatureValid };
  }

  upsertBatch(input) {
    const id = input.id || input.code || `batch:${randomUUID()}`;
    const batch = { id, ...input, updatedAt: now() };
    this.batches.set(id, batch);
    this.recordCompanyCalculation(`batch-upsert:${id}`);
    return clone(batch);
  }

  getBatch(id) {
    const b = this.batches.get(id);
    if (!b) throw Object.assign(new Error("Lote não encontrado"), { status: 404, code: "BATCH_NOT_FOUND" });
    return clone({ ...b, pi5: this.calculateDraft({ batch:b, impact:b.impact||{}, transparency:b.transparency||{}, evidence:Array(b.evidenceCount||0).fill({}), materials:[{}] }) });
  }

  companySnapshot() {
    const all = [...this.batches.values()];
    const aggregate = (rows) => {
      const units = rows.reduce((s,b)=>s+Number(b.approvedUnits||b.plannedUnits||0),0);
      const totals = rows.reduce((a,b)=>({
        co2eKg:a.co2eKg+Number(b.impact?.co2eKg||0), waterLiters:a.waterLiters+Number(b.impact?.waterLiters||0),
        energyKwh:a.energyKwh+Number(b.impact?.energyKwh||0), wasteKg:a.wasteKg+Number(b.impact?.wasteKg||0),
      }), {co2eKg:0,waterLiters:0,energyKwh:0,wasteKg:0});
      const weighted = (key) => units ? Math.round(rows.reduce((s,b)=>s+score(b.transparency?.[key])*Number(b.approvedUnits||b.plannedUnits||0),0)/units) : 0;
      const dimensions = Object.fromEntries(Object.keys(ITM.dimensions).map(k=>[k,weighted(k)]));
      return { batches:rows.length, units, totals, perPiece:Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,units?Number((v/units).toFixed(4)):0])), dimensions, transparencyScore:Math.round(Object.values(dimensions).reduce((a,b)=>a+b,0)/5), benchmark:ITM };
    };
    return { actual: aggregate(all.filter(b=>b.status==="completed")), forecast: aggregate(all.filter(b=>b.status!=="completed")), updatedAt: now() };
  }

  recordCompanyCalculation(reason) {
    const snapshot = this.companySnapshot();
    this.calculations.push({ id:`pi5calc:${randomUUID()}`, reason, ...snapshot });
  }
  historyCompany() { return clone(this.calculations); }
}

export function createDppPi5Api() {
  const store = new DppPi5Store();
  return {
    store,
    async handle({ req, res, url, json, body }) {
      const path = url.pathname;
      if (!path.startsWith("/api/v1/dpp") && !path.startsWith("/api/v1/pi5/company") && !path.startsWith("/api/v1/pi5/batches")) return false;
      try {
        if (req.method==="POST" && path==="/api/v1/dpp/drafts") return json(res,201,store.createDraft(await body(req)));
        if (req.method==="GET" && path==="/api/v1/dpp/drafts") return json(res,200,store.listDrafts());
        let m = path.match(/^\/api\/v1\/dpp\/drafts\/([^/]+)(?:\/(validate|preview|publish))?$/);
        if (m) {
          const id=decodeURIComponent(m[1]), action=m[2];
          if (req.method==="GET" && !action) return json(res,200,clone(store.getDraft(id)));
          if (req.method==="PATCH" && !action) return json(res,200,store.updateDraft(id,await body(req)));
          if (req.method==="POST" && action==="validate") return json(res,200,store.validateDraft(id));
          if (req.method==="GET" && action==="preview") return json(res,200,store.preview(id,url.searchParams.get("profile")||"consumer"));
          if (req.method==="POST" && action==="publish") return json(res,201,store.publish(id));
        }
        m=path.match(/^\/api\/v1\/dpp\/public\/([^/]+)(?:\/(verify|history))?$/);
        if (m && req.method==="GET") {
          const id=decodeURIComponent(m[1]);
          return json(res,200,m[2]==="verify"?store.verify(id):m[2]==="history"?store.history(id):store.getPublic(id));
        }
        if (req.method==="POST" && path==="/api/v1/pi5/batches") return json(res,201,store.upsertBatch(await body(req)));
        m=path.match(/^\/api\/v1\/pi5\/batches\/([^/]+)$/);
        if (m && req.method==="GET") return json(res,200,store.getBatch(decodeURIComponent(m[1])));
        if (req.method==="GET" && path==="/api/v1/pi5/company") return json(res,200,store.companySnapshot());
        if (req.method==="GET" && path==="/api/v1/pi5/company/history") return json(res,200,store.historyCompany());
        return json(res,404,{error:"Endpoint DPP/PI5 não encontrado"});
      } catch (error) {
        return json(res,error.status||400,{error:error.message,code:error.code||"DPP_PI5_ERROR",details:error.details});
      }
    }
  };
}
