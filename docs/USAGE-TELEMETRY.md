# Telemetria de usabilidade do Evidence OS

**Contrato:** `usage-event-v1`  
**Finalidade:** medir adoção, abandono, erros e conclusão dos fluxos para melhorar produto e operação do piloto.

## Eventos

`page_view`, `navigation`, `ui_action`, `form_start`, `form_submit`, `field_change`, `api_error`, `js_error`, `flow_complete` e `session_end`.

## Minimização

- sessão pseudônima em `sessionStorage`;
- nenhum valor digitado, texto visível, nome de arquivo, query string, e-mail ou stack trace;
- componente identificado apenas por atributo técnico, `id`, `name` ou tag;
- allowlist aplicada novamente no servidor;
- idempotência por `eventId` e conflito detectável por SHA-256 no PostgreSQL.

## Persistência

Com `DATABASE_URL`, o Render cria e usa a tabela `usage_events`. Sem banco, o modo local grava JSONL em `.runtime/usage` e deve ser tratado como efêmero.

Retenção proposta: 90 dias para eventos brutos. A política e a revisão independente de privacidade permanecem pendentes antes de qualquer ampliação da coleta.
