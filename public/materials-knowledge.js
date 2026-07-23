const API_BASE = "/api/v1/materials";
const $ = (selector, root = document) => root.querySelector(selector);
const all = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const verticalLabels = { apparel: "Confecção", footwear: "Calçados", accessory: "Acessórios", packaging: "Embalagem" };
const originLabels = {
  plant: "Vegetal", animal: "Animal", regenerated_cellulosic: "Celulósica regenerada",
  fossil_synthetic: "Sintética fóssil", mineral: "Mineral", mixed: "Mista", other: "Outra",
};
const confidenceLabels = {
  unknown: "Desconhecido", declared_by_brand: "Declarado pela marca",
  declared_by_supplier: "Declarado pelo fornecedor", documented: "Documentado",
  laboratory_tested: "Testado em laboratório", reviewed: "Revisado", validated: "Validado",
  conflicting: "Conflitante", expired: "Vencido", superseded: "Substituído",
};

const state = {
  status: null,
  filters: null,
  tab: "catalog",
  materials: [],
  articles: [],
  products: [],
  suppliers: [],
  components: [],
  applications: [],
  selectedSkuId: null,
  selectedVertical: "apparel",
  picker: { componentId: null, materialId: null, articleId: null },
  articleDialogContext: null,
};

function toast(message) {
  const host = $("#toast");
  if (!host) return;
  host.textContent = message;
  host.classList.add("show");
  setTimeout(() => host.classList.remove("show"), 2800);
}

function idempotencyKey() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function api(path, { method = "GET", body, headers = {} } = {}) {
  const options = {
    method,
    headers: { accept: "application/json", ...headers },
  };
  if (body !== undefined) {
    options.headers["content-type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  const response = await fetch(`${API_BASE}${path}`, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || payload.error || `Falha HTTP ${response.status}`);
    error.code = payload.error;
    error.status = response.status;
    error.details = payload;
    throw error;
  }
  return payload;
}

function params(values) {
  const search = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) search.set(key, value);
  });
  return search.toString();
}

function installNavigation() {
  if ($('[data-view="materials"]')) return;
  const nav = $(".sidebar nav");
  if (!nav) return;
  const button = document.createElement("button");
  button.className = "nav";
  button.dataset.view = "materials";
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
        <p class="eyebrow">MATERIALS KNOWLEDGE BASE · API PERSISTENTE</p>
        <h2>Do catálogo técnico à configuração verificável da peça.</h2>
        <p>Consulte o catálogo PostgreSQL, cadastre artigos comerciais e aplique-os aos componentes dos SKUs persistentes.</p>
      </div>
      <div class="materials-hero-actions">
        <span id="materialsModeBadge" class="materials-mode">Verificando API…</span>
        <button class="primary" id="openPieceMaterials">Configurar peça →</button>
      </div>
    </div>

    <div id="materialsApiNotice"></div>
    <div id="materialsMetrics" class="metrics materials-metrics"></div>

    <div class="materials-tabs" role="tablist" aria-label="Base de materiais">
      <button class="active" data-materials-tab="catalog" role="tab">Materiais canônicos</button>
      <button data-materials-tab="articles" role="tab">Artigos comerciais</button>
      <button data-materials-tab="applications" role="tab">Materiais da peça</button>
    </div>

    <div class="materials-search-panel">
      <div class="materials-toolbar-actions">
        <label class="materials-search-field">
          <span>Pesquisar</span>
          <input id="materialsSearch" type="search" placeholder="Material, sinônimo, código ou fornecedor" autocomplete="off">
        </label>
        <button class="primary hidden" id="newCommercialArticle">+ Cadastrar artigo</button>
      </div>
      <div class="materials-filter-grid">
        <label>Vertical<select id="materialsVertical"><option value="">Todas</option></select></label>
        <label>Família<select id="materialsFamily"><option value="">Todas</option></select></label>
        <label>Origem<select id="materialsOrigin"><option value="">Todas</option></select></label>
        <label>Estrutura<select id="materialsStructure"><option value="">Todas</option></select></label>
        <label id="materialsCertificationField">Certificação<select id="materialsCertification" disabled><option value="">Indisponível nesta versão</option></select></label>
        <label>Evidência<select id="materialsEvidence"><option value="">Todas</option></select></label>
      </div>
      <p id="materialsCapabilityNote" class="materials-capability-note"></p>
      <div class="materials-search-meta"><span id="materialsResultCount">—</span><button class="link" id="clearMaterialsFilters">Limpar filtros</button></div>
    </div>

    <div id="materialsCatalogPanel" class="materials-panel"><div id="materialsCatalog" class="materials-table-card"></div></div>
    <div id="materialsArticlesPanel" class="materials-panel hidden"><div id="materialsArticles" class="materials-table-card"></div></div>

    <div id="materialsApplicationsPanel" class="materials-panel hidden">
      <div class="piece-config-shell">
        <div class="piece-config-head">
          <div><p class="eyebrow">CONFIGURAÇÃO PERSISTENTE</p><h3>Materiais e componentes do SKU</h3><p>Somente SKUs persistidos no Buyer Readiness podem receber aplicações na Materials API.</p></div>
          <div class="piece-selector-grid">
            <label>SKU<select id="materialsProductSelect"></select></label>
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
      <div class="picker-head"><p class="eyebrow">APLICAR AO SKU</p><h3 id="pickerTitle">Selecionar artigo comercial</h3><p id="pickerContext"></p></div>
      <label class="materials-search-field picker-search"><span>Buscar na base</span><input id="pickerSearch" type="search" placeholder="Material, artigo, código ou fornecedor"></label>
      <div id="pickerResults" class="picker-results"></div>
      <form id="materialApplicationForm" class="application-form hidden">
        <div id="selectedMaterialSnapshot" class="selected-material-snapshot"></div>
        <div class="field-grid">
          <label>Lote<input name="batchReference" placeholder="Ex.: LT-2026-004"></label>
          <label>Quantidade<input name="quantity" type="number" min="0" step="0.01" placeholder="Ex.: 1,85"></label>
          <label>Unidade<select name="quantityUnit"><option value="m">metro</option><option value="m2">metro quadrado</option><option value="kg">quilograma</option><option value="g">grama</option><option value="unit">unidade</option><option value="pair">par</option></select></label>
          <label>Confiança<select name="confidence"><option value="unknown">Desconhecido</option><option value="declared_by_brand">Declarado pela marca</option><option value="declared_by_supplier">Declarado pelo fornecedor</option><option value="documented">Documentado</option><option value="laboratory_tested">Testado em laboratório</option><option value="reviewed">Revisado</option><option value="validated">Validado</option><option value="conflicting">Conflitante</option></select></label>
          <label class="application-wide">Referência da evidência<input name="evidenceReference" placeholder="Ficha técnica, certificado, laudo ou declaração"></label>
          <label class="application-wide">Observações<textarea name="notesPt" placeholder="Limitações, divergências ou decisões"></textarea></label>
        </div>
        <div class="application-actions"><button type="button" class="link" id="cancelApplicationSelection">Trocar artigo</button><button type="submit" class="primary">Salvar na Materials API</button></div>
      </form>
    </dialog>

    <dialog id="commercialArticleDialog" class="materials-dialog">
      <button class="dialog-close" data-close-article-dialog aria-label="Fechar">×</button>
      <div class="picker-head"><p class="eyebrow">ARTIGO COMERCIAL</p><h3>Cadastrar material fornecido</h3><p>O artigo representa o item efetivamente comprado; não altera o material canônico.</p></div>
      <form id="commercialArticleForm" class="application-form">
        <div class="article-form-grid">
          <label>Fornecedor<select name="supplierOrganizationId" required></select></label>
          <label>Material canônico<select name="primaryMaterialId" required></select></label>
          <label>Código comercial<input name="commercialCode" required placeholder="Ex.: LIN-240"></label>
          <label>Nome comercial<input name="commercialName" placeholder="Ex.: Linho Natural 240"></label>
          <label>Gramatura (g/m²)<input name="weightGsm" type="number" min="0" step="0.01"></label>
          <label>Largura (cm)<input name="widthCm" type="number" min="0" step="0.01"></label>
          <label>Cor<input name="color"></label>
          <label>Acabamento<input name="finish"></label>
          <label>Composição inicial (%)<input name="primaryPercentage" type="number" min="0.01" max="100" step="0.01" value="100"></label>
          <label>Origem do feedstock<select name="feedstockType"><option value="unknown">Não informada</option><option value="virgin">Virgem</option><option value="recycled_pre_consumer">Reciclado pré-consumo</option><option value="recycled_post_consumer">Reciclado pós-consumo</option><option value="reused">Reutilizado</option><option value="mass_balance">Balanço de massa</option></select></label>
          <label>Confiança<select name="confidence"><option value="unknown">Desconhecida</option><option value="declared_by_supplier">Declarada pelo fornecedor</option><option value="documented">Documentada</option><option value="laboratory_tested">Testada em laboratório</option></select></label>
          <label>Status<select name="status"><option value="draft">Rascunho</option><option value="active">Ativo</option></select></label>
          <label class="article-form-wide">Base da declaração<textarea name="declarationBasis" placeholder="Documento, ficha, certificado ou informação recebida"></textarea></label>
        </div>
        <div class="article-dialog-actions"><button type="button" class="link" data-close-article-dialog>Cancelar</button><button type="submit" class="primary">Cadastrar artigo</button></div>
      </form>
    </dialog>
  `;
  $("main")?.append(section);
}

function showMaterials() {
  all(".view").forEach((view) => view.classList.toggle("hidden", view.id !== "materials"));
  all(".nav").forEach((button) => button.classList.toggle("active", button.dataset.view === "materials"));
  if ($("#pageTitle")) $("#pageTitle").textContent = "Materiais";
  window.scrollTo({ top: 0, behavior: "smooth" });
  renderCurrentTab();
}

function switchTab(tab) {
  state.tab = tab;
  all("[data-materials-tab]").forEach((button) => button.classList.toggle("active", button.dataset.materialsTab === tab));
  $("#materialsCatalogPanel").classList.toggle("hidden", tab !== "catalog");
  $("#materialsArticlesPanel").classList.toggle("hidden", tab !== "articles");
  $("#materialsApplicationsPanel").classList.toggle("hidden", tab !== "applications");
  $("#newCommercialArticle").classList.toggle("hidden", tab !== "articles");
  renderCurrentTab();
}

function optionMarkup(items = []) {
  return items.map((item) => `<option value="${esc(item.value)}">${esc(item.label)}</option>`).join("");
}

function populateFilters() {
  if (!state.filters) return;
  $("#materialsVertical").insertAdjacentHTML("beforeend", optionMarkup(state.filters.verticals));
  $("#materialsFamily").insertAdjacentHTML("beforeend", optionMarkup(state.filters.families));
  $("#materialsOrigin").insertAdjacentHTML("beforeend", optionMarkup(state.filters.origins));
  $("#materialsStructure").insertAdjacentHTML("beforeend", optionMarkup(state.filters.structures));
  $("#materialsEvidence").insertAdjacentHTML("beforeend", optionMarkup((state.filters.evidence || []).map((item) => ({ value: item.value, label: confidenceLabels[item.value] || item.label }))));
  const capabilities = state.filters.capabilities || {};
  if (!capabilities.certification_filter) {
    $("#materialsCertificationField").classList.add("hidden");
    $("#materialsCapabilityNote").textContent = capabilities.reason || "Filtros regulatórios dependem de vínculos ainda não modelados.";
  }
}

function selectedFilters() {
  return {
    query: $("#materialsSearch")?.value.trim() || "",
    vertical: $("#materialsVertical")?.value || "",
    family: $("#materialsFamily")?.value || "",
    origin: $("#materialsOrigin")?.value || "",
    structure: $("#materialsStructure")?.value || "",
    evidence: $("#materialsEvidence")?.value || "",
  };
}

function renderStatus() {
  const badge = $("#materialsModeBadge");
  const notice = $("#materialsApiNotice");
  if (!state.status) return;
  badge.classList.remove("ready", "warning", "error");
  if (state.status.runtime_ready) {
    badge.textContent = `PostgreSQL · API v${state.status.version}`;
    badge.classList.add("ready");
    notice.innerHTML = "";
  } else if (state.status.schema_ready) {
    badge.textContent = "Catálogo ativo · tenant pendente";
    badge.classList.add("warning");
    notice.innerHTML = `<div class="materials-api-notice"><strong>Catálogo disponível; operações do tenant bloqueadas.</strong>Configure MATERIALS_TENANT_ID, MATERIALS_USER_ID e MATERIALS_ROLE no Render para acessar artigos, SKUs e aplicações.</div>`;
  } else {
    badge.textContent = "Materials API indisponível";
    badge.classList.add("error");
    notice.innerHTML = `<div class="materials-api-notice"><strong>Banco ou schema ainda não está pronto.</strong>${esc(state.status.reason || "Aplique as migrations 002 e 003 e confirme DATABASE_URL.")}</div>`;
  }
}

function renderMetrics() {
  const host = $("#materialsMetrics");
  if (!host) return;
  const documented = state.applications.filter((item) => ["documented", "laboratory_tested", "reviewed", "validated"].includes(item.confidence)).length;
  host.innerHTML = [
    ["Materiais canônicos", state.status?.canonical_materials ?? state.materials.length],
    ["Artigos do tenant", state.status?.commercial_articles ?? state.articles.length],
    ["Aplicações persistentes", state.status?.material_applications ?? state.applications.length],
    ["Aplicações documentadas", documented],
  ].map(([label, value]) => `<div class="metric"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("");
}

function materialBadges(material) {
  return [
    ...(material.verticals || []).map((value) => verticalLabels[value] || value),
    originLabels[material.base_origin] || material.base_origin,
    confidenceLabels[material.evidence_status] || material.evidence_status,
  ].filter(Boolean).map((value) => `<span>${esc(value)}</span>`).join("");
}

async function refreshCatalog() {
  const host = $("#materialsCatalog");
  host.innerHTML = `<div class="materials-loading">Consultando o catálogo PostgreSQL…</div>`;
  try {
    const result = await api(`/catalog?${params({ ...selectedFilters(), limit: 120 })}`);
    state.materials = result.items || [];
    $("#materialsResultCount").textContent = `${result.total ?? state.materials.length} material(is)`;
    renderCatalog();
  } catch (error) {
    host.innerHTML = errorPanel("Não foi possível consultar o catálogo", error);
  }
}

function renderCatalog() {
  const host = $("#materialsCatalog");
  if (!state.materials.length) {
    host.innerHTML = `<div class="materials-empty"><strong>Nenhum material encontrado</strong><p>Altere a busca ou os filtros.</p></div>`;
    return;
  }
  host.innerHTML = `
    <div class="materials-table-head"><span>MATERIAL</span><span>CLASSIFICAÇÃO</span><span>EVIDÊNCIA</span><span>ARTIGOS</span><span>AÇÕES</span></div>
    ${state.materials.map((material) => `
      <article class="materials-row">
        <div><strong>${esc(material.canonical_name_pt)}</strong><small>${esc(material.technical_name || material.canonical_name_en || "")}</small><div class="material-mini-badges">${materialBadges(material)}</div></div>
        <div><strong>${esc(material.family_name_pt)}</strong><small>${esc(material.structure || "Estrutura não informada")}</small></div>
        <div><span class="evidence-state ${esc(material.evidence_status)}">${esc(confidenceLabels[material.evidence_status] || material.evidence_status)}</span><small>${esc(material.source_label || "Fonte não informada")}</small></div>
        <div><strong>${Number(material.article_count || 0)}</strong><small>artigo(s) do tenant</small></div>
        <div class="materials-row-actions"><button class="link material-detail" data-id="${esc(material.id)}">Consultar</button><button class="primary material-apply" data-id="${esc(material.id)}">Aplicar à peça</button></div>
      </article>
    `).join("")}`;
  all(".material-detail", host).forEach((button) => button.addEventListener("click", () => openMaterialDetail(button.dataset.id)));
  all(".material-apply", host).forEach((button) => button.addEventListener("click", () => beginApplicationFromMaterial(button.dataset.id)));
}

function compositionText(article) {
  const composition = article?.composition || [];
  return composition.length
    ? composition.map((item) => `${Number(item.percentage).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% ${item.material_name}`).join(" · ")
    : "Composição não informada";
}

async function refreshArticles() {
  const host = $("#materialsArticles");
  host.innerHTML = `<div class="materials-loading">Consultando artigos do tenant…</div>`;
  try {
    const filter = selectedFilters();
    const result = await api(`/commercial-articles?${params({ query: filter.query, vertical: filter.vertical, limit: 200 })}`);
    state.articles = result.items || [];
    $("#materialsResultCount").textContent = `${state.articles.length} artigo(s)`;
    renderArticles();
  } catch (error) {
    host.innerHTML = errorPanel("Não foi possível consultar os artigos", error);
  }
}

function renderArticles() {
  const host = $("#materialsArticles");
  if (!state.articles.length) {
    host.innerHTML = `<div class="materials-empty"><strong>Nenhum artigo comercial cadastrado</strong><p>Cadastre o item fornecido antes de aplicá-lo à peça.</p><button class="primary" id="emptyNewArticle">+ Cadastrar artigo</button></div>`;
    $("#emptyNewArticle")?.addEventListener("click", () => openArticleDialog());
    return;
  }
  host.innerHTML = `
    <div class="materials-table-head articles-head"><span>ARTIGO</span><span>FORNECEDOR</span><span>COMPOSIÇÃO</span><span>EVIDÊNCIA</span><span>AÇÃO</span></div>
    ${state.articles.map((article) => `
      <article class="materials-row articles-row">
        <div><strong>${esc(article.commercial_name || article.commercial_code)}</strong><small>${esc(article.commercial_code)}${article.weight_gsm ? ` · ${esc(article.weight_gsm)} g/m²` : ""}</small></div>
        <div><strong>${esc(article.supplier_name)}</strong><small>${(article.verticals || []).map((value) => verticalLabels[value] || value).join(" · ")}</small></div>
        <div><strong>${esc(compositionText(article))}</strong><small>${esc(article.finish || "Sem acabamento informado")}</small></div>
        <div><span class="evidence-state ${article.evidence_count ? "documented" : "unknown"}">${article.evidence_count ? `${article.evidence_count} vínculo(s)` : "Sem evidência"}</span><small class="status-${esc(article.status)}">${esc(article.status)}</small></div>
        <div><button class="primary article-apply" data-material="${esc(article.primary_material_id)}" data-article="${esc(article.id)}">Aplicar à peça</button></div>
      </article>
    `).join("")}`;
  all(".article-apply", host).forEach((button) => button.addEventListener("click", () => beginApplicationFromMaterial(button.dataset.material, button.dataset.article)));
}

async function openMaterialDetail(materialId) {
  const dialog = $("#materialDetailDialog");
  const content = $("#materialDetailContent");
  content.innerHTML = `<div class="materials-loading">Carregando detalhes…</div>`;
  dialog.showModal();
  try {
    const material = await api(`/catalog/${encodeURIComponent(materialId)}`);
    content.innerHTML = `
      <div class="material-detail-head"><p class="eyebrow">MATERIAL CANÔNICO · ${(material.verticals || []).map((value) => verticalLabels[value] || value).join(" · ")}</p><h2>${esc(material.canonical_name_pt)}</h2><p>${esc(material.technical_name || "")}</p><div class="material-mini-badges">${materialBadges(material)}</div></div>
      <div class="material-detail-grid"><section><span>Família</span><strong>${esc(material.family_name_pt)}</strong></section><section><span>Origem</span><strong>${esc(originLabels[material.base_origin] || material.base_origin)}</strong></section><section><span>Estrutura</span><strong>${esc(material.structure || "Não informada")}</strong></section><section><span>Fonte</span><strong>${esc(material.source_label || "Não informada")}</strong></section></div>
      <div class="material-detail-section"><h3>Sinônimos</h3><div class="material-mini-badges">${(material.aliases || []).map((item) => `<span>${esc(item)}</span>`).join("") || "<span>Nenhum</span>"}</div></div>
      <div class="material-detail-section"><h3>Processos relacionados</h3><div class="material-mini-badges">${(material.processes || []).map((item) => `<span>${esc(item.name_pt)}</span>`).join("") || "<span>Nenhum vínculo registrado</span>"}</div></div>
      <div class="material-detail-section"><h3>Limite de interpretação</h3><div class="limit-note"><p>${esc(material.limitations_pt)}</p></div></div>
      <div class="material-detail-section"><h3>Artigos comerciais do tenant</h3>${(material.commercial_articles || []).length ? material.commercial_articles.map((article) => `<article class="detail-article"><div><strong>${esc(article.commercial_name || article.commercial_code)}</strong><small>${esc(article.commercial_code)} · ${esc(article.supplier_name)}</small></div><span>${esc(compositionText(article))}</span><button class="link detail-article-apply" data-material="${esc(material.id)}" data-article="${esc(article.id)}">Aplicar</button></article>`).join("") : `<p>Nenhum artigo comercial associado.</p><button class="primary detail-new-article" data-material="${esc(material.id)}">Cadastrar artigo deste material</button>`}</div>
    `;
    all(".detail-article-apply", content).forEach((button) => button.addEventListener("click", () => { dialog.close(); beginApplicationFromMaterial(button.dataset.material, button.dataset.article); }));
    $(".detail-new-article", content)?.addEventListener("click", () => { dialog.close(); openArticleDialog(material.id); });
  } catch (error) {
    content.innerHTML = errorPanel("Falha ao abrir o material", error);
  }
}

async function refreshProducts() {
  try {
    const result = await api("/skus");
    state.products = result.items || [];
    if (!state.selectedSkuId || !state.products.some((item) => item.id === state.selectedSkuId)) state.selectedSkuId = state.products[0]?.id || null;
    const selected = selectedProduct();
    state.selectedVertical = selected?.vertical || "apparel";
    renderProductOptions();
  } catch (error) {
    state.products = [];
    state.selectedSkuId = null;
    renderProductOptions(error);
  }
}

function renderProductOptions(error = null) {
  const select = $("#materialsProductSelect");
  if (!select) return;
  if (error) select.innerHTML = `<option value="">Materials API sem contexto do tenant</option>`;
  else if (!state.products.length) select.innerHTML = `<option value="">Nenhum SKU persistente</option>`;
  else select.innerHTML = state.products.map((product) => `<option value="${esc(product.id)}" ${product.id === state.selectedSkuId ? "selected" : ""}>${esc(product.name)} · ${esc(product.code)}</option>`).join("");
  $("#materialsProductVertical").value = state.selectedVertical;
}

function selectedProduct() {
  return state.products.find((item) => item.id === state.selectedSkuId) || null;
}

async function refreshComponents() {
  try {
    const result = await api(`/component-types?vertical=${encodeURIComponent(state.selectedVertical)}`);
    state.components = result.items || [];
  } catch {
    state.components = [];
  }
}

async function refreshApplications() {
  if (!state.selectedSkuId) {
    state.applications = [];
    renderPieceConfiguration();
    return;
  }
  try {
    const result = await api(`/skus/${encodeURIComponent(state.selectedSkuId)}/applications`);
    state.applications = result.items || [];
  } catch (error) {
    state.applications = [];
    renderPieceConfiguration(error);
    return;
  }
  renderPieceConfiguration();
}

function applicationFor(component) {
  return state.applications.find((item) => item.component_type_id === component.id && item.status !== "archived") || null;
}

function evidenceReference(application) {
  return application?.evidence?.find((item) => item.scope?.reference)?.scope?.reference || "";
}

function applicationAlerts(application, component) {
  const alerts = [];
  if (!application && component.required) alerts.push("Componente obrigatório sem material");
  if (application && !application.batch_reference) alerts.push("Lote não informado");
  if (application && !application.evidence_count) alerts.push("Evidência não vinculada");
  if (application && Number(application.composition_total_pct) < 99.5) alerts.push(`Composição incompleta: ${Number(application.composition_total_pct).toLocaleString("pt-BR")}%`);
  if (application?.confidence === "conflicting") alerts.push("Informação conflitante");
  return alerts;
}

function configurationCompleteness() {
  const requiredComponents = state.components.filter((item) => item.required);
  if (!requiredComponents.length) return 0;
  return Math.round(requiredComponents.filter((item) => applicationFor(item)).length / requiredComponents.length * 100);
}

function renderPieceConfiguration(error = null) {
  const product = selectedProduct();
  const host = $("#pieceComponents");
  const summary = $("#pieceMaterialSummary");
  if (!host || !summary) return;
  if (error) {
    summary.innerHTML = "";
    host.innerHTML = errorPanel("Não foi possível consultar as aplicações", error);
    return;
  }
  if (!product) {
    summary.innerHTML = "";
    host.innerHTML = `<div class="materials-empty"><strong>Nenhum SKU persistente disponível</strong><p>O cadastro local do portfólio ainda não é um SKU do banco. Conecte a persistência de Product/SKU ou crie o SKU no Buyer Readiness antes de aplicar materiais.</p></div>`;
    return;
  }
  const requiredMissing = state.components.filter((component) => component.required && !applicationFor(component)).length;
  const evidenceMissing = state.applications.filter((item) => !item.evidence_count).length;
  summary.innerHTML = `
    <div><span>SKU persistente</span><strong>${esc(product.name)}</strong><small>${esc(product.code)} · ${esc(verticalLabels[state.selectedVertical])}</small></div>
    <div><span>Completude obrigatória</span><strong>${configurationCompleteness()}%</strong><div class="bar"><i style="width:${configurationCompleteness()}%"></i></div></div>
    <div><span>Pendências</span><strong>${requiredMissing + evidenceMissing}</strong><small>${requiredMissing} componente(s) · ${evidenceMissing} evidência(s)</small></div>
  `;
  host.innerHTML = state.components.map((component) => {
    const application = applicationFor(component);
    const alerts = applicationAlerts(application, component);
    return `
      <article class="component-card ${application ? "configured" : ""}" data-component-id="${esc(component.id)}">
        <div class="component-card-head"><div><span>${component.required ? "OBRIGATÓRIO" : "OPCIONAL"}</span><h4>${esc(component.name_pt)}</h4></div>${application ? `<span class="evidence-state ${esc(application.confidence)}">${esc(confidenceLabels[application.confidence] || application.confidence)}</span>` : ""}</div>
        ${application ? `<div class="component-material"><strong>${esc(application.commercial_name || application.commercial_code)}</strong><small>${esc(application.material_name_pt)} · ${esc(application.supplier_name)}</small><p>${esc(compositionText(application))}</p></div><div class="component-meta"><span>Lote: <b>${esc(application.batch_reference || "pendente")}</b></span><span>Quantidade: <b>${esc(application.quantity || "—")} ${esc(application.quantity_unit || "")}</b></span><span>Evidência: <b>${esc(evidenceReference(application) || "pendente")}</b></span></div>` : `<p class="component-empty">Nenhum artigo comercial aplicado.</p>`}
        ${alerts.length ? `<div class="component-alerts">${alerts.map((alert) => `<span>! ${esc(alert)}</span>`).join("")}</div>` : ""}
        <div class="component-actions">${application ? `<button class="link edit-component-material" data-component="${esc(component.id)}">Editar</button><button class="link archive-component-material" data-component="${esc(component.id)}">Arquivar</button>` : `<button class="primary add-component-material" data-component="${esc(component.id)}">+ Adicionar material</button>`}</div>
      </article>
    `;
  }).join("");
  all(".add-component-material, .edit-component-material", host).forEach((button) => button.addEventListener("click", () => openPicker(button.dataset.component)));
  all(".archive-component-material", host).forEach((button) => button.addEventListener("click", () => archiveApplication(button.dataset.component)));
  renderMetrics();
}

async function archiveApplication(componentId) {
  const component = state.components.find((item) => item.id === componentId);
  const application = component && applicationFor(component);
  if (!application) return;
  const card = $(`[data-component-id="${CSS.escape(componentId)}"]`);
  card?.classList.add("component-saving");
  try {
    await api(`/skus/${encodeURIComponent(state.selectedSkuId)}/applications/${encodeURIComponent(application.id)}`, {
      method: "DELETE",
      body: { version: Number(application.version) },
      headers: { "if-match": String(application.version) },
    });
    await Promise.all([refreshApplications(), refreshStatus()]);
    toast("Aplicação arquivada; histórico preservado no PostgreSQL");
  } catch (error) {
    toast(error.message);
    card?.classList.remove("component-saving");
  }
}

async function openPicker(componentId) {
  const product = selectedProduct();
  const component = state.components.find((item) => item.id === componentId);
  if (!product || !component) return;
  state.picker = { componentId, materialId: null, articleId: null };
  $("#pickerTitle").textContent = component.name_pt;
  $("#pickerContext").textContent = `${product.name} · ${product.code} · ${verticalLabels[state.selectedVertical]}`;
  $("#pickerSearch").value = "";
  $("#materialApplicationForm").classList.add("hidden");
  $("#pickerResults").classList.remove("hidden");
  $("#materialPickerDialog").showModal();
  await renderPickerResults();
  const existing = applicationFor(component);
  if (existing) selectPickerArticle(existing.primary_material_id, existing.commercial_article_id);
}

async function renderPickerResults() {
  const host = $("#pickerResults");
  host.innerHTML = `<div class="materials-loading">Buscando artigos comerciais…</div>`;
  const query = $("#pickerSearch").value.trim();
  try {
    const [materialsPayload, articlesPayload] = await Promise.all([
      api(`/catalog?${params({ query, vertical: state.selectedVertical, limit: 120 })}`),
      api(`/commercial-articles?${params({ query, vertical: state.selectedVertical, status: "active", limit: 200 })}`),
    ]);
    const materials = materialsPayload.items || [];
    const articles = articlesPayload.items || [];
    state.materials = materials;
    state.articles = articles;
    const byMaterial = new Map(materials.map((material) => [material.id, { material, articles: [] }]));
    for (const article of articles) {
      if (!byMaterial.has(article.primary_material_id)) {
        byMaterial.set(article.primary_material_id, { material: { id: article.primary_material_id, canonical_name_pt: article.material_name_pt, family_name_pt: article.family_name_pt, verticals: article.verticals }, articles: [] });
      }
      byMaterial.get(article.primary_material_id).articles.push(article);
    }
    const groups = [...byMaterial.values()];
    if (!groups.length) {
      host.innerHTML = `<div class="materials-empty"><strong>Nenhum material encontrado</strong><p>Cadastre um artigo comercial ou altere a busca.</p><button class="primary" id="pickerNewArticle">+ Cadastrar artigo</button></div>`;
      $("#pickerNewArticle")?.addEventListener("click", () => openArticleDialog());
      return;
    }
    host.innerHTML = groups.map(({ material, articles: materialArticles }) => `
      <article class="picker-material">
        <div class="picker-material-head"><div><strong>${esc(material.canonical_name_pt)}</strong><small>${esc(material.family_name_pt || "")}</small></div><div class="material-mini-badges">${materialBadges(material)}</div></div>
        ${materialArticles.length ? `<div class="picker-article-list">${materialArticles.map((article) => `<button type="button" class="picker-article" data-material="${esc(material.id)}" data-article="${esc(article.id)}"><span><strong>${esc(article.commercial_name || article.commercial_code)}</strong><small>${esc(article.commercial_code)} · ${esc(article.supplier_name)}</small></span><span>${esc(compositionText(article))}</span><i>Selecionar →</i></button>`).join("")}</div>` : `<p class="picker-no-article">Sem artigo comercial ativo.<br><button class="link picker-create-article" data-material="${esc(material.id)}">Cadastrar artigo deste material</button></p>`}
      </article>
    `).join("");
    all(".picker-article", host).forEach((button) => button.addEventListener("click", () => selectPickerArticle(button.dataset.material, button.dataset.article)));
    all(".picker-create-article", host).forEach((button) => button.addEventListener("click", () => openArticleDialog(button.dataset.material)));
  } catch (error) {
    host.innerHTML = errorPanel("Falha na busca de artigos", error);
  }
}

function selectPickerArticle(materialId, articleId) {
  const article = state.articles.find((item) => item.id === articleId);
  const material = state.materials.find((item) => item.id === materialId) || {
    id: article?.primary_material_id,
    canonical_name_pt: article?.material_name_pt,
    family_name_pt: article?.family_name_pt,
    base_origin: article?.base_origin,
    structure: article?.structure,
    verticals: article?.verticals,
  };
  if (!article) return;
  state.picker.materialId = materialId;
  state.picker.articleId = articleId;
  $("#pickerResults").classList.add("hidden");
  const form = $("#materialApplicationForm");
  form.classList.remove("hidden");
  form.reset();
  const component = state.components.find((item) => item.id === state.picker.componentId);
  const existing = component && applicationFor(component);
  if (existing) {
    form.elements.batchReference.value = existing.batch_reference || "";
    form.elements.quantity.value = existing.quantity || "";
    form.elements.quantityUnit.value = existing.quantity_unit || "m";
    form.elements.confidence.value = existing.confidence || "unknown";
    form.elements.evidenceReference.value = evidenceReference(existing);
    form.elements.notesPt.value = existing.notes_pt || "";
  }
  $("#selectedMaterialSnapshot").innerHTML = `<span>ARTIGO SELECIONADO</span><strong>${esc(article.commercial_name || article.commercial_code)}</strong><small>${esc(material.canonical_name_pt)} · ${esc(article.supplier_name)}</small><p>${esc(compositionText(article))}</p><div class="material-mini-badges">${materialBadges(material)}</div>`;
}

async function saveApplication(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const component = state.components.find((item) => item.id === state.picker.componentId);
  const existing = component && applicationFor(component);
  if (!component || !state.picker.articleId || !state.selectedSkuId) return;
  const data = Object.fromEntries(new FormData(form));
  const body = {
    componentTypeId: component.id,
    commercialArticleId: state.picker.articleId,
    batchReference: data.batchReference,
    quantity: data.quantity || null,
    quantityUnit: data.quantityUnit,
    confidence: data.confidence,
    evidenceReference: data.evidenceReference,
    notesPt: data.notesPt,
    status: "active",
  };
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.textContent = "Salvando…";
  try {
    if (existing) {
      body.version = Number(existing.version);
      await api(`/skus/${encodeURIComponent(state.selectedSkuId)}/applications/${encodeURIComponent(existing.id)}`, {
        method: "PATCH",
        body,
        headers: { "if-match": String(existing.version) },
      });
    } else {
      await api(`/skus/${encodeURIComponent(state.selectedSkuId)}/applications`, {
        method: "POST",
        body,
        headers: { "idempotency-key": idempotencyKey() },
      });
    }
    $("#materialPickerDialog").close();
    await Promise.all([refreshApplications(), refreshStatus()]);
    switchTab("applications");
    toast("Aplicação salva na Materials API");
  } catch (error) {
    toast(error.code === "APPLICATION_VERSION_CONFLICT" ? "A aplicação mudou. Atualizando os dados…" : error.message);
    if (error.code === "APPLICATION_VERSION_CONFLICT") await refreshApplications();
  } finally {
    submit.disabled = false;
    submit.textContent = "Salvar na Materials API";
  }
}

async function beginApplicationFromMaterial(materialId, articleId = null) {
  switchTab("applications");
  if (!state.products.length) {
    toast("Nenhum SKU persistente disponível");
    return;
  }
  await Promise.all([refreshComponents(), refreshApplications()]);
  const component = state.components.find((item) => item.required && !applicationFor(item)) || state.components[0];
  if (!component) return;
  await openPicker(component.id);
  if (articleId) selectPickerArticle(materialId, articleId);
  else {
    const article = state.articles.find((item) => item.primary_material_id === materialId);
    if (article) selectPickerArticle(materialId, article.id);
    else openArticleDialog(materialId);
  }
}

async function loadArticleDialogData() {
  const [supplierPayload, materialPayload] = await Promise.all([
    api("/organizations"),
    api("/catalog?limit=120"),
  ]);
  state.suppliers = supplierPayload.items || [];
  const materials = materialPayload.items || [];
  const form = $("#commercialArticleForm");
  form.elements.supplierOrganizationId.innerHTML = `<option value="">Selecione</option>` + state.suppliers.map((item) => `<option value="${esc(item.id)}">${esc(item.name)}${item.type ? ` · ${esc(item.type)}` : ""}</option>`).join("");
  form.elements.primaryMaterialId.innerHTML = `<option value="">Selecione</option>` + materials.map((item) => `<option value="${esc(item.id)}">${esc(item.canonical_name_pt)} · ${esc(item.family_name_pt)}</option>`).join("");
  return materials;
}

async function openArticleDialog(materialId = null) {
  state.articleDialogContext = { materialId, returnToPicker: $("#materialPickerDialog")?.open || false };
  const form = $("#commercialArticleForm");
  form.reset();
  try {
    await loadArticleDialogData();
    if (materialId) form.elements.primaryMaterialId.value = materialId;
    $("#commercialArticleDialog").showModal();
  } catch (error) {
    toast(error.message);
  }
}

async function saveCommercialArticle(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form));
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.textContent = "Cadastrando…";
  try {
    const article = await api("/commercial-articles", {
      method: "POST",
      headers: { "idempotency-key": idempotencyKey() },
      body: data,
    });
    $("#commercialArticleDialog").close();
    await Promise.all([refreshArticles(), refreshStatus()]);
    toast("Artigo comercial persistido");
    if (state.articleDialogContext?.returnToPicker) {
      await renderPickerResults();
      selectPickerArticle(article.primary_material_id, article.id);
    }
  } catch (error) {
    toast(error.message);
  } finally {
    submit.disabled = false;
    submit.textContent = "Cadastrar artigo";
  }
}

function enhanceProductRows() {
  const table = $("#productTable");
  if (!table) return;
  all(".product-line", table).forEach((row) => {
    if ($(".configure-piece-materials", row)) return;
    const code = ($("small", row)?.textContent || "").split("·")[0].trim();
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
      if (!match) {
        toast("Esta peça ainda é local; persista o SKU antes de aplicar materiais");
        showMaterials();
        switchTab("applications");
        return;
      }
      state.selectedSkuId = match.id;
      state.selectedVertical = match.vertical;
      renderProductOptions();
      showMaterials();
      switchTab("applications");
      await Promise.all([refreshComponents(), refreshApplications()]);
    });
    actions.prepend(button);
  });
}

function errorPanel(title, error) {
  return `<div class="materials-empty"><strong>${esc(title)}</strong><p>${esc(error.message || error)}</p>${error.code ? `<small>Código: ${esc(error.code)}</small>` : ""}</div>`;
}

async function refreshStatus() {
  try {
    state.status = await api("/status");
  } catch (error) {
    state.status = { available: false, runtime_ready: false, reason: error.message };
  }
  renderStatus();
  renderMetrics();
}

async function renderCurrentTab() {
  if (state.tab === "catalog") await refreshCatalog();
  if (state.tab === "articles") await refreshArticles();
  if (state.tab === "applications") {
    await refreshProducts();
    await refreshComponents();
    await refreshApplications();
  }
  renderMetrics();
}

function bindEvents() {
  all("[data-materials-tab]").forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.materialsTab)));
  $("#openPieceMaterials").addEventListener("click", () => switchTab("applications"));
  $("#newCommercialArticle").addEventListener("click", () => openArticleDialog());
  $("#materialsProductSelect").addEventListener("change", async (event) => {
    state.selectedSkuId = event.target.value || null;
    state.selectedVertical = selectedProduct()?.vertical || state.selectedVertical;
    renderProductOptions();
    await Promise.all([refreshComponents(), refreshApplications()]);
  });
  $("#materialsProductVertical").addEventListener("change", async (event) => {
    state.selectedVertical = event.target.value;
    await Promise.all([refreshComponents(), refreshApplications()]);
  });

  let searchTimer;
  const schedule = () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (state.tab === "catalog") refreshCatalog();
      if (state.tab === "articles") refreshArticles();
    }, 300);
  };
  $("#materialsSearch").addEventListener("input", schedule);
  all("#materialsVertical, #materialsFamily, #materialsOrigin, #materialsStructure, #materialsEvidence").forEach((field) => field.addEventListener("change", schedule));
  $("#clearMaterialsFilters").addEventListener("click", () => {
    $("#materialsSearch").value = "";
    all("#materialsVertical, #materialsFamily, #materialsOrigin, #materialsStructure, #materialsEvidence").forEach((field) => { field.value = ""; });
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
  $("#commercialArticleForm").addEventListener("submit", saveCommercialArticle);
  $("[data-close-material-dialog]").addEventListener("click", () => $("#materialDetailDialog").close());
  $("[data-close-picker]").addEventListener("click", () => $("#materialPickerDialog").close());
  all("[data-close-article-dialog]").forEach((button) => button.addEventListener("click", () => $("#commercialArticleDialog").close()));
}

async function init() {
  installNavigation();
  installView();
  bindEvents();
  await refreshStatus();
  try {
    state.filters = await api("/filters");
    populateFilters();
  } catch (error) {
    $("#materialsCapabilityNote").textContent = error.message;
  }
  await refreshProducts();
  await refreshComponents();
  await Promise.allSettled([refreshCatalog(), refreshArticles(), refreshApplications()]);
  renderMetrics();
  enhanceProductRows();
  const table = $("#productTable");
  if (table) new MutationObserver(enhanceProductRows).observe(table, { childList: true, subtree: true });
}

init();
