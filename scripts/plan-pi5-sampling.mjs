import { maturityGates, requiredSampleSize, stratifiedPlan } from "../src/pi5-sampling-plan.js";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=") || true];
}));
const categories = String(args.categories || "camiseta,camisa,calca,vestido,jaqueta,generic").split(",").map((item) => item.trim()).filter(Boolean);
const calculation = requiredSampleSize({
  confidence: Number(args.confidence || 0.95),
  margin: Number(args.margin || 0.15),
  expectedStdDev: Number(args.stddev || 0.8),
  designEffect: Number(args.designEffect || 1.15),
  attrition: Number(args.attrition || 0.15),
});
const total = Math.max(calculation.collected, categories.length * Number(args.minimumPerCategory || 50));
const allocation = stratifiedPlan({ categories, total, minimumPerCategory: Number(args.minimumPerCategory || 50) });
console.log(JSON.stringify({ calculation, allocation, maturityGates: maturityGates({ categories: categories.length }) }, null, 2));
