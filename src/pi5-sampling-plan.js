const Z = { 0.90: 1.645, 0.95: 1.96, 0.99: 2.576 };

export function requiredSampleSize({ confidence = 0.95, margin = 0.15, expectedStdDev = 0.8, designEffect = 1.15, attrition = 0.15 } = {}) {
  const z = Z[confidence];
  if (!z) throw new Error("confidence deve ser 0.90, 0.95 ou 0.99");
  if (!(margin > 0)) throw new Error("margin deve ser maior que zero");
  if (!(expectedStdDev > 0)) throw new Error("expectedStdDev deve ser maior que zero");
  if (!(designEffect >= 1)) throw new Error("designEffect deve ser pelo menos 1");
  if (!(attrition >= 0 && attrition < 1)) throw new Error("attrition deve estar entre 0 e 1");
  const analyzable = Math.ceil(((z * expectedStdDev) / margin) ** 2 * designEffect);
  const collected = Math.ceil(analyzable / (1 - attrition));
  return { confidence, margin, expectedStdDev, designEffect, attrition, analyzable, collected };
}

export function stratifiedPlan({ categories, total, minimumPerCategory = 30, strategicWeights = {}, evidenceMix = { verified: 0.50, measured: 0.30, documented: 0.20 } } = {}) {
  if (!Array.isArray(categories) || !categories.length) throw new Error("categories é obrigatória");
  if (total < categories.length * minimumPerCategory) throw new Error("total é insuficiente para o mínimo por categoria");
  const weights = categories.map((category) => Math.max(0, Number(strategicWeights[category] ?? 1)));
  const sum = weights.reduce((a, b) => a + b, 0);
  const remaining = total - categories.length * minimumPerCategory;
  const allocation = Object.fromEntries(categories.map((category, index) => [category, minimumPerCategory + Math.floor(remaining * weights[index] / sum)]));
  let assigned = Object.values(allocation).reduce((a, b) => a + b, 0);
  let cursor = 0;
  while (assigned < total) {
    allocation[categories[cursor % categories.length]] += 1;
    assigned += 1;
    cursor += 1;
  }
  const perCategory = Object.fromEntries(categories.map((category) => {
    const n = allocation[category];
    const verified = Math.round(n * evidenceMix.verified);
    const measured = Math.round(n * evidenceMix.measured);
    const documented = n - verified - measured;
    return [category, { total: n, verified, measured, documented }];
  }));
  return { total, minimumPerCategory, categories, evidenceMix, perCategory };
}

export function maturityGates({ categories = 6 } = {}) {
  return {
    protocolPilot: { goldSamples: Math.max(70, categories * 10), purpose: "validar captura, rotulagem e qualidade; não afirmar desempenho geral" },
    firstCategoryEvaluation: { goldSamples: categories * 50, purpose: "avaliar erro e calibração por categoria com alta incerteza residual" },
    reliableCalibration: { goldSamples: categories * 100, purpose: "calibrar e avaliar slices principais com holdout por linhagem" },
    matureEvidenceBase: { goldSamples: categories * 200, purpose: "cobrir materiais, processos, fornecedores e extremos com maior estabilidade" },
  };
}
