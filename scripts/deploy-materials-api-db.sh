#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
if [[ "$MODE" != "--staging" && "$MODE" != "--production" ]]; then
  echo "Uso: bash scripts/deploy-materials-api-db.sh --staging|--production" >&2
  exit 2
fi

: "${DATABASE_URL:?Defina DATABASE_URL com a conexão PostgreSQL}"
command -v psql >/dev/null 2>&1 || { echo "ERRO: psql não encontrado" >&2; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ "$MODE" == "--production" ]]; then
  if [[ "${CONFIRM_MATERIALS_PRODUCTION:-}" != "YES" ]]; then
    echo "ERRO: produção exige CONFIRM_MATERIALS_PRODUCTION=YES" >&2
    exit 1
  fi
  command -v pg_dump >/dev/null 2>&1 || { echo "ERRO: pg_dump é obrigatório em produção" >&2; exit 1; }
  BACKUP_DIR="${MATERIALS_BACKUP_DIR:-$ROOT/.runtime/materials-backups}"
  mkdir -p "$BACKUP_DIR"
  BACKUP_FILE="$BACKUP_DIR/materials-pre-api-$(date +%Y%m%d-%H%M%S).dump"
  echo "Gerando backup: $BACKUP_FILE"
  pg_dump "$DATABASE_URL" --format=custom --file="$BACKUP_FILE"
fi

SERVER_VERSION="$(psql "$DATABASE_URL" -X -Atqc "SHOW server_version_num")"
if [[ -z "$SERVER_VERSION" || "$SERVER_VERSION" -lt 150000 ]]; then
  echo "ERRO: PostgreSQL 15+ é obrigatório; server_version_num=${SERVER_VERSION:-indisponível}" >&2
  exit 1
fi

BASE_OBJECTS="$(psql "$DATABASE_URL" -X -Atqc "SELECT concat_ws('|',to_regclass('public.organizations'),to_regclass('public.skus'),to_regclass('public.audit_events'))")"
if [[ "$BASE_OBJECTS" != "organizations|skus|audit_events" && "$BASE_OBJECTS" != "public.organizations|public.skus|public.audit_events" ]]; then
  echo "ERRO: fundação Buyer Readiness ausente: $BASE_OBJECTS" >&2
  exit 1
fi

for file in \
  db/migrations/002_materials_knowledge_base.sql \
  db/seeds/002_materials_knowledge_base_seed.sql \
  db/migrations/003_materials_api_v1.sql \
  db/validation/002_materials_knowledge_base_validate.sql \
  db/validation/003_materials_api_v1_validate.sql
  do
    [[ -f "$file" ]] || { echo "ERRO: arquivo ausente: $file" >&2; exit 1; }
    echo "Aplicando $file"
    psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$file"
  done

echo
printf 'Materials API DB pronta em %s.\n' "$MODE"
printf 'Próximo gate: configurar MATERIALS_TENANT_ID, MATERIALS_USER_ID e MATERIALS_ROLE no serviço web.\n'
