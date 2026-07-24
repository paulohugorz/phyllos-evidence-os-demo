import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const architecture = await readFile(new URL("../public/module-architecture.js", import.meta.url), "utf8");
const onboarding = await readFile(new URL("../public/onboarding.js", import.meta.url), "utf8");

test("six-module navigation preserves onboarding", () => {
  assert.match(architecture, /buttons\.get\("onboarding"\)/);
  assert.match(architecture, /Início e ajuda/);
  assert.match(architecture, /nav\.appendChild\(onboarding\)/);
});

test("original onboarding behavior remains intact", () => {
  assert.match(onboarding, /id="onboarding"/);
  assert.match(onboarding, /ensureNavigation\(\)/);
  assert.match(onboarding, /ensurePage\(\)/);
  assert.match(onboarding, /firstVisit/);
  assert.match(onboarding, /openOnboarding/);
});
