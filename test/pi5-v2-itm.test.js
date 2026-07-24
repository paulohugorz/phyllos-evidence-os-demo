import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const js = await readFile(new URL("../public/pi5-v2-itm.js", import.meta.url), "utf8");
test("contains ITM Brasil 2025 benchmark", () => {
  for (const value of ["overall: 24", "benchmark: 30", "benchmark: 40", "benchmark: 16", "benchmark: 33", "benchmark: 9"]) {
    assert.match(js, new RegExp(value));
  }
});
test("keeps transparency, coverage and confidence separate", () => {
  assert.match(js, /function score/);
  assert.match(js, /function confidence/);
  assert.match(js, /function coverage/);
});
test("shows company and ITM side by side", () => {
  assert.match(js, /Empresa/);
  assert.match(js, /ITM Brasil 2025/);
  assert.match(js, /pi5v2-bars/);
});
