#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATION="$ROOT/db/migrations/002_materials_knowledge_base.sql"
SEED="$ROOT/db/seeds/002_materials_knowledge_base_seed.sql"
VALIDATION="$ROOT/db/validation/002_materials_knowledge_base_validate.sql"
MODE="staging"
CONFIRMATION=""
BACKUP_DIR="${PHYLLOS_BACKUP_DIR:-$ROOT/.backups}"

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
fail() { printf '\n\033[1;31mERRO: %s\033[0m\n' "$1" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --staging)
      MODE="staging"
      shift
      ;;
    --production)
      MODE="production"
      shift
      ;;
    --confirm)
      [[ $# -ge 2 ]] || fail "--confirm exige uma frase"
      CONFIRMATION="$2"
      shift 2
      ;;
    *)
      fail "Argumento desconhecido: $1"
      ;;
  esac
done

command -v psql >/dev/null 2>&1 || fail "Comando ausente: psql"

file_sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    fail "sha256sum ou shasum é obrigatório"
  fi
}

[[ -n "${DATABASE_URL:-}" ]] || fail "Defina DATABASE_URL"
[[ -f "$MIGRATION" && -f "$SEED" && -f "$VALIDATION" ]] || fail "Arquivos SQL incompletos"

if [[ "$MODE" == "production" ]]; then
  command -v pg_dump >/dev/null 2>&1 || fail "pg_dump é obrigatório em produção"
  [[ "$CONFIRMATION" == "APPLY PHYLLOS MATERIALS KB" ]] || \
    fail "Produção exige --confirm 'APPLY PHYLLOS MATERIALS KB'"
fi

log "Verificando PostgreSQL e compatibilidade do schema existente"
SERVER_VERSION_NUM="$(psql "$DATABASE_URL" -X -Atqc "SHOW server_version_num")"
[[ "$SERVER_VERSION_NUM" =~ ^[0-9]+$ ]] || fail "Não foi possível ler server_version_num"
(( SERVER_VERSION_NUM >= 150000 )) || fail "PostgreSQL 15+ é obrigatório"

psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atqc "
DO \$\$
BEGIN
  IF to_regclass('public.organizations') IS NULL THEN
    RAISE EXCEPTION 'Tabela public.organizations ausente';
  END IF;
  IF to_regclass('public.skus') IS NULL THEN
    RAISE EXCEPTION 'Tabela public.skus ausente';
  END IF;
  IF to_regclass('public.audit_events') IS NULL THEN
    RAISE EXCEPTION 'Tabela public.audit_events ausente';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='organizations' AND column_name='tenant_id'
  ) THEN
    RAISE EXCEPTION 'organizations.tenant_id ausente';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='skus' AND column_name='tenant_id'
  ) THEN
    RAISE EXCEPTION 'skus.tenant_id ausente';
  END IF;
END
\$\$;"

printf 'Ambiente: %s\n' "$MODE"
printf 'PostgreSQL server_version_num: %s\n' "$SERVER_VERSION_NUM"
printf 'Migration SHA-256: %s\n' "$(file_sha256 "$MIGRATION")"
printf 'Seed SHA-256: %s\n' "$(file_sha256 "$SEED")"

if [[ "$MODE" == "production" ]]; then
  log "Gerando backup antes da migration"
  mkdir -p "$BACKUP_DIR"
  BACKUP_FILE="$BACKUP_DIR/phyllos-before-materials-kb-$(date -u +%Y%m%dT%H%M%SZ).dump"
  pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl --file="$BACKUP_FILE"
  [[ -s "$BACKUP_FILE" ]] || fail "Backup não foi gerado"
  printf 'Backup: %s\n' "$BACKUP_FILE"
fi

log "Aplicando migration em transação"
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$MIGRATION"

log "Aplicando seed idempotente"
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$SEED"

log "Executando validação pós-migração"
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$VALIDATION"

log "Migration concluída"
printf 'O schema Materials KB está disponível no banco %s.\n' "$MODE"
printf 'A persistência do runtime ainda precisa usar src/materials-repository.js e conectar Evidence/Document ao PostgreSQL.\n'
