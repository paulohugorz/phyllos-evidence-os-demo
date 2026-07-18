import { calculatePI5Local, PI5_LABELS } from "./pi5-methodology.js";

const QUEUE_KEY = "phyllos-pi5-event-queue";
const LAST_KEY = "phyllos-pi5-last-prediction";
const $ = (selector, root = document) => root.querySelector(selector);
const readJson = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);

function selectedPiece() {
  const pieces = readJson("phyllos-portfolio", []);
  const id = $("#impactProduct")?.value || pieces[0]?.id;
  return pieces.find((item) => item.id === id) || pieces[0] || { id: "demo", name: "Peça PHYLLOS", category: "generic", quantity: 1 };
}
function selectedSpec(pieceId) {
  return readJson("phyllos-production-specifications", {})[pieceId] || { components: [], processes: [], techniques: [] };
}
function sourceConfidence(spec) {
  const weight = { reference: 15, estimated: 35, declared: 55, measured: 80, documented: 100 };
  const items = [...(spec.components || []), ...(spec.processes || []), ...(spec.techniques || [])];
  return items.length ? items.reduce((sum, item) => sum + (weight[item.source] || 15), 0) / items.length : 15;
}
function deriveInputs() {
  const piece = selectedPiece();
  const spec = selectedSpec(piece.id);
  const components = spec.components || [];
  const processes = spec.processes || [];
  const techniques = spec.techniques || [];
  const carbonKg = number($("#impactResultCarbon")?.dataset.value, number($("#impactCarbon")?.value, components.reduce((sum, item) => sum + number(item.massG) / 1000 * 6, 0) + processes.reduce((sum, item) => sum + number(item.energyKwh) * 0.09, 0)));
  const waterL = number($("#impactResultWater")?.dataset.value, components.reduce((sum, item) => sum + number(item.massG) / 1000 * 3200, 0) + processes.reduce((sum, item) => sum + number(item.waterL), 0));
  const totalMass = components.reduce((sum, item) => sum + number(item.massG), 0);
  const wastePct = totalMass ? components.reduce((sum, item) => sum + number(item.massG) * number(item.wastePct), 0) / totalMass : number($("#impactWaste")?.value, 15);
  const documented = [...components, ...processes, ...techniques].filter((item) => item.source === "documented").length;
  const measured = [...components, ...processes, ...techniques].filter((item) => item.source === "measured").length;
  const total = components.length + processes.length + techniques.length;
  const coverage = Math.min(100, total ? 35 + (components.length ? 15 : 0) + (processes.length ? 15 : 0) + (techniques.length ? 10 : 0) + ((documented + measured) / total) * 25 : 25);
  const chemicalControl = Math.min(5, 1.5 + processes.filter((item) => ["washing", "dyeing"].includes(item.processId)).reduce((sum, item) => sum + (item.source === "documented" ? 1.5 : item.source === "measured" ? 1 : 0.25), 0));
  const circularity = Math.min(5, 2.2 + techniques.reduce((sum, item) => sum + (["zero-waste", "upcycling", "detachable-trim"].includes(item.techniqueId) ? 0.6 : 0.1), 0) - Math.max(0, components.length - 5) * 0.08);
  const durabilityUses = 40 + techniques.reduce((sum, item) => sum + (["reinforced-stitch", "flat-felled", "tailoring"].includes(item.techniqueId) ? 12 : 4), 0);
  return { entityId: piece.id, name: piece.name, category: piece.category || piece.name, carbonKg, waterL, wastePct, chemicalControl, materialCircularity: circularity, durabilityUses, coverage, confidence: sourceConfidence(spec), scope: "cradle-to-gate", quantity: piece.quantity || 1 };
}
async function api(path, options = {}) {
  const response = await fetch(path, { headers: { "content-type": "application/json", ...(options.headers || {}) }, ...options });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `HTTP ${response.status}`);
  return response.json();
}
function queueEvent(eventType, payload) {
  const queue = readJson(QUEUE_KEY, []);
  queue.push({ id: crypto.randomUUID?.() || `${Date.now()}`, eventType, occurredAt: new Date().toISOString(), ...payload });
  writeJson(QUEUE_KEY, queue.slice(-1000));
}
async function predict() {
  const inputs = deriveInputs();
  let prediction;
  try { prediction = await api("/api/v1/pi5/predict", { method: "POST", body: JSON.stringify(inputs) }); }
  catch { prediction = calculatePI5Local(inputs); queueEvent("prediction", { entityId: inputs.entityId, inputs, prediction, offline: true }); }
  writeJson(LAST_KEY, prediction);
  renderPrediction(prediction);
}
function statusLabel(status) {
  return ({ insufficient: "Dados insuficientes para publicação", experimental: "Estimativa experimental", contextualized: "Resultado contextualizado", "limited-confidence": "Resultado com confiança limitada" })[status] || status;
}
function dimensionRows(prediction) {
  return Object.entries(prediction.dimensions || {}).map(([key, value]) => `<div class="pi5-dimension"><div><strong>${escapeHtml(PI5_LABELS[key] || key)}</strong><span>${Number(value).toFixed(1)} / 5</span></div><div class="pi5-bar"><i style="width:${Math.max(0, Math.min(100, value / 5 * 100))}%"></i></div></div>`).join("");
}
function renderPrediction(prediction) {
  const body = $("#pi5PredictionBody");
  if (!body) return;
  const className = prediction.score >= 4 ? "excellent" : prediction.score >= 3 ? "good" : prediction.score >= 2 ? "attention" : "critical";
  body.innerHTML = `<div class="pi5-score-card ${className}"><span>PHYLLOS IMPACT 5</span><strong>${Number(prediction.score).toFixed(1)}</strong><b>/ 5</b><small>${escapeHtml(statusLabel(prediction.publicationStatus))}</small></div><div class="pi5-dimensions">${dimensionRows(prediction)}</div><div class="pi5-trust"><div><span>Cobertura</span><strong>${Number(prediction.coverage).toFixed(0)}%</strong></div><div><span>Confiança</span><strong>${Number(prediction.confidence).toFixed(0)}%</strong></div><div><span>Modelo</span><strong>${escapeHtml(prediction.modelVersion)}</strong></div><div><span>Categoria</span><strong>${escapeHtml(prediction.category)}</strong></div></div><p class="pi5-limit">O score compara a peça com uma referência da mesma categoria. Não substitui ACV, certificação ou auditoria.</p>`;
  $("#pi5FeedbackPredictionId").value = prediction.predictionId || prediction.eventId || "";
}
function panelHtml() {
  return `<section id="pi5MLOpsPanel" class="pi5-panel"><div class="pi5-head"><div><p class="eyebrow">METODOLOGIA PROPRIETÁRIA · APRENDIZADO CONTÍNUO</p><h3>PHYLLOS Impact 5</h3><p>Uma régua global de 0 a 5, separando desempenho ambiental, cobertura e confiança das evidências.</p></div><div class="pi5-actions"><button class="primary" id="pi5Calculate">Calcular PI5</button><button class="secondary-action" id="pi5Export">Exportar base MLOps</button></div></div><div id="pi5PredictionBody" class="pi5-body"></div><details class="pi5-feedback"><summary>Registrar validação profissional</summary><form id="pi5FeedbackForm"><input type="hidden" id="pi5FeedbackPredictionId"><label>Score validado<input id="pi5ExpertScore" type="number" min="0" max="5" step="0.1" required></label><label>Profissional responsável<input id="pi5ValidatedBy" required placeholder="Nome ou identificador"></label><label class="span-2">Observações<textarea id="pi5FeedbackNotes" rows="3" placeholder="Critério, evidência e ajustes necessários"></textarea></label><button class="primary" type="submit">Salvar validação</button></form></details><div class="pi5-pipeline"><strong>Esteira MLOps</strong><span>Produção → features → predição → validação profissional → dataset ouro → challenger → avaliação → promoção controlada</span><div id="pi5PipelineStatus">Carregando status...</div></div></section>`;
}
function ensurePanel() {
  const impact = $("#impact") || $("[data-view-panel='impact']") || $("main");
  if (!impact || $("#pi5MLOpsPanel")) return;
  impact.insertAdjacentHTML("beforeend", panelHtml());
  $("#pi5Calculate").addEventListener("click", predict);
  $("#pi5Export").addEventListener("click", exportData);
  $("#pi5FeedbackForm").addEventListener("submit", submitFeedback);
  const last = readJson(LAST_KEY, null); if (last) renderPrediction(last); else predict();
  refreshStatus();
}
async function submitFeedback(event) {
  event.preventDefault();
  const payload = { predictionId: $("#pi5FeedbackPredictionId").value, expertScore: number($("#pi5ExpertScore").value), validatedBy: $("#pi5ValidatedBy").value.trim(), notes: $("#pi5FeedbackNotes").value.trim(), validationMethod: "professional_review" };
  try { await api("/api/v1/pi5/feedback", { method: "POST", body: JSON.stringify(payload) }); }
  catch { queueEvent("expert_feedback", { ...payload, labelStatus: "validated", offline: true }); }
  event.target.reset();
  alert("Validação registrada para a base de aprendizado contínuo.");
  refreshStatus();
}
async function refreshStatus() {
  const target = $("#pi5PipelineStatus"); if (!target) return;
  try { const status = await api("/api/v1/pi5/summary"); target.textContent = `${status.validatedFeedback}/${status.minimumForTraining} validações · ${status.readyForTraining ? "treino liberado" : "coleta em andamento"} · persistência ${status.persistenceMode}`; }
  catch { const queue = readJson(QUEUE_KEY, []); const feedback = queue.filter((item) => item.eventType === "expert_feedback").length; target.textContent = `${feedback}/70 validações locais · sincronização pendente`; }
}
async function exportData() {
  let text;
  try { const response = await fetch("/api/v1/pi5/export"); if (!response.ok) throw new Error(); text = await response.text(); }
  catch { text = readJson(QUEUE_KEY, []).map((item) => JSON.stringify(item)).join("\n") + "\n"; }
  const blob = new Blob([text], { type: "application/x-ndjson" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `phyllos-pi5-events-${new Date().toISOString().slice(0,10)}.jsonl`; link.click(); URL.revokeObjectURL(link.href);
}
function init() { ensurePanel(); setInterval(ensurePanel, 1000); }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
