export const MATERIAL_FACTORS = {
  cotton: { label: "Algodão", carbon: 5.9, water: 10000 },
  "recycled-polyester": { label: "Poliéster reciclado", carbon: 3.2, water: 45 },
  polyester: { label: "Poliéster", carbon: 9.5, water: 70 },
  "linen-viscose": { label: "Linho e viscose", carbon: 6.1, water: 3600 },
  viscose: { label: "Viscose", carbon: 6.8, water: 2800 },
  generic: { label: "Material não confirmado", carbon: 7.0, water: 3000 },
};

export function materialKey(value = "") {
  const text = value.toLowerCase();
  if (text.includes("recicl") && (text.includes("poli") || text.includes("pet"))) return "recycled-polyester";
  if (text.includes("poli") || text.includes("sarja") || text.includes("denim")) return "polyester";
  if (text.includes("algod")) return "cotton";
  if (text.includes("linho") && text.includes("visc")) return "linen-viscose";
  if (text.includes("visc") || text.includes("cetim")) return "viscose";
  return "generic";
}

export function estimateImpact(input) {
  const factor = MATERIAL_FACTORS[input.material] || MATERIAL_FACTORS.generic;
  const quantity = Math.max(1, Number(input.quantity) || 1);
  const productMassKg = Math.max(0, Number(input.massGrams) || 0) / 1000;
  const wasteRate = Math.max(0, Number(input.wastePercent) || 0) / 100;
  const materialMassKg = productMassKg * quantity * (1 + wasteRate);
  const energyCarbon = Math.max(0, Number(input.energyKwh) || 0) * quantity * 0.4;
  const transportCarbon = (materialMassKg / 1000) * Math.max(0, Number(input.distanceKm) || 0) * 0.1;
  const carbon = materialMassKg * factor.carbon + energyCarbon + transportCarbon;
  const water = materialMassKg * factor.water;
  return {
    carbon,
    water,
    materialMassKg,
    range: { low: carbon * 0.75, high: carbon * 1.25 },
    factor,
    components: { material: materialMassKg * factor.carbon, energy: energyCarbon, transport: transportCarbon },
  };
}
