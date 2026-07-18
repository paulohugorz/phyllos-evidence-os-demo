BEGIN;

CREATE TABLE IF NOT EXISTS pi5_experiment_configurations (
  configuration_id TEXT PRIMARY KEY,
  official_model_name TEXT NOT NULL,
  model_family TEXT NOT NULL,
  repository_or_catalog TEXT,
  checkpoint_version_or_hash TEXT,
  obtained_at TIMESTAMPTZ,
  runtime TEXT,
  library_versions JSONB NOT NULL DEFAULT '{}'::JSONB,
  quantization TEXT,
  hardware JSONB NOT NULL DEFAULT '{}'::JSONB,
  memory_available_mb NUMERIC,
  context_window INTEGER,
  chat_template TEXT,
  system_prompt_hash CHAR(64),
  generation_parameters JSONB NOT NULL DEFAULT '{}'::JSONB,
  tools JSONB NOT NULL DEFAULT '[]'::JSONB,
  rag_version TEXT,
  knowledge_graph_version TEXT,
  prompt_version TEXT,
  validators_version TEXT,
  postprocessors_version TEXT,
  execution_condition TEXT,
  dataset_version TEXT,
  completeness_status TEXT NOT NULL CHECK (
    completeness_status IN ('complete_for_smoke_test','complete','blocked_incomplete_registry','retired')
  ),
  promotion_scope TEXT NOT NULL DEFAULT 'none',
  configuration_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pi5_experiment_scenarios (
  scenario_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  task_family TEXT,
  description TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low','medium','high','critical')),
  factors JSONB NOT NULL DEFAULT '{}'::JSONB,
  minimum_main_cases INTEGER NOT NULL CHECK (minimum_main_cases > 0),
  status TEXT NOT NULL CHECK (
    status IN ('planned','blocked','smoke_test_executed_partial','pilot','main_evaluation','blind_confirmation','closed')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pi5_experiment_cases (
  case_id TEXT NOT NULL,
  case_version INTEGER NOT NULL CHECK (case_version > 0),
  scenario_id TEXT NOT NULL REFERENCES pi5_experiment_scenarios(scenario_id),
  task_type TEXT NOT NULL,
  input_reference TEXT,
  evidence_references JSONB NOT NULL DEFAULT '[]'::JSONB,
  reference_answer JSONB,
  correction_criteria JSONB NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low','medium','high','critical')),
  possible_error_classes JSONB NOT NULL DEFAULT '[]'::JSONB,
  indetermination_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  human_review JSONB,
  origin TEXT,
  license TEXT,
  split TEXT NOT NULL CHECK (
    split IN ('development','calibration','internal_test','blind_test','stress_test','post_deployment')
  ),
  evaluator_actor_id UUID REFERENCES pi5_actors(id),
  conflicts JSONB NOT NULL DEFAULT '[]'::JSONB,
  payload_hash CHAR(64) NOT NULL,
  frozen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (case_id, case_version)
);

CREATE TABLE IF NOT EXISTS pi5_experiment_runs (
  run_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  case_version INTEGER NOT NULL,
  configuration_id TEXT NOT NULL REFERENCES pi5_experiment_configurations(configuration_id),
  prompt_version TEXT NOT NULL,
  seed TEXT NOT NULL,
  response_snapshot JSONB NOT NULL,
  response_decision TEXT NOT NULL CHECK (response_decision IN ('respond','abstain','request_evidence','safe_failure')),
  success_level TEXT NOT NULL CHECK (
    success_level IN ('integral_success','partial_success','recoverable_failure','severe_failure','critical_failure')
  ),
  valid BOOLEAN NOT NULL DEFAULT TRUE,
  correct BOOLEAN,
  critical_error BOOLEAN,
  hallucination BOOLEAN,
  unsupported_claim_count INTEGER CHECK (unsupported_claim_count IS NULL OR unsupported_claim_count >= 0),
  evaluated_claim_count INTEGER CHECK (evaluated_claim_count IS NULL OR evaluated_claim_count >= 0),
  expected_abstention BOOLEAN,
  expected_conflict BOOLEAN,
  conflict_detected BOOLEAN,
  confidence NUMERIC CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  latency_ms NUMERIC CHECK (latency_ms IS NULL OR latency_ms >= 0),
  input_tokens INTEGER CHECK (input_tokens IS NULL OR input_tokens >= 0),
  output_tokens INTEGER CHECK (output_tokens IS NULL OR output_tokens >= 0),
  memory_peak_mb NUMERIC CHECK (memory_peak_mb IS NULL OR memory_peak_mb >= 0),
  cost_amount NUMERIC CHECK (cost_amount IS NULL OR cost_amount >= 0),
  cost_currency CHAR(3),
  raw_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (case_id, case_version) REFERENCES pi5_experiment_cases(case_id, case_version),
  UNIQUE (case_id, case_version, configuration_id, prompt_version, seed, run_id)
);

CREATE INDEX IF NOT EXISTS pi5_experiment_runs_group_idx
  ON pi5_experiment_runs(configuration_id, case_id, case_version, created_at);

CREATE TABLE IF NOT EXISTS pi5_scenario_reliability_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id TEXT NOT NULL REFERENCES pi5_experiment_configurations(configuration_id),
  scenario_id TEXT NOT NULL REFERENCES pi5_experiment_scenarios(scenario_id),
  metric_version TEXT NOT NULL,
  success_definition TEXT NOT NULL,
  n_total INTEGER NOT NULL CHECK (n_total >= 0),
  n_valid INTEGER NOT NULL CHECK (n_valid >= 0),
  n_success INTEGER NOT NULL CHECK (n_success >= 0),
  observed_success NUMERIC CHECK (observed_success IS NULL OR observed_success BETWEEN 0 AND 1),
  wilson_lower_95 NUMERIC CHECK (wilson_lower_95 IS NULL OR wilson_lower_95 BETWEEN 0 AND 1),
  wilson_upper_95 NUMERIC CHECK (wilson_upper_95 IS NULL OR wilson_upper_95 BETWEEN 0 AND 1),
  conservative_reliability NUMERIC CHECK (conservative_reliability IS NULL OR conservative_reliability BETWEEN 0 AND 1),
  response_coverage NUMERIC CHECK (response_coverage IS NULL OR response_coverage BETWEEN 0 AND 1),
  selective_risk NUMERIC CHECK (selective_risk IS NULL OR selective_risk BETWEEN 0 AND 1),
  abstention_recall NUMERIC CHECK (abstention_recall IS NULL OR abstention_recall BETWEEN 0 AND 1),
  abstention_precision NUMERIC CHECK (abstention_precision IS NULL OR abstention_precision BETWEEN 0 AND 1),
  hallucination_rate NUMERIC CHECK (hallucination_rate IS NULL OR hallucination_rate BETWEEN 0 AND 1),
  critical_error_rate NUMERIC CHECK (critical_error_rate IS NULL OR critical_error_rate BETWEEN 0 AND 1),
  ece NUMERIC CHECK (ece IS NULL OR ece BETWEEN 0 AND 1),
  brier_score NUMERIC CHECK (brier_score IS NULL OR brier_score BETWEEN 0 AND 1),
  latency_p50_ms NUMERIC,
  latency_p95_ms NUMERIC,
  latency_p99_ms NUMERIC,
  additional_metrics JSONB NOT NULL DEFAULT '{}'::JSONB,
  synthetic BOOLEAN NOT NULL DEFAULT FALSE,
  snapshot_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (configuration_id, scenario_id, metric_version, snapshot_hash)
);

CREATE TABLE IF NOT EXISTS pi5_promotion_decisions (
  decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id TEXT NOT NULL REFERENCES pi5_experiment_configurations(configuration_id),
  scope TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('production_assisted','shadow','experimental','blocked')),
  rationale TEXT NOT NULL,
  blocking_failures JSONB NOT NULL DEFAULT '[]'::JSONB,
  decided_by UUID REFERENCES pi5_actors(id),
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decision_hash CHAR(64) NOT NULL UNIQUE
);

CREATE OR REPLACE VIEW pi5_reliability_dashboard_v1 AS
SELECT
  s.configuration_id,
  c.official_model_name,
  c.completeness_status,
  s.scenario_id,
  sc.name AS scenario_name,
  sc.risk_level,
  s.metric_version,
  s.success_definition,
  s.n_valid,
  s.observed_success,
  s.wilson_lower_95,
  s.wilson_upper_95,
  s.conservative_reliability,
  s.response_coverage,
  s.selective_risk,
  s.hallucination_rate,
  s.critical_error_rate,
  s.ece,
  s.brier_score,
  s.latency_p95_ms,
  s.synthetic,
  s.created_at
FROM pi5_scenario_reliability_snapshots s
JOIN pi5_experiment_configurations c USING (configuration_id)
JOIN pi5_experiment_scenarios sc USING (scenario_id);

INSERT INTO pi5_experiment_scenarios
  (scenario_id, name, task_family, description, risk_level, factors, minimum_main_cases, status)
VALUES
  ('S01','Baseline controlada','all','Entrada completa, limpa e pertencente ao domínio conhecido.','low','{"quality":"ideal","evidence":"complete"}',30,'smoke_test_executed_partial'),
  ('S02','Variações de linguagem','language','Paráfrases, linguagem cotidiana, erros e ambiguidade.','medium','{"prompt_variation":true}',30,'planned'),
  ('S03','Imagem ideal','multimodal','Seis imagens completas e de alta qualidade.','medium','{"quality":"ideal"}',30,'planned'),
  ('S04','Degradação progressiva','multimodal','Desfoque, compressão, recorte e exposição degradada.','high','{"degradation_curve":true}',100,'planned'),
  ('S05','Tecidos semelhantes','textile','Classes com alto potencial de confusão.','high','{"confusion_groups":true}',100,'planned'),
  ('S06','Classes raras ou desconhecidas','ood','Materiais raros, fora do domínio e não tecidos.','high','{"out_of_domain":true}',100,'planned'),
  ('S07','Evidências conflitantes','evidence','Fontes documentais e visuais discordantes.','high','{"evidence":"conflicting"}',100,'planned'),
  ('S08','Evidência insuficiente','abstention','Informações essenciais removidas.','high','{"evidence":"insufficient"}',100,'planned'),
  ('S09','Planejamento operacional','operations','Recursos, prazos, prioridades e restrições.','medium','{"task":"planning"}',100,'planned'),
  ('S10','Cálculos e unidades','numeric','Consumo, perdas, conversões e capacidade.','high','{"task":"numeric"}',100,'planned'),
  ('S11','Contexto longo','context','Conversas prolongadas com múltiplos registros.','high','{"context":"long"}',100,'planned'),
  ('S12','Robustez adversarial','security','Tentativas de indução, promoção indevida e vazamento.','critical','{"adversarial":true}',100,'planned'),
  ('S13','Repetibilidade','stability','Repetições e sementes diferentes.','medium','{"repetitions":true}',30,'planned'),
  ('S14','Quantização e infraestrutura','runtime','Comparação de runtimes, hardware e quantização.','high','{"runtime_comparison":true}',100,'blocked'),
  ('S15','Falhas de ferramentas','resilience','Timeout, RAG vazio, documento corrompido e queda.','critical','{"tool_failure":true}',100,'planned')
ON CONFLICT (scenario_id) DO NOTHING;

COMMIT;
