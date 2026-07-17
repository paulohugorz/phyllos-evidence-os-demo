import {
  LIBRARY_VERSION,
  MATERIAL_LIBRARY,
  PROCESS_LIBRARY,
  SOURCE_STATES,
  TECHNIQUE_LIBRARY,
  createSuggestedSpecification,
  cryptoId,
  deriveGaps,
  dominantMaterialFamily,
  estimateProductionImpact,
  findMaterial,
  findProcess,
  findTechnique,
  specificityLevel,
  specificityScore,
} from "./production-library.js";

const SPEC_STORAGE_KEY = "phyllos-production-specifications";
const PORTFOLIO_STORAGE_KEY = "phyllos-portfolio";
const PROJECT_STORAGE_KEY = "phyllos-projects";
const openCards = new Set();
const activeTabs = new Map();
let lastPortfolioSignature = "";
let renderQueued = false;

const $ = (selector, root = document) => root.querySelector(selector);
const all = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const formatNumber = (value, digits = 2) => number(value).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const formatDate = (value) => value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

function readPieces() { return readJson(PORTFOLIO_STORAGE_KEY, []); }
function readProjects() { return readJson(PROJECT_STORAGE_KEY, []); }
function readSpecifications() { return readJson(SPEC_STORAGE_KEY, {}); }
function saveSpecifications(specifications) { localStorage.setItem(SPEC_STORAGE_KEY, JSON.stringify(specifications)); }

function blankSpecification(pieceId) {
  return { pieceId, libraryVersion: LIBRARY_VERSION, components: [], processes: [], techniques: [], snapshots: [], updatedAt: new Date().toISOString() };
}

function getSpecification(specifications, pieceId) {
  return specifications[pieceId] || blankSpecification(pieceId);
}

function updateSpecification(pieceId, updater, { renderAfter = true } = {}) {
  const specifications = readSpecifications();
  const current = getSpecification(specifications, pieceId);
  const next = updater(structuredClone(current)) || current;
  next.pieceId = pieceId;
  next.libraryVersion = next.libraryVersion || LIBRARY_VERSION;
  next.updatedAt = new Date().toISOString();
  specifications[pieceId] = next;
  saveSpecifications(specifications);
  if (renderAfter) queueRender();
}

function notify(message) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function projectForPiece(piece, projects) {
  return projects.find((project) => project.id === piece.projectId);
}

function sourceOptions(selected = "reference") {
  return Object.entries(SOURCE_STATES).map(([value, meta]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${escapeHtml(meta.label)}</option>`).join("");
}

function materialOptions(selected = "") {
  return MATERIAL_LIBRARY.map((item) => `<option value="${item.id}" ${item.id === selected ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
}

function processOptions(selected = "") {
  return PROCESS_LIBRARY.map((item) => `<option value="${item.id}" ${item.id === selected ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
}

function techniqueOptions(selected = "") {
  return TECHNIQUE_LIBRARY.map((item) => `<option value="${item.id}" ${item.id === selected ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("");
}

function sourceBadge(source) {
  const meta = SOURCE_STATES[source] || SOURCE_STATES.reference;
  return `<span class="source-badge ${meta.tone}">${escapeHtml(meta.label)}</span>`;
}

function sourceCounts(spec) {
  const counts = Object.fromEntries(Object.keys(SOURCE_STATES).map((key) => [key, 0]));
  [...(spec.components || []), ...(spec.processes || []), ...(spec.techniques || [])].forEach((item) => { counts[item.source || "reference"] += 1; });
  return counts;
}

function contributionBars(result) {
  const contributions = [...result.materialContributions, ...result.processContributions]
    .filter((item) => item.carbon > 0)
    .sort((a, b) => b.carbon - a.carbon);
  const max = contributions[0]?.carbon || 1;
  return contributions.length ? contributions.map((item) => `
    <div class="impact-contribution">
      <div><strong>${escapeHtml(item.label)}</strong><small>${formatNumber(item.carbon, 3)} kg CO₂e/un. · ${escapeHtml(SOURCE_STATES[item.source]?.label || "Referência")}</small></div>
      <div class="impact-bar"><i style="width:${Math.max(4, item.carbon / max * 100)}%"></i></div>
    </div>`).join("") : `<div class="spec-empty compact">Adicione materiais e processos para visualizar contribuições.</div>`;
}

function renderComponentRow(pieceId, item) {
  const ref = findMaterial(item.materialId) || MATERIAL_LIBRARY[0];
  return `<article class="library-record">
    <div class="record-heading"><div><input class="record-title" data-kind="component" data-id="${item.id}" data-piece="${pieceId}" data-field="name" value="${escapeHtml(item.name || ref.name)}" aria-label="Nome do componente">${sourceBadge(item.source)}</div><button class="icon-action danger" data-action="delete-item" data-kind="component" data-id="${item.id}" data-piece="${pieceId}" title="Remover componente">×</button></div>
    <div class="record-fields component-fields">
      <label>Material da biblioteca<select data-kind="component" data-id="${item.id}" data-piece="${pieceId}" data-field="materialId">${materialOptions(item.materialId)}</select></label>
      <label>Massa por peça <span class="unit-field"><input type="number" min="0" step="1" data-kind="component" data-id="${item.id}" data-piece="${pieceId}" data-field="massG" value="${number(item.massG)}"><i>g</i></span></label>
      <label>Perda <span class="unit-field"><input type="number" min="0" max="100" step="1" data-kind="component" data-id="${item.id}" data-piece="${pieceId}" data-field="wastePct" value="${number(item.wastePct)}"><i>%</i></span></label>
      <label>Qualidade do dado<select data-kind="component" data-id="${item.id}" data-piece="${pieceId}" data-field="source">${sourceOptions(item.source)}</select></label>
      <label>Fornecedor<input data-kind="component" data-id="${item.id}" data-piece="${pieceId}" data-field="supplier" value="${escapeHtml(item.supplier || "")}" placeholder="Empresa, cooperativa ou estoque"></label>
      <label>Origem<input data-kind="component" data-id="${item.id}" data-piece="${pieceId}" data-field="origin" value="${escapeHtml(item.origin || "")}" placeholder="País, estado, lote ou local"></label>
      <label class="span-2">Evidência<input data-kind="component" data-id="${item.id}" data-piece="${pieceId}" data-field="evidence" value="${escapeHtml(item.evidence || "")}" placeholder="Etiqueta, ficha, nota, laudo ou medição"></label>
    </div>
    <div class="library-reference"><span>BIBLIOTECA PHYLLOS · ${LIBRARY_VERSION}</span><div><strong>${escapeHtml(ref.name)}</strong><p><b>Riscos:</b> ${escapeHtml(ref.risks)}. <b>Circularidade:</b> ${escapeHtml(ref.circularity)}.</p><small>Como confirmar: ${escapeHtml(ref.evidence)} · fator demonstrativo ${formatNumber(ref.carbonKgPerKg, 1)} kg CO₂e/kg.</small></div></div>
  </article>`;
}

function renderMaterialsTab(piece, spec) {
  return `<div class="spec-tab-panel">
    <div class="tab-intro"><div><h4>Componentes e materiais</h4><p>Registre cada parte da peça. A referência da biblioteca só se torna fato quando você altera o estado e vincula evidência.</p></div><span>${spec.components.length} componente(s)</span></div>
    <div class="library-record-list">${spec.components.length ? spec.components.map((item) => renderComponentRow(piece.id, item)).join("") : `<div class="spec-empty"><strong>A estrutura material ainda não foi criada.</strong><p>Aplique um modelo sugerido ou adicione o primeiro componente.</p></div>`}</div>
    <form class="quick-add-form" data-add-kind="component" data-piece="${piece.id}">
      <div><strong>Adicionar componente</strong><small>O valor inicia como referência da biblioteca.</small></div>
      <label>Componente<input name="name" required placeholder="Ex.: forro, botão, linha"></label>
      <label>Material<select name="libraryId">${materialOptions()}</select></label>
      <label>Massa <span class="unit-field"><input name="mass" type="number" min="0" step="1" value="10"><i>g</i></span></label>
      <button class="secondary-action" type="submit">Adicionar</button>
    </form>
  </div>`;
}

function renderProcessRow(pieceId, item, index, count) {
  const ref = findProcess(item.processId) || PROCESS_LIBRARY[0];
  return `<article class="library-record process-record">
    <div class="record-heading"><div><span class="sequence-number">${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(ref.name)}</strong>${sourceBadge(item.source)}</div><div class="record-actions"><button class="icon-action" data-action="move-item" data-direction="up" data-kind="process" data-id="${item.id}" data-piece="${pieceId}" ${index === 0 ? "disabled" : ""}>↑</button><button class="icon-action" data-action="move-item" data-direction="down" data-kind="process" data-id="${item.id}" data-piece="${pieceId}" ${index === count - 1 ? "disabled" : ""}>↓</button><button class="icon-action danger" data-action="delete-item" data-kind="process" data-id="${item.id}" data-piece="${pieceId}">×</button></div></div>
    <div class="record-fields process-fields">
      <label>Processo<select data-kind="process" data-id="${item.id}" data-piece="${pieceId}" data-field="processId">${processOptions(item.processId)}</select></label>
      <label>Energia por peça <span class="unit-field"><input type="number" min="0" step="0.01" data-kind="process" data-id="${item.id}" data-piece="${pieceId}" data-field="energyKwh" value="${number(item.energyKwh)}"><i>kWh</i></span></label>
      <label>Água por peça <span class="unit-field"><input type="number" min="0" step="0.1" data-kind="process" data-id="${item.id}" data-piece="${pieceId}" data-field="waterL" value="${number(item.waterL)}"><i>L</i></span></label>
      <label>Qualidade do dado<select data-kind="process" data-id="${item.id}" data-piece="${pieceId}" data-field="source">${sourceOptions(item.source)}</select></label>
      <label>Local de execução<input data-kind="process" data-id="${item.id}" data-piece="${pieceId}" data-field="facility" value="${escapeHtml(item.facility || "")}" placeholder="Ateliê, oficina ou terceiro"></label>
      <label>Responsável<input data-kind="process" data-id="${item.id}" data-piece="${pieceId}" data-field="responsible" value="${escapeHtml(item.responsible || "")}"></label>
      <label class="span-2">Evidência<input data-kind="process" data-id="${item.id}" data-piece="${pieceId}" data-field="evidence" value="${escapeHtml(item.evidence || "")}" placeholder="OP, checklist, medição, foto ou registro de máquina"></label>
    </div>
    <div class="library-reference"><span>REFERÊNCIA DE PROCESSO</span><div><strong>${escapeHtml(ref.name)}</strong><p><b>Riscos:</b> ${escapeHtml(ref.risks)}.</p><small>Evidência recomendada: ${escapeHtml(ref.evidence)} · base ${formatNumber(ref.energyKwh, 2)} kWh e ${formatNumber(ref.waterL, 1)} L por peça.</small></div></div>
  </article>`;
}

function renderProcessesTab(piece, spec) {
  return `<div class="spec-tab-panel">
    <div class="tab-intro"><div><h4>Rota produtiva</h4><p>Organize a sequência real. Consumos sugeridos podem ser substituídos por tempo de máquina, medição ou documento.</p></div><span>${spec.processes.length} processo(s)</span></div>
    <div class="library-record-list">${spec.processes.length ? spec.processes.map((item, index) => renderProcessRow(piece.id, item, index, spec.processes.length)).join("") : `<div class="spec-empty"><strong>Nenhuma rota produtiva registrada.</strong><p>Adicione processos individualmente ou aplique a estrutura sugerida.</p></div>`}</div>
    <form class="quick-add-form" data-add-kind="process" data-piece="${piece.id}">
      <div><strong>Adicionar processo</strong><small>Consumos iniciais vêm da biblioteca.</small></div>
      <label>Processo<select name="libraryId">${processOptions()}</select></label>
      <label>Qualidade<select name="source">${sourceOptions("reference")}</select></label>
      <button class="secondary-action" type="submit">Adicionar</button>
    </form>
  </div>`;
}

function renderTechniqueRow(pieceId, item, components) {
  const ref = findTechnique(item.techniqueId) || TECHNIQUE_LIBRARY[0];
  const componentOptions = `<option value="">Peça inteira</option>` + components.map((component) => `<option value="${component.id}" ${component.id === item.componentId ? "selected" : ""}>${escapeHtml(component.name)}</option>`).join("");
  return `<article class="library-record technique-record">
    <div class="record-heading"><div><strong>${escapeHtml(ref.name)}</strong>${sourceBadge(item.source)}</div><button class="icon-action danger" data-action="delete-item" data-kind="technique" data-id="${item.id}" data-piece="${pieceId}">×</button></div>
    <div class="record-fields technique-fields">
      <label>Técnica<select data-kind="technique" data-id="${item.id}" data-piece="${pieceId}" data-field="techniqueId">${techniqueOptions(item.techniqueId)}</select></label>
      <label>Aplicação<select data-kind="technique" data-id="${item.id}" data-piece="${pieceId}" data-field="componentId">${componentOptions}</select></label>
      <label>Qualidade do dado<select data-kind="technique" data-id="${item.id}" data-piece="${pieceId}" data-field="source">${sourceOptions(item.source)}</select></label>
      <label>Evidência<input data-kind="technique" data-id="${item.id}" data-piece="${pieceId}" data-field="evidence" value="${escapeHtml(item.evidence || "")}" placeholder="Foto, ficha, amostra ou responsável"></label>
    </div>
    <div class="technique-effect"><div><span>Durabilidade</span><strong>${ref.durability > 0 ? "+" : ""}${ref.durability}</strong></div><div><span>Reparabilidade</span><strong>${ref.repairability > 0 ? "+" : ""}${ref.repairability}</strong></div><div><span>Circularidade</span><strong>${ref.circularity > 0 ? "+" : ""}${ref.circularity}</strong></div><p>${escapeHtml(ref.note)}</p></div>
  </article>`;
}

function renderTechniquesTab(piece, spec) {
  return `<div class="spec-tab-panel">
    <div class="tab-intro"><div><h4>Técnicas construtivas</h4><p>Registre como a peça foi construída. Benefícios de durabilidade e reparo não são convertidos automaticamente em redução ambiental.</p></div><span>${spec.techniques.length} técnica(s)</span></div>
    <div class="library-record-list">${spec.techniques.length ? spec.techniques.map((item) => renderTechniqueRow(piece.id, item, spec.components)).join("") : `<div class="spec-empty"><strong>Nenhuma técnica específica registrada.</strong><p>Adicione técnicas que alterem construção, durabilidade, reparabilidade ou desmontagem.</p></div>`}</div>
    <form class="quick-add-form" data-add-kind="technique" data-piece="${piece.id}">
      <div><strong>Adicionar técnica</strong><small>A biblioteca explica efeitos e limitações.</small></div>
      <label>Técnica<select name="libraryId">${techniqueOptions()}</select></label>
      <label>Aplicação<select name="componentId"><option value="">Peça inteira</option>${spec.components.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join("")}</select></label>
      <button class="secondary-action" type="submit">Adicionar</button>
    </form>
  </div>`;
}

function renderImpactTab(piece, spec) {
  const result = estimateProductionImpact(spec, piece.quantity || 1);
  const gaps = deriveGaps(spec);
  const counts = sourceCounts(spec);
  const highGaps = gaps.filter((gap) => gap.level === "high").length;
  return `<div class="spec-tab-panel impact-panel">
    <div class="tab-intro"><div><h4>Impacto conectado e lacunas</h4><p>A estimativa usa a versão ${escapeHtml(result.libraryVersion)} da biblioteca e preserva o estado de cada entrada.</p></div><span>${gaps.length} lacuna(s)</span></div>
    <div class="impact-summary-grid">
      <div><span>Estimativa por peça</span><strong>${formatNumber(result.carbonPerUnit, 2)}</strong><small>kg CO₂e demonstrativos</small></div>
      <div><span>Lote de ${result.quantity}</span><strong>${formatNumber(result.carbonBatch, 1)}</strong><small>kg CO₂e demonstrativos</small></div>
      <div><span>Água por peça</span><strong>${formatNumber(result.waterPerUnit, 0)}</strong><small>litros associados</small></div>
      <div class="specificity-metric"><span>Especificidade</span><strong>${result.specificity}%</strong><small>${specificityLevel(result.specificity)} · ${highGaps} crítica(s)</small></div>
    </div>
    <div class="impact-columns">
      <section><div class="mini-section-head"><strong>Principais contribuições</strong><small>Por unidade produzida</small></div>${contributionBars(result)}</section>
      <section><div class="mini-section-head"><strong>Qualidade das entradas</strong><small>Não mede sustentabilidade</small></div><div class="source-distribution">${Object.entries(counts).map(([source, count]) => `<div>${sourceBadge(source)}<strong>${count}</strong></div>`).join("")}</div><div class="technique-summary"><span>Durabilidade <b>${result.durability >= 0 ? "+" : ""}${result.durability}</b></span><span>Reparabilidade <b>${result.repairability >= 0 ? "+" : ""}${result.repairability}</b></span><span>Circularidade <b>${result.circularity >= 0 ? "+" : ""}${result.circularity}</b></span></div></section>
    </div>
    <div class="gap-list"><div class="mini-section-head"><strong>Lacunas geradas automaticamente</strong><small>Responsabilidade futura pode ser vinculada no módulo Lacunas</small></div>${gaps.length ? gaps.slice(0, 12).map((gap) => `<div class="spec-gap ${gap.level}"><span>!</span><div><strong>${escapeHtml(gap.text)}</strong><small>${escapeHtml(gap.expected)}</small></div></div>`).join("") : `<div class="spec-empty compact"><strong>Nenhuma lacuna pelas regras atuais.</strong><p>Isso não substitui revisão técnica ou auditoria.</p></div>`}</div>
    <div class="impact-actions"><button class="secondary-action" data-action="send-impact" data-piece="${piece.id}">Usar na calculadora ambiental →</button><button class="primary" data-action="snapshot" data-piece="${piece.id}">Congelar snapshot local</button><span>${spec.snapshots?.length || 0} snapshot(s)</span></div>
    <div class="method-note"><strong>Limite metodológico</strong><p>Os fatores são referências demonstrativas para estruturar dados e comparar contribuições. Não constituem ACV, certificação ou alegação ambiental. Técnicas de maior durabilidade são mostradas separadamente e não reduzem automaticamente o resultado.</p></div>
  </div>`;
}

function renderCard(piece, projects, specifications) {
  const project = projectForPiece(piece, projects);
  const spec = getSpecification(specifications, piece.id);
  const score = specificityScore(spec);
  const gaps = deriveGaps(spec);
  const isOpen = openCards.has(piece.id);
  const tab = activeTabs.get(piece.id) || "materials";
  const result = estimateProductionImpact(spec, piece.quantity || 1);
  const dueDate = piece.dueDate || project?.dueDate;
  const detail = tab === "materials" ? renderMaterialsTab(piece, spec)
    : tab === "processes" ? renderProcessesTab(piece, spec)
      : tab === "techniques" ? renderTechniquesTab(piece, spec)
        : renderImpactTab(piece, spec);
  return `<article class="smart-production-card ${isOpen ? "open" : ""}" data-smart-piece="${piece.id}">
    <div class="smart-card-summary">
      <button class="smart-card-toggle" data-action="toggle-card" data-piece="${piece.id}" aria-expanded="${isOpen}">
        <span class="smart-card-code">${escapeHtml(piece.code || "SEM CÓDIGO")}</span>
        <span class="smart-card-title"><strong>${escapeHtml(piece.name || "Peça sem nome")}</strong><small>${escapeHtml(project?.name || "Portfólio sem projeto")} · ${escapeHtml(project?.customer || piece.customer || "cliente a confirmar")}</small></span>
        <span class="smart-card-stat"><strong>${spec.components.length}</strong><small>materiais</small></span>
        <span class="smart-card-stat"><strong>${spec.processes.length}</strong><small>processos</small></span>
        <span class="smart-card-stat"><strong>${spec.techniques.length}</strong><small>técnicas</small></span>
        <span class="smart-card-specificity"><i style="--score:${score * 3.6}deg"><b>${score}%</b></i><small>${specificityLevel(score)}</small></span>
        <span class="smart-card-chevron">${isOpen ? "−" : "+"}</span>
      </button>
      <div class="smart-card-meta"><span>${piece.quantity || 1} unidade(s)</span><span>${dueDate ? `prazo ${new Date(`${dueDate}T12:00:00`).toLocaleDateString("pt-BR")}` : "prazo a definir"}</span><span>${formatNumber(result.carbonPerUnit, 2)} kg CO₂e/un. estimados</span><span class="${gaps.some((gap) => gap.level === "high") ? "has-critical" : ""}">${gaps.length} lacuna(s)</span><span>atualizado ${formatDate(spec.updatedAt)}</span></div>
    </div>
    <div class="smart-card-detail ${isOpen ? "" : "hidden"}">
      <div class="card-governance"><div><span>PH / CARD DE PRODUÇÃO</span><strong>Biblioteca ${escapeHtml(spec.libraryVersion || LIBRARY_VERSION)}</strong></div><p>Referências orientam o cadastro; fatos dependem de declaração, medição ou documento vinculado.</p><div class="card-governance-actions"><button class="link" data-action="apply-template" data-piece="${piece.id}">${spec.components.length || spec.processes.length ? "Reaplicar estrutura sugerida" : "Criar estrutura sugerida"}</button><button class="link" data-action="open-portfolio" data-piece="${piece.id}">Abrir cadastro da peça →</button></div></div>
      <nav class="spec-tabs" aria-label="Detalhes do card"><button class="${tab === "materials" ? "active" : ""}" data-action="tab" data-piece="${piece.id}" data-tab="materials">Materiais <span>${spec.components.length}</span></button><button class="${tab === "processes" ? "active" : ""}" data-action="tab" data-piece="${piece.id}" data-tab="processes">Processos <span>${spec.processes.length}</span></button><button class="${tab === "techniques" ? "active" : ""}" data-action="tab" data-piece="${piece.id}" data-tab="techniques">Técnicas <span>${spec.techniques.length}</span></button><button class="${tab === "impact" ? "active" : ""}" data-action="tab" data-piece="${piece.id}" data-tab="impact">Impacto e lacunas <span>${score}%</span></button></nav>
      ${detail}
    </div>
  </article>`;
}

function ensureSection() {
  const operations = $("#operations");
  const projectList = $("#projectList");
  if (!operations || !projectList) return null;
  let section = $("#productionSpecificationSection");
  if (section) return section;
  section = document.createElement("section");
  section.id = "productionSpecificationSection";
  section.className = "production-specification-section";
  projectList.insertAdjacentElement("afterend", section);
  section.addEventListener("click", handleClick);
  section.addEventListener("submit", handleSubmit);
  section.addEventListener("change", handleFieldChange);
  section.addEventListener("input", handleFieldInput);
  return section;
}

function render() {
  renderQueued = false;
  const section = ensureSection();
  if (!section) return;
  const pieces = readPieces();
  const projects = readProjects();
  const specifications = readSpecifications();
  const scores = pieces.map((piece) => specificityScore(getSpecification(specifications, piece.id)));
  const allGaps = pieces.flatMap((piece) => deriveGaps(getSpecification(specifications, piece.id)));
  const documented = pieces.flatMap((piece) => {
    const spec = getSpecification(specifications, piece.id);
    return [...spec.components, ...spec.processes, ...spec.techniques];
  }).filter((item) => item.source === "documented").length;
  const averageScore = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
  section.innerHTML = `
    <div class="production-spec-head">
      <div><p class="eyebrow">CARDS INTELIGENTES · BIBLIOTECAS PHYLLOS</p><h3>Especifique a peça enquanto ela é produzida.</h3><p>Conecte materiais, processos, técnicas e evidências para transformar uma estimativa genérica em um impacto contextualizado e verificável.</p></div>
      <div class="production-library-mark"><span>Biblioteca ativa</span><strong>${LIBRARY_VERSION}</strong><small>${MATERIAL_LIBRARY.length} materiais · ${PROCESS_LIBRARY.length} processos · ${TECHNIQUE_LIBRARY.length} técnicas</small></div>
    </div>
    <div class="production-spec-metrics">
      <div><span>Cards de peças</span><strong>${pieces.length}</strong></div>
      <div><span>Especificidade média</span><strong>${averageScore}%</strong></div>
      <div><span>Lacunas abertas</span><strong>${allGaps.length}</strong></div>
      <div><span>Itens documentados</span><strong>${documented}</strong></div>
      <button class="secondary-action" data-action="apply-all" ${pieces.length ? "" : "disabled"}>Criar estruturas sugeridas</button>
    </div>
    <div id="smartProductionCards" class="smart-production-list">
      ${pieces.length ? pieces.map((piece) => renderCard(piece, projects, specifications)).join("") : `<div class="smart-empty-state"><span>PH / PRODUÇÃO</span><h4>Crie um projeto e adicione a primeira peça.</h4><p>O card será criado automaticamente e poderá receber materiais, rota produtiva, técnicas, evidências e estimativas de impacto.</p><button class="primary" data-action="new-project">+ Novo projeto</button></div>`}
    </div>`;
}

function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(render);
}

function findCollection(spec, kind) {
  if (kind === "component") return spec.components;
  if (kind === "process") return spec.processes;
  if (kind === "technique") return spec.techniques;
  return [];
}

function handleClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const pieceId = button.dataset.piece;
  if (action === "toggle-card") {
    openCards.has(pieceId) ? openCards.delete(pieceId) : openCards.add(pieceId);
    queueRender();
  } else if (action === "tab") {
    activeTabs.set(pieceId, button.dataset.tab);
    openCards.add(pieceId);
    queueRender();
  } else if (action === "apply-template") {
    const piece = readPieces().find((item) => item.id === pieceId);
    if (!piece) return;
    const specifications = readSpecifications();
    const current = getSpecification(specifications, pieceId);
    const proposed = createSuggestedSpecification(piece);
    if ((current.components.length || current.processes.length || current.techniques.length) && !confirm("Reaplicar a estrutura substituirá materiais, processos e técnicas atuais deste card. Continuar?")) return;
    proposed.snapshots = current.snapshots || [];
    specifications[pieceId] = proposed;
    saveSpecifications(specifications);
    openCards.add(pieceId);
    activeTabs.set(pieceId, "materials");
    notify("Estrutura sugerida criada como referência da biblioteca");
    queueRender();
  } else if (action === "apply-all") {
    const pieces = readPieces();
    const specifications = readSpecifications();
    let created = 0;
    pieces.forEach((piece) => {
      const current = getSpecification(specifications, piece.id);
      if (!current.components.length && !current.processes.length && !current.techniques.length) {
        specifications[piece.id] = createSuggestedSpecification(piece);
        created += 1;
      }
    });
    saveSpecifications(specifications);
    notify(created ? `${created} estrutura(s) sugerida(s) criada(s)` : "Todos os cards já possuem especificação");
    queueRender();
  } else if (action === "delete-item") {
    updateSpecification(pieceId, (spec) => {
      const collection = findCollection(spec, button.dataset.kind);
      const index = collection.findIndex((item) => item.id === button.dataset.id);
      if (index >= 0) collection.splice(index, 1);
      return spec;
    });
  } else if (action === "move-item") {
    updateSpecification(pieceId, (spec) => {
      const collection = findCollection(spec, button.dataset.kind);
      const index = collection.findIndex((item) => item.id === button.dataset.id);
      const target = button.dataset.direction === "up" ? index - 1 : index + 1;
      if (index >= 0 && target >= 0 && target < collection.length) [collection[index], collection[target]] = [collection[target], collection[index]];
      collection.forEach((item, order) => { item.sequence = order + 1; });
      return spec;
    });
  } else if (action === "snapshot") {
    const piece = readPieces().find((item) => item.id === pieceId);
    updateSpecification(pieceId, (spec) => {
      const result = estimateProductionImpact(spec, piece?.quantity || 1);
      const snapshot = { id: cryptoId("snapshot"), frozenAt: new Date().toISOString(), libraryVersion: spec.libraryVersion, specificity: specificityScore(spec), gaps: deriveGaps(spec), result, specification: structuredClone({ components: spec.components, processes: spec.processes, techniques: spec.techniques }) };
      spec.snapshots = [...(spec.snapshots || []), snapshot];
      return spec;
    });
    notify("Snapshot local congelado com versão e premissas");
  } else if (action === "send-impact") {
    sendToImpact(pieceId);
  } else if (action === "open-portfolio") {
    const nav = $("[data-view='products']");
    nav?.click();
    setTimeout(() => {
      const edit = $(`.edit-portfolio[data-product="${CSS.escape(pieceId)}"]`);
      edit?.click();
    }, 40);
  } else if (action === "new-project") {
    $("#operationsNewItem")?.click();
  }
}

function handleSubmit(event) {
  const form = event.target.closest("[data-add-kind]");
  if (!form) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const kind = form.dataset.addKind;
  const pieceId = form.dataset.piece;
  updateSpecification(pieceId, (spec) => {
    if (kind === "component") {
      const ref = findMaterial(data.libraryId) || MATERIAL_LIBRARY[0];
      spec.components.push({ id: cryptoId("component"), name: data.name, materialId: data.libraryId, massG: number(data.mass, 10), wastePct: ref.defaultWaste, source: "reference", supplier: "", origin: "", evidence: "" });
    } else if (kind === "process") {
      const ref = findProcess(data.libraryId) || PROCESS_LIBRARY[0];
      spec.processes.push({ id: cryptoId("process"), processId: data.libraryId, sequence: spec.processes.length + 1, energyKwh: ref.energyKwh, waterL: ref.waterL, wasteG: ref.wasteG, source: data.source || "reference", facility: "", responsible: "", evidence: "" });
    } else if (kind === "technique") {
      spec.techniques.push({ id: cryptoId("technique"), techniqueId: data.libraryId, componentId: data.componentId || "", source: "reference", evidence: "" });
    }
    return spec;
  });
  notify("Item adicionado ao card de produção");
}

function updateField(target, immediate = false) {
  const { piece: pieceId, kind, id, field } = target.dataset;
  if (!pieceId || !kind || !id || !field) return;
  updateSpecification(pieceId, (spec) => {
    const item = findCollection(spec, kind).find((entry) => entry.id === id);
    if (!item) return spec;
    const numericFields = new Set(["massG", "wastePct", "energyKwh", "waterL", "wasteG"]);
    item[field] = numericFields.has(field) ? number(target.value) : target.value;
    if (kind === "component" && field === "materialId") {
      const ref = findMaterial(target.value);
      if (ref && !number(item.wastePct)) item.wastePct = ref.defaultWaste;
    }
    if (kind === "process" && field === "processId") {
      const ref = findProcess(target.value);
      if (ref && item.source === "reference") { item.energyKwh = ref.energyKwh; item.waterL = ref.waterL; item.wasteG = ref.wasteG; }
    }
    return spec;
  }, { renderAfter: !immediate });
  if (!immediate) notify("Card atualizado");
}

function handleFieldChange(event) {
  const target = event.target.closest("[data-field]");
  if (target) updateField(target);
}

let inputTimer;
function handleFieldInput(event) {
  const target = event.target.closest("input[data-field]");
  if (!target) return;
  clearTimeout(inputTimer);
  inputTimer = setTimeout(() => updateField(target, true), 450);
}

function sendToImpact(pieceId) {
  const piece = readPieces().find((item) => item.id === pieceId);
  const spec = getSpecification(readSpecifications(), pieceId);
  if (!piece) return;
  const result = estimateProductionImpact(spec, piece.quantity || 1);
  const family = dominantMaterialFamily(spec);
  $("[data-view='impact']")?.click();
  setTimeout(() => {
    const product = $("#impactProduct");
    if (product && [...product.options].some((option) => option.value === pieceId)) product.value = pieceId;
    const fields = {
      impactMaterial: family,
      impactMass: Math.max(1, Math.round(result.totalMassG)),
      impactQuantity: Math.max(1, number(piece.quantity, 1)),
      impactWaste: Math.round(result.weightedWaste),
      impactEnergy: Number(result.energyPerUnit.toFixed(2)),
      impactDistance: 0,
    };
    Object.entries(fields).forEach(([id, value]) => {
      const field = $(`#${id}`);
      if (!field) return;
      field.value = String(value);
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const inherited = $("#inheritedFields");
    if (inherited) inherited.innerHTML = `<div><strong>Card Inteligente de Produção</strong><span>${escapeHtml(piece.name)} · especificidade ${result.specificity}% · biblioteca ${escapeHtml(result.libraryVersion)}</span></div><div><strong>Dados transferidos</strong><span>${spec.components.length} materiais · ${spec.processes.length} processos · logística ainda não especificada</span></div>`;
    const sources = $("#impactSources");
    if (sources) sources.innerHTML = `<span class="source-chip active">CARD DE PRODUÇÃO</span><strong>${escapeHtml(piece.name)}</strong><small>Confira distância logística e demais lacunas antes de calcular.</small>`;
    notify("Dados do card enviados; complete as lacunas da calculadora");
  }, 80);
}

function monitorApplication() {
  const signature = `${localStorage.getItem(PORTFOLIO_STORAGE_KEY) || ""}|${localStorage.getItem(PROJECT_STORAGE_KEY) || ""}`;
  if (signature !== lastPortfolioSignature) {
    lastPortfolioSignature = signature;
    queueRender();
  }
}

function init() {
  ensureSection();
  render();
  lastPortfolioSignature = `${localStorage.getItem(PORTFOLIO_STORAGE_KEY) || ""}|${localStorage.getItem(PROJECT_STORAGE_KEY) || ""}`;
  setInterval(monitorApplication, 900);
  window.addEventListener("storage", queueRender);
  const projectList = $("#projectList");
  const board = $("#operationsBoard");
  const observer = new MutationObserver(queueRender);
  if (projectList) observer.observe(projectList, { childList: true, subtree: true });
  if (board) observer.observe(board, { childList: true, subtree: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
