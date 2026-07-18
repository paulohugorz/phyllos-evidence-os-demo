import { DIMENSIONS, clamp, sha256 } from "./pi5-training-data.js";
import { seededRandom } from "./pi5-synthetic-fixtures.js";

function mean(values) { return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length); }
function quantile(values, q) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const position = (sorted.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  return sorted[base + 1] === undefined ? sorted[base] : sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}
function round(value, digits = 6) { return Number(Number(value).toFixed(digits)); }

export function regressionMetrics(actual, predicted) {
  const errors = actual.map((value, index) => predicted[index] - value);
  const absolute = errors.map(Math.abs);
  const mse = mean(errors.map((value) => value ** 2));
  const actualMean = mean(actual);
  const sst = actual.reduce((sum, value) => sum + (value - actualMean) ** 2, 0);
  const sse = errors.reduce((sum, value) => sum + value ** 2, 0);
  const predictedMean = mean(predicted);
  const covariance = mean(actual.map((value, index) => (value - actualMean) * (predicted[index] - predictedMean)));
  const stdActual = Math.sqrt(mean(actual.map((value) => (value - actualMean) ** 2)));
  const stdPredicted = Math.sqrt(mean(predicted.map((value) => (value - predictedMean) ** 2)));
  return {
    count: actual.length,
    mae: round(mean(absolute)),
    rmse: round(Math.sqrt(mse)),
    r2: round(sst === 0 ? 0 : 1 - sse / sst),
    pearson: round(stdActual && stdPredicted ? covariance / (stdActual * stdPredicted) : 0),
    medianAbsoluteError: round(quantile(absolute, 0.5)),
    p90AbsoluteError: round(quantile(absolute, 0.9)),
    bias: round(mean(errors)),
  };
}

export function classificationMetrics(actual, predictions, categories) {
  const confusion = Object.fromEntries(categories.map((actualCategory) => [actualCategory, Object.fromEntries(categories.map((predictedCategory) => [predictedCategory, 0]))]));
  let correct = 0;
  let top3Correct = 0;
  actual.forEach((category, index) => {
    const prediction = predictions[index];
    confusion[category][prediction.category] += 1;
    if (prediction.category === category) correct += 1;
    if (prediction.top3.includes(category)) top3Correct += 1;
  });
  const perCategory = {};
  for (const category of categories) {
    const tp = confusion[category][category];
    const fp = categories.reduce((sum, actualCategory) => sum + (actualCategory === category ? 0 : confusion[actualCategory][category]), 0);
    const fn = categories.reduce((sum, predictedCategory) => sum + (predictedCategory === category ? 0 : confusion[category][predictedCategory]), 0);
    const precision = tp / Math.max(1, tp + fp);
    const recall = tp / Math.max(1, tp + fn);
    const f1 = 2 * precision * recall / Math.max(1e-12, precision + recall);
    perCategory[category] = { support: categories.reduce((sum, predictedCategory) => sum + confusion[category][predictedCategory], 0), precision: round(precision), recall: round(recall), f1: round(f1) };
  }
  return {
    accuracy: round(correct / Math.max(1, actual.length)),
    top3Accuracy: round(top3Correct / Math.max(1, actual.length)),
    macroF1: round(mean(Object.values(perCategory).map((item) => item.f1))),
    perCategory,
    confusionMatrix: confusion,
  };
}

function sigmoid(value) { return 1 / (1 + Math.exp(-clamp(value, -30, 30))); }
function logit(probability) {
  const p = clamp(probability, 1e-6, 1 - 1e-6);
  return Math.log(p / (1 - p));
}

export function fitPlattCalibration(rawProbabilities, outcomes, { iterations = 2500, learningRate = 0.035 } = {}) {
  let a = 1;
  let b = 0;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let gradA = 0;
    let gradB = 0;
    rawProbabilities.forEach((raw, index) => {
      const x = logit(raw);
      const p = sigmoid(a * x + b);
      const error = p - outcomes[index];
      gradA += error * x;
      gradB += error;
    });
    a -= learningRate * gradA / Math.max(1, outcomes.length);
    b -= learningRate * gradB / Math.max(1, outcomes.length);
  }
  return { a: round(a), b: round(b), method: "platt_1d" };
}

export function applyPlatt(calibrator, rawProbability) {
  return sigmoid(calibrator.a * logit(rawProbability) + calibrator.b);
}

export function calibrationMetrics(probabilities, outcomes, bins = 10) {
  const brier = mean(probabilities.map((probability, index) => (probability - outcomes[index]) ** 2));
  const calibrationBins = [];
  let ece = 0;
  for (let bin = 0; bin < bins; bin += 1) {
    const lower = bin / bins;
    const upper = (bin + 1) / bins;
    const indexes = probabilities.map((probability, index) => ({ probability, index })).filter(({ probability }) => probability >= lower && (bin === bins - 1 ? probability <= upper : probability < upper));
    if (!indexes.length) continue;
    const avgConfidence = mean(indexes.map(({ probability }) => probability));
    const accuracy = mean(indexes.map(({ index }) => outcomes[index]));
    const weight = indexes.length / probabilities.length;
    ece += weight * Math.abs(avgConfidence - accuracy);
    calibrationBins.push({ lower: round(lower, 3), upper: round(upper, 3), count: indexes.length, confidence: round(avgConfidence), accuracy: round(accuracy), gap: round(Math.abs(avgConfidence - accuracy)) });
  }
  return { brierScore: round(brier), expectedCalibrationError: round(ece), bins: calibrationBins };
}

export function bootstrapMetric(actual, predicted, metricFn, { iterations = 500, seed = "pi5-bootstrap-v3", alpha = 0.05 } = {}) {
  const random = seededRandom(seed);
  const values = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const sampledActual = [];
    const sampledPredicted = [];
    for (let index = 0; index < actual.length; index += 1) {
      const sampledIndex = Math.floor(random() * actual.length);
      sampledActual.push(actual[sampledIndex]);
      sampledPredicted.push(predicted[sampledIndex]);
    }
    values.push(metricFn(sampledActual, sampledPredicted));
  }
  return { lower: round(quantile(values, alpha / 2)), upper: round(quantile(values, 1 - alpha / 2)), iterations, confidenceLevel: 1 - alpha };
}

export function evaluatePi5Predictions(records, predictions, { correctnessTolerance = 0.5, intervalQuantile = 0.90, validationResiduals = [], calibrator = null } = {}) {
  const actualGlobal = records.map((record) => Number(record.target.globalScore));
  const predictedGlobal = predictions.map((prediction) => Number(prediction.score.globalScore));
  const global = regressionMetrics(actualGlobal, predictedGlobal);
  const dimensions = Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, regressionMetrics(
    records.map((record) => Number(record.target.dimensionScores[dimension])),
    predictions.map((prediction) => Number(prediction.score.dimensionScores[dimension])),
  )]));
  const intervalRadius = quantile(validationResiduals.map(Math.abs), intervalQuantile);
  const intervalCoverage = mean(actualGlobal.map((actual, index) => Number(Math.abs(actual - predictedGlobal[index]) <= intervalRadius)));
  const rawProbabilities = predictions.map((prediction) => prediction.rawConfidence);
  const probabilities = calibrator ? rawProbabilities.map((value) => applyPlatt(calibrator, value)) : rawProbabilities;
  const outcomes = actualGlobal.map((actual, index) => Number(Math.abs(actual - predictedGlobal[index]) <= correctnessTolerance));
  const thresholdPerformance = Object.fromEntries([0.10, 0.25, 0.50].map((tolerance) => [
    tolerance.toFixed(2),
    round(mean(actualGlobal.map((actual, index) => Number(Math.abs(actual - predictedGlobal[index]) <= tolerance))))
  ]));
  return {
    global,
    dimensions,
    thresholdPerformance,
    confidence: {
      definition: `P(|erro global| <= ${correctnessTolerance})`,
      ...calibrationMetrics(probabilities, outcomes),
      meanDeclaredConfidence: round(mean(probabilities)),
      observedAccuracyAtTolerance: round(mean(outcomes)),
    },
    predictionInterval: {
      quantile: intervalQuantile,
      radius: round(intervalRadius),
      empiricalCoverage: round(intervalCoverage),
      meanWidth: round(intervalRadius * 2),
    },
    bootstrap95: {
      mae: bootstrapMetric(actualGlobal, predictedGlobal, (a, p) => regressionMetrics(a, p).mae, { seed: "pi5-bootstrap-mae-v3" }),
      rmse: bootstrapMetric(actualGlobal, predictedGlobal, (a, p) => regressionMetrics(a, p).rmse, { seed: "pi5-bootstrap-rmse-v3" }),
    },
    evaluationHash: sha256({ actualGlobal, predictedGlobal, probabilities }),
  };
}

export function metricsByCategory(records, predictions) {
  const categories = [...new Set(records.map((record) => record.category))].sort();
  return Object.fromEntries(categories.map((category) => {
    const indexes = records.map((record, index) => ({ record, index })).filter(({ record }) => record.category === category).map(({ index }) => index);
    const actual = indexes.map((index) => Number(records[index].target.globalScore));
    const predicted = indexes.map((index) => Number(predictions[index].score.globalScore));
    return [category, regressionMetrics(actual, predicted)];
  }));
}
