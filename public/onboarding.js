const PHYLLOS_GUIDE_VERSION = "2026.07.1";
const GUIDE_SEEN_KEY = "phyllos-onboarding-seen-v1";
const GUIDE_PROGRESS_KEY = "phyllos-onboarding-progress-v1";

const $ = (selector, root = document) => root.querySelector(selector);
const all = (selector, root = document) => [...root.querySelectorAll(selector)];

const MODULES = [
  {
    view: "products", number: "01", title: "Produtos", icon: "PEÇA",
    summary: "Cadastre cada peça aos poucos, começando apenas com nome e categoria.",
    receives: "Ideia, molde, tamanho, material, quantidade, fornecedor e evidências.",
    delivers: "A identidade da peça usada por Produção, Impacto e Dossiê.",
    action: "Cadastrar peça", actionId: "newPortfolioItem",
  },
  {
    view: "operations", number: "02", title: "Produção", icon: "FAZER",
    summary: "Acompanhe encomendas, lotes, prazos, responsáveis e o andamento real.",
    receives: "Peças do portfólio, compromissos, materiais, processos e técnicas.",
    delivers: "Dados operacionais, consumos, perdas, imagens e evidências para o PI5.",
    action: "Abrir produção",
  },
  {
    view: "identify", number: "03", title: "Identificar tecido", icon: "TECIDO",
    summary: "Registre imagens e características observáveis para levantar hipóteses seguras.",
    receives: "Fotos, toque, elasticidade, transparência, caimento e etiqueta.",
    delivers: "Hipóteses, limitações e próximos testes para completar o cadastro da peça.",
    action: "Analisar tecido",
  },
  {
    view: "measure", number: "04", title: "Calculadora", icon: "MEDIR",
    summary: "Use medidas e comportamento do tecido como apoio ao traçado e planejamento.",
    receives: "Medidas corporais, tipo de peça e propriedades do material.",
    delivers: "Referências de modelagem que apoiam Produto e Produção.",
    action: "Abrir calculadora",
  },
  {
    view: "impact", number: "05", title: "Impacto ambiental", icon: "PI5",
    summary: "Compare o desempenho ambiental da peça em uma escala comum de 0 a 5.",
    receives: "Materiais, processos, água, energia, resíduos, durabilidade e confiança.",
    delivers: "Score PI5, dimensões, hotspots, cobertura, confiança e recomendações.",
    action: "Calcular impacto",
  },
  {
    view: "findings", number: "06", title: "Lacunas", icon: "REVER",
    summary: "Transforme informação ausente em uma pendência clara, com responsável e evidência.",
    receives: "Campos incompletos, baixa confiança e inconsistências detectadas nos módulos.",
    delivers: "Lista priorizada do que falta para melhorar a operação e a qualidade do PI5.",
    action: "Revisar lacunas",
  },
  {
    view: "dossier", number: "07", title: "Dossiê", icon: "GUARDAR",
    summary: "Congele um retrato verificável dos dados, decisões e limitações do produto.",
    receives: "Produtos, produção, evidências, lacunas e resultados ambientais.",
    delivers: "Snapshot versionado para consulta, prestação de contas e rastreabilidade.",
    action: "Gerar dossiê",
  },
];

const FAQS = [
  { q: "Onde cadastro uma nova peça?", a: "Use Produtos. Nome e categoria bastam para começar; o restante pode ser completado depois.", view: "products", actionId: "newPortfolioItem", tags: "cadastro produto peça começar" },
  { q: "Como acompanho uma encomenda ou lote?", a: "Use Produção para acompanhar etapa, prazo, responsável, bloqueios, materiais e próxima ação.", view: "operations", tags: "encomenda lote prazo produção" },
  { q: "Não sei qual é o tecido. O que faço?", a: "Abra Identificar tecido, envie fotos e descreva o comportamento observado. A PHYLLOS mostrará hipóteses e limites.", view: "identify", tags: "tecido foto composição identificar" },
  { q: "Como registrar fotos da peça e do material?", a: "Abra o card da peça em Produção. Você pode registrar imagem principal, tecido e detalhes de acabamento.", view: "operations", tags: "imagem foto material card" },
  { q: "Como calculo o impacto ambiental?", a: "A Produção envia materiais e processos para Impacto ambiental. Complete as lacunas e gere o score PI5.", view: "impact", tags: "pi5 impacto score carbono água" },
  { q: "O que significa confiança no PI5?", a: "Confiança mostra a qualidade das informações usadas. Ela é separada do desempenho ambiental: documento não reduz impacto, apenas torna o resultado mais confiável.", view: "impact", tags: "confiança cobertura pi5 dados" },
  { q: "Por que meu PI5 aparece como experimental?", a: "O resultado fica experimental quando a cobertura dos dados ainda está abaixo do nível necessário para uma comparação contextualizada.", view: "impact", tags: "experimental cobertura score" },
  { q: "Onde encontro o que ainda falta preencher?", a: "Use Lacunas. A PHYLLOS reúne ausências, valores de referência, baixa confiança e evidências pendentes.", view: "findings", tags: "falta pendência lacuna" },
  { q: "Como corrigir uma informação da produção?", a: "Abra o card da peça em Produção e atualize material, processo, técnica, origem, consumo ou evidência. O PI5 poderá ser recalculado.", view: "operations", tags: "corrigir editar produção material processo" },
  { q: "Como preservar um resultado para consulta futura?", a: "Use Dossiê para congelar um snapshot. Assim, alterações futuras não mudam o retrato já registrado.", view: "dossier", tags: "snapshot congelar histórico dossiê" },
  { q: "Como usar a calculadora de medidas?", a: "Escolha a base, informe medidas e ajuste o comportamento do tecido. O resultado é uma referência educacional e deve ser validado com prova.", view: "measure", tags: "medidas molde modelagem calculadora" },
  { q: "Qual é a ordem recomendada para começar?", a: "Cadastre a peça, organize a Produção, registre materiais e processos, calcule o PI5, resolva lacunas e gere um Dossiê.", view: "products", tags: "ordem fluxo começar primeiros passos" },
];

const GLOSSARY = [
  ["PI5", "Score ambiental global de 0 a 5. Quanto maior, menor o impacto relativo ao benchmark da categoria."],
  ["Evidência", "Registro que sustenta uma informação: foto, etiqueta, nota, ficha técnica, medição, laudo ou documento."],
  ["Lacuna", "Informação ausente, incompleta ou pouco confiável que precisa de uma ação futura."],
  ["Cobertura", "Quanto do escopo necessário para o cálculo já foi informado."],
  ["Confiança", "Qualidade e rastreabilidade das entradas usadas no cálculo."],
  ["Snapshot", "Retrato congelado e versionado dos dados em uma data específica."],
  ["Benchmark", "Referência comparável da mesma categoria usada para posicionar a peça na escala PI5."],
  ["Especificidade", "Grau de detalhe do card de produção; não significa automaticamente maior sustentabilidade."],
];

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

function closeMobileNavigation() {
  document.body.classList.remove("mobile-nav-open");
  $(".sidebar")?.classList.remove("mobile-open");
  const toggle = $("#mobileNavToggle");
  toggle?.classList.remove("open");
  toggle?.setAttribute("aria-expanded", "false");
  const backdrop = $(".mobile-nav-backdrop");
  if (backdrop) backdrop.hidden = true;
}

function navigate(view, actionId = "") {
  const nav = $(`.nav[data-view="${view}"]`);
  if (nav) nav.click();
  else {
    all(".view").forEach((item) => item.classList.toggle("hidden", item.id !== view));
  }
  closeMobileNavigation();
  if (actionId) window.setTimeout(() => $(`#${actionId}`)?.click(), 100);
}

function moduleCard(module) {
  return `<article class="onb-module-card" data-onb-module="${module.view}">
    <div class="onb-module-top"><span class="onb-module-number">${module.number}</span><span class="onb-module-icon">${module.icon}</span></div>
    <h3>${module.title}</h3>
    <p>${module.summary}</p>
    <dl><div><dt>Recebe</dt><dd>${module.receives}</dd></div><div><dt>Entrega</dt><dd>${module.delivers}</dd></div></dl>
    <button class="onb-card-action" data-onb-go="${module.view}" ${module.actionId ? `data-onb-action="${module.actionId}"` : ""}>${module.action} →</button>
  </article>`;
}

function flowNode(module, index) {
  return `<button class="onb-flow-node" data-onb-go="${module.view}">
    <span>${String(index + 1).padStart(2, "0")}</span><strong>${module.title}</strong><small>${module.icon}</small>
  </button>`;
}

function faqCard(item) {
  return `<article class="onb-faq-card" data-onb-search="${item.q} ${item.a} ${item.tags}">
    <h3>${item.q}</h3><p>${item.a}</p>
    <button data-onb-go="${item.view}" ${item.actionId ? `data-onb-action="${item.actionId}"` : ""}>Abrir ${MODULES.find((module) => module.view === item.view)?.title || "módulo"} →</button>
  </article>`;
}

function onboardingMarkup() {
  return `<section id="onboarding" class="view hidden onb-page" aria-labelledby="onbTitle">
    <div class="onb-hero">
      <div class="onb-hero-copy">
        <p class="eyebrow">PHYLLOS · PRIMEIROS PASSOS</p>
        <h2 id="onbTitle">Sua produção, explicada passo a passo.</h2>
        <p>A PHYLLOS conecta o cadastro da peça, a rotina do ateliê, as evidências e o impacto ambiental. Comece por uma tarefa real e deixe que a plataforma organize o restante.</p>
        <div class="onb-hero-actions">
          <button class="primary" data-onb-go="products" data-onb-action="newPortfolioItem">Cadastrar minha primeira peça</button>
          <button class="onb-secondary" data-onb-anchor="onbModules">Entender os módulos</button>
        </div>
      </div>
      <div class="onb-progress-card" aria-live="polite">
        <span>SEU PROGRESSO INICIAL</span>
        <strong id="onbProgressValue">0%</strong>
        <div class="onb-progress-bar"><i id="onbProgressBar"></i></div>
        <p id="onbProgressText">Verificando seus primeiros passos…</p>
      </div>
    </div>

    <nav class="onb-page-nav" aria-label="Atalhos desta página">
      <button data-onb-anchor="onbQuick">Links rápidos</button>
      <button data-onb-anchor="onbJourney">Por onde começar</button>
      <button data-onb-anchor="onbFlow">Como se conectam</button>
      <button data-onb-anchor="onbModules">Módulos</button>
      <button data-onb-anchor="onbConsult">Consultas</button>
      <button data-onb-anchor="onbGlossary">Glossário</button>
    </nav>

    <section id="onbQuick" class="onb-section">
      <div class="onb-section-head"><div><p class="eyebrow">LINKS RÁPIDOS</p><h2>O que você precisa fazer agora?</h2></div><p>Acesse diretamente a atividade, sem precisar conhecer toda a plataforma.</p></div>
      <div class="onb-quick-grid">
        <button data-onb-go="products" data-onb-action="newPortfolioItem"><span>+</span><strong>Cadastrar uma peça</strong><small>Comece com nome e categoria.</small></button>
        <button data-onb-go="operations"><span>→</span><strong>Acompanhar produção</strong><small>Veja prazos, etapas e bloqueios.</small></button>
        <button data-onb-go="identify"><span>⌕</span><strong>Consultar um tecido</strong><small>Envie fotos e observações.</small></button>
        <button data-onb-go="impact"><span>5</span><strong>Calcular o PI5</strong><small>Compare o impacto na mesma régua.</small></button>
        <button data-onb-go="findings"><span>!</span><strong>Resolver pendências</strong><small>Veja o que ainda falta informar.</small></button>
        <button data-onb-go="dossier"><span>□</span><strong>Gerar um dossiê</strong><small>Congele um retrato verificável.</small></button>
      </div>
    </section>

    <section id="onbJourney" class="onb-section">
      <div class="onb-section-head"><div><p class="eyebrow">ROTAS RECOMENDADAS</p><h2>Comece pelo seu objetivo.</h2></div><p>Você não precisa usar tudo de uma vez.</p></div>
      <div class="onb-journey-grid">
        <article><span>01</span><h3>Organizar meu ateliê</h3><p>Cadastre uma peça, transforme-a em encomenda ou lote e acompanhe a etapa atual.</p><div><button data-onb-go="products" data-onb-action="newPortfolioItem">Produtos</button><i>→</i><button data-onb-go="operations">Produção</button></div></article>
        <article><span>02</span><h3>Entender um material</h3><p>Registre imagens, levante hipóteses, depois complete o material e sua evidência no card.</p><div><button data-onb-go="identify">Identificar</button><i>→</i><button data-onb-go="operations">Card da peça</button></div></article>
        <article><span>03</span><h3>Melhorar o impacto</h3><p>Estruture materiais e processos, calcule o PI5 e use as lacunas como plano de melhoria.</p><div><button data-onb-go="operations">Produção</button><i>→</i><button data-onb-go="impact">PI5</button><i>→</i><button data-onb-go="findings">Lacunas</button></div></article>
      </div>
    </section>

    <section id="onbFlow" class="onb-section onb-flow-section">
      <div class="onb-section-head"><div><p class="eyebrow">FLUXO DE INFORMAÇÃO</p><h2>Como os módulos se comunicam.</h2></div><p>Uma informação registrada uma vez pode alimentar várias decisões.</p></div>
      <div class="onb-flow" role="list">
        ${MODULES.map(flowNode).join('<i aria-hidden="true">→</i>')}
      </div>
      <div class="onb-flow-explanation">
        <strong>Exemplo prático</strong>
        <p>Você cadastra uma camisa em <b>Produtos</b>. Em <b>Produção</b>, registra tecido, botões, corte, costura e fotos. Esses dados alimentam o <b>PI5</b>. O que ainda estiver incompleto aparece em <b>Lacunas</b>. Quando o registro estiver pronto, o <b>Dossiê</b> preserva o estado e as limitações daquela versão.</p>
      </div>
    </section>

    <section id="onbModules" class="onb-section">
      <div class="onb-section-head"><div><p class="eyebrow">GUIA DOS MÓDULOS</p><h2>O papel de cada área.</h2></div><p>Cada módulo recebe informações e entrega algo para o próximo.</p></div>
      <div class="onb-modules-grid">${MODULES.map(moduleCard).join("")}</div>
    </section>

    <section class="onb-section onb-checklist-section">
      <div class="onb-section-head"><div><p class="eyebrow">CHECKLIST INICIAL</p><h2>Seis passos para colocar a PHYLLOS em movimento.</h2></div><button class="onb-secondary" id="onbRefreshProgress">Atualizar progresso</button></div>
      <div class="onb-checklist" id="onbChecklist"></div>
    </section>

    <section id="onbConsult" class="onb-section">
      <div class="onb-section-head"><div><p class="eyebrow">CONSULTAS RÁPIDAS</p><h2>Encontre uma resposta em linguagem simples.</h2></div><p>Pesquise por uma tarefa, dúvida ou palavra do dia a dia.</p></div>
      <label class="onb-search-label" for="onbSearch">O que você precisa saber?</label>
      <input id="onbSearch" class="onb-search" type="search" placeholder="Ex.: cadastrar peça, tecido, PI5, prazo, evidência…" autocomplete="off">
      <div id="onbFaqGrid" class="onb-faq-grid">${FAQS.map(faqCard).join("")}</div>
      <p id="onbNoResults" class="onb-no-results hidden">Nenhuma resposta encontrada. Tente uma palavra mais simples, como “tecido”, “prazo” ou “impacto”.</p>
    </section>

    <section id="onbGlossary" class="onb-section">
      <div class="onb-section-head"><div><p class="eyebrow">GLOSSÁRIO PHYLLOS</p><h2>Os termos importantes, sem complicação.</h2></div></div>
      <div class="onb-glossary-grid">${GLOSSARY.map(([term, description]) => `<article><strong>${term}</strong><p>${description}</p></article>`).join("")}</div>
    </section>

    <section class="onb-end-card">
      <div><p class="eyebrow">VOCÊ NÃO PRECISA FAZER TUDO AGORA</p><h2>Comece por uma peça real.</h2><p>A PHYLLOS ficará mais útil conforme a produção gerar dados, imagens, evidências e decisões.</p></div>
      <button class="primary" data-onb-go="products" data-onb-action="newPortfolioItem">Começar cadastro →</button>
    </section>
  </section>`;
}

function ensureNavigation() {
  const nav = $(".sidebar nav");
  if (!nav || $(".nav[data-view='onboarding']", nav)) return;
  const button = document.createElement("button");
  button.className = "nav onb-nav-entry";
  button.dataset.view = "onboarding";
  button.innerHTML = "<span>00</span> Início e ajuda";
  button.addEventListener("click", () => openOnboarding());
  nav.prepend(button);
}

function ensureHelpButton() {
  if ($("#phyllosHelpButton")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.id = "phyllosHelpButton";
  button.className = "onb-help-button";
  button.setAttribute("aria-label", "Abrir início e ajuda");
  button.innerHTML = '<span aria-hidden="true">?</span><b>Ajuda</b>';
  button.addEventListener("click", () => openOnboarding());
  document.body.append(button);
}

function ensurePage() {
  if ($("#onboarding")) return;
  const main = $("main");
  if (!main) return;
  const header = $("main > header");
  if (header) header.insertAdjacentHTML("afterend", onboardingMarkup());
  else main.insertAdjacentHTML("afterbegin", onboardingMarkup());
  bindPageEvents();
}

function openOnboarding() {
  ensurePage();
  all(".view").forEach((item) => item.classList.toggle("hidden", item.id !== "onboarding"));
  all(".nav").forEach((item) => item.classList.toggle("active", item.dataset.view === "onboarding"));
  const title = $("#pageTitle");
  if (title) title.textContent = "Início e ajuda";
  localStorage.setItem(GUIDE_SEEN_KEY, JSON.stringify({ version: PHYLLOS_GUIDE_VERSION, seenAt: new Date().toISOString() }));
  closeMobileNavigation();
  window.scrollTo({ top: 0, behavior: "smooth" });
  updateProgress();
}

function bindPageEvents() {
  const page = $("#onboarding");
  if (!page || page.dataset.bound === "true") return;
  page.dataset.bound = "true";
  page.addEventListener("click", (event) => {
    const go = event.target.closest("[data-onb-go]");
    if (go) {
      navigate(go.dataset.onbGo, go.dataset.onbAction || "");
      return;
    }
    const anchor = event.target.closest("[data-onb-anchor]");
    if (anchor) $(`#${anchor.dataset.onbAnchor}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("#onbSearch", page)?.addEventListener("input", filterFaqs);
  $("#onbRefreshProgress", page)?.addEventListener("click", updateProgress);
}

function filterFaqs(event) {
  const query = String(event.target.value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  let visible = 0;
  all(".onb-faq-card").forEach((card) => {
    const haystack = String(card.dataset.onbSearch || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const show = !query || haystack.includes(query);
    card.classList.toggle("hidden", !show);
    if (show) visible += 1;
  });
  $("#onbNoResults")?.classList.toggle("hidden", visible > 0);
}

async function getProgressState() {
  const projects = readJson("phyllos-projects", []);
  const pieces = readJson("phyllos-portfolio", []);
  const specifications = readJson("phyllos-production-specifications", {});
  const media = readJson("phyllos-production-media", {});
  const specValues = Object.values(specifications || {});
  let pi5Predictions = 0;
  try {
    const response = await fetch("/api/v1/pi5/summary", { cache: "no-store" });
    if (response.ok) pi5Predictions = Number((await response.json()).predictions || 0);
  } catch {}
  return [
    { id: "guide", label: "Conhecer o fluxo da PHYLLOS", detail: "Abrir esta página e entender por onde começar.", done: Boolean(localStorage.getItem(GUIDE_SEEN_KEY)), view: "onboarding" },
    { id: "piece", label: "Cadastrar a primeira peça", detail: "Nome e categoria já são suficientes.", done: pieces.length > 0, view: "products", actionId: "newPortfolioItem" },
    { id: "project", label: "Criar um compromisso de produção", detail: "Organizar uma encomenda ou um lote.", done: projects.length > 0, view: "operations" },
    { id: "spec", label: "Registrar materiais e processos", detail: "Criar o card inteligente da peça.", done: specValues.some((spec) => (spec.components?.length || 0) > 0 && (spec.processes?.length || 0) > 0), view: "operations" },
    { id: "media", label: "Adicionar uma imagem ou evidência", detail: "Foto da peça, tecido, detalhe, etiqueta ou ficha.", done: Object.values(media || {}).some((item) => item?.cover || item?.fabric || item?.detail) || pieces.some((piece) => String(piece.evidence || "").trim()), view: "operations" },
    { id: "pi5", label: "Gerar o primeiro PI5", detail: "Comparar a peça e descobrir os principais hotspots.", done: pi5Predictions > 0, view: "impact" },
  ];
}

async function updateProgress() {
  if (!$("#onboarding")) return;
  const steps = await getProgressState();
  const completed = steps.filter((step) => step.done).length;
  const percent = Math.round(completed / steps.length * 100);
  const progressValue = $("#onbProgressValue");
  const progressBar = $("#onbProgressBar");
  const progressText = $("#onbProgressText");
  if (progressValue) progressValue.textContent = `${percent}%`;
  if (progressBar) progressBar.style.width = `${percent}%`;
  if (progressText) progressText.textContent = completed === steps.length ? "Primeiros passos concluídos. Continue aprimorando os dados." : `${completed} de ${steps.length} passos concluídos.`;
  const checklist = $("#onbChecklist");
  if (checklist) checklist.innerHTML = steps.map((step, index) => `<article class="onb-check-item ${step.done ? "done" : ""}">
    <span>${step.done ? "✓" : String(index + 1).padStart(2, "0")}</span><div><strong>${step.label}</strong><small>${step.detail}</small></div>
    <button data-onb-go="${step.view}" ${step.actionId ? `data-onb-action="${step.actionId}"` : ""}>${step.done ? "Revisar" : "Fazer agora"}</button>
  </article>`).join("");
  localStorage.setItem(GUIDE_PROGRESS_KEY, JSON.stringify({ percent, completed, updatedAt: new Date().toISOString() }));
}

function init() {
  ensureNavigation();
  ensurePage();
  ensureHelpButton();
  window.addEventListener("storage", updateProgress);
  window.addEventListener("focus", updateProgress);
  const firstVisit = !localStorage.getItem(GUIDE_SEEN_KEY);
  if (firstVisit) window.setTimeout(openOnboarding, 1000);
  else updateProgress();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
