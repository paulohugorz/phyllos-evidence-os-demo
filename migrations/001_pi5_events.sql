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
