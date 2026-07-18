import test from "node:test";
import assert from "node:assert/strict";
import { regressionMetrics, fitPlattCalibration, calibrationMetrics } from "../src/pi5-evaluation.js";

test("métricas de regressão reconhecem predição perfeita", () => {
  const metrics = regressionMetrics([1,2,3], [1,2,3]);
  assert.equal(metrics.mae, 0);
  assert.equal(metrics.rmse, 0);
  assert.equal(metrics.r2, 1);
});

test("calibração retorna probabilidades válidas", () => {
  const calibrator = fitPlattCalibration([0.2,0.4,0.6,0.8], [0,0,1,1]);
  assert.ok(Number.isFinite(calibrator.a));
  const metrics = calibrationMetrics([0.1,0.2,0.8,0.9], [0,0,1,1]);
  assert.ok(metrics.brierScore >= 0 && metrics.brierScore <= 1);
});
