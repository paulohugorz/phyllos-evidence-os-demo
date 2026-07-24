const ITM_BENCHMARK = Object.freeze({
  label: "ITM Brasil 2025",
  overall: 24,
  dimensions: [
    { id: "traceability", label: "Rastreabilidade", benchmark: 30 },
    { id: "ghg", label: "Emissões de GEE", benchmark: 40 },
    { id: "decarbonization", label: "Descarbonização e desmatamento", benchmark: 16 },
    { id: "renewable", label: "Energia renovável", benchmark: 33 },
    { id: "justTransition", label: "Transição justa", benchmark: 9 }
  ]
});

const STORAGE_KEY = "phyllos-pi5-v2-transparency-v1";
const $ = (selector, root = document) => root.querySelector(selector);
const clamp = (value) => Math.max(0, Math.min(100, Number(value) || 0));

function readState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

function score(values) {
  return Math.round(ITM_BENCHMARK.dimensions.reduce((sum, d) => sum + clamp(values[d.id]), 0) / ITM_BENCHMARK.dimensions.length);
}

function confidence(values) {
  const keys = ["publicEvidence", "reviewedEvidence", "supplierLink", "versionedSource"];
  return Math.round(keys.filter((key) => values[key]).length / keys.length * 100);
}

function coverage(values) {
  const dims = ITM_BENCHMARK.dimensions.filter((d) => String(values[d.id] ?? "").trim() !== "").length;
  return Math.round(dims / ITM_BENCHMARK.dimensions.length * 100);
}

function diff(value, benchmark) {
  const delta = Math.round(value - benchmark);
  return `${delta > 0 ? "+" : ""}${delta} p.p.`;
}

function row(dimension, company) {
  const delta = company - dimension.benchmark;
  return `<div class="pi5v2-row">
    <div class="pi5v2-row-head"><strong>${dimension.label}</strong><span class="${delta >= 0 ? "positive" : "negative"}">${diff(company, dimension.benchmark)}</span></div>
    <div class="pi5v2-bars">
      <div><small>Empresa</small><i><b style="width:${company}%"></b></i><strong>${company}%</strong></div>
      <div><small>ITM Brasil 2025</small><i><b style="width:${dimension.benchmark}%"></b></i><strong>${dimension.benchmark}%</strong></div>
    </div>
  </div>`;
}

function render(values) {
  const transparency = score(values);
  const conf = confidence(values);
  const cov = coverage(values);
  $("#pi5V2Summary").innerHTML = `
    <article><span>Transparência climática</span><strong>${transparency}/100</strong><small>${diff(transparency, ITM_BENCHMARK.overall)} vs. ITM</small></article>
    <article><span>Média ITM Brasil 2025</span><strong>${ITM_BENCHMARK.overall}/100</strong><small>referência pública</small></article>
    <article><span>Cobertura</span><strong>${cov}%</strong><small>dimensões avaliadas</small></article>
    <article><span>Confiança</span><strong>${conf >= 75 ? "Alta" : conf >= 50 ? "Média" : conf > 0 ? "Baixa" : "Não avaliada"}</strong><small>${conf}/100</small></article>`;
  $("#pi5V2Rows").innerHTML = ITM_BENCHMARK.dimensions.map((d) => row(d, clamp(values[d.id]))).join("");
}

function valuesFrom(form) {
  const data = new FormData(form);
  const values = {};
  ITM_BENCHMARK.dimensions.forEach((d) => values[d.id] = clamp(data.get(d.id)));
  ["publicEvidence", "reviewedEvidence", "supplierLink", "versionedSource"].forEach((key) => values[key] = data.has(key));
  return values;
}

function init() {
  const impact = $("#impact");
  if (!impact || $("#pi5V2Panel")) return;
  const state = readState();
  impact.insertAdjacentHTML("beforeend", `
    <section id="pi5V2Panel" class="pi5v2-panel">
      <div class="pi5v2-head">
        <div><p class="eyebrow">PI5 V2 · BENCHMARK DE TRANSPARÊNCIA</p><h2>Empresa e média ITM lado a lado.</h2><p>O desempenho ambiental continua separado. Esta camada compara transparência climática, cobertura e confiança.</p></div>
        <span>ITM Brasil 2025<small>Média geral 24%</small></span>
      </div>
      <form id="pi5V2Form">
        <div class="pi5v2-inputs">
          ${ITM_BENCHMARK.dimensions.map((d) => `<label><strong>${d.label}</strong><small>Empresa <output data-output="${d.id}">${clamp(state[d.id])}%</output> · ITM ${d.benchmark}%</small><input type="range" min="0" max="100" name="${d.id}" value="${clamp(state[d.id])}"></label>`).join("")}
        </div>
        <fieldset><legend>Qualidade da evidência</legend>
          <label><input type="checkbox" name="publicEvidence" ${state.publicEvidence ? "checked" : ""}> Evidência pública</label>
          <label><input type="checkbox" name="reviewedEvidence" ${state.reviewedEvidence ? "checked" : ""}> Evidência revisada</label>
          <label><input type="checkbox" name="supplierLink" ${state.supplierLink ? "checked" : ""}> Vínculo com fornecedor</label>
          <label><input type="checkbox" name="versionedSource" ${state.versionedSource ? "checked" : ""}> Fonte versionada</label>
        </fieldset>
        <button class="primary" type="submit">Atualizar comparação</button>
      </form>
      <div id="pi5V2Summary" class="pi5v2-summary"></div>
      <div id="pi5V2Rows"></div>
      <div class="pi5v2-note"><strong>Limite metodológico</strong><p>O ITM mede transparência pública. A comparação não equivale a desempenho ambiental, certificação ou conformidade.</p></div>
    </section>`);
  const form = $("#pi5V2Form");
  form.addEventListener("input", (event) => {
    const output = $(`[data-output="${event.target.name}"]`, form);
    if (output) output.textContent = `${event.target.value}%`;
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = valuesFrom(form);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    render(values);
  });
  render(state);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
