export const LIBRARY_VERSION = "2026.07.1";

export const SOURCE_STATES = {
  reference: { label: "Referência da biblioteca", weight: 0.15, tone: "reference" },
  estimated: { label: "Estimativa aceita", weight: 0.35, tone: "estimated" },
  declared: { label: "Dado declarado", weight: 0.55, tone: "declared" },
  measured: { label: "Dado medido", weight: 0.8, tone: "measured" },
  documented: { label: "Dado documentado", weight: 1, tone: "documented" },
};

export const MATERIAL_LIBRARY = [
  { id: "cotton-woven", name: "Tecido plano de algodão", family: "cotton", unit: "g", carbonKgPerKg: 5.6, waterLPerKg: 8200, defaultWaste: 12, circularity: "Reciclável quando monomaterial e sem acabamentos impeditivos", risks: "Origem da fibra, irrigação, tingimento e acabamento", evidence: "Etiqueta, ficha técnica, origem e composição" },
  { id: "organic-cotton", name: "Algodão orgânico", family: "cotton", unit: "g", carbonKgPerKg: 3.8, waterLPerKg: 4300, defaultWaste: 12, circularity: "Reciclável quando monomaterial", risks: "Alegação orgânica depende de cadeia e certificação verificável", evidence: "Certificado de escopo/transação e ficha técnica" },
  { id: "linen-woven", name: "Tecido plano de linho", family: "linen-viscose", unit: "g", carbonKgPerKg: 2.9, waterLPerKg: 2500, defaultWaste: 14, circularity: "Boa reciclabilidade quando sem mistura", risks: "Retting, beneficiamento, mistura e distância de origem", evidence: "Composição, gramatura, origem e beneficiamento" },
  { id: "linen-viscose", name: "Linho com viscose", family: "linen-viscose", unit: "g", carbonKgPerKg: 4.3, waterLPerKg: 3900, defaultWaste: 14, circularity: "Misturas dificultam separação e reciclagem", risks: "Proporção da mistura e processo da viscose", evidence: "Ficha técnica com percentuais e fornecedor" },
  { id: "viscose-woven", name: "Tecido de viscose", family: "viscose", unit: "g", carbonKgPerKg: 5.1, waterLPerKg: 3100, defaultWaste: 13, circularity: "Reciclagem depende de composição e infraestrutura", risks: "Origem da celulose, químicos e tratamento de efluentes", evidence: "Fornecedor, origem da celulose e processo" },
  { id: "polyester-woven", name: "Tecido de poliéster", family: "polyester", unit: "g", carbonKgPerKg: 9.2, waterLPerKg: 900, defaultWaste: 10, circularity: "Potencial técnico de reciclagem; mistura e acabamento podem limitar", risks: "Origem fóssil, energia, microfibras e fim de vida", evidence: "Composição, massa e conteúdo reciclado quando alegado" },
  { id: "recycled-polyester", name: "Poliéster reciclado", family: "recycled-polyester", unit: "g", carbonKgPerKg: 4.8, waterLPerKg: 700, defaultWaste: 10, circularity: "Mantém desafios de microfibras e reciclagem futura", risks: "Origem do reciclado e rastreabilidade da alegação", evidence: "Certificação, conteúdo reciclado e cadeia de custódia" },
  { id: "wool-fabric", name: "Tecido de lã", family: "generic", unit: "g", carbonKgPerKg: 22, waterLPerKg: 7100, defaultWaste: 15, circularity: "Durável e reciclável quando composição é conhecida", risks: "Criação animal, metano, lavagem e acabamento", evidence: "Origem, composição, bem-estar e processamento" },
  { id: "polyester-thread", name: "Linha de poliéster", family: "polyester", unit: "g", carbonKgPerKg: 9.2, waterLPerKg: 900, defaultWaste: 4, circularity: "Pode comprometer monomaterialidade em pequenas proporções", risks: "Composição e quantidade normalmente não registradas", evidence: "Ficha do insumo e consumo estimado/medido" },
  { id: "cotton-thread", name: "Linha de algodão", family: "cotton", unit: "g", carbonKgPerKg: 5.6, waterLPerKg: 8200, defaultWaste: 4, circularity: "Favorece compatibilidade com peças de algodão", risks: "Resistência, tingimento e origem da fibra", evidence: "Ficha do insumo e consumo" },
  { id: "fusible-interlining", name: "Entretela termocolante", family: "generic", unit: "g", carbonKgPerKg: 8.1, waterLPerKg: 1000, defaultWaste: 18, circularity: "Adesivo e mistura podem dificultar desmontagem", risks: "Polímero, adesivo, temperatura e área aplicada", evidence: "Composição, massa e ficha do fabricante" },
  { id: "metal-zipper", name: "Zíper metálico", family: "generic", unit: "g", carbonKgPerKg: 12.5, waterLPerKg: 1200, defaultWaste: 2, circularity: "Reutilizável se puder ser removido", risks: "Liga metálica, fita têxtil e reparabilidade", evidence: "Fornecedor, composição e peso" },
  { id: "resin-button", name: "Botão de resina", family: "generic", unit: "g", carbonKgPerKg: 8.7, waterLPerKg: 600, defaultWaste: 3, circularity: "Reutilizável quando removível", risks: "Tipo de resina e origem", evidence: "Fornecedor, quantidade e massa" },
  { id: "corozo-button", name: "Botão de corozo", family: "generic", unit: "g", carbonKgPerKg: 2.6, waterLPerKg: 1100, defaultWaste: 3, circularity: "Biogênico e reutilizável; acabamento deve ser conhecido", risks: "Origem, tingimento e alegações de biodegradação", evidence: "Origem do material e fornecedor" },
  { id: "paper-packaging", name: "Embalagem de papel", family: "generic", unit: "g", carbonKgPerKg: 1.3, waterLPerKg: 1800, defaultWaste: 2, circularity: "Reciclável quando limpa e sem laminação", risks: "Fibra virgem/reciclada, impressão e laminação", evidence: "Gramatura, conteúdo reciclado e fornecedor" },
  { id: "plastic-packaging", name: "Embalagem plástica", family: "polyester", unit: "g", carbonKgPerKg: 3.2, waterLPerKg: 300, defaultWaste: 2, circularity: "Reciclabilidade depende do polímero e coleta local", risks: "Uso único, polímero e destinação", evidence: "Tipo de polímero, massa e conteúdo reciclado" },
];

export const PROCESS_LIBRARY = [
  { id: "receiving", name: "Recebimento e conferência", energyKwh: 0.01, waterL: 0, wasteG: 0, risks: "Lote sem documentação ou divergência de quantidade", evidence: "Nota, lote, foto e conferência" },
  { id: "inspection", name: "Inspeção do material", energyKwh: 0.03, waterL: 0, wasteG: 2, risks: "Defeitos não detectados e baixa rastreabilidade", evidence: "Checklist, fotos e responsável" },
  { id: "resting", name: "Descanso do tecido", energyKwh: 0, waterL: 0, wasteG: 0, risks: "Tempo insuficiente e deformação no corte", evidence: "Data, duração e lote" },
  { id: "spreading", name: "Enfesto", energyKwh: 0.04, waterL: 0, wasteG: 1, risks: "Alinhamento, tensão e largura útil", evidence: "Plano de enfesto e operador" },
  { id: "cutting", name: "Corte", energyKwh: 0.12, waterL: 0, wasteG: 18, risks: "Perda de encaixe, erro e mistura de lotes", evidence: "Mapa de corte, peso de retalho e quantidade" },
  { id: "straight-sewing", name: "Costura reta", energyKwh: 0.18, waterL: 0, wasteG: 2, risks: "Retrabalho, tensão e resistência inadequada", evidence: "Tempo de máquina, operador e amostra" },
  { id: "overlock", name: "Overloque", energyKwh: 0.13, waterL: 0, wasteG: 3, risks: "Consumo de linha, aparas e acabamento", evidence: "Tempo, linha e regulagem" },
  { id: "pressing", name: "Passadoria", energyKwh: 0.24, waterL: 0.35, wasteG: 0, risks: "Energia, vapor e dano térmico", evidence: "Tempo, equipamento e temperatura" },
  { id: "washing", name: "Lavagem da peça", energyKwh: 0.32, waterL: 18, wasteG: 0, risks: "Água, químicos, efluentes e encolhimento", evidence: "Receita, volume, equipamento e efluente" },
  { id: "dyeing", name: "Tingimento", energyKwh: 0.7, waterL: 45, wasteG: 1, risks: "Químicos, água, energia, efluentes e repetição de banho", evidence: "Receita, lote, água, energia e tratamento" },
  { id: "embroidery", name: "Bordado", energyKwh: 0.2, waterL: 0, wasteG: 4, risks: "Linha adicional, entretela, tempo e retrabalho", evidence: "Programa, materiais, tempo e foto" },
  { id: "quality", name: "Revisão de qualidade", energyKwh: 0.02, waterL: 0, wasteG: 0, risks: "Critério inconsistente ou defeito sem causa registrada", evidence: "Checklist, defeitos e decisão" },
  { id: "repair", name: "Correção ou retrabalho", energyKwh: 0.15, waterL: 0, wasteG: 3, risks: "Duplicação de esforço e perda adicional", evidence: "Motivo, tempo, material e resultado" },
  { id: "packaging", name: "Embalagem", energyKwh: 0.02, waterL: 0, wasteG: 1, risks: "Excesso de material e ausência de especificação", evidence: "Tipo, massa e quantidade" },
];

export const TECHNIQUE_LIBRARY = [
  { id: "french-seam", name: "Costura francesa", durability: 2, repairability: 1, circularity: 0, timeMinutes: 8, note: "Acabamento interno protegido, com maior tempo e linha." },
  { id: "flat-felled", name: "Costura rebatida", durability: 3, repairability: 1, circularity: 0, timeMinutes: 7, note: "Eleva resistência em áreas submetidas a tração." },
  { id: "overlocked-seam", name: "Acabamento em overloque", durability: 1, repairability: 1, circularity: 0, timeMinutes: 3, note: "Controla desfiamento, mas adiciona linha sintética quando aplicável." },
  { id: "tailoring", name: "Construção de alfaiataria", durability: 2, repairability: 2, circularity: -1, timeMinutes: 35, note: "Pode elevar vida útil, porém usa camadas e estruturas adicionais." },
  { id: "zero-waste", name: "Modelagem zero waste", durability: 0, repairability: 0, circularity: 2, timeMinutes: 15, note: "Procura reduzir resíduo de corte por desenho do molde e encaixe." },
  { id: "upcycling", name: "Upcycling", durability: 1, repairability: 2, circularity: 3, timeMinutes: 30, note: "Reaproveita material existente; exige registrar origem e condição." },
  { id: "hand-embroidery", name: "Bordado manual", durability: 1, repairability: 2, circularity: 0, timeMinutes: 45, note: "Agrega trabalho manual e pode demandar fios e bases adicionais." },
  { id: "bias-bound", name: "Acabamento com viés", durability: 1, repairability: 2, circularity: 0, timeMinutes: 9, note: "Protege bordas e pode facilitar manutenção quando acessível." },
  { id: "reinforced-stitch", name: "Reforço em pontos críticos", durability: 3, repairability: 2, circularity: 0, timeMinutes: 5, note: "Reduz falhas em bolsos, entrepernas, alças e aberturas." },
  { id: "detachable-trim", name: "Aviamento removível", durability: 1, repairability: 3, circularity: 3, timeMinutes: 4, note: "Facilita troca, reparo e desmontagem ao fim de vida." },
];

const byId = (items, id) => items.find((item) => item.id === id);
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export function sourceWeight(source) {
  return SOURCE_STATES[source]?.weight ?? SOURCE_STATES.reference.weight;
}

export function createSuggestedSpecification(piece = {}) {
  const category = String(piece.category || "").toLowerCase();
  const materialName = String(piece.material || "").toLowerCase();
  let mainMaterial = "cotton-woven";
  if (materialName.includes("linho")) mainMaterial = materialName.includes("viscose") ? "linen-viscose" : "linen-woven";
  else if (materialName.includes("viscose")) mainMaterial = "viscose-woven";
  else if (materialName.includes("reciclad")) mainMaterial = "recycled-polyester";
  else if (materialName.includes("poliéster") || materialName.includes("poliester")) mainMaterial = "polyester-woven";

  const components = [
    { id: cryptoId("component"), name: "Material principal", materialId: mainMaterial, massG: number(piece.mass, 300), wastePct: number(piece.waste, byId(MATERIAL_LIBRARY, mainMaterial)?.defaultWaste || 12), source: piece.material ? "declared" : "reference", supplier: piece.supplier || "", origin: "", evidence: piece.evidence || "" },
    { id: cryptoId("component"), name: "Linha de costura", materialId: "polyester-thread", massG: 8, wastePct: 4, source: "reference", supplier: "", origin: "", evidence: "" },
    { id: cryptoId("component"), name: "Etiqueta", materialId: "polyester-woven", massG: 2, wastePct: 2, source: "reference", supplier: "", origin: "", evidence: "" },
    { id: cryptoId("component"), name: "Embalagem", materialId: "paper-packaging", massG: 25, wastePct: 2, source: "reference", supplier: "", origin: "", evidence: "" },
  ];
  if (["calça", "calca", "saia", "vestido", "jaqueta"].some((term) => category.includes(term))) {
    components.splice(2, 0, { id: cryptoId("component"), name: "Fechamento", materialId: "metal-zipper", massG: 18, wastePct: 2, source: "reference", supplier: "", origin: "", evidence: "" });
  }
  if (["camisa", "blusa", "jaqueta"].some((term) => category.includes(term))) {
    components.splice(2, 0, { id: cryptoId("component"), name: "Botões", materialId: "resin-button", massG: 12, wastePct: 3, source: "reference", supplier: "", origin: "", evidence: "" });
  }

  const routeIds = ["receiving", "inspection", "resting", "spreading", "cutting", "straight-sewing", "overlock", "pressing", "quality", "packaging"];
  const processes = routeIds.map((processId, index) => {
    const ref = byId(PROCESS_LIBRARY, processId);
    return { id: cryptoId("process"), processId, sequence: index + 1, energyKwh: ref.energyKwh, waterL: ref.waterL, wasteG: ref.wasteG, source: "reference", facility: piece.site || "", responsible: piece.responsible || "", evidence: "" };
  });

  return {
    pieceId: piece.id,
    libraryVersion: LIBRARY_VERSION,
    components,
    processes,
    techniques: [],
    snapshots: [],
    updatedAt: new Date().toISOString(),
  };
}

export function specificityScore(spec = {}) {
  const components = spec.components || [];
  const processes = spec.processes || [];
  const techniques = spec.techniques || [];

  const materialQuality = average(components.map((item) => {
    const completeness = average([
      item.materialId ? 1 : 0,
      number(item.massG) > 0 ? 1 : 0,
      String(item.supplier || "").trim() ? 1 : 0,
      String(item.origin || "").trim() ? 1 : 0,
    ]);
    const evidenceBoost = item.evidence ? 0.1 : 0;
    return clamp((sourceWeight(item.source) * 0.7 + completeness * 0.3 + evidenceBoost) * 100) / 100;
  }));

  const processQuality = average(processes.map((item) => {
    const measuredInputs = average([
      number(item.energyKwh) >= 0 ? 1 : 0,
      number(item.waterL) >= 0 ? 1 : 0,
      String(item.facility || "").trim() ? 1 : 0,
      String(item.responsible || "").trim() ? 1 : 0,
    ]);
    const evidenceBoost = item.evidence ? 0.1 : 0;
    return clamp((sourceWeight(item.source) * 0.7 + measuredInputs * 0.3 + evidenceBoost) * 100) / 100;
  }));

  const techniqueQuality = average(techniques.map((item) => clamp(sourceWeight(item.source) + (item.evidence ? 0.1 : 0), 0, 1)));
  const evidenceItems = [...components, ...processes, ...techniques];
  const evidenceQuality = evidenceItems.length ? evidenceItems.filter((item) => String(item.evidence || "").trim()).length / evidenceItems.length : 0;

  const score = (components.length ? materialQuality : 0) * 45
    + (processes.length ? processQuality : 0) * 30
    + (techniques.length ? techniqueQuality : 0) * 15
    + evidenceQuality * 10;
  return Math.round(clamp(score));
}

export function specificityLevel(score) {
  if (score >= 85) return "Auditável";
  if (score >= 70) return "Verificada";
  if (score >= 50) return "Específica";
  if (score >= 25) return "Contextualizada";
  return "Inicial";
}

export function estimateProductionImpact(spec = {}, quantity = 1) {
  const components = spec.components || [];
  const processes = spec.processes || [];
  const techniques = spec.techniques || [];
  const qty = Math.max(1, number(quantity, 1));
  const gridFactorKgPerKwh = 0.09;
  const waterTreatmentKgPerL = 0.0003;

  const materialContributions = components.map((item) => {
    const ref = byId(MATERIAL_LIBRARY, item.materialId) || { name: "Material não identificado", carbonKgPerKg: 7, waterLPerKg: 2500 };
    const massKg = Math.max(0, number(item.massG)) / 1000;
    const wasteMultiplier = 1 + Math.max(0, number(item.wastePct)) / 100;
    const carbon = massKg * wasteMultiplier * ref.carbonKgPerKg;
    const water = massKg * wasteMultiplier * ref.waterLPerKg;
    return { id: item.id, label: item.name || ref.name, material: ref.name, carbon, water, massKg, source: item.source || "reference" };
  });

  const processContributions = processes.map((item) => {
    const ref = byId(PROCESS_LIBRARY, item.processId) || { name: "Processo não identificado" };
    const energy = Math.max(0, number(item.energyKwh));
    const water = Math.max(0, number(item.waterL));
    const carbon = energy * gridFactorKgPerKwh + water * waterTreatmentKgPerL;
    return { id: item.id, label: ref.name, carbon, water, energy, source: item.source || "reference" };
  });

  const carbonPerUnit = [...materialContributions, ...processContributions].reduce((sum, item) => sum + item.carbon, 0);
  const waterPerUnit = [...materialContributions, ...processContributions].reduce((sum, item) => sum + item.water, 0);
  const totalMassG = components.reduce((sum, item) => sum + Math.max(0, number(item.massG)), 0);
  const weightedWaste = totalMassG ? components.reduce((sum, item) => sum + Math.max(0, number(item.massG)) * Math.max(0, number(item.wastePct)), 0) / totalMassG : 0;
  const energyPerUnit = processes.reduce((sum, item) => sum + Math.max(0, number(item.energyKwh)), 0);
  const durability = techniques.reduce((sum, item) => sum + number(byId(TECHNIQUE_LIBRARY, item.techniqueId)?.durability), 0);
  const repairability = techniques.reduce((sum, item) => sum + number(byId(TECHNIQUE_LIBRARY, item.techniqueId)?.repairability), 0);
  const circularity = techniques.reduce((sum, item) => sum + number(byId(TECHNIQUE_LIBRARY, item.techniqueId)?.circularity), 0);

  return {
    carbonPerUnit,
    carbonBatch: carbonPerUnit * qty,
    waterPerUnit,
    waterBatch: waterPerUnit * qty,
    totalMassG,
    weightedWaste,
    energyPerUnit,
    quantity: qty,
    materialContributions,
    processContributions,
    durability,
    repairability,
    circularity,
    specificity: specificityScore(spec),
    libraryVersion: spec.libraryVersion || LIBRARY_VERSION,
  };
}

export function deriveGaps(spec = {}) {
  const gaps = [];
  const components = spec.components || [];
  const processes = spec.processes || [];
  const techniques = spec.techniques || [];
  if (!components.length) gaps.push({ level: "high", text: "Nenhum componente ou material foi especificado.", expected: "Adicionar a estrutura material da peça." });
  if (!processes.length) gaps.push({ level: "high", text: "A rota produtiva ainda não foi registrada.", expected: "Adicionar processos e sequência." });
  components.forEach((item) => {
    if (!item.materialId) gaps.push({ level: "high", text: `${item.name || "Componente"}: material não identificado.`, expected: "Selecionar item da biblioteca ou cadastrar referência." });
    if (number(item.massG) <= 0) gaps.push({ level: "high", text: `${item.name || "Componente"}: massa por peça ausente.`, expected: "Pesar ou estimar a massa." });
    if (["reference", "estimated"].includes(item.source)) gaps.push({ level: "medium", text: `${item.name || "Componente"}: valor ainda baseado em ${SOURCE_STATES[item.source]?.label.toLowerCase()}.`, expected: "Confirmar por declaração, medição ou documento." });
    if (!String(item.supplier || "").trim()) gaps.push({ level: "medium", text: `${item.name || "Componente"}: fornecedor não informado.`, expected: "Identificar fornecedor ou origem do estoque." });
    if (["declared", "documented"].includes(item.source) && !String(item.evidence || "").trim()) gaps.push({ level: "high", text: `${item.name || "Componente"}: estado exige referência de evidência.`, expected: "Vincular etiqueta, ficha, nota ou certificado." });
  });
  processes.forEach((item) => {
    const ref = byId(PROCESS_LIBRARY, item.processId);
    if (["reference", "estimated"].includes(item.source)) gaps.push({ level: "low", text: `${ref?.name || "Processo"}: consumo ainda é referência.`, expected: "Registrar tempo, equipamento ou medição real." });
    if (!String(item.facility || "").trim()) gaps.push({ level: "medium", text: `${ref?.name || "Processo"}: local de execução ausente.`, expected: "Informar oficina, ateliê ou terceiro." });
  });
  techniques.forEach((item) => {
    if (!item.componentId) gaps.push({ level: "low", text: `${byId(TECHNIQUE_LIBRARY, item.techniqueId)?.name || "Técnica"}: componente não definido.`, expected: "Vincular à peça inteira ou a um componente." });
  });
  return gaps;
}

export function dominantMaterialFamily(spec = {}) {
  const totals = new Map();
  for (const item of spec.components || []) {
    const family = byId(MATERIAL_LIBRARY, item.materialId)?.family || "generic";
    totals.set(family, (totals.get(family) || 0) + Math.max(0, number(item.massG)));
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "generic";
}

export function cryptoId(prefix = "item") {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}

export function findMaterial(id) { return byId(MATERIAL_LIBRARY, id); }
export function findProcess(id) { return byId(PROCESS_LIBRARY, id); }
export function findTechnique(id) { return byId(TECHNIQUE_LIBRARY, id); }
