# PHYLLOS PI5/Phi-5 Reliability v1

Pacote privado para executar o charter experimental, registrar configurações e cenários,
calcular confiabilidade conservadora por Wilson e publicar o dashboard.

## Principais comandos

```bash
node --test tests/phi-reliability.test.mjs

node scripts/phi_eval_runner.mjs   --input tests/fixtures/phi-smoke-v3-runs.jsonl   --out-dir data/pi5/reliability/smoke-v3
```

## Aplicação no PostgreSQL

```bash
psql "$PI5_TRAINING_DATABASE_URL"   -v ON_ERROR_STOP=1   -f migrations/006_pi5_experimental_reliability.sql

node scripts/register_phi_smoke_v3.mjs
```

## Confidencialidade
Não publicar o pacote, datasets, regras de promoção ou configurações no GitHub público.
