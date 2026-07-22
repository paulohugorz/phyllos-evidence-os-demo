import assert from "node:assert/strict";
import test from "node:test";
import { assertOperatorAuthConfigured, authenticateRequest } from "../src/auth.js";

const request = (authorization) => ({
  headers: authorization ? { authorization } : {},
});

test("produção exige token forte configurado", () => {
  assert.throws(
    () => assertOperatorAuthConfigured({ NODE_ENV: "production" }),
    (error) => error.code === "AUTH_NOT_CONFIGURED",
  );
  assert.doesNotThrow(() =>
    assertOperatorAuthConfigured({
      NODE_ENV: "production",
      PHYLLOS_OPERATOR_TOKEN: "a".repeat(32),
    }),
  );
});

test("autentica operador com bearer token sem aceitar headers de papel", () => {
  const env = {
    NODE_ENV: "production",
    PHYLLOS_OPERATOR_TOKEN: "b".repeat(32),
    PHYLLOS_OPERATOR_USER_ID: "operator-01",
    PHYLLOS_OPERATOR_ROLE: "analyst",
  };
  const ctx = authenticateRequest(request(`Bearer ${env.PHYLLOS_OPERATOR_TOKEN}`), {
    tenantId: "tenant-01",
    env,
  });
  assert.deepEqual(ctx, {
    tenantId: "tenant-01",
    userId: "operator-01",
    role: "analyst",
    authenticationMode: "bearer-token",
  });
});

test("nega token ausente ou inválido", () => {
  const env = {
    NODE_ENV: "production",
    PHYLLOS_OPERATOR_TOKEN: "c".repeat(32),
  };
  assert.throws(
    () => authenticateRequest(request(), { tenantId: "tenant-01", env }),
    (error) => error.code === "AUTH_REQUIRED",
  );
  assert.throws(
    () => authenticateRequest(request(`Bearer ${"d".repeat(32)}`), { tenantId: "tenant-01", env }),
    (error) => error.code === "AUTH_INVALID",
  );
});

test("permite bypass somente fora de produção para desenvolvimento local", () => {
  const ctx = authenticateRequest(request(), {
    tenantId: "tenant-dev",
    env: { NODE_ENV: "development" },
  });
  assert.equal(ctx.authenticationMode, "development-bypass");
  assert.equal(ctx.role, "client_admin");
});
