const endpoint = "/api/v1/usage-events";
const schemaVersion = "usage-event-v1";
const startedAt = Date.now();
const nativeFetch = window.fetch.bind(window);
const uuid = () => globalThis.crypto?.randomUUID?.() || `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

let sessionId = sessionStorage.getItem("phyllos_usage_session");
if (!sessionId) {
  sessionId = uuid();
  sessionStorage.setItem("phyllos_usage_session", sessionId);
}

function componentName(element) {
  return element?.dataset?.telemetry || element?.dataset?.view || element?.id ||
    element?.getAttribute?.("name") || element?.getAttribute?.("role") ||
    element?.tagName?.toLowerCase() || "unknown";
}

function track(name, details = {}) {
  const payload = {
    eventId: uuid(), schemaVersion, sessionId, name,
    page: location.pathname, component: details.component || null,
    action: details.action || null, metadata: details.metadata || {},
    occurredAt: new Date().toISOString(),
  };
  const content = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, new Blob([content], { type: "application/json" }));
  } else {
    nativeFetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: content, keepalive: true }).catch(() => {});
  }
}

window.PhyllosTelemetry = { track };

window.fetch = async function trackedFetch(input, init) {
  const response = await nativeFetch(input, init);
  const url = typeof input === "string" ? input : input?.url || "";
  if (!response.ok) track("api_error", { component: "fetch", action: "response", metadata: { statusCode: response.status, step: "request" } });
  if (response.ok && /\/api\/v1\/dossiers(?:\?|$)/.test(url)) track("flow_complete", { component: "dossier", action: "freeze", metadata: { flow: "freeze_dossier" } });
  return response;
};

document.addEventListener("DOMContentLoaded", () => {
  track("page_view", { component: "document", action: "view", metadata: { viewportWidth: innerWidth, viewportHeight: innerHeight } });
});

document.addEventListener("click", (event) => {
  const target = event.target.closest("button, a, [role='button'], [data-view], [data-go]");
  if (!target) return;
  const view = target.dataset.view || target.dataset.go;
  track(view ? "navigation" : "ui_action", {
    component: componentName(target), action: view ? "open_view" : "activate",
    metadata: { targetType: target.tagName.toLowerCase(), ...(view ? { view } : {}) },
  });
}, true);

const startedForms = new WeakSet();
document.addEventListener("focusin", (event) => {
  const form = event.target.closest("form");
  if (!form || startedForms.has(form)) return;
  startedForms.add(form);
  track("form_start", { component: componentName(form), action: "start", metadata: { formId: form.id || "anonymous" } });
}, true);

document.addEventListener("submit", (event) => {
  track("form_submit", { component: componentName(event.target), action: "submit", metadata: { formId: event.target.id || "anonymous" } });
}, true);

document.addEventListener("change", (event) => {
  if (!event.target.matches("input, select, textarea")) return;
  track("field_change", { component: componentName(event.target), action: "change", metadata: { fieldType: event.target.type || event.target.tagName.toLowerCase() } });
}, true);

window.addEventListener("error", () => track("js_error", { component: "window", action: "error", metadata: { step: "runtime" } }));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") track("session_end", { component: "document", action: "hide", metadata: { durationMs: Date.now() - startedAt } });
});
