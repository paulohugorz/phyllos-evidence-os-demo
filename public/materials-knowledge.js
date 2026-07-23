const API_BASE = "/api/v1/materials-demo";
const STORAGE_KEY = "phyllos-material-applications-v1";
const PRODUCT_VERTICAL_KEY = "phyllos-material-product-verticals-v1";
const $ = (selector, root = document) => root.querySelector(selector);
const all = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const verticalLabels = { apparel: "Confecção", footwear: "Calçados", accessory: "Acessórios", packaging: "Embalagem" };
const confidenceLabels = {
  unknown: "Desconhecido",
  declared_by_brand: "Declarado pela marca",
  declared_by_supplier: "Declarado pelo fornecedor",
  documented: "Documentado",
  laboratory_tested: "Testado em laboratório",
  reviewed: "Revisado",
  validated: "Validado",
  conflicting: "Conflitante",
  expired: "Vencido",
  superseded: "Substituído",
};
const claimStatusLabels = {
  draft: "Rascunho",
  evidence_requested: "Evidência pendente",
  under_review: "Em revisão",
  substantiated: "Sustentado",
  approved_for_buyer: "Aprovado para buyer",
  approved_for_publication: "Aprovado para publicação",
  unsupported: "Não sustentado",
  rejected: "Rejeitado",
};

const state = {
  status: null,
  filters: null,
  materials: [],
  articles: [],
  components: [],
  products: [],
  selectedProductKey: null,
  selectedVertical: "apparel",
  tab: "catalog",
  picker: { componentCode: null, materialId: null, articleId: null },
  applications: readJson(STORAGE_KEY, []),
  productVerticals: readJson(PRODUCT_VERTICAL_KEY, {}),
};

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function toast(message) {
  const host = $("#toast");
  if (!host) return;
  host.textContent = message;
  host.classList.add("show");
  setTimeout(() => host.classList.remove("show"), 2600);
}

async function fetchJson(path) {
  const response = await fetch(`${API_BASE}${path}`, { headers: { accept: "application/json" } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || payload.error || `Falha ${response.status}`);
  return payload;
}

function installNavigation() {
  if ($('[data-view="materials"]')) return;
  const nav = $(".sidebar nav");
  if (!nav) return;
  const button = document.createElement("button");
  button.className = "nav";
  button.dataset.view = "materials";
  button.dataset.telemetry = "materials_catalog_viewed";
  button.innerHTML = "<span>10</span> Materiais";
  button.addEventListener("click", showMaterials);
  nav.append(button);
}

function installView() {
  if ($("#materials")) return;
  const section = document.createElement("section");
  section.id = "materials";
  section.className = "view hidden materials-view";
  section.innerHTML = `
    <div class="materials-hero">
      <div>
        <p class="eyebrow">MATERIALS KNOWLEDGE BASE · PILOTO INTEGRADO</p>
        <h2>Materiais, artigos e aplicações em um só fluxo.</h2>
        <p>Pesquise a base canônica, consulte evidências e aplique um artigo comercial ao componente real de uma peça.</p>
      </div>
      <div class="materials-hero-actions">
        <span id="materialsModeBadge" class="materials-mode">Carregando base…</span>
        <button class="primary" id="openPieceMaterials">Configurar peça →</button>
      </div>
    </div>

    <div id="materialsMetrics" class="metrics materials-metrics"></div>

    <div class="materials-tabs" role="tablist" aria-label="Base de materiais">
      <button class="active" data-materials-tab="catalog" role="tab">Materiais canônicos</button>
      <button data-materials-tab="articles" role="tab">Artigos comerciais</button>
      <button data-materials-tab="applications" role="tab">Aplicações em peças</button>
    </div>

    <div class="materials-search-panel">
      <label class="materials-search-field">
        <span>Pesquisar</span>
        <input id="materialsSearch" type="search" placeholder="Material, sinônimo, código, fornecedor, certificação ou claim" autocomplete="off">
      </label>
      <div class="materials-filter-grid">
        <label>Vertical<select id="materialsVertical"><option value="">Todas</option></select></label>
        <label>Família<select id="materialsFamily"><option value="">Todas</option></select></label>
        <label>Origem<select id="materialsOrigin"><option value="">Todas</option></select></label>
        <label>Estrutura<select id="materialsStructure"><option value="">Todas</option></select></label>
        <label>Certificação<select id="materialsCertification"><option value="">Todas</option></select></label>
        <label>Evidência<select id="materialsEvidence"><option value="">Todas</option></select></label>
      </div>
      <div class="materials-search-meta"><span id="materialsResultCount">—</span><button class="link" id="clearMaterialsFilters">Limpar filtros</button></div>
    </div>

    <div id="materialsCatalogPanel" class="materials-panel">
      <div id="materialsCatalog" class="materials-table-card"></div>
    </div>

    <div id="materialsArticlesPanel" class="materials-panel hidden">
      <div id="materialsArticles" class="materials-table-card"></div>
    </div>

    <div id="materialsApplicationsPanel" class="materials-panel hidden">
      <div class="piece-config-shell">
        <div class="piece-config-head">
          <div>
            <p class="eyebrow">CONFIGURAÇÃO DA PEÇA</p>
            <h3>Materiais e componentes</h3>
            <p>O material canônico, o artigo comercial e a aplicação permanecem separados.</p>
          </div>
          <div class="piece-selector-grid">
            <label>Peça<select id="materialsProductSelect"></select></label>
            <label>Vertical<select id="materialsProductVertical"><option value="apparel">Confecção</option><option value="footwear">Calçados</option></select></label>
          </div>
        </div>
        <div id="pieceMaterialSummary" class="piece-material-summary"></div>
        <div id="pieceComponents" class="piece-components"></div>
      </div>
    </div>

    <dialog id="materialDetailDialog" class="materials-dialog">
      <button class="dialog-close" data-close-material-dialog aria-label="Fechar">×</button>
      <div id="materialDetailContent"></div>
    </dialog>

    <dialog id="materialPickerDialog" class="materials-dialog materials-picker-dialog">
      <button class="dialog-close" data-close-picker aria-label="Fechar">×</button>
      <div class="picker-head">
        <p class="eyebrow">APLICAR À PEÇA</p>
        <h3 id="pickerTitle">Selecionar material</h3>
        <p id="pickerContext"></p>
      </div>
      <label class="materials-search-field picker-search"><span>Buscar na base</span><input id="pickerSearch" type="search" placeholder="Nome, artigo, código ou fornecedor"></label>
      <div id="pickerResults" class="picker-results"></div>
      <form id="materialApplicationForm" class="application-form hidden">
        <div id="selectedMaterialSnapshot" class="selected-material-snapshot"></div>
        <div class="field-grid">
          <label>Lote<input name="batchReference" placeholder="Ex.: LT-2026-004"></label>
          <label>Quantidade<input name="quantity" type="number" min="0" step="0.01" placeholder="Ex.: 1,85"></label>
          <label>Unidade<select name="quantityUnit"><option value="m">metro</option><option value="m2">metro quadrado</option><option value="kg">quilograma</option><option value="g">grama</option><option value="unit">unidade</option><option value="pair">par</option></select></label>
          <label>Confiança<select name="confidence"><option value="unknown">Desconhecido</option><option value="declared_by_brand">Declarado pela marca</option><option value="declared_by_supplier">Declarado pelo fornecedor</option><option value="documented">Documentado</option><option value="laboratory_tested">Testado em laboratório</option><option value="reviewed">Revisado</option><option value="validated">Validado</option><option value="conflicting">Conflitante</option></select></label>
          <label class="application-wide">Referência da evidência<input name="evidenceReference" placeholder="Ficha técnica, certificado, laudo ou declaração"></label>
          <label class="application-wide">Observações<textarea name="notes" placeholder="Limitações, divergências ou decisões"></textarea></label>
        </div>
        <div class="application-actions"><button type="button" class="link" id="cancelApplicationSelection">Trocar material</button><button type="submit" class="primary">Salvar aplicação</button></div>
      </form>
    </dialog>
  `;
  $("main")?.append(section);
}

function showMaterials() {
  all(".view").forEach((view) => view.classList.toggle("hidden", view.id !== "materials"));
  all(".nav").forEach((button) => button.classList.toggle("active", button.dataset.view === "materials"));
  const title = $("#pageTitle");
  if (title) title.textContent = "Materiais";
  window.scrollTo({ top: 0, behavior: "smooth" });
  refreshProducts();
  renderCurrentTab();
}

function switchTab(tab) {
  state.tab = tab;
  all("[data-materials-tab]").forEach((button) => button.classList.toggle("active", button.dataset.materialsTab === tab));
  $("#materialsCatalogPanel")?.classList.toggle("hidden", tab !== "catalog");
  $("#materialsArticlesPanel")?.classList.toggle("hidden", tab !== "articles");
  $("#materialsApplicationsPanel")?.classList.toggle("hidden", tab !== "applications");
  renderCurrentTab();
}

function optionMarkup(items = []) {
  return items.map((item) => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`).join("");
}

function populateFilters() {
  if (!state.filters) return;
  $("#materialsVertical").insertAdjacentHTML("beforeend", optionMarkup(state.filters.verticals));
  $("#materialsFamily").insertAdjacentHTML("beforeend", optionMarkup(state.filters.families));
  $("#materialsOrigin").insertAdjacentHTML("beforeend", optionMarkup(state.filters.origins));
  $("#materialsStructure").insertAdjacentHTML("beforeend", optionMarkup(state.filters.structures));
  $("#materialsCertification").insertAdjacentHTML("beforeend", optionMarkup(state.filters.certifications));
  $("#materialsEvidence").insertAdjacentHTML("beforeend", optionMarkup(state.filters.evidence));
}

function selectedFilters() {
  return {
    query: $("#materialsSearch")?.value.trim() || "",
    vertical: $("#materialsVertical")?.value || "",
    family: $("#materialsFamily")?.value || "",
    origin: $("#materialsOrigin")?.value || "",
    structure: $("#materialsStructure")?.value || "",
    certification: $("#materialsCertification")?.value || "",
    evidence: $("#materialsEvidence")?.value || "",
  };
}

function queryString(input) {
  const params = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) params.set(key, value);
  });
  return params.toString();
}

async function refreshCatalog() {
  const host = $("#materialsCatalog");
  if (!host) return;
  host.innerHTML = `<div class="materials-loading">Consultando a base de materiais…</div>`;
  try {
    const result = await fetchJson(`/catalog?${queryString({ ...selectedFilters(), limit: 120 })}`);
    state.materials = result.items || [];
    $("#materialsResultCount").textContent = `${state.materials.length} material(is) encontrado(s)`;
    renderCatalog();
  } catch (error) {
    host.innerHTML = `<div class="materials-empty"><strong>Não foi possível consultar a base</strong><p>${escapeHtml(error.message)}</p></div>`;
  }
}

async function refreshArticles() {
  const host = $("#materialsArticles");
  if (!host) return;
  host.innerHTML = `<div class="materials-loading">Consultando artigos comerciais…</div>`;
  try {
    const filters = selectedFilters();
    const result = await fetchJson(`/commercial-articles?${queryString({ query: filters.query, vertical: filters.vertical, evidence: filters.evidence })}`);
    state.articles = result.items || [];
    renderArticles();
  } catch (error) {
    host.innerHTML = `<div class="materials-empty"><strong>Não foi possível consultar os artigos</strong><p>${escapeHtml(error.message)}</p></div>`;
  }
}

function materialBadges(material) {
  return [
    ...(material.vertical_labels || material.verticals?.map((item) => verticalLabels[item] || item) || []),
    material.origin_label,
    material.evidence_label || confidenceLabels[material.evidence_status],
  ].filter(Boolean).map((item) => `<span>${escapeHtml(item)}</span>`).join("");
}

function renderCatalog() {
  const host = $("#materialsCatalog");
  if (!host) return;
  if (!state.materials.length) {
    host.innerHTML = `<div class="materials-empty"><strong>Nenhum material corresponde aos filtros</strong><p>Remova um filtro ou pesquise por outro termo.</p></div>`;
    return;
  }
  host.innerHTML = `
    <div class="materials-table-head"><span>MATERIAL</span><span>CLASSIFICAÇÃO</span><span>EVIDÊNCIA</span><span>ARTIGOS</span><span>AÇÕES</span></div>
    ${state.materials.map((material) => `
      <article class="materials-row" data-material-id="${escapeHtml(material.id)}">
        <div><strong>${escapeHtml(material.canonical_name_pt)}</strong><small>${escapeHtml(material.technical_name || material.canonical_name_en || "")}</small><div class="material-mini-badges">${materialBadges(material)}</div></div>
        <div><strong>${escapeHtml(material.family_name_pt)}</strong><small>${escapeHtml(material.structure)}</small></div>
        <div><span class="evidence-state ${escapeHtml(material.evidence_status)}">${escapeHtml(material.evidence_label || confidenceLabels[material.evidence_status] || material.evidence_status)}</span><small>${escapeHtml(material.source_label || "Fonte não informada")}</small></div>
        <div><strong>${Number(material.article_count || 0)}</strong><small>artigo(s)</small></div>
        <div class="materials-row-actions"><button class="link material-detail" data-material-id="${escapeHtml(material.id)}">Consultar</button><button class="primary material-apply" data-material-id="${escapeHtml(material.id)}">Aplicar à peça</button></div>
      </article>
    `).join("")}`;
  all(".material-detail", host).forEach((button) => button.addEventListener("click", () => openMaterialDetail(button.dataset.materialId)));
  all(".material-apply", host).forEach((button) => button.addEventListener("click", () => beginApplicationFromMaterial(button.dataset.materialId)));
}

function compositionText(article) {
  return (article.composition || []).map((item) => `${item.percentage}% ${item.material_name}`).join(" · ") || "Composição não informada";
}

function renderArticles() {
  const host = $("#materialsArticles");
  if (!host) return;
  if (!state.articles.length) {
    host.innerHTML = `<div class="materials-empty"><strong>Nenhum artigo comercial encontrado</strong><p>Altere a busca ou os filtros.</p></div>`;
    return;
  }
  host.innerHTML = `
    <div class="materials-table-head articles-head"><span>ARTIGO</span><span>FORNECEDOR</span><span>COMPOSIÇÃO</span><span>EVIDÊNCIA</span><span>AÇÃO</span></div>
    ${state.articles.map((article) => `
      <article class="materials-row articles-row">
        <div><strong>${escapeHtml(article.commercial_name)}</strong><small>${escapeHtml(article.commercial_code)}${article.weight_gsm ? ` · ${article.weight_gsm} g/m²` : ""}</small></div>
        <div><strong>${escapeHtml(article.supplier_name)}</strong><small>${escapeHtml(article.vertical === "footwear" ? "Calçados" : "Confecção")}</small></div>
        <div><strong>${escapeHtml(compositionText(article))}</strong><small>${escapeHtml(article.finish || "Sem acabamento informado")}</small></div>
        <div><span class="evidence-state ${escapeHtml(article.evidence_status)}">${escapeHtml(confidenceLabels[article.evidence_status] || article.evidence_status)}</span><small>${escapeHtml((article.certifications || []).join(" · ") || "Sem certificação vinculada")}</small></div>
        <div><button class="primary article-apply" data-material-id="${escapeHtml(article.material_id)}" data-article-id="${escapeHtml(article.id)}">Aplicar à peça</button></div>
      </article>
    `).join("")}`;
  all(".article-apply", host).forEach((button) => button.addEventListener("click", () => beginApplicationFromMaterial(button.dataset.materialId, button.dataset.articleId)));
}

async function openMaterialDetail(materialId) {
  const dialog = $("#materialDetailDialog");
  const content = $("#materialDetailContent");
  content.innerHTML = `<div class="materials-loading">Carregando detalhes…</div>`;
  dialog.showModal();
  try {
    const material = await fetchJson(`/catalog/${encodeURIComponent(materialId)}`);
    content.innerHTML = `
      <div class="material-detail-head"><p class="eyebrow">MATERIAL CANÔNICO · ${escapeHtml((material.vertical_labels || []).join(" · "))}</p><h2>${escapeHtml(material.canonical_name_pt)}</h2><p>${escapeHtml(material.technical_name)}</p><div class="material-mini-badges">${materialBadges(material)}</div></div>
      <div class="material-detail-grid">
        <section><span>Família</span><strong>${escapeHtml(material.family_name_pt)}</strong></section>
        <section><span>Origem</span><strong>${escapeHtml(material.origin_label)}</strong></section>
        <section><span>Estrutura</span><strong>${escapeHtml(material.structure)}</strong></section>
        <section><span>Última revisão</span><strong>${escapeHtml(material.last_reviewed_at || "Não informada")}</strong></section>
      </div>
      <div class="material-detail-section"><h3>Visão técnica</h3><p>${escapeHtml(material.description_pt)}</p><div class="limit-note"><b>Limite</b><p>${escapeHtml(material.limitations_pt)}</p></div></div>
      <div class="material-detail-section"><h3>Sinônimos</h3><div class="material-mini-badges">${(material.aliases || []).map((item) => `<span>${escapeHtml(item)}</span>`).join("") || "<span>Nenhum</span>"}</div></div>
      <div class="material-detail-section"><h3>Certificações relacionadas</h3><div class="material-mini-badges">${(material.certifications || []).map((item) => `<span>${escapeHtml(item)}</span>`).join("") || "<span>Nenhuma vinculada</span>"}</div></div>
      <div class="material-detail-section"><h3>Claims e requisitos</h3>${(material.claims || []).length ? material.claims.map((claim) => `<article class="claim-requirement"><div><strong>${escapeHtml(claim.label)}</strong><span>${escapeHtml(claimStatusLabels[claim.status] || claim.status)}</span></div><p>${escapeHtml(claim.requirement)}</p></article>`).join("") : "<p>Nenhum claim associado ao material canônico.</p>"}</div>
      <div class="material-detail-section"><h3>Artigos comerciais</h3>${(material.commercial_articles || []).length ? material.commercial_articles.map((article) => `<article class="detail-article"><div><strong>${escapeHtml(article.commercial_name)}</strong><small>${escapeHtml(article.commercial_code)} · ${escapeHtml(article.supplier_name)}</small></div><span>${escapeHtml(compositionText(article))}</span><button class="link detail-article-apply" data-material-id="${escapeHtml(material.id)}" data-article-id="${escapeHtml(article.id)}">Aplicar</button></article>`).join("") : "<p>Nenhum artigo comercial associado.</p>"}</div>
    `;
    all(".detail-article-apply", content).forEach((button) => button.addEventListener("click", () => {
      dialog.close();
      beginApplicationFromMaterial(button.dataset.materialId, button.dataset.articleId);
    }));
  } catch (error) {
    content.innerHTML = `<div class="materials-empty"><strong>Falha ao abrir material</strong><p>${escapeHtml(error.message)}</p></div>`;
  }
}

async function refreshProducts() {
  const seeded = await fetch("/api/v1/dashboard").then((response) => response.ok ? response.json() : null).catch(() => null);
  const local = readJson("phyllos-portfolio", []);
  const products = [
    ...((seeded?.products || []).map((item) => ({ key: item.externalCode, name: item.name, code: item.externalCode, source: "demo" }))),
    ...(local.map((item) => ({ key: item.code || item.id, name: item.name, code: item.code || item.id, source: "portfolio", category: item.category }))),
  ];
  state.products = products.filter((item, index) => products.findIndex((candidate) => candidate.key === item.key) === index);
  if (!state.selectedProductKey && state.products.length) state.selectedProductKey = state.products[0].key;
  renderProductOptions();
}

function renderProductOptions() {
  const select = $("#materialsProductSelect");
  if (!select) return;
  select.innerHTML = state.products.length
    ? state.products.map((product) => `<option value="${escapeHtml(product.key)}" ${product.key === state.selectedProductKey ? "selected" : ""}>${escapeHtml(product.name)} · ${escapeHtml(product.code)}</option>`).join("")
    : `<option value="">Cadastre uma peça primeiro</option>`;
  const savedVertical = state.productVerticals[state.selectedProductKey];
  state.selectedVertical = savedVertical || inferProductVertical(state.products.find((item) => item.key === state.selectedProductKey));
  $("#materialsProductVertical").value = state.selectedVertical;
}

function inferProductVertical(product) {
  const text = `${product?.name || ""} ${product?.category || ""}`.toLowerCase();
  return /(sapato|tênis|tenis|sandália|sandalia|bota|calçado|calcado)/.test(text) ? "footwear" : "apparel";
}

async function refreshComponents() {
  try {
    const result = await fetchJson(`/component-types?vertical=${encodeURIComponent(state.selectedVertical)}`);
    state.components = result.items || [];
  } catch {
    state.components = [];
  }
  renderPieceConfiguration();
}

function selectedProduct() {
  return state.products.find((item) => item.key === state.selectedProductKey) || null;
}

function productApplications() {
  return state.applications.filter((item) => item.productKey === state.selectedProductKey && item.vertical === state.selectedVertical && item.status !== "archived");
}

function applicationFor(componentCode) {
  return productApplications().find((item) => item.componentCode === componentCode);
}

function applicationAlerts(application, component) {
  const alerts = [];
  if (!application && component.required) alerts.push("Componente obrigatório sem material");
  if (application && !application.articleId) alerts.push("Artigo comercial não selecionado");
  if (application && !application.batchReference) alerts.push("Lote não informado");
  if (application && !application.evidenceReference) alerts.push("Evidência não vinculada");
  if (application?.confidence === "conflicting") alerts.push("Informação conflitante");
  return alerts;
}

function configurationCompleteness() {
  const required = state.components.filter((item) => item.required);
  const configured = required.filter((item) => Boolean(applicationFor(item.code)));
  return required.length ? Math.round((configured.length / required.length) * 100) : 0;
}

function renderPieceConfiguration() {
  const product = selectedProduct();
  const host = $("#pieceComponents");
  const summary = $("#pieceMaterialSummary");
  if (!host || !summary) return;
  if (!product) {
    summary.innerHTML = "";
    host.innerHTML = `<div class="materials-empty"><strong>Nenhuma peça disponível</strong><p>Cadastre uma peça no portfólio para configurar seus materiais.</p></div>`;
    return;
  }
  const applications = productApplications();
  const requiredMissing = state.components.filter((component) => component.required && !applicationFor(component.code)).length;
  const evidenceMissing = applications.filter((item) => !item.evidenceReference).length;
  summary.innerHTML = `
    <div><span>Peça</span><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.code)} · ${escapeHtml(verticalLabels[state.selectedVertical])}</small></div>
    <div><span>Completude obrigatória</span><strong>${configurationCompleteness()}%</strong><div class="bar"><i style="width:${configurationCompleteness()}%"></i></div></div>
    <div><span>Pendências</span><strong>${requiredMissing + evidenceMissing}</strong><small>${requiredMissing} componente(s) · ${evidenceMissing} evidência(s)</small></div>
  `;
  host.innerHTML = state.components.map((component) => {
    const application = applicationFor(component.code);
    const alerts = applicationAlerts(application, component);
    return `
      <article class="component-card ${application ? "configured" : ""}">
        <div class="component-card-head"><div><span>${component.required ? "OBRIGATÓRIO" : "OPCIONAL"}</span><h4>${escapeHtml(component.name_pt)}</h4></div>${application ? `<span class="evidence-state ${escapeHtml(application.confidence)}">${escapeHtml(confidenceLabels[application.confidence] || application.confidence)}</span>` : ""}</div>
        ${application ? `
          <div class="component-material"><strong>${escapeHtml(application.articleName || application.materialName)}</strong><small>${escapeHtml(application.materialName)}${application.supplierName ? ` · ${escapeHtml(application.supplierName)}` : ""}</small><p>${escapeHtml(application.composition || "Composição não informada")}</p></div>
          <div class="component-meta"><span>Lote: <b>${escapeHtml(application.batchReference || "pendente")}</b></span><span>Quantidade: <b>${escapeHtml(application.quantity || "—")} ${escapeHtml(application.quantityUnit || "")}</b></span><span>Evidência: <b>${escapeHtml(application.evidenceReference || "pendente")}</b></span></div>
        ` : `<p class="component-empty">Nenhum material aplicado a este componente.</p>`}
        ${alerts.length ? `<div class="component-alerts">${alerts.map((alert) => `<span>! ${escapeHtml(alert)}</span>`).join("")}</div>` : ""}
        <div class="component-actions">${application ? `<button class="link edit-component-material" data-component="${escapeHtml(component.code)}">Editar</button><button class="link archive-component-material" data-component="${escapeHtml(component.code)}">Arquivar</button>` : `<button class="primary add-component-material" data-component="${escapeHtml(component.code)}">+ Adicionar material</button>`}</div>
      </article>
    `;
  }).join("");
  all(".add-component-material, .edit-component-material", host).forEach((button) => button.addEventListener("click", () => openPicker(button.dataset.component)));
  all(".archive-component-material", host).forEach((button) => button.addEventListener("click", () => archiveApplication(button.dataset.component)));
  renderMetrics();
}

function archiveApplication(componentCode) {
  const application = applicationFor(componentCode);
  if (!application) return;
  application.status = "archived";
  application.updatedAt = new Date().toISOString();
  writeJson(STORAGE_KEY, state.applications);
  renderPieceConfiguration();
  renderApplicationsList();
  toast("Aplicação arquivada; histórico preservado");
}

async function openPicker(componentCode) {
  const product = selectedProduct();
  if (!product) {
    toast("Selecione uma peça antes de aplicar o material");
    return;
  }
  state.picker = { componentCode, materialId: null, articleId: null };
  const component = state.components.find((item) => item.code === componentCode);
  $("#pickerTitle").textContent = component ? component.name_pt : "Selecionar material";
  $("#pickerContext").textContent = `${product.name} · ${product.code} · ${verticalLabels[state.selectedVertical]}`;
  $("#pickerSearch").value = "";
  $("#materialApplicationForm").classList.add("hidden");
  $("#pickerResults").classList.remove("hidden");
  await renderPickerResults();
  $("#materialPickerDialog").showModal();
}

async function renderPickerResults() {
  const host = $("#pickerResults");
  host.innerHTML = `<div class="materials-loading">Buscando materiais compatíveis…</div>`;
  try {
    const term = $("#pickerSearch")?.value.trim() || "";
    const [materialsPayload, articlesPayload] = await Promise.all([
      fetchJson(`/catalog?${queryString({ query: term, vertical: state.selectedVertical, limit: 80 })}`),
      fetchJson(`/commercial-articles?${queryString({ query: term, vertical: state.selectedVertical })}`),
    ]);
    const materials = materialsPayload.items || [];
    const articles = articlesPayload.items || [];
    if (!materials.length) {
      host.innerHTML = `<div class="materials-empty"><strong>Nenhum material compatível</strong><p>Tente outro termo.</p></div>`;
      return;
    }
    host.innerHTML = materials.map((material) => {
      const materialArticles = articles.filter((article) => article.material_id === material.id);
      return `
        <article class="picker-material-card">
          <div class="picker-material-head"><div><strong>${escapeHtml(material.canonical_name_pt)}</strong><small>${escapeHtml(material.family_name_pt)} · ${escapeHtml(material.structure)}</small></div><button type="button" class="link picker-select-generic" data-material-id="${escapeHtml(material.id)}">Aplicar sem artigo</button></div>
          ${materialArticles.length ? `<div class="picker-article-list">${materialArticles.map((article) => `<button type="button" class="picker-article" data-material-id="${escapeHtml(material.id)}" data-article-id="${escapeHtml(article.id)}"><span><strong>${escapeHtml(article.commercial_name)}</strong><small>${escapeHtml(article.commercial_code)} · ${escapeHtml(article.supplier_name)}</small></span><span>${escapeHtml(compositionText(article))}</span><i>Selecionar →</i></button>`).join("")}</div>` : `<p class="picker-no-article">Sem artigo comercial cadastrado.</p>`}
        </article>
      `;
    }).join("");
    all(".picker-select-generic", host).forEach((button) => button.addEventListener("click", () => choosePickerSelection(button.dataset.materialId, null, materials, articles)));
    all(".picker-article", host).forEach((button) => button.addEventListener("click", () => choosePickerSelection(button.dataset.materialId, button.dataset.articleId, materials, articles)));
  } catch (error) {
    host.innerHTML = `<div class="materials-empty"><strong>Falha na busca</strong><p>${escapeHtml(error.message)}</p></div>`;
  }
}

function choosePickerSelection(materialId, articleId, materials, articles) {
  state.picker.materialId = materialId;
  state.picker.articleId = articleId;
  const material = materials.find((item) => item.id === materialId);
  const article = articles.find((item) => item.id === articleId);
  $("#pickerResults").classList.add("hidden");
  const form = $("#materialApplicationForm");
  form.classList.remove("hidden");
  form.reset();
  const existing = applicationFor(state.picker.componentCode);
  if (existing) {
    for (const [name, value] of Object.entries(existing)) {
      const field = form.elements.namedItem(name);
      if (field) field.value = value ?? "";
    }
  }
  $("#selectedMaterialSnapshot").innerHTML = `
    <span>MATERIAL SELECIONADO</span>
    <strong>${escapeHtml(article?.commercial_name || material?.canonical_name_pt || "Material")}</strong>
    <small>${escapeHtml(article ? `${material?.canonical_name_pt} · ${article.supplier_name}` : `${material?.family_name_pt} · sem artigo comercial`)}</small>
    <p>${escapeHtml(article ? compositionText(article) : material?.technical_name || "")}</p>
    <div class="material-mini-badges">${materialBadges(material || {})}</div>
  `;
  form.dataset.materialSnapshot = JSON.stringify({ material, article });
}

function saveApplication(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  const snapshot = JSON.parse(form.dataset.materialSnapshot || "{}");
  const product = selectedProduct();
  const component = state.components.find((item) => item.code === state.picker.componentCode);
  if (!product || !component || !snapshot.material) return;
  const record = {
    id: applicationFor(component.code)?.id || `application-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    productKey: product.key,
    productName: product.name,
    productCode: product.code,
    vertical: state.selectedVertical,
    componentCode: component.code,
    componentName: component.name_pt,
    materialId: snapshot.material.id,
    materialName: snapshot.material.canonical_name_pt,
    materialSnapshot: snapshot.material,
    articleId: snapshot.article?.id || null,
    articleName: snapshot.article?.commercial_name || null,
    articleCode: snapshot.article?.commercial_code || null,
    supplierName: snapshot.article?.supplier_name || null,
    composition: snapshot.article ? compositionText(snapshot.article) : null,
    articleSnapshot: snapshot.article || null,
    batchReference: data.batchReference?.trim() || "",
    quantity: data.quantity || "",
    quantityUnit: data.quantityUnit || "",
    confidence: data.confidence || "unknown",
    evidenceReference: data.evidenceReference?.trim() || "",
    notes: data.notes?.trim() || "",
    status: "active",
    updatedAt: new Date().toISOString(),
  };
  const index = state.applications.findIndex((item) => item.id === record.id);
  if (index >= 0) state.applications[index] = record;
  else state.applications.push(record);
  writeJson(STORAGE_KEY, state.applications);
  $("#materialPickerDialog").close();
  switchTab("applications");
  renderPieceConfiguration();
  renderApplicationsList();
  toast("Material aplicado à peça com snapshot preservado");
}

function renderApplicationsList() {
  if (state.tab !== "applications") return;
  renderPieceConfiguration();
}

function renderMetrics() {
  const host = $("#materialsMetrics");
  if (!host) return;
  const activeApplications = state.applications.filter((item) => item.status !== "archived");
  const documented = activeApplications.filter((item) => ["documented", "laboratory_tested", "reviewed", "validated"].includes(item.confidence)).length;
  host.innerHTML = [
    ["Materiais canônicos", state.status?.canonical_materials ?? state.materials.length],
    ["Artigos comerciais", state.status?.commercial_articles ?? state.articles.length],
    ["Aplicações ativas", activeApplications.length],
    ["Aplicações documentadas", documented],
  ].map(([label, value]) => `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
}

function renderCurrentTab() {
  if (state.tab === "catalog") refreshCatalog();
  if (state.tab === "articles") refreshArticles();
  if (state.tab === "applications") refreshComponents();
  renderMetrics();
}

function beginApplicationFromMaterial(materialId, articleId = null) {
  switchTab("applications");
  if (!state.products.length) {
    toast("Cadastre uma peça antes de aplicar materiais");
    return;
  }
  const firstComponent = state.components.find((item) => item.required) || state.components[0];
  if (!firstComponent) {
    refreshComponents().then(() => {
      const component = state.components.find((item) => item.required) || state.components[0];
      if (component) openPicker(component.code).then(() => preselectPicker(materialId, articleId));
    });
    return;
  }
  openPicker(firstComponent.code).then(() => preselectPicker(materialId, articleId));
}

async function preselectPicker(materialId, articleId) {
  const materialsPayload = await fetchJson(`/catalog?${queryString({ vertical: state.selectedVertical, limit: 120 })}`);
  const articlesPayload = await fetchJson(`/commercial-articles?${queryString({ vertical: state.selectedVertical })}`);
  const material = (materialsPayload.items || []).find((item) => item.id === materialId);
  const article = (articlesPayload.items || []).find((item) => item.id === articleId);
  if (material) choosePickerSelection(materialId, article?.id || null, materialsPayload.items || [], articlesPayload.items || []);
}

function enhanceProductRows() {
  const table = $("#productTable");
  if (!table) return;
  all(".product-line", table).forEach((row) => {
    if ($(".configure-piece-materials", row)) return;
    const codeText = $("small", row)?.textContent || "";
    const code = codeText.split("·")[0].trim();
    const name = $("strong", row)?.textContent?.trim() || code;
    const actions = $(".row-actions", row) || row.lastElementChild;
    if (!actions) return;
    const button = document.createElement("button");
    button.className = "link configure-piece-materials";
    button.type = "button";
    button.textContent = "Materiais →";
    button.addEventListener("click", async () => {
      await refreshProducts();
      const match = state.products.find((item) => item.code === code || item.name === name);
      if (match) state.selectedProductKey = match.key;
      renderProductOptions();
      showMaterials();
      switchTab("applications");
      await refreshComponents();
    });
    actions.prepend(button);
  });
}

function bindEvents() {
  all("[data-materials-tab]").forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.materialsTab)));
  $("#openPieceMaterials").addEventListener("click", () => switchTab("applications"));
  $("#materialsProductSelect").addEventListener("change", async (event) => {
    state.selectedProductKey = event.target.value;
    renderProductOptions();
    await refreshComponents();
  });
  $("#materialsProductVertical").addEventListener("change", async (event) => {
    state.selectedVertical = event.target.value;
    state.productVerticals[state.selectedProductKey] = state.selectedVertical;
    writeJson(PRODUCT_VERTICAL_KEY, state.productVerticals);
    await refreshComponents();
  });

  let searchTimer;
  const scheduleRefresh = () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (state.tab === "catalog") refreshCatalog();
      if (state.tab === "articles") refreshArticles();
    }, 300);
  };
  $("#materialsSearch").addEventListener("input", scheduleRefresh);
  all("#materialsVertical, #materialsFamily, #materialsOrigin, #materialsStructure, #materialsCertification, #materialsEvidence").forEach((field) => field.addEventListener("change", scheduleRefresh));
  $("#clearMaterialsFilters").addEventListener("click", () => {
    $("#materialsSearch").value = "";
    all("#materialsVertical, #materialsFamily, #materialsOrigin, #materialsStructure, #materialsCertification, #materialsEvidence").forEach((field) => { field.value = ""; });
    renderCurrentTab();
  });

  let pickerTimer;
  $("#pickerSearch").addEventListener("input", () => {
    clearTimeout(pickerTimer);
    pickerTimer = setTimeout(renderPickerResults, 300);
  });
  $("#materialApplicationForm").addEventListener("submit", saveApplication);
  $("#cancelApplicationSelection").addEventListener("click", () => {
    $("#materialApplicationForm").classList.add("hidden");
    $("#pickerResults").classList.remove("hidden");
  });
  $("[data-close-material-dialog]").addEventListener("click", () => $("#materialDetailDialog").close());
  $("[data-close-picker]").addEventListener("click", () => $("#materialPickerDialog").close());
}

async function init() {
  installNavigation();
  installView();
  bindEvents();
  try {
    [state.status, state.filters] = await Promise.all([fetchJson("/status"), fetchJson("/filters")]);
    $("#materialsModeBadge").textContent = `Catálogo piloto v${state.status.version} · ${state.status.canonical_materials} materiais`;
    populateFilters();
  } catch (error) {
    $("#materialsModeBadge").textContent = "Base indisponível";
    $("#materialsModeBadge").classList.add("error");
    console.error("Materials Knowledge Base", error);
  }
  await refreshProducts();
  await refreshComponents();
  await refreshCatalog();
  await refreshArticles();
  renderMetrics();
  enhanceProductRows();
  const observer = new MutationObserver(enhanceProductRows);
  const productTable = $("#productTable");
  if (productTable) observer.observe(productTable, { childList: true, subtree: true });
}

init();
