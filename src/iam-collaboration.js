import { createHash, randomUUID } from "node:crypto";

export class IAMError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.name = "IAMError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function requestHash({ operation, workspaceId, actorUserId, payload }) {
  return createHash("sha256").update(JSON.stringify(canonical({
    schemaVersion: 1, operation, workspaceId, actorUserId, payload,
  }))).digest("hex");
}

const clone = (value) => structuredClone(value);

export function iamPhase0Enabled(env = process.env) {
  return env.IAM_PHASE0_ENABLED === "true";
}

/**
 * Executable Phase-0 reference store. It proves the HTTP/domain contracts but
 * is deliberately process-local; PostgreSQL remains required before production.
 */
export class CollaborationStore {
  #resources = new Map();
  #idempotency = new Map();
  #memberships = new Map();
  #workspaceRevisions = new Map();

  seedMembership({ workspaceId, userId, role = "member" }) {
    const membership = { id: randomUUID(), workspaceId, userId, role, status: "active" };
    this.#memberships.set(`${workspaceId}:${userId}`, membership);
    return clone(membership);
  }

  createResource({ workspaceId, actorUserId, idempotencyKey, input }) {
    this.#requireIdempotencyKey(idempotencyKey);
    return this.#idempotent({ workspaceId, actorUserId, operation: "resource.create", idempotencyKey, payload: input }, () => {
      const timestamp = new Date().toISOString();
      const resource = {
        id: randomUUID(), workspaceId, name: String(input.name || "").trim(),
        version: 1, createdAt: timestamp, updatedAt: timestamp, updatedByUserId: actorUserId,
      };
      if (!resource.name) throw new IAMError(400, "RESOURCE_NAME_REQUIRED", "Informe o nome do recurso.");
      this.#resources.set(resource.id, resource);
      this.#bumpRevision(workspaceId);
      return { status: 201, body: clone(resource) };
    });
  }

  updateResource({ workspaceId, resourceId, actorUserId, expectedVersion, input }) {
    const current = this.#resources.get(resourceId);
    if (!current || current.workspaceId !== workspaceId) {
      throw new IAMError(404, "RESOURCE_NOT_FOUND", "Recurso não encontrado.");
    }
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
      throw new IAMError(428, "EXPECTED_VERSION_REQUIRED", "If-Match ou expected_version é obrigatório.");
    }
    if (current.version !== expectedVersion) {
      throw new IAMError(409, "RESOURCE_VERSION_CONFLICT", "O recurso foi alterado por outra pessoa.", {
        resource_id: resourceId, expected_version: expectedVersion,
        current_version: current.version, conflict_id: randomUUID(),
      });
    }
    const updated = {
      ...current, name: String(input.name ?? current.name).trim(), version: current.version + 1,
      updatedAt: new Date().toISOString(), updatedByUserId: actorUserId,
    };
    if (!updated.name) throw new IAMError(400, "RESOURCE_NAME_REQUIRED", "Informe o nome do recurso.");
    this.#resources.set(resourceId, updated);
    this.#bumpRevision(workspaceId);
    return clone(updated);
  }

  listResources({ workspaceId, updatedSince }) {
    const after = updatedSince ? Date.parse(updatedSince) : Number.NEGATIVE_INFINITY;
    if (updatedSince && Number.isNaN(after)) throw new IAMError(400, "INVALID_UPDATED_SINCE", "updated_since inválido.");
    const items = [...this.#resources.values()]
      .filter((item) => item.workspaceId === workspaceId && Date.parse(item.updatedAt) > after)
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
    return { items: clone(items), workspace_revision: this.#workspaceRevisions.get(workspaceId) || 0 };
  }

  removeMembership({ workspaceId, userId }) {
    const key = `${workspaceId}:${userId}`;
    const membership = this.#memberships.get(key);
    if (!membership || membership.status !== "active") throw new IAMError(404, "MEMBERSHIP_NOT_FOUND", "Acesso não encontrado.");
    const activeOwners = [...this.#memberships.values()].filter((item) =>
      item.workspaceId === workspaceId && item.status === "active" && item.role === "owner");
    if (membership.role === "owner" && activeOwners.length === 1) {
      throw new IAMError(409, "LAST_OWNER_REQUIRED", "O último owner não pode ser removido.");
    }
    membership.status = "removed";
    return clone(membership);
  }

  #requireIdempotencyKey(key) {
    if (!key || key.length > 200) throw new IAMError(400, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key é obrigatório.");
  }

  #idempotent(command, execute) {
    const recordKey = `${command.workspaceId}:${command.actorUserId}:${command.operation}:${command.idempotencyKey}`;
    const hash = requestHash(command);
    const existing = this.#idempotency.get(recordKey);
    if (existing) {
      if (existing.hash !== hash) throw new IAMError(409, "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST", "A chave de idempotência já foi usada com outro conteúdo.");
      return { ...clone(existing.result), replay: true };
    }
    const result = execute();
    this.#idempotency.set(recordKey, { hash, result: clone(result) });
    return { ...result, replay: false };
  }

  #bumpRevision(workspaceId) {
    this.#workspaceRevisions.set(workspaceId, (this.#workspaceRevisions.get(workspaceId) || 0) + 1);
  }
}
