import assert from "node:assert/strict";
import test from "node:test";
import { CollaborationStore, IAMError, iamPhase0Enabled } from "../src/iam-collaboration.js";

const command = (store, overrides = {}) => store.createResource({
  workspaceId: "ws-a", actorUserId: "user-a", idempotencyKey: "command-1",
  input: { name: "Dossiê" }, ...overrides,
});

test("feature flag is deny-by-default", () => {
  assert.equal(iamPhase0Enabled({}), false);
  assert.equal(iamPhase0Enabled({ IAM_PHASE0_ENABLED: "TRUE" }), false);
  assert.equal(iamPhase0Enabled({ IAM_PHASE0_ENABLED: "true" }), true);
});

test("same idempotency key and payload replays a single creation", () => {
  const store = new CollaborationStore();
  const first = command(store);
  const replay = command(store);
  assert.equal(first.replay, false);
  assert.equal(replay.replay, true);
  assert.equal(replay.body.id, first.body.id);
  assert.equal(store.listResources({ workspaceId: "ws-a" }).items.length, 1);
});

test("same idempotency key with another payload returns conflict", () => {
  const store = new CollaborationStore();
  command(store);
  assert.throws(() => command(store, { input: { name: "Outro" } }), (error) =>
    error instanceof IAMError && error.status === 409 && error.code === "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST");
});

test("stale update never overwrites a newer version", () => {
  const store = new CollaborationStore();
  const resource = command(store).body;
  const updated = store.updateResource({ workspaceId: "ws-a", resourceId: resource.id, actorUserId: "user-a", expectedVersion: 1, input: { name: "Versão 2" } });
  assert.equal(updated.version, 2);
  assert.throws(() => store.updateResource({ workspaceId: "ws-a", resourceId: resource.id, actorUserId: "user-b", expectedVersion: 1, input: { name: "Perdida" } }), (error) =>
    error.status === 409 && error.code === "RESOURCE_VERSION_CONFLICT" && error.details.current_version === 2);
  assert.equal(store.listResources({ workspaceId: "ws-a" }).items[0].name, "Versão 2");
});

test("resources never cross workspace boundaries", () => {
  const store = new CollaborationStore();
  command(store);
  assert.deepEqual(store.listResources({ workspaceId: "ws-b" }).items, []);
});

test("last active owner cannot be removed", () => {
  const store = new CollaborationStore();
  store.seedMembership({ workspaceId: "ws-a", userId: "owner-a", role: "owner" });
  assert.throws(() => store.removeMembership({ workspaceId: "ws-a", userId: "owner-a" }), (error) =>
    error.status === 409 && error.code === "LAST_OWNER_REQUIRED");
  store.seedMembership({ workspaceId: "ws-a", userId: "owner-b", role: "owner" });
  assert.equal(store.removeMembership({ workspaceId: "ws-a", userId: "owner-a" }).status, "removed");
});
