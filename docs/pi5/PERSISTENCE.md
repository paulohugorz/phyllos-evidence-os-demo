# Persistência durável do PHYLLOS Impact 5

## Seleção automática

- com `DATABASE_URL`: PostgreSQL;
- sem `DATABASE_URL`: arquivo JSONL local;
- com `PI5_DATA_DIR` sem banco: diretório configurado, útil para disco persistente.

## Variáveis

- `DATABASE_URL`: conexão PostgreSQL;
- `PGSSL=require`: ativa TLS aceitando o certificado do provedor;
- `PGSSL=disable`: desativa TLS, útil para conexão interna controlada;
- `PI5_DATA_DIR`: diretório alternativo do fallback JSONL.

## Garantias

- eventos append-only;
- idempotência por `id`;
- conflito bloqueado quando o mesmo ID chega com conteúdo diferente;
- payload completo preservado em JSONB;
- índices para tipo, data, predição, categoria e status de validação;
- exportação JSONL permanece disponível para treino e auditoria.

## Render

Crie ou conecte um PostgreSQL e defina `DATABASE_URL` no serviço web. Depois do redeploy, consulte:

- `/api/v1/pi5/health`
- `/api/v1/pi5/summary`

O campo `persistenceMode` deve ser `postgresql` e `durable` deve ser `true`.
