const MODULES = [
  { id: "product", number: "01", label: "Produto", description: "Planejamento, portfólio, ficha e modelagem.", views: ["products", "measure"] },
  { id: "materials", number: "02", label: "Materiais", description: "Conhecimento têxtil, identificação e cadeia.", views: ["identify"] },
  { id: "production", number: "03", label: "Produção", description: "Projetos, ordens, etapas e operação.", views: ["operations"] },
  { id: "evidence", number: "04", label: "Evidências", description: "Lacunas, revisão, auditoria e dossiês.", views: ["findings", "dossier"] },
  { id: "intelligence", number: "05", label: "Inteligência", description: "Knowledge Base, modelos, inferências e MLOps.", generatedView: "module-intelligence" },
  { id: "compliance", number: "06", label: "Compliance", description: "Impacto, prontidão regulatória e publicação.", views: ["impact"], generatedView: "module-compliance" }
];

const LABELS = {
  overview: "Visão geral",
  products: "Produtos e portfólio",
  measure: "Modelagem e medidas",
  identify: "Identificação têxtil",
  operations: "Operações produtivas",
  findings: "Lacunas e pendências",
  dossier: "Dossiês verificáveis",
  impact: "Impacto ambiental",
  iam: "Pessoas e workspaces"
};

function legacy(view) {
  document.querySelector(`.nav[data-view="${view}"]`)?.click();
}

function showGenerated(id, title) {
  document.querySelectorAll(".view").forEach((view) => view.classList.add("hidden"));
  document.querySelector(`#${id}`)?.classList.remove("hidden");
  document.querySelectorAll(".nav, .module-nav-entry").forEach((item) => item.classList.remove("active"));
  document.querySelector(`[data-generated-view="${id}"]`)?.classList.add("active");
  const heading = document.querySelector("#pageTitle");
  if (heading) heading.textContent = title;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function ensureGeneratedViews() {
  const main = document.querySelector("main");
  if (!main) return;

  if (!document.querySelector("#module-intelligence")) {
    const section = document.createElement("section");
    section.id = "module-intelligence";
    section.className = "view hidden module-landing";
    section.innerHTML = `
      <div class="module-landing-hero">
        <p class="eyebrow">MÓDULO 05</p>
        <h2>Inteligência, conhecimento e modelos</h2>
        <p>Conhecimento têxtil, inferências e histórico de modelos sem confundir hipótese com prova.</p>
      </div>
      <div class="module-capability-grid">
        <article><span>KB</span><h3>Knowledge Base</h3><p>Taxonomias, fontes e relações de conhecimento.</p><button class="link" data-module-target="identify">Abrir identificação assistida →</button></article>
        <article><span>AI</span><h3>Modelos e inferências</h3><p>Hipóteses, confiança experimental, limitações e revisão humana.</p><button class="link" data-module-target="identify">Abrir assistente experimental →</button></article>
        <article><span>ML</span><h3>MLOps e telemetria</h3><p>Saúde do PI5, versão do modelo, eventos e feedback.</p><div id="modulePi5Status" class="module-status">Consultando o modelo…</div></article>
      </div>`;
    main.appendChild(section);
  }

  if (!document.querySelector("#module-compliance")) {
    const section = document.createElement("section");
    section.id = "module-compliance";
    section.className = "view hidden module-landing";
    section.innerHTML = `
      <div class="module-landing-hero">
        <p class="eyebrow">MÓDULO 06</p>
        <h2>Compliance, impacto e publicação</h2>
        <p>Converta evidências revisadas em prontidão regulatória, relatórios e decisões de publicação.</p>
      </div>
      <div class="module-capability-grid">
        <article><span>BR</span><h3>Buyer Readiness</h3><p>Completude mínima, requisitos e bloqueios por produto.</p><button class="link" data-module-target="findings">Abrir lacunas →</button></article>
        <article><span>ES</span><h3>Impacto e escopo</h3><p>Estimativas com fonte, escopo e limitações explícitas.</p><button class="link" data-module-target="impact">Abrir impacto ambiental →</button></article>
        <article><span>DP</span><h3>Dossiê e DPP</h3><p>Snapshots verificáveis e publicação controlada.</p><button class="link" data-module-target="dossier">Abrir dossiês →</button></article>
      </div>`;
    main.appendChild(section);
  }
}

async function hydratePi5() {
  const target = document.querySelector("#modulePi5Status");
  if (!target) return;
  try {
    const [healthRes, modelRes] = await Promise.all([
      fetch("/api/v1/pi5/health"),
      fetch("/api/v1/pi5/model")
    ]);
    if (!healthRes.ok || !modelRes.ok) throw new Error("unavailable");
    const health = await healthRes.json();
    const model = await modelRes.json();
    target.innerHTML = `<strong>${model.name || model.model || "PI5"}</strong><span>${health.status || "ativo"} · ${model.version || "versão registrada"}</span>`;
  } catch {
    target.innerHTML = "<strong>MLOps preservado</strong><span>Status não disponível neste ambiente.</span>";
  }
}

function rebuildNavigation() {
  const nav = document.querySelector(".sidebar nav");
  if (!nav || nav.dataset.sixModules === "ready") return;

  const buttons = new Map([...nav.querySelectorAll(".nav[data-view]")].map((button) => [button.dataset.view, button]));
  const onboarding = buttons.get("onboarding");
  const overview = buttons.get("overview");
  const iam = buttons.get("iam");

  nav.innerHTML = "";
  nav.dataset.sixModules = "ready";
  nav.classList.add("six-module-nav");

  if (onboarding) {
    onboarding.innerHTML = `<span>00</span> Início e ajuda`;
    onboarding.classList.add("nav-onboarding");
    nav.appendChild(onboarding);
  }

  if (overview) {
    overview.innerHTML = `<span>·</span> ${LABELS.overview}`;
    overview.classList.add("nav-overview");
    nav.appendChild(overview);
  }

  MODULES.forEach((module, index) => {
    const group = document.createElement("section");
    group.className = "module-nav-group";

    const header = document.createElement("button");
    header.type = "button";
    header.className = "module-nav-header";
    header.setAttribute("aria-expanded", index < 4 ? "true" : "false");
    header.innerHTML = `<span>${module.number}</span><div><strong>${module.label}</strong><small>${module.description}</small></div><i>⌄</i>`;

    const children = document.createElement("div");
    children.className = "module-nav-children";
    if (index >= 4) children.hidden = true;

    if (module.generatedView) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "module-nav-entry module-child-nav";
      button.dataset.generatedView = module.generatedView;
      button.innerHTML = `<span class="nav-dot"></span>Visão do módulo`;
      button.addEventListener("click", () => {
        showGenerated(module.generatedView, module.label);
        if (module.id === "intelligence") hydratePi5();
      });
      children.appendChild(button);
    }

    for (const view of module.views || []) {
      const button = buttons.get(view);
      if (!button) continue;
      button.innerHTML = `<span class="nav-dot"></span>${LABELS[view] || view}`;
      button.classList.add("module-child-nav");
      children.appendChild(button);
    }

    header.addEventListener("click", () => {
      const expanded = header.getAttribute("aria-expanded") === "true";
      header.setAttribute("aria-expanded", String(!expanded));
      children.hidden = expanded;
      if (!expanded) {
        if (module.generatedView) {
          showGenerated(module.generatedView, module.label);
          if (module.id === "intelligence") hydratePi5();
        } else if (module.views?.[0]) {
          legacy(module.views[0]);
        }
      }
    });

    group.append(header, children);
    nav.appendChild(group);
  });

  if (iam) {
    const admin = document.createElement("section");
    admin.className = "module-nav-admin";
    const label = document.createElement("p");
    label.textContent = "ADMINISTRAÇÃO";
    iam.innerHTML = `<span class="nav-dot"></span>${LABELS.iam}`;
    iam.classList.add("module-child-nav");
    admin.append(label, iam);
    nav.appendChild(admin);
  }
}

function addFlow() {
  const overview = document.querySelector("#overview");
  if (!overview || overview.querySelector(".evidence-flow")) return;
  const flow = document.createElement("div");
  flow.className = "evidence-flow";
  flow.innerHTML = MODULES.map((module, index) => `
    <button type="button" data-flow-module="${module.id}">
      <span>${module.number}</span><strong>${module.label}</strong>${index < MODULES.length - 1 ? "<i>→</i>" : ""}
    </button>`).join("");
  overview.insertBefore(flow, overview.querySelector(".metrics"));
  flow.querySelectorAll("[data-flow-module]").forEach((button) => {
    button.addEventListener("click", () => {
      const module = MODULES.find((item) => item.id === button.dataset.flowModule);
      if (module.generatedView) {
        showGenerated(module.generatedView, module.label);
        if (module.id === "intelligence") hydratePi5();
      } else {
        legacy(module.views[0]);
      }
    });
  });
}

function wireActions() {
  document.querySelectorAll("[data-module-target]").forEach((button) => {
    button.addEventListener("click", () => legacy(button.dataset.moduleTarget));
  });
}

function init() {
  ensureGeneratedViews();
  rebuildNavigation();
  addFlow();
  wireActions();
  document.documentElement.dataset.phyllosArchitecture = "six-modules";
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
