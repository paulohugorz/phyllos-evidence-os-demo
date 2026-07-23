# PHYLLOS Materials API + Frontend v1.0

## Decisão

A interface deixa de gravar aplicações de materiais no `localStorage` e passa a consumir uma API PostgreSQL sob:

```text
/api/v1/materials
```

O catálogo canônico permanece global e somente leitura para clientes. Artigos comerciais, aplicações por SKU, evidências referenciais e claims permanecem isolados por `tenant_id` e protegidos pelo RLS instalado na migration 002.

## Fluxo implementado

```text
Catálogo canônico PostgreSQL
→ artigo comercial do tenant
→ SKU persistente
→ componente da vertical
→ aplicação com lote, quantidade e confiança
→ snapshot histórico
→ referência de evidência
→ auditoria
```

## Endpoints

### Estado e vocabulário

```http
GET /api/v1/materials/status
GET /api/v1/materials/filters
GET /api/v1/materials/families
GET /api/v1/materials/component-types?vertical=apparel
GET /api/v1/materials/claim-types
```

### Catálogo

```http
GET /api/v1/materials/catalog
GET /api/v1/materials/catalog/:materialId
```

Filtros implementados:

- `query`
- `vertical`
- `family`
- `origin`
- `structure`
- `evidence`
- `limit`
- `cursor`

O filtro por certificação e o filtro por claim permanecem desabilitados no frontend porque a migration 002 registra certificações e claims, mas ainda não cria relação direta entre cada material canônico e esses objetos. A interface informa essa limitação em vez de produzir associação implícita.

### Organizações e SKUs

```http
GET /api/v1/materials/organizations
GET /api/v1/materials/skus
```

A API lê `public.skus` usando `to_jsonb`, reduzindo dependência de nomes acessórios de coluna. Os únicos campos estruturais assumidos são `tenant_id` e `id`, exigidos pela Materials KB.

### Artigos comerciais

```http
GET  /api/v1/materials/commercial-articles
GET  /api/v1/materials/commercial-articles/:articleId
POST /api/v1/materials/commercial-articles
POST /api/v1/materials/commercial-articles/:articleId/composition
```

Operações `POST` exigem `Idempotency-Key`.

### Aplicações por SKU

```http
GET    /api/v1/materials/skus/:skuId/applications
POST   /api/v1/materials/skus/:skuId/applications
PATCH  /api/v1/materials/skus/:skuId/applications/:applicationId
DELETE /api/v1/materials/skus/:skuId/applications/:applicationId
```

- `POST` exige `Idempotency-Key`.
- `PATCH` e `DELETE` exigem `If-Match` ou `version`.
- `DELETE` arquiva; não remove fisicamente o histórico.
- a aplicação preserva `application_snapshot` do artigo, material e composição no momento do vínculo.

### Claims

```http
POST  /api/v1/materials/applications/:applicationId/claims
PATCH /api/v1/materials/application-claims/:claimId
```

Aprovação continua restrita a perfis de revisão. O frontend v1 não aprova claims automaticamente.

## Variáveis do serviço

Obrigatórias para operações do tenant:

```text
DATABASE_URL
MATERIALS_TENANT_ID
MATERIALS_USER_ID
MATERIALS_ROLE
```

Exemplo para o piloto:

```text
MATERIALS_TENANT_ID=tenant-marca-horizonte
MATERIALS_USER_ID=demo-analyst
MATERIALS_ROLE=client_admin
```

`MATERIALS_TENANT_ID` deve corresponder ao `tenant_id` existente em `public.organizations` e `public.skus`.

Opcional:

```text
PGSSL=require
MATERIALS_API_TRUST_HEADERS=false
```

`MATERIALS_API_TRUST_HEADERS=true` somente deve ser usado quando um proxy autenticado e confiável preencher:

```text
X-Phyllos-Tenant-Id
X-Phyllos-User-Id
X-Phyllos-Role
```

Não habilitar essa opção para tráfego público direto.

## Migration 003

A migration adiciona:

- snapshot histórico da aplicação;
- notas;
- chave de idempotência;
- versão para concorrência otimista;
- data de arquivamento;
- índices operacionais;
- view `materials.v_material_application_api`.

## Frontend

A nova tela permite:

- pesquisa e filtros do catálogo real;
- consulta de detalhes técnicos e fontes;
- consulta de artigos do tenant;
- cadastro de artigo comercial;
- seleção separada de material e artigo;
- configuração por componente de confecção ou calçados;
- lote, quantidade, unidade, confiança e referência de evidência;
- edição concorrente protegida por versão;
- arquivamento preservando histórico;
- indicação explícita quando Product/SKU ainda não está persistido.

## Limitações preservadas

1. O Evidence Store canônico ainda não está persistido em PostgreSQL. A API grava uma referência textual em `materials.evidence_binding`, identificada como `frontend:*`.
2. Autenticação real ainda precisa substituir o contexto por variáveis de ambiente.
3. Produtos existentes apenas no `localStorage` do portfólio não são sincronizados automaticamente para `public.skus`.
4. Não há associação direta material–certificação ou material–claim; o frontend não fabrica essa relação.
5. `production_ready` permanece `false` no endpoint de status enquanto autenticação e Evidence Store canônico estiverem pendentes.

## Gates

### Staging

- migrations 002 e 003 aplicadas;
- seed 002 aplicado;
- validações SQL aprovadas;
- tenant configurado;
- ao menos uma organização fornecedora e um SKU do mesmo tenant;
- testes HTTP de criação, atualização, conflito e isolamento.

### Produção

- backup e restauração testados;
- autenticação real;
- RLS validado com dois tenants;
- observabilidade;
- Evidence Store PostgreSQL ou aceitação formal da ponte transitória;
- rollout por feature flag.
