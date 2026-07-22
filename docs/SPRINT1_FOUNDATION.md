# Sprint 1 — Foundation increment

This increment introduces the first Buyer Readiness domain slice without claiming production persistence.

## Included

- Collection and SKU entities in the in-memory domain store.
- Tenant-aware list and creation methods.
- Organization, collection, product and SKU HTTP endpoints.
- Operator bearer-token gate for every `/api/*` endpoint in production.
- Public `/healthz` endpoint.
- Payload size and malformed JSON handling.
- PostgreSQL target migration with tenant columns, constraints, indexes and RLS policies.
- Tests for domain isolation, GTIN validation, dossier SKU snapshot and authentication.

## Important limitation

The running server still uses `EvidenceStore` in memory. The SQL migration is a reviewed target schema and is not yet connected to the runtime. Do not call this PostgreSQL persistence complete until:

1. a database adapter is implemented;
2. transactions set `SET LOCAL app.tenant_id`;
3. migrations are executed in an isolated environment;
4. backup and restore are tested;
5. API integration tests run against PostgreSQL.

## Required production environment

- `NODE_ENV=production`
- `PHYLLOS_OPERATOR_TOKEN`: random secret with at least 32 characters
- `PHYLLOS_OPERATOR_USER_ID`
- `PHYLLOS_OPERATOR_ROLE`

Render uses `sync: false` for the token. Deployment must not proceed until the secret is configured.

## Local validation

```bash
docker run --rm \
  -v "$PWD":/app \
  -w /app \
  node:22-alpine \
  npm test
```

For local server use without production auth:

```bash
NODE_ENV=development npm start
```

For explicit local auth:

```bash
export PHYLLOS_OPERATOR_TOKEN="$(openssl rand -hex 32)"
NODE_ENV=production npm start
```
