ALTER TABLE pi5_events ADD COLUMN IF NOT EXISTS snapshot_id TEXT;
ALTER TABLE pi5_events ADD COLUMN IF NOT EXISTS methodology_version TEXT;
ALTER TABLE pi5_events ADD COLUMN IF NOT EXISTS benchmark_version TEXT;
ALTER TABLE pi5_events ADD COLUMN IF NOT EXISTS gate_state TEXT;

CREATE INDEX IF NOT EXISTS pi5_events_snapshot_id_idx ON pi5_events(snapshot_id);
CREATE INDEX IF NOT EXISTS pi5_events_gate_state_idx ON pi5_events(gate_state);
CREATE INDEX IF NOT EXISTS pi5_events_methodology_version_idx ON pi5_events(methodology_version);
CREATE INDEX IF NOT EXISTS pi5_events_benchmark_version_idx ON pi5_events(benchmark_version);
