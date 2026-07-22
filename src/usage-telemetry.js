import { appendFile, mkdir, readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";

export const USAGE_SCHEMA_VERSION = "usage-event-v1";
export const USAGE_EVENT_NAMES = new Set([
  "page_view", "navigation", "ui_action", "form_start", "form_submit",
  "field_change", "api_error", "js_error", "flow_complete", "session_end",
]);

const METADATA_KEYS = new Set([
  "targetType", "fieldType", "formId", "statusCode", "durationMs",
  "viewportWidth", "viewportHeight", "view", "flow", "step",
]);

const canonicalize = (value) => Array.isArray(value)
  ? value.map(canonicalize)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]))
    : value;

const hash = (value) => createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");

export function normalizeUsageEvent(input = {}) {
  const event = {
    eventId: String(input.eventId || randomUUID()),
    schemaVersion: String(input.schemaVersion || USAGE_SCHEMA_VERSION),
    sessionId: String(input.sessionId || ""),
    name: String(input.name || ""),
    page: String(input.page || ""),
    component: input.component ? String(input.component).slice(0, 120) : null,
    action: input.action ? String(input.action).slice(0, 80) : null,
    metadata: {},
    occurredAt: input.occurredAt || new Date().toISOString(),
  };
  if (event.schemaVersion !== USAGE_SCHEMA_VERSION) throw new Error("Versão de telemetria não suportada");
  if (!USAGE_EVENT_NAMES.has(event.name)) throw new Error("Evento de uso não permitido");
  if (!event.sessionId || event.sessionId.length > 64 || event.eventId.length > 64) throw new Error("Identificador de evento ou sessão inválido");
  if (!event.page.startsWith("/") || event.page.length > 200) throw new Error("Página inválida");
  if (Number.isNaN(Date.parse(event.occurredAt))) throw new Error("Data do evento inválida");
  for (const [key, value] of Object.entries(input.metadata || {})) {
    if (!METADATA_KEYS.has(key) || !["string", "number", "boolean"].includes(typeof value)) continue;
    event.metadata[key] = typeof value === "string" ? value.slice(0, 120) : value;
  }
  return event;
}

export class FileUsageRepository {
  constructor({ dataDir = process.env.USAGE_DATA_DIR || join(process.cwd(), ".runtime", "usage") } = {}) {
    this.path = join(dataDir, "usage-events.jsonl");
    this.dataDir = dataDir;
    this.ids = null;
  }

  async init() {
    await mkdir(this.dataDir, { recursive: true });
    if (!this.ids) this.ids = new Set((await this.list()).map((event) => event.eventId));
  }

  async append(input) {
    await this.init();
    const event = normalizeUsageEvent(input);
    if (this.ids.has(event.eventId)) return { ...event, duplicate: true };
    await appendFile(this.path, `${JSON.stringify(event)}\n`, "utf8");
    this.ids.add(event.eventId);
    return event;
  }

  async list() {
    try {
      return (await readFile(this.path, "utf8")).split("\n").filter(Boolean).map((line) => JSON.parse(line));
    } catch { return []; }
  }

  async close() {}
}

export class PostgresUsageRepository {
  constructor({ connectionString = process.env.DATABASE_URL, sslMode = process.env.PGSSL || "auto" } = {}) {
    if (!connectionString) throw new Error("DATABASE_URL é obrigatória para telemetria PostgreSQL");
    this.connectionString = connectionString;
    this.sslMode = sslMode;
    this.pool = null;
  }

  async init() {
    if (this.pool) return;
    const { Pool } = await import("pg");
    const ssl = this.sslMode === "require" ? { rejectUnauthorized: false }
      : this.sslMode === "disable" ? false : undefined;
    this.pool = new Pool({ connectionString: this.connectionString, ssl, max: 4, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS usage_events (
        event_id TEXT PRIMARY KEY,
        schema_version TEXT NOT NULL,
        session_id TEXT NOT NULL,
        event_name TEXT NOT NULL,
        page TEXT NOT NULL,
        component TEXT,
        action TEXT,
        metadata JSONB NOT NULL,
        occurred_at TIMESTAMPTZ NOT NULL,
        payload_hash TEXT NOT NULL,
        received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS usage_events_name_idx ON usage_events(event_name);
      CREATE INDEX IF NOT EXISTS usage_events_occurred_idx ON usage_events(occurred_at);
      CREATE INDEX IF NOT EXISTS usage_events_session_idx ON usage_events(session_id);
    `);
  }

  async append(input) {
    await this.init();
    const event = normalizeUsageEvent(input);
    const payloadHash = hash(event);
    const result = await this.pool.query(`
      INSERT INTO usage_events (
        event_id, schema_version, session_id, event_name, page,
        component, action, metadata, occurred_at, payload_hash
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)
      ON CONFLICT (event_id) DO NOTHING RETURNING event_id
    `, [event.eventId, event.schemaVersion, event.sessionId, event.name, event.page,
      event.component, event.action, JSON.stringify(event.metadata), event.occurredAt, payloadHash]);
    if (!result.rowCount) {
      const existing = await this.pool.query("SELECT payload_hash FROM usage_events WHERE event_id=$1", [event.eventId]);
      if (existing.rows[0]?.payload_hash !== payloadHash) throw new Error(`Conflito de idempotência no evento ${event.eventId}`);
      return { ...event, duplicate: true };
    }
    return event;
  }

  async close() { if (this.pool) await this.pool.end(); }
}

export function createUsageRepository(options = {}) {
  if (options.repository) return options.repository;
  if (options.connectionString || process.env.DATABASE_URL) {
    return new PostgresUsageRepository({ connectionString: options.connectionString || process.env.DATABASE_URL, sslMode: options.sslMode });
  }
  return new FileUsageRepository({ dataDir: options.dataDir });
}
