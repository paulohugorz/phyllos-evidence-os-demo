import { invariant } from "./errors.js";

export const EPISTEMIC_STATES = Object.freeze([
  "missing", "declared", "estimated", "calculated", "inferred", "submitted",
  "validated", "proven", "expired", "contested", "superseded",
]);

const transitions = new Map([
  ["missing", new Set(["declared", "submitted", "estimated", "calculated"])],
  ["declared", new Set(["submitted", "contested", "superseded", "expired"])],
  ["estimated", new Set(["calculated", "submitted", "contested", "superseded", "expired"])],
  ["calculated", new Set(["submitted", "validated", "contested", "superseded", "expired"])],
  ["inferred", new Set(["submitted", "contested", "superseded", "expired"])],
  ["submitted", new Set(["validated", "contested", "superseded", "expired"])],
  ["validated", new Set(["proven", "contested", "superseded", "expired"])],
  ["proven", new Set(["contested", "superseded", "expired"])],
  ["expired", new Set(["submitted", "superseded"])],
  ["contested", new Set(["submitted", "superseded"])],
  ["superseded", new Set()],
]);

export function assertEpistemicTransition(from, to, context = {}) {
  invariant(EPISTEMIC_STATES.includes(to), "INVALID_EPISTEMIC_STATUS", `Estado desconhecido: ${to}`);
  if (from) invariant(transitions.get(from)?.has(to), "INVALID_EPISTEMIC_TRANSITION", `Transição inválida: ${from} → ${to}`);
  if (to === "proven") {
    invariant(context.ruleRunId, "PROVEN_REQUIRES_RULE", "Comprovado exige execução de regra");
    invariant(context.reviewId, "PROVEN_REQUIRES_REVIEW", "Comprovado exige revisão autorizada");
    invariant(context.actorRole === "reviewer", "PROVEN_REQUIRES_REVIEWER", "Somente revisor pode marcar como comprovado");
  }
}
