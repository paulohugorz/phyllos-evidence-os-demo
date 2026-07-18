import { appendFile, mkdir, readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function eventHash(event) {
  return createHash("sha256").update(JSON.stringify(canonicalize(event))).digest("hex");
}

function normalizeEvent(event = {}) {
  return {
    id: String(event.id || randomUUID()),
    eventType: String(event.eventType || "production_event"),
    occurredAt: event.occurredAt || new Date().toISOString(),
    ...event,
  };
}

function parseLines(text = "") {
  return String(text).split("\n").filter(Boolean).map((line) => {
    try { return JSON.parse(line); }
    catch { return null; }
  }).filter(Boolean);
}

export class FilePI5Repository {
  constructor({ dataDir = process.env.PI5_DATA_DIR || join(process.cwd(), ".runtime", "pi5") } = {}) {
    this.dataDir = dataDir;
    this.eventsPath = join(dataDir, "production-events.jsonl");
    this.ids = null;
  }

  async init() {
    await mkdir(this.dataDir, { recursive: true });
    if (!this.ids) {
      this.ids = new Set((await this.list()).map((event) => event.id));
    }
  }

  async append(input = {}) {
    await this.init();
    const event = normalizeEvent(input);
    if (this.ids.has(event.id)) return event;
    await appendFile(this.eventsPath, `${JSON.stringify(event)}\n`, "utf8");
    this.ids.add(event.id);
    return event;
  }

  async list({ limit = 100000 } = {}) {
    try {
      const events = parseLines(await readFile(this.eventsPath, "utf8"));
      return events.slice(-Math.max(1, Number(limit) || 100000));
    } catch {
      return [];
    }
  }

  async exportJsonl() {
    const events = await this.list();
    return events.map((event) => JSON.stringify(event)).join("\n") + (events.length ? "\n" : "");
  }

  async summary({ minimumForTraining = 70 } = {}) {
    const events = await this.list();
    const predictions = events.filter((item) => item.eventType === "prediction");
    const feedback = events.filter((item) => item.eventType === "expert_feedback" && item.labelStatus === "validated");
    const categories = {};
    for (const event of predictions) {
      const category = event.category || event.prediction?.category || "generic";
      categories[category] = (categories[category] || 0) + 1;
    }
    return {
      predictions: predictions.length,
      validatedFeedback: feedback.length,
      minimumForTraining,
      readyForTraining: feedback.length >= minimumForTraining,
      lastEventAt: events.at(-1)?.occurredAt || null,
      categories,
      persistenceMode: process.env.PI5_DATA_DIR ? "configured-directory" : "ephemeral-demo",
      durable: Boolean(process.env.PI5_DATA_DIR),
    };
  }

  async health() {
    await this.init();
    return {
      ok: true,
      mode: process.env.PI5_DATA_DIR ? "configured-directory" : "ephemeral-demo",
      durable: Boolean(process.env.PI5_DATA_DIR),
      location: this.dataDir,
      checkedAt: new Date().toISOString(),
    };
  }

  async close() {}
}

export class PostgresPI5Repository {
  constructor({ connectionString = process.env.DATABASE_URL, sslMode = process.env.PGSSL || "auto" } = {}) {
    if (!connectionString) throw new Error("DATABASE_URL é obrigatória para persistência PostgreSQL");
    this.connectionString = connectionString;
    this.sslMode = sslMode;
    this.pool = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    const { Pool } = await import("pg");
    const ssl = this.sslMode === "require" ? { rejectUnauthorized: false }
      : this.sslMode === "disable" ? false
        : undefined;
    this.pool = new Pool({ connectionString: this.connectionString, ssl, max: 8, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS pi5_events (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        occurred_at TIMESTAMPTZ NOT NULL,
        entity_id TEXT,
        prediction_id TEXT,
        model_version TEXT,
        category TEXT,
        label_status TEXT,
        payload JSONB NOT NULL,
        payload_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS pi5_events_event_type_idx ON pi5_events(event_type);
      CREATE INDEX IF NOT EXISTS pi5_events_occurred_at_idx ON pi5_events(occurred_at);
      CREATE INDEX IF NOT EXISTS pi5_events_prediction_id_idx ON pi5_events(prediction_id);
      CREATE INDEX IF NOT EXISTS pi5_events_category_idx ON pi5_events(category);
      CREATE INDEX IF NOT EXISTS pi5_events_label_status_idx ON pi5_events(label_status);
    `);
    this.initialized = true;
  }

  async append(input = {}) {
    await this.init();
    const event = normalizeEvent(input);
    const hash = eventHash(event);
    const values = [
      event.id,
      event.eventType,
      event.occurredAt,
      event.entityId || null,
      event.predictionId || event.prediction?.predictionId || null,
      event.modelVersion || event.prediction?.modelVersion || null,
      event.category || event.prediction?.category || null,
      event.labelStatus || null,
      event,
      hash,
    ];
    const result = await this.pool.query(`
      INSERT INTO pi5_events (
        id, event_type, occurred_at, entity_id, prediction_id,
        model_version, category, label_status, payload, payload_hash
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    `, [...values.slice(0, 8), JSON.stringify(values[8]), values[9]]);
    if (!result.rowCount) {
      const existing = await this.pool.query("SELECT payload_hash FROM pi5_events WHERE id=$1", [event.id]);
      if (existing.rows[0]?.payload_hash !== hash) throw new Error(`Conflito de idempotência no evento ${event.id}`);
    }
    return event;
  }

  async list({ limit = 100000 } = {}) {
    await this.init();
    const safeLimit = Math.min(100000, Math.max(1, Number(limit) || 100000));
    const result = await this.pool.query(`
      SELECT payload
      FROM pi5_events
      ORDER BY occurred_at ASC, created_at ASC
      LIMIT $1
    `, [safeLimit]);
    return result.rows.map((row) => row.payload);
  }

  async exportJsonl() {
    const events = await this.list();
    return events.map((event) => JSON.stringify(event)).join("\n") + (events.length ? "\n" : "");
  }

  async summary({ minimumForTraining = 70 } = {}) {
    await this.init();
    const counts = await this.pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE event_type='prediction')::int AS predictions,
        COUNT(*) FILTER (WHERE event_type='expert_feedback' AND label_status='validated')::int AS validated_feedback,
        MAX(occurred_at) AS last_event_at
      FROM pi5_events
    `);
    const categoryRows = await this.pool.query(`
      SELECT COALESCE(category, 'generic') AS category, COUNT(*)::int AS total
      FROM pi5_events
      WHERE event_type='prediction'
      GROUP BY COALESCE(category, 'generic')
      ORDER BY total DESC
    `);
    const predictions = counts.rows[0]?.predictions || 0;
    const validatedFeedback = counts.rows[0]?.validated_feedback || 0;
    return {
      predictions,
      validatedFeedback,
      minimumForTraining,
      readyForTraining: validatedFeedback >= minimumForTraining,
      lastEventAt: counts.rows[0]?.last_event_at || null,
      categories: Object.fromEntries(categoryRows.rows.map((row) => [row.category, row.total])),
      persistenceMode: "postgresql",
      durable: true,
    };
  }

  async health() {
    await this.init();
    const result = await this.pool.query("SELECT NOW() AS database_time, COUNT(*)::int AS events FROM pi5_events");
    return {
      ok: true,
      mode: "postgresql",
      durable: true,
      events: result.rows[0]?.events || 0,
      databaseTime: result.rows[0]?.database_time,
      checkedAt: new Date().toISOString(),
    };
  }

  async close() {
    if (this.pool) await this.pool.end();
  }
}

export function createPI5Repository(options = {}) {
  if (options.repository) return options.repository;
  if (options.connectionString || process.env.DATABASE_URL) {
    return new PostgresPI5Repository({ connectionString: options.connectionString || process.env.DATABASE_URL, sslMode: options.sslMode });
  }
  return new FilePI5Repository({ dataDir: options.dataDir });
}
