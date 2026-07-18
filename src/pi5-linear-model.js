import { FEATURE_NAMES } from "./pi5-synthetic-fixtures.js";
import { DIMENSIONS, clamp } from "./pi5-training-data.js";

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function solveLinearSystem(matrix, vector) {
  const n = vector.length;
  const a = matrix.map((row, index) => [...row, vector[index]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    if (Math.abs(a[pivot][col]) < 1e-12) a[pivot][col] = 1e-12;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const divisor = a[col][col];
    for (let j = col; j <= n; j += 1) a[col][j] /= divisor;
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let j = col; j <= n; j += 1) a[row][j] -= factor * a[col][j];
    }
  }
  return a.map((row) => row[n]);
}

export function fitScaler(rows, featureNames = FEATURE_NAMES) {
  const means = {};
  const stddevs = {};
  for (const feature of featureNames) {
    const values = rows.map((row) => Number(row.features?.[feature] ?? 0));
    const avg = mean(values);
    const variance = mean(values.map((value) => (value - avg) ** 2));
    means[feature] = avg;
    stddevs[feature] = Math.sqrt(variance) || 1;
  }
  return { featureNames, means, stddevs };
}

export function vectorize(record, scaler) {
  return scaler.featureNames.map((feature) => (Number(record.features?.[feature] ?? 0) - scaler.means[feature]) / scaler.stddevs[feature]);
}

export function fitRidge(records, targetAccessor, { lambda = 0.7, scaler = fitScaler(records) } = {}) {
  const x = records.map((record) => [1, ...vectorize(record, scaler)]);
  const y = records.map((record) => Number(targetAccessor(record)));
  const p = x[0].length;
  const xtx = Array.from({ length: p }, () => Array(p).fill(0));
  const xty = Array(p).fill(0);
  for (let row = 0; row < x.length; row += 1) {
    for (let i = 0; i < p; i += 1) {
      xty[i] += x[row][i] * y[row];
      for (let j = 0; j < p; j += 1) xtx[i][j] += x[row][i] * x[row][j];
    }
  }
  for (let i = 1; i < p; i += 1) xtx[i][i] += lambda;
  return { coefficients: solveLinearSystem(xtx, xty), scaler, lambda };
}

export function predictRidge(model, record) {
  const x = [1, ...vectorize(record, model.scaler)];
  return x.reduce((sum, value, index) => sum + value * model.coefficients[index], 0);
}

export function trainPi5Regression(records, options = {}) {
  const scaler = fitScaler(records, options.featureNames || FEATURE_NAMES);
  const outputs = {
    globalScore: fitRidge(records, (record) => record.target.globalScore, { ...options, scaler }),
    ...Object.fromEntries(DIMENSIONS.map((dimension) => [
      dimension,
      fitRidge(records, (record) => record.target.dimensionScores[dimension], { ...options, scaler }),
    ])),
  };
  return { type: "multi_output_ridge", outputs, featureNames: scaler.featureNames, trainedRecords: records.length };
}

export function predictPi5Regression(model, record) {
  return {
    globalScore: Number(clamp(predictRidge(model.outputs.globalScore, record), 0, 5).toFixed(4)),
    dimensionScores: Object.fromEntries(DIMENSIONS.map((dimension) => [
      dimension,
      Number(clamp(predictRidge(model.outputs[dimension], record), 0, 5).toFixed(4)),
    ])),
  };
}

export function trainNearestCentroid(records, featureNames = FEATURE_NAMES) {
  const scaler = fitScaler(records, featureNames);
  const grouped = new Map();
  for (const record of records) {
    const values = grouped.get(record.category) || [];
    values.push(vectorize(record, scaler));
    grouped.set(record.category, values);
  }
  const centroids = Object.fromEntries([...grouped.entries()].map(([category, rows]) => [
    category,
    rows[0].map((_, index) => mean(rows.map((row) => row[index]))),
  ]));
  return { type: "nearest_centroid", scaler, centroids, categories: Object.keys(centroids).sort() };
}

export function predictNearestCentroid(model, record, temperature = 1.2) {
  const vector = vectorize(record, model.scaler);
  const scored = model.categories.map((category) => {
    const centroid = model.centroids[category];
    const distance = Math.sqrt(vector.reduce((sum, value, index) => sum + (value - centroid[index]) ** 2, 0));
    return { category, distance, logit: -distance / temperature };
  });
  const maxLogit = Math.max(...scored.map((item) => item.logit));
  const denominator = scored.reduce((sum, item) => sum + Math.exp(item.logit - maxLogit), 0);
  const probabilities = Object.fromEntries(scored.map((item) => [item.category, Math.exp(item.logit - maxLogit) / denominator]));
  const ranking = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);
  return { category: ranking[0][0], confidence: ranking[0][1], probabilities, top3: ranking.slice(0, 3).map(([category]) => category) };
}
