import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { trainPi5Regression, predictPi5Regression, trainNearestCentroid, predictNearestCentroid } from "../src/pi5-linear-model.js";
import { fitPlattCalibration, evaluatePi5Predictions, metricsByCategory, classificationMetrics } from "../src/pi5-evaluation.js";
import { sha256 } from "../src/pi5-training-data.js";

function args(argv) { return Object.fromEntries(argv.slice(2).map((item) => { const [key, ...rest] = item.replace(/^--/, "").split("="); return [key, rest.join("=") || true]; })); }
async function readJsonl(path) { const text = await readFile(path, "utf8"); return text.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)); }
function residuals(records, predictions) { return records.map((record, index) => predictions[index].score.globalScore - record.target.globalScore); }
function rawConfidenceFromErrorScale(prediction, scale) {
  const dimensionSpread = Math.sqrt(Object.values(prediction.dimensionScores).reduce((sum, value) => sum + (value - prediction.globalScore) ** 2, 0) / 6);
  return Math.max(0.05, Math.min(0.99, Math.exp(-(scale + dimensionSpread * 0.12) / 0.72)));
}

const options = args(process.argv);
const datasetDir = resolve(String(options.dataset || "data/pi5/agent-execution/v3-synthetic/dataset"));
const outputDir = resolve(String(options.output || "data/pi5/agent-execution/v3-synthetic/evaluation"));
const train = await readJsonl(resolve(datasetDir, "train.jsonl"));
const validation = await readJsonl(resolve(datasetDir, "validation.jsonl"));
const test = await readJsonl(resolve(datasetDir, "test.jsonl"));
if (!train.length || !validation.length || !test.length) throw new Error("splits vazios; aumente a massa sintética");

const regressionModel = trainPi5Regression(train, { lambda: Number(options.lambda || 0.7) });
const categoryModel = trainNearestCentroid(train);
const validationScore = validation.map((record) => predictPi5Regression(regressionModel, record));
const validationResiduals = residuals(validation, validationScore.map((score) => ({ score })));
const validationScale = Math.sqrt(validationResiduals.reduce((sum, value) => sum + value ** 2, 0) / validationResiduals.length);
const validationPredictions = validationScore.map((score, index) => ({ score, rawConfidence: rawConfidenceFromErrorScale(score, Math.abs(validationResiduals[index]) * 0.35 + validationScale * 0.65), category: predictNearestCentroid(categoryModel, validation[index]) }));
const confidenceTolerance = Number(options.confidenceTolerance || 0.10);
const validationOutcomes = validation.map((record, index) => Number(Math.abs(record.target.globalScore - validationPredictions[index].score.globalScore) <= confidenceTolerance));
const calibrator = fitPlattCalibration(validationPredictions.map((item) => item.rawConfidence), validationOutcomes);

const predictions = test.map((record) => {
  const score = predictPi5Regression(regressionModel, record);
  return { score, rawConfidence: rawConfidenceFromErrorScale(score, validationScale), category: predictNearestCentroid(categoryModel, record) };
});
const metrics = evaluatePi5Predictions(test, predictions, { validationResiduals, calibrator, correctnessTolerance: confidenceTolerance });
metrics.byCategory = metricsByCategory(test, predictions);
metrics.categoryIdentification = classificationMetrics(test.map((record) => record.category), predictions.map((item) => item.category), categoryModel.categories);
metrics.dataset = { train: train.length, validation: validation.length, test: test.length, synthetic: true };
metrics.calibrator = calibrator;
metrics.warning = "Indicadores sintéticos validam a esteira; não estimam desempenho real do PI5.";
metrics.metricsHash = sha256(metrics);

const modelArtifact = { regressionModel, categoryModel, calibrator, validationResidualScale: validationScale, synthetic: true, artifactHash: null };
modelArtifact.artifactHash = sha256(modelArtifact);
await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "model.json"), JSON.stringify(modelArtifact, null, 2) + "\n");
await writeFile(resolve(outputDir, "metrics.json"), JSON.stringify(metrics, null, 2) + "\n");
await writeFile(resolve(outputDir, "predictions-test.jsonl"), predictions.map((prediction, index) => JSON.stringify({ recordId: test[index].recordId, actual: test[index].target, prediction })).join("\n") + "\n");
console.log(JSON.stringify(metrics, null, 2));
