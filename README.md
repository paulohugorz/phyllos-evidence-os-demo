# PHYLLOS Evidence OS P0 — vertical slice executável

Implementação de referência do primeiro Evidence Loop, sem dependências externas.

## Executar

```bash
npm test
npm run demo
```

## Implementado

- tenants e isolamento de recursos;
- autorização deny-by-default por papel;
- organizações e produtos;
- fatos versionados e transições epistemológicas;
- documentos com SHA-256 e detecção de duplicidade;
- vínculos de evidência;
- regra de completude e findings explicáveis;
- tarefas e submissão de resolução;
- importação validada e idempotente;
- dossiê congelado com hash reproduzível;
- audit log segregado por tenant.

## Limites deliberados

Este vertical slice usa armazenamento em memória para validar contratos de domínio e testes. Não é produção. Os próximos passos são:

1. portar os serviços para PostgreSQL/Drizzle usando o schema do kit Sprint 0;
2. autenticação OIDC e memberships persistidas;
3. object storage, quarentena e malware scan;
4. API `/api/v1` e UI acessível;
5. jobs de expiração e notificações;
6. testes E2E e staging.

Nenhum estado `proven` é produzido automaticamente. O sistema não certifica sustentabilidade nem publica cálculo ambiental.
