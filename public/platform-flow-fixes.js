
const $ = (selector, root = document) => root.querySelector(selector);
const all = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = (value = "") => String(value).replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
})[c]);

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || payload.message || `Falha HTTP ${response.status}`);
    error.payload = payload;
    throw error;
  }
  return payload;
}

function nativeShow(viewId, title) {
  all(".view").forEach(v => v.classList.toggle("hidden", v.id !== viewId));
  all(".nav").forEach(b => b.classList.toggle("active", b.dataset.view === viewId));
  if ($("#pageTitle")) $("#pageTitle").textContent = title;
  document.body.classList.remove("mobile-nav-open");
  $(".sidebar")?.classList.remove("mobile-open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function installDppNavigation() {
  if ($('[data-view="dpp"]')) return;
  const nav = $(".sidebar nav");
  if (!nav) return;
  const button = document.createElement("button");
  button.className = "nav";
  button.dataset.view = "dpp";
  button.innerHTML = "<span>11</span> DPP e publicação";
  button.addEventListener("click", () => {
    ensureDppView();
    nativeShow("dpp", "DPP e publicação");
    renderDraftList();
  });
  nav.append(button);
}

function ensureDppView() {
  if ($("#dpp")) return;
  const section = document.createElement("section");
  section.id = "dpp";
  section.className = "view hidden dpp-native-view";
  section.innerHTML = `
    <div class="dpp-native-hero">
      <div>
        <p class="eyebrow">DIGITAL PRODUCT PASSPORT</p>
        <h2>Do lote ao passaporte verificável.</h2>
        <p>Crie um rascunho, confira exatamente o que ficará público, resolva bloqueios e só então publique uma versão imutável.</p>
      </div>
      <button class="primary" id="startDppDraft">+ Criar DPP</button>
    </div>

    <div class="dpp-flow-strip" aria-label="Fluxo do DPP">
      <button data-dpp-step="1"><span>01</span><b>Selecionar peça ou lote</b><small>Identidade e produção</small></button>
      <i>→</i>
      <button data-dpp-step="2"><span>02</span><b>Completar dados</b><small>Materiais, evidências e PI5</small></button>
      <i>→</i>
      <button data-dpp-step="3"><span>03</span><b>Consultar prévia</b><small>Visão pública antes de publicar</small></button>
      <i>→</i>
      <button data-dpp-step="4"><span>04</span><b>Validar e publicar</b><small>Gates, hash e assinatura</small></button>
    </div>

    <div class="dpp-native-tabs">
      <button class="active" data-dpp-tab="drafts">Passaportes</button>
      <button data-dpp-tab="company">PI5 da empresa</button>
      <button data-dpp-tab="guide">Como funciona</button>
    </div>
    <div id="dppNativeContent"></div>

    <dialog id="dppEditorDialog" class="dpp-native-dialog">
      <button class="dialog-close" data-close-dpp aria-label="Fechar">×</button>
      <div id="dppEditorContent"></div>
    </dialog>
  `;
  $("main")?.append(section);
  bindDppEvents();
}

let activeDraft = null;

function bindDppEvents() {
  $("#startDppDraft")?.addEventListener("click", () => openDppEditor());
  all("[data-dpp-tab]").forEach(button => button.addEventListener("click", () => {
    all("[data-dpp-tab]").forEach(x => x.classList.toggle("active", x === button));
    if (button.dataset.dppTab === "company") renderCompany();
    else if (button.dataset.dppTab === "guide") renderGuide();
    else renderDraftList();
  }));
  $("[data-close-dpp]")?.addEventListener("click", () => $("#dppEditorDialog")?.close());
}

async function renderDraftList() {
  const host = $("#dppNativeContent");
  if (!host) return;
  host.innerHTML = '<div class="dpp-loading">Carregando passaportes…</div>';
  try {
    const drafts = await request("/api/v1/dpp/drafts");
    host.innerHTML = `
      <div class="dpp-section-head">
        <div><p class="eyebrow">CENTRAL DE DPP</p><h3>Rascunhos e publicações</h3></div>
        <button class="primary" data-new-dpp>+ Novo passaporte</button>
      </div>
      <div class="dpp-list">
        ${drafts.length ? drafts.map(d => `
          <article>
            <div><span class="dpp-status ${esc(d.status)}">${esc(d.status)}</span>
            <h3>${esc(d.product?.name || "Produto sem nome")}</h3>
            <p>${esc(d.product?.sku || "SKU pendente")} · ${esc(d.batch?.code || "lote pendente")}</p></div>
            <div class="dpp-list-actions">
              <button class="link" data-edit-dpp="${esc(d.id)}">Editar</button>
              <button class="link" data-preview-dpp="${esc(d.id)}">Consultar prévia</button>
            </div>
          </article>`).join("") :
          `<div class="dpp-empty"><strong>Nenhum DPP criado</strong><p>Comece por uma peça ou lote real. O passaporte só será público depois da sua revisão.</p><button class="primary" data-new-dpp>Criar primeiro DPP</button></div>`
        }
      </div>`;
    all("[data-new-dpp]", host).forEach(b => b.onclick = () => openDppEditor());
    all("[data-edit-dpp]", host).forEach(b => b.onclick = async () => openDppEditor(await request(`/api/v1/dpp/drafts/${encodeURIComponent(b.dataset.editDpp)}`)));
    all("[data-preview-dpp]", host).forEach(b => b.onclick = () => renderPreview(b.dataset.previewDpp));
  } catch (error) {
    host.innerHTML = `<div class="dpp-error"><strong>O módulo DPP ainda não está disponível no backend.</strong><p>${esc(error.message)}</p><small>Confirme a instalação de src/dpp-pi5-api.js e a integração em src/server.js.</small></div>`;
  }
}

function formMarkup(d = {}) {
  const t = d.transparency || {};
  return `
    <div class="dpp-editor-head"><p class="eyebrow">RASCUNHO DE PASSAPORTE</p><h2>${d.id ? "Continuar DPP" : "Criar DPP"}</h2><p>Preencha o mínimo necessário, salve e consulte a prévia antes de publicar.</p></div>
    <form id="dppNativeForm">
      <div class="dpp-form-section"><h3>1. Produto e lote</h3><div class="field-grid">
        <label>Nome da peça<input name="name" required value="${esc(d.product?.name)}"></label>
        <label>SKU<input name="sku" required value="${esc(d.product?.sku)}"></label>
        <label>Código do lote<input name="code" required value="${esc(d.batch?.code)}"></label>
        <label>Unidades aprovadas<input name="approvedUnits" type="number" min="1" required value="${esc(d.batch?.approvedUnits || 1)}"></label>
      </div></div>
      <div class="dpp-form-section"><h3>2. Material e evidência</h3><div class="field-grid">
        <label>Material principal<input name="material" required value="${esc(d.materials?.[0]?.name || "")}"></label>
        <label>Referência da evidência<input name="evidence" required value="${esc(d.evidence?.[0]?.id || "")}" placeholder="Ficha, etiqueta, laudo ou declaração"></label>
      </div></div>
      <div class="dpp-form-section"><h3>3. Impactos totais do lote</h3><div class="field-grid">
        <label>CO₂e (kg)<input name="co2eKg" type="number" min="0" step=".01" value="${esc(d.impact?.co2eKg || 0)}"></label>
        <label>Água (L)<input name="waterLiters" type="number" min="0" step=".01" value="${esc(d.impact?.waterLiters || 0)}"></label>
        <label>Energia (kWh)<input name="energyKwh" type="number" min="0" step=".01" value="${esc(d.impact?.energyKwh || 0)}"></label>
        <label>Resíduos (kg)<input name="wasteKg" type="number" min="0" step=".01" value="${esc(d.impact?.wasteKg || 0)}"></label>
      </div></div>
      <div class="dpp-form-section"><h3>4. Transparência alinhada ao ITM</h3><div class="field-grid">
        <label>Rastreabilidade<input name="traceability" type="number" min="0" max="100" value="${esc(t.traceability || 0)}"></label>
        <label>GEE<input name="ghg" type="number" min="0" max="100" value="${esc(t.ghg || 0)}"></label>
        <label>Descarbonização<input name="decarbonization" type="number" min="0" max="100" value="${esc(t.decarbonization || 0)}"></label>
        <label>Energia renovável<input name="renewable" type="number" min="0" max="100" value="${esc(t.renewable || 0)}"></label>
        <label>Transição justa<input name="justTransition" type="number" min="0" max="100" value="${esc(t.justTransition || 0)}"></label>
      </div><p class="dpp-method-note">Este é um score PHYLLOS alinhado às dimensões do ITM, não o score oficial do ITM.</p></div>
      <div class="dpp-editor-actions">
        <button type="button" class="link" data-save-dpp>Salvar rascunho</button>
        <button type="button" class="link" data-check-dpp>Validar</button>
        <button type="button" class="primary" data-see-dpp>Salvar e consultar prévia →</button>
      </div>
      <div id="dppEditorFeedback"></div>
    </form>`;
}

function draftPayload(form) {
  const fd = new FormData(form);
  const number = name => Number(fd.get(name) || 0);
  return {
    scope: "batch",
    product: { name: fd.get("name"), sku: fd.get("sku") },
    batch: { code: fd.get("code"), approvedUnits: number("approvedUnits"), status: "completed" },
    materials: [{ name: fd.get("material"), percentage: 100 }],
    evidence: [{ id: fd.get("evidence"), type: "user_provided", status: "supported" }],
    impact: {
      co2eKg: number("co2eKg"), waterLiters: number("waterLiters"),
      energyKwh: number("energyKwh"), wasteKg: number("wasteKg"),
    },
    transparency: {
      traceability: number("traceability"), ghg: number("ghg"),
      decarbonization: number("decarbonization"), renewable: number("renewable"),
      justTransition: number("justTransition"), coverage: 70, confidence: 65,
    },
  };
}

async function saveActiveDraft() {
  const form = $("#dppNativeForm");
  const payload = draftPayload(form);
  activeDraft = activeDraft?.id
    ? await request(`/api/v1/dpp/drafts/${encodeURIComponent(activeDraft.id)}`, { method: "PATCH", body: JSON.stringify(payload) })
    : await request("/api/v1/dpp/drafts", { method: "POST", body: JSON.stringify(payload) });
  return activeDraft;
}

function openDppEditor(draft = null) {
  activeDraft = draft;
  const dialog = $("#dppEditorDialog");
  $("#dppEditorContent").innerHTML = formMarkup(draft || {});
  dialog.showModal();
  const feedback = $("#dppEditorFeedback");
  $("[data-save-dpp]").onclick = async () => {
    try { await saveActiveDraft(); feedback.innerHTML = `<p class="dpp-success">Rascunho salvo. Você pode sair e continuar depois.</p>`; }
    catch (e) { feedback.innerHTML = `<p class="dpp-failure">${esc(e.message)}</p>`; }
  };
  $("[data-check-dpp]").onclick = async () => {
    try {
      await saveActiveDraft();
      const result = await request(`/api/v1/dpp/drafts/${encodeURIComponent(activeDraft.id)}/validate`, { method: "POST" });
      feedback.innerHTML = readinessMarkup(result);
    } catch (e) { feedback.innerHTML = `<p class="dpp-failure">${esc(e.message)}</p>`; }
  };
  $("[data-see-dpp]").onclick = async () => {
    try { await saveActiveDraft(); dialog.close(); await renderPreview(activeDraft.id); }
    catch (e) { feedback.innerHTML = `<p class="dpp-failure">${esc(e.message)}</p>`; }
  };
}

function readinessMarkup(validation) {
  return `<div class="dpp-readiness"><strong>Prontidão: ${validation.readiness}%</strong>
    ${validation.items.map(i => `<p class="${i.ok ? "dpp-success" : "dpp-failure"}">${i.ok ? "✓" : "●"} ${esc(i.message)}</p>`).join("")}</div>`;
}

async function renderPreview(id) {
  const host = $("#dppNativeContent");
  host.innerHTML = '<div class="dpp-loading">Montando pré-visualização…</div>';
  try {
    const p = await request(`/api/v1/dpp/drafts/${encodeURIComponent(id)}/preview?profile=consumer`);
    const x = p.pi5;
    host.innerHTML = `
      <div class="dpp-preview-banner">${esc(p.banner)}</div>
      <div class="dpp-section-head"><button class="link" data-back-dpp>← Voltar</button><div>
        <button class="link" data-edit-preview>Editar dados</button>
        <button class="primary" data-publish-preview ${p.validation.valid ? "" : "disabled"}>Publicar versão</button>
      </div></div>
      <article class="dpp-public-preview">
        <p class="eyebrow">DIGITAL PRODUCT PASSPORT · PRÉVIA</p>
        <h2>${esc(p.draft.product.name)}</h2>
        <p>${esc(p.draft.product.sku)} · lote ${esc(p.draft.batch.code)}</p>
        <div class="dpp-metrics">
          <div><strong>${x.perPiece.co2eKg}</strong><span>kg CO₂e/peça</span></div>
          <div><strong>${x.perPiece.waterLiters}</strong><span>L de água/peça</span></div>
          <div><strong>${x.transparencyScore}</strong><span>Transparência</span></div>
          <div><strong>${x.coverage}%</strong><span>Cobertura</span></div>
          <div><strong>${x.confidence}%</strong><span>Confiança</span></div>
        </div>
        <h3>Comparação de transparência</h3>
        ${Object.entries(x.dimensions).map(([key, value]) => `
          <div class="dpp-comparison"><span>${esc(key)}</span><i style="--score:${value}%"></i>
          <b>PHYLLOS ${value} · ITM ${x.benchmark.dimensions[key]}</b></div>`).join("")}
        <h3>Prontidão para publicação</h3>
        ${readinessMarkup(p.validation)}
      </article>`;
    $("[data-back-dpp]").onclick = renderDraftList;
    $("[data-edit-preview]").onclick = () => openDppEditor(p.draft);
    $("[data-publish-preview]").onclick = async () => {
      try {
        const published = await request(`/api/v1/dpp/drafts/${encodeURIComponent(id)}/publish`, { method: "POST" });
        host.innerHTML = `<div class="dpp-published">
          <span>✓</span><h2>DPP publicado</h2><p>Identificador público:</p><code>${esc(published.identifier)}</code>
          <p>Hash SHA-256:</p><code>${esc(published.contentHash)}</code>
          <button class="primary" data-back-dpp>Voltar à central</button></div>`;
        $("[data-back-dpp]").onclick = renderDraftList;
      } catch (e) { alert(e.message); }
    };
  } catch (error) {
    host.innerHTML = `<div class="dpp-error">${esc(error.message)}</div>`;
  }
}

async function renderCompany() {
  const host = $("#dppNativeContent");
  host.innerHTML = '<div class="dpp-loading">Atualizando PI5 empresarial…</div>';
  try {
    const c = await request("/api/v1/pi5/company");
    const block = (title, value) => `<section class="dpp-company-block"><h3>${title}</h3>
      <div class="dpp-metrics"><div><strong>${value.units}</strong><span>Peças</span></div>
      <div><strong>${value.totals.co2eKg.toFixed(2)}</strong><span>kg CO₂e</span></div>
      <div><strong>${value.perPiece.co2eKg}</strong><span>kg CO₂e/peça</span></div>
      <div><strong>${value.transparencyScore}</strong><span>Transparência</span></div></div>
      ${Object.entries(value.dimensions).map(([key, score]) => `<div class="dpp-comparison"><span>${esc(key)}</span>
      <i style="--score:${score}%"></i><b>${score} · ITM ${value.benchmark.dimensions[key]}</b></div>`).join("")}</section>`;
    host.innerHTML = `<div class="dpp-section-head"><div><p class="eyebrow">PI5 EMPRESARIAL</p><h3>Produção acumulada</h3>
      <p>O realizado usa lotes concluídos; o projetado usa lotes ainda planejados.</p></div></div>
      ${block("Realizado", c.actual)}${block("Projetado", c.forecast)}`;
  } catch (e) { host.innerHTML = `<div class="dpp-error">${esc(e.message)}</div>`; }
}

function renderGuide() {
  $("#dppNativeContent").innerHTML = `
    <div class="dpp-guide">
      <article><span>01</span><h3>Cadastre a peça</h3><p>Em Produtos, registre identidade, construção, produção e evidências.</p><button data-guide-view="products">Abrir Produtos →</button></article>
      <article><span>02</span><h3>Configure materiais</h3><p>Na Base de materiais, consulte a KB técnica e aplique artigos ao SKU.</p><button data-guide-view="materials">Consultar KB →</button></article>
      <article><span>03</span><h3>Registre o lote</h3><p>Em Produção, atualize quantidade, perdas, processos e evidências realizadas.</p><button data-guide-view="operations">Abrir Produção →</button></article>
      <article><span>04</span><h3>Calcule e revise</h3><p>O PI5 é calculado por lote e peça. Consulte a prévia e resolva bloqueios.</p><button data-guide-view="dpp">Criar DPP →</button></article>
      <article><span>05</span><h3>Publique</h3><p>A publicação congela o resultado, gera hash, assinatura e versão imutável.</p></article>
    </div>`;
  all("[data-guide-view]").forEach(button => button.onclick = () => {
    const view = button.dataset.guideView;
    if (view === "dpp") { renderDraftList(); return; }
    const nav = $(`.nav[data-view="${view}"]`);
    if (nav) nav.click();
  });
}

function installOnboardingUpdate() {
  const add = () => {
    const page = $("#onboarding");
    if (!page || $("#onbUpdatedPlatformFlow")) return;
    const journey = $("#onbJourney", page);
    const section = document.createElement("section");
    section.id = "onbUpdatedPlatformFlow";
    section.className = "onb-section";
    section.innerHTML = `
      <div class="onb-section-head"><div><p class="eyebrow">FLUXO ATUAL DA PLATAFORMA</p>
      <h2>Da peça ao DPP publicado.</h2></div><p>O Dossiê preserva evidências internas. O DPP é a versão pública, revisada e verificável.</p></div>
      <div class="updated-platform-flow">
        <button data-flow-view="products"><span>01</span><b>Produtos</b><small>Cadastre peça e SKU</small></button><i>→</i>
        <button data-flow-view="materials"><span>02</span><b>Base de materiais</b><small>Consulte a KB e aplique materiais</small></button><i>→</i>
        <button data-flow-view="operations"><span>03</span><b>Produção</b><small>Registre lote e realizado</small></button><i>→</i>
        <button data-flow-view="impact"><span>04</span><b>PI5</b><small>Calcule impacto, cobertura e confiança</small></button><i>→</i>
        <button data-flow-view="dossier"><span>05</span><b>Dossiê</b><small>Congele o snapshot interno</small></button><i>→</i>
        <button data-flow-view="dpp"><span>06</span><b>DPP</b><small>Consulte a prévia e publique</small></button>
      </div>`;
    journey?.insertAdjacentElement("beforebegin", section);
    all("[data-flow-view]", section).forEach(button => button.onclick = () => {
      const view = button.dataset.flowView;
      if (view === "dpp") {
        ensureDppView(); nativeShow("dpp", "DPP e publicação"); renderDraftList();
      } else {
        $(`.nav[data-view="${view}"]`)?.click();
      }
    });
  };
  add();
  const observer = new MutationObserver(add);
  observer.observe(document.body, { childList: true, subtree: true });
}

function fixKnowledgeBaseRouting() {
  document.addEventListener("click", event => {
    const button = event.target.closest("button, a");
    if (!button) return;
    const text = button.textContent.toLowerCase();
    const explicitKb = button.matches("[data-go-kb], [data-consult-kb]") || text.includes("consultar kb") || text.includes("base de conhecimento");
    if (!explicitKb) return;
    const nav = $('.nav[data-view="materials"]');
    if (nav) {
      event.preventDefault();
      event.stopImmediatePropagation();
      nav.click();
    }
  }, true);
}

function improveDossierResult() {
  const button = $("#freezeDossier");
  if (!button || button.dataset.fixed === "true") return;
  button.dataset.fixed = "true";
  button.addEventListener("click", async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const box = $("#dossierResult");
    button.disabled = true;
    button.textContent = "Gerando snapshot…";
    box.style.display = "block";
    box.innerHTML = `<div class="dossier-progress">Organizando produtos, fatos, evidências e limitações…</div>`;
    try {
      const result = await request("/api/v1/dossiers", { method: "POST" });
      const documentData = {
        type: "PHYLLOS_EVIDENCE_DOSSIER",
        generatedAt: result.frozenAt,
        productCount: result.productCount,
        sha256: result.sha256,
        limitation: result.limitation,
      };
      const blob = new Blob([JSON.stringify(documentData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      box.innerHTML = `<article class="dossier-generated">
        <span class="dossier-check">✓</span><div><p class="eyebrow">DOSSIÊ GERADO</p>
        <h3>Snapshot verificável disponível</h3>
        <p>${result.productCount} produto(s) · ${new Date(result.frozenAt).toLocaleString("pt-BR")}</p>
        <label>Hash SHA-256</label><code>${esc(result.sha256)}</code>
        <p class="dossier-limitation">${esc(result.limitation || "Sem limitação informada.")}</p>
        <a class="primary dossier-download" href="${url}" download="phyllos-dossie-${Date.now()}.json">Baixar dossiê JSON</a></div>
      </article>`;
      button.textContent = "Gerar nova versão";
    } catch (error) {
      box.innerHTML = `<div class="dossier-error"><strong>Não foi possível gerar o dossiê.</strong>
        <p>${esc(error.message)}</p><small>Verifique o endpoint POST /api/v1/dossiers e tente novamente.</small></div>`;
      button.textContent = "Tentar novamente";
    } finally {
      button.disabled = false;
    }
  }, true);
}

function initialize() {
  installDppNavigation();
  ensureDppView();
  installOnboardingUpdate();
  fixKnowledgeBaseRouting();
  improveDossierResult();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
else initialize();
