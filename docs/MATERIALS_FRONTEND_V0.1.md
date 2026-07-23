# PHYLLOS Materials Knowledge Base — frontend v0.1

## Entrega

A implementação adiciona ao Evidence OS:

- item **Materiais** no menu principal;
- consulta de materiais canônicos com busca de 300 ms e filtros combinados;
- consulta de artigos comerciais;
- detalhe técnico com sinônimos, certificações, claims, requisitos e limitações;
- configuração de materiais por peça e componente;
- taxonomias independentes para confecção e calçados;
- seleção separada de material canônico e artigo comercial;
- lote, quantidade, unidade, confiança, evidência e observações;
- alertas de componente obrigatório, lote e evidência ausentes;
- snapshot do material e do artigo no momento da aplicação;
- persistência local das aplicações para acompanhar a arquitetura atual do piloto;
- endpoint de catálogo piloto versionado sob `/api/v1/materials-demo`.

## Rotas de API do catálogo piloto

```text
GET /api/v1/materials-demo/status
GET /api/v1/materials-demo/filters
GET /api/v1/materials-demo/families
GET /api/v1/materials-demo/component-types?vertical=apparel|footwear
GET /api/v1/materials-demo/catalog
GET /api/v1/materials-demo/catalog/:materialId
GET /api/v1/materials-demo/commercial-articles
```

Filtros do catálogo:

```text
query
vertical
family
origin
structure
certification
claim
evidence
limit
```

## Persistência e limites

O catálogo piloto é versionado no código. As aplicações feitas pela interface são guardadas no navegador em `phyllos-material-applications-v1`, porque o runtime principal ainda usa armazenamento local/em memória.

A interface não declara a base como pronta para produção. O endpoint de status retorna `production_ready: false`. A promoção para produção exige:

1. Materials Knowledge Base PostgreSQL aplicada;
2. `tenant_id` e RLS;
3. endpoints persistentes de aplicação por SKU;
4. autorização real;
5. integração com Evidence e Claim Ledger;
6. testes de integração e migração dos snapshots locais.

Claims permanecem em estados de rascunho, evidência pendente ou revisão; nenhum claim é aprovado automaticamente.
