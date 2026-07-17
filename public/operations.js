export const STAGES = {
  planned: "Planejamento", materials: "Materiais", cutting: "Corte", sewing: "Costura",
  fitting: "Prova", quality: "Qualidade", ready: "Pronta", delivered: "Entregue",
};

export function operationalItems(items = []) {
  return items.filter((item) => ["custom", "batch"].includes(item.mode));
}

export function dueState(item, today = new Date()) {
  if (!item.dueDate || item.stage === "delivered") return "none";
  const due = new Date(`${item.dueDate}T23:59:59`);
  const comparisonDay = new Date(today);
  comparisonDay.setHours(23, 59, 59, 0);
  const days = Math.round((due - comparisonDay) / 86400000);
  if (days < 0) return "late";
  if (days <= 2) return "risk";
  return "ok";
}

export function materialNeed(item) {
  const quantity = Math.max(1, Number(item.quantity) || 1);
  const massKg = Math.max(0, Number(item.mass) || 0) / 1000;
  const waste = 1 + Math.max(0, Number(item.waste) || 0) / 100;
  const required = quantity * massKg * waste;
  const available = Math.max(0, Number(item.materialAvailable) || 0);
  return { required, available, shortage: Math.max(0, required - available) };
}

export function explainAlerts(item, today = new Date()) {
  const alerts = [];
  if (item.blocked === "yes") alerts.push({ level: "critical", code: "blocked", text: `Bloqueio: ${item.blockReason || "motivo não informado"}` });
  const due = dueState(item, today);
  if (due === "late") alerts.push({ level: "critical", code: "late", text: "Prazo vencido e compromisso não entregue" });
  if (due === "risk") alerts.push({ level: "warning", code: "due-risk", text: "Prazo em até 2 dias" });
  const material = materialNeed(item);
  if (material.required > 0 && material.shortage > 0) alerts.push({ level: "warning", code: "material", text: `Faltam ${material.shortage.toFixed(2)} kg de material` });
  if (!item.nextAction) alerts.push({ level: "warning", code: "next-action", text: "Próxima ação não definida" });
  if (!item.responsible) alerts.push({ level: "info", code: "owner", text: "Responsável não definido" });
  if (Number(item.actualCost) > Number(item.plannedCost) && Number(item.plannedCost) > 0) alerts.push({ level: "warning", code: "cost", text: "Custo realizado acima do previsto" });
  return alerts;
}

export function priorityScore(item, today = new Date()) {
  const weights = { critical: 10, warning: 4, info: 1 };
  return explainAlerts(item, today).reduce((sum, alert) => sum + weights[alert.level], 0) + (item.nextAction ? 2 : 0);
}

export function moveItemStage(items, id, stage, changedAt = new Date().toISOString()) {
  if (!STAGES[stage]) return items;
  return items.map((item) => item.id === id ? { ...item, stage, stageChangedAt: changedAt, updatedAt: changedAt } : item);
}
