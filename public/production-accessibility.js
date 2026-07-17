const MEDIA_STORAGE_KEY = "phyllos-production-media";
const ACCESS_STORAGE_KEY = "phyllos-accessibility-ui";
const SECTION_ID = "productionSpecificationSection";
const sectionSelector = `#${SECTION_ID}`;
let lastSignature = "";

const $ = (selector, root = document) => root.querySelector(selector);
const all = (selector, root = document) => [...root.querySelectorAll(selector)];

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readMedia() {
  return readJson(MEDIA_STORAGE_KEY, {});
}

function saveMedia(store) {
  writeJson(MEDIA_STORAGE_KEY, store);
}

function readAccessibility() {
  return { fontSize: "large", contrast: "normal", ...(readJson(ACCESS_STORAGE_KEY, {})) };
}

function saveAccessibility(prefs) {
  writeJson(ACCESS_STORAGE_KEY, prefs);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function svgDataUrl(svg) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function palette(seed = "phyllos") {
  const palettes = [
    ["#285446", "#b7d3c2", "#f7f4ee"],
    ["#6b5a3b", "#e8d9b8", "#f9f6ef"],
    ["#4b5963", "#cad7df", "#f5f7f8"],
    ["#7b4f54", "#e9c8cd", "#fbf5f6"],
  ];
  const hash = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palettes[hash % palettes.length];
}

function firstWords(value = "", count = 2) {
  return String(value).trim().split(/\s+/).filter(Boolean).slice(0, count).join(" ") || "PHYLLOS";
}

function createPlaceholder(label, subtitle = "Produção") {
  const [dark, soft, paper] = palette(label + subtitle);
  const initials = firstWords(label, 2).slice(0, 16);
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 720">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="${paper}" />
        <stop offset="100%" stop-color="${soft}" />
      </linearGradient>
    </defs>
    <rect width="960" height="720" fill="url(#g)" rx="40"/>
    <circle cx="775" cy="170" r="150" fill="${soft}" opacity="0.55"/>
    <circle cx="150" cy="600" r="140" fill="${dark}" opacity="0.12"/>
    <rect x="94" y="94" width="772" height="532" rx="28" fill="white" opacity="0.82"/>
    <text x="140" y="215" fill="${dark}" font-family="Georgia, serif" font-size="64">${escapeHtml(initials)}</text>
    <text x="140" y="285" fill="${dark}" opacity="0.88" font-family="Arial, sans-serif" font-size="28">${escapeHtml(subtitle)}</text>
    <rect x="140" y="350" width="420" height="18" rx="9" fill="${dark}" opacity="0.18"/>
    <rect x="140" y="392" width="330" height="18" rx="9" fill="${dark}" opacity="0.14"/>
    <rect x="140" y="434" width="380" height="18" rx="9" fill="${dark}" opacity="0.12"/>
    <rect x="140" y="508" width="130" height="46" rx="23" fill="${dark}" opacity="0.18"/>
    <text x="165" y="537" fill="${dark}" font-family="Arial, sans-serif" font-size="18">PHYLLOS</text>
  </svg>`;
  return svgDataUrl(svg);
}

function createMaterialPlaceholder(label) {
  const [dark, soft, paper] = palette(`material-${label}`);
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 520">
    <rect width="720" height="520" fill="${paper}"/>
    <rect x="70" y="66" width="580" height="388" rx="28" fill="${soft}"/>
    <path d="M90 140c80 36 160 36 240 0s160-36 240 0 160 36 240 0" stroke="${dark}" stroke-opacity="0.22" stroke-width="18" fill="none" transform="translate(-60 10)"/>
    <path d="M90 220c80 36 160 36 240 0s160-36 240 0 160 36 240 0" stroke="${dark}" stroke-opacity="0.16" stroke-width="18" fill="none" transform="translate(-60 10)"/>
    <path d="M90 300c80 36 160 36 240 0s160-36 240 0 160 36 240 0" stroke="${dark}" stroke-opacity="0.12" stroke-width="18" fill="none" transform="translate(-60 10)"/>
    <text x="96" y="108" fill="${dark}" font-family="Arial, sans-serif" font-size="24">MATERIAL</text>
    <text x="96" y="416" fill="${dark}" font-family="Georgia, serif" font-size="34">${escapeHtml(firstWords(label, 3))}</text>
  </svg>`;
  return svgDataUrl(svg);
}

function buildGalleryItem(label, src, pieceName, slotClass) {
  return `
    <figure class="visual-preview-card ${slotClass}">
      <img src="${src}" alt="${escapeHtml(label)} de ${escapeHtml(pieceName)}">
      <figcaption>
        <strong>${escapeHtml(label)}</strong>
        <small>${slotClass === "cover" ? "Peça" : slotClass === "fabric" ? "Material" : "Detalhe"}</small>
      </figcaption>
    </figure>`;
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function applyAccessibilityClasses() {
  const prefs = readAccessibility();
  document.body.classList.toggle("phyllos-access-large", prefs.fontSize === "large");
  document.body.classList.toggle("phyllos-access-contrast", prefs.contrast === "high");
}

function toolbarHtml() {
  const prefs = readAccessibility();
  return `
    <div class="production-visual-toolbar" id="productionVisualToolbar">
      <div>
        <span class="eyebrow">ACESSIBILIDADE VISUAL</span>
        <strong>Leitura mais confortável para costureiras e ateliês</strong>
        <small>Ative letras maiores e maior contraste para reduzir esforço visual.</small>
      </div>
      <div class="visual-toolbar-actions">
        <button class="toolbar-toggle ${prefs.fontSize === "large" ? "active" : ""}" data-visual-action="toggle-font-size">${prefs.fontSize === "large" ? "Fonte ampliada ativa" : "Ativar fonte ampliada"}</button>
        <button class="toolbar-toggle ${prefs.contrast === "high" ? "active" : ""}" data-visual-action="toggle-contrast">${prefs.contrast === "high" ? "Alto contraste ativo" : "Ativar alto contraste"}</button>
      </div>
    </div>`;
}

function ensureToolbar(section) {
  if (!section) return;
  const head = $(".production-spec-head", section);
  if (!head) return;
  let toolbar = $("#productionVisualToolbar", section);
  if (!toolbar) {
    head.insertAdjacentHTML("beforebegin", toolbarHtml());
  } else {
    toolbar.outerHTML = toolbarHtml();
  }
}

function cardMedia(pieceId) {
  const store = readMedia();
  return store[pieceId] || { cover: "", fabric: "", detail: "" };
}

function cardTitle(card) {
  return $(".smart-card-title strong", card)?.textContent?.trim() || "Peça PHYLLOS";
}

function buildSummaryMedia(card) {
  const pieceId = card.dataset.smartPiece;
  const pieceName = cardTitle(card);
  const media = cardMedia(pieceId);
  const title = $(".smart-card-title", card);
  if (!pieceId || !title) return;
  const src = media.cover || createPlaceholder(pieceName, "Peça em produção");
  if (!title.querySelector(".smart-card-text")) {
    title.innerHTML = `<img class="smart-card-inline-image" src="${src}" alt="Imagem principal de ${escapeHtml(pieceName)}"><span class="smart-card-text">${title.innerHTML}</span>`;
  } else {
    const image = $(".smart-card-inline-image", title);
    if (image) image.src = src;
  }
}

function galleryHtml(pieceId, pieceName) {
  const media = cardMedia(pieceId);
  const coverSrc = media.cover || createPlaceholder(pieceName, "Peça em produção");
  const fabricSrc = media.fabric || createMaterialPlaceholder(pieceName);
  const detailSrc = media.detail || createPlaceholder(pieceName, "Acabamento e detalhe");
  return `
    <section class="production-visual-gallery" data-visual-gallery="${pieceId}">
      <div class="tab-intro visual-gallery-head">
        <div>
          <h4>Imagens da peça</h4>
          <p>Use fotos para reconhecer rapidamente a peça, o tecido e os detalhes. As imagens ficam salvas apenas no navegador deste dispositivo.</p>
        </div>
        <span>Visual e acessível</span>
      </div>
      <div class="visual-gallery-grid">
        ${buildGalleryItem("Imagem principal", coverSrc, pieceName, "cover")}
        ${buildGalleryItem("Tecido ou material", fabricSrc, pieceName, "fabric")}
        ${buildGalleryItem("Detalhe ou acabamento", detailSrc, pieceName, "detail")}
      </div>
      <div class="visual-upload-grid">
        <label class="visual-upload-card">
          <strong>Enviar imagem principal</strong>
          <small>Foto da peça para reconhecer rapidamente no card.</small>
          <input class="visual-upload-input" type="file" accept="image/*" data-piece="${pieceId}" data-slot="cover">
        </label>
        <label class="visual-upload-card">
          <strong>Enviar imagem do tecido</strong>
          <small>Ajuda a comparar textura, composição e aplicação.</small>
          <input class="visual-upload-input" type="file" accept="image/*" data-piece="${pieceId}" data-slot="fabric">
        </label>
        <label class="visual-upload-card">
          <strong>Enviar imagem de detalhe</strong>
          <small>Mostre acabamento, aviamento, ponto ou defeito.</small>
          <input class="visual-upload-input" type="file" accept="image/*" data-piece="${pieceId}" data-slot="detail">
        </label>
      </div>
      <div class="visual-gallery-actions">
        <button class="secondary-action" data-visual-action="remove-image" data-piece="${pieceId}" data-slot="cover">Limpar principal</button>
        <button class="secondary-action" data-visual-action="remove-image" data-piece="${pieceId}" data-slot="fabric">Limpar tecido</button>
        <button class="secondary-action" data-visual-action="remove-image" data-piece="${pieceId}" data-slot="detail">Limpar detalhe</button>
      </div>
    </section>`;
}

function ensureGallery(card) {
  const pieceId = card.dataset.smartPiece;
  const pieceName = cardTitle(card);
  const detail = $(".smart-card-detail", card);
  if (!pieceId || !detail) return;
  const governance = $(".card-governance", detail);
  let gallery = $("[data-visual-gallery]", detail);
  const html = galleryHtml(pieceId, pieceName);
  if (!gallery) {
    if (governance) governance.insertAdjacentHTML("afterend", html);
    else detail.insertAdjacentHTML("afterbegin", html);
  } else {
    gallery.outerHTML = html;
  }
}

function decorateLibraryReferences(card) {
  all(".library-reference", card).forEach((block) => {
    if (block.querySelector(".library-reference-figure")) return;
    const title = $("strong", block)?.textContent?.trim() || "Biblioteca";
    block.insertAdjacentHTML("afterbegin", `<img class="library-reference-figure" src="${createMaterialPlaceholder(title)}" alt="Referência visual de ${escapeHtml(title)}">`);
  });
}

function enhanceCards() {
  const cards = all(".smart-production-card");
  cards.forEach((card) => {
    buildSummaryMedia(card);
    ensureGallery(card);
    decorateLibraryReferences(card);
  });
}

function renderEnhancements() {
  applyAccessibilityClasses();
  const section = $(sectionSelector);
  if (!section) return;
  ensureToolbar(section);
  enhanceCards();
}

async function handleFileUpload(input) {
  const [file] = input.files || [];
  const pieceId = input.dataset.piece;
  const slot = input.dataset.slot;
  if (!file || !pieceId || !slot) return;
  if (!file.type.startsWith("image/")) {
    alert("Selecione um arquivo de imagem.");
    return;
  }
  const dataUrl = await readAsDataUrl(file);
  const store = readMedia();
  store[pieceId] = { cover: "", fabric: "", detail: "", ...(store[pieceId] || {}), [slot]: dataUrl };
  saveMedia(store);
  renderEnhancements();
}

function handleToolbarAction(button) {
  const prefs = readAccessibility();
  if (button.dataset.visualAction === "toggle-font-size") {
    prefs.fontSize = prefs.fontSize === "large" ? "standard" : "large";
  } else if (button.dataset.visualAction === "toggle-contrast") {
    prefs.contrast = prefs.contrast === "high" ? "normal" : "high";
  } else if (button.dataset.visualAction === "remove-image") {
    const pieceId = button.dataset.piece;
    const slot = button.dataset.slot;
    const store = readMedia();
    if (store[pieceId]) {
      store[pieceId][slot] = "";
      saveMedia(store);
    }
    renderEnhancements();
    return;
  }
  saveAccessibility(prefs);
  renderEnhancements();
}

document.addEventListener("change", (event) => {
  const upload = event.target.closest(".visual-upload-input");
  if (!upload) return;
  handleFileUpload(upload).catch(() => alert("Não foi possível carregar a imagem. Tente novamente."));
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-visual-action]");
  if (!button) return;
  handleToolbarAction(button);
});

function monitorChanges() {
  const signature = `${localStorage.getItem("phyllos-portfolio") || ""}|${localStorage.getItem("phyllos-projects") || ""}|${localStorage.getItem("phyllos-production-specifications") || ""}|${localStorage.getItem(MEDIA_STORAGE_KEY) || ""}|${localStorage.getItem(ACCESS_STORAGE_KEY) || ""}`;
  if (signature !== lastSignature) {
    lastSignature = signature;
    renderEnhancements();
  }
}

function init() {
  applyAccessibilityClasses();
  renderEnhancements();
  lastSignature = `${localStorage.getItem("phyllos-portfolio") || ""}|${localStorage.getItem("phyllos-projects") || ""}|${localStorage.getItem("phyllos-production-specifications") || ""}|${localStorage.getItem(MEDIA_STORAGE_KEY) || ""}|${localStorage.getItem(ACCESS_STORAGE_KEY) || ""}`;
  setInterval(monitorChanges, 900);
  const observer = new MutationObserver(() => renderEnhancements());
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("storage", renderEnhancements);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
else init();
