import { createHash, timingSafeEqual } from "node:crypto";
import { invariant } from "./errors.js";

const MIN_TOKEN_LENGTH = 32;

function digest(value) {
  return createHash("sha256").update(value).digest();
}

function secureEqual(left, right) {
  return timingSafeEqual(digest(left), digest(right));
}

function bearerToken(req) {
  const authorization = req.headers.authorization;
  if (typeof authorization !== "string") return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function assertOperatorAuthConfigured(env = process.env) {
  if (env.NODE_ENV !== "production") return;
  invariant(
    typeof env.PHYLLOS_OPERATOR_TOKEN === "string" &&
      env.PHYLLOS_OPERATOR_TOKEN.length >= MIN_TOKEN_LENGTH,
    "AUTH_NOT_CONFIGURED",
    "PHYLLOS_OPERATOR_TOKEN deve existir e ter pelo menos 32 caracteres em produção",
  );
}

export function authenticateRequest(req, { tenantId, env = process.env } = {}) {
  invariant(tenantId, "AUTH_CONTEXT_INVALID", "Tenant ativo é obrigatório");

  const expectedToken = env.PHYLLOS_OPERATOR_TOKEN;
  if (!expectedToken) {
    invariant(
      env.NODE_ENV !== "production",
      "AUTH_NOT_CONFIGURED",
      "Autenticação de operador não configurada",
    );
    return {
      tenantId,
      userId: env.PHYLLOS_OPERATOR_USER_ID || "local-demo-operator",
      role: env.PHYLLOS_OPERATOR_ROLE || "client_admin",
      authenticationMode: "development-bypass",
    };
  }

  invariant(
    expectedToken.length >= MIN_TOKEN_LENGTH,
    "AUTH_NOT_CONFIGURED",
    "PHYLLOS_OPERATOR_TOKEN deve ter pelo menos 32 caracteres",
  );

  const receivedToken = bearerToken(req);
  invariant(receivedToken, "AUTH_REQUIRED", "Bearer token obrigatório");
  invariant(secureEqual(receivedToken, expectedToken), "AUTH_INVALID", "Credencial inválida");

  return {
    tenantId,
    userId: env.PHYLLOS_OPERATOR_USER_ID || "internal-operator",
    role: env.PHYLLOS_OPERATOR_ROLE || "client_admin",
    authenticationMode: "bearer-token",
  };
}
