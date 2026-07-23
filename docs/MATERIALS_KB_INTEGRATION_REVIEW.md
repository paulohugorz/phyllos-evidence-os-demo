# PHYLLOS Materials Knowledge Base — revisão técnica e plano de integração

## Decisão

**Não aplicar diretamente em produção os arquivos originais `01_schema.sql` e `02_seed.sql`.**

O material original é uma boa prova de conceito relacional e separa corretamente material canônico, artigo comercial, material aplicado, certificações e claims. Entretanto, ele não está compatível com os controles já adotados pelo Evidence OS para multi-tenancy, isolamento por tenant, IDs de SKU, auditoria e segurança epistêmica.

O pacote revisado transforma a proposta em uma fundação de integração **v0.2**, preparada para PostgreSQL 15+ e para o schema alvo do Sprint 1 do Buyer Readiness.

## Pontos positivos preservados

- Separação entre material canônico e artigo comercial.
- Material aplicado por produto, componente e lote.
- Claim nunca aprovado automaticamente.
- Catálogo de certificações e requisitos de evidência.
- Taxonomia independente de componentes de vestuário e calçados.
- Reconhecimento de que SVHC, normas e identificadores são dados vivos.
- Preparação para níveis de acesso diferentes.

## Bloqueios encontrados nos arquivos originais

### P0 — segurança e compatibilidade

1. **Ausência de `tenant_id` e RLS** nas tabelas operacionais.
2. **`material_application.sku` como texto livre**, sem FK para `skus`.
3. **Tabela `supplier` paralela a `organizations`**, criando duas fontes de verdade.
4. **Documentos paralelos ao Evidence OS**, sem hash obrigatório e sem ligação canônica à evidência.
5. **Sem integração com `audit_events`**.
6. **Seed não idempotente**: uma segunda execução falha ou duplica dados.
7. **Tipos e tabelas globais sem namespace**, aumentando risco de conflito.
8. **Aprovação modelada apenas por booleano**, sem estado de revisão/publicação consistente.

### P1 — modelagem

1. `material_origin` mistura natureza química/biológica com circularidade. Poliéster reciclado é simultaneamente sintético e reciclado; um único enum não representa isso corretamente.
2. `material_family.vertical` permite apenas uma vertical, embora materiais sejam usados em vestuário, acessórios e calçados.
3. `product_component.code` era globalmente único, forçando códigos artificiais como `forro_calcado`.
4. `material_property.property_value` como texto impede comparação, unidades controladas e validação numérica.
5. Não havia controle da soma da composição do artigo.
6. Não havia versão efetiva das certificações e regras de claim.
7. Não havia restrição contra vínculos de evidência para objetos inexistentes.

### P1 — conteúdo regulatório e de certificação

- GRS precisa distinguir o uso B2B do claim voltado ao consumidor.
- GOTS precisa distinguir o grau “Made with organic” do grau “Organic”.
- A lista ECHA não deve ser descrita por uma contagem fixa no seed.
- O relatório JRC de maio de 2026 é uma recomendação para apoiar requisitos, não o ato delegado final.
- `access_tier` deve ser tratado como política versionada de readiness, não como conclusão jurídica fechada.

## Correções implementadas no pacote v0.2

### Catálogo compartilhado

- Schema PostgreSQL dedicado: `materials`.
- Famílias e materiais canônicos versionáveis.
- Relação muitos-para-muitos entre material e vertical.
- Componentes independentes por vertical.
- Processos produtivos.
- Certificações com versão e vigência.
- Regras de claim por contexto.
- Claims e requisitos de evidência.
- Fontes com frequência de atualização e data de verificação.
- Amostra de substâncias explicitamente não exaustiva.

### Dados operacionais por tenant

- `commercial_article` ligado ao fornecedor em `organizations`.
- `material_application` ligado por FK ao `skus` do Evidence OS.
- FKs compostas garantem que SKU, fornecedor e registro pertençam ao mesmo tenant.
- RLS e `FORCE ROW LEVEL SECURITY`.
- Triggers de auditoria para `audit_events`.
- Trigger diferido que impede composição acima de 100%.
- Claims com estados compatíveis com revisão e publicação.
- Ponte explícita para Evidence/Document, sem duplicar arquivo físico.

### Segurança do catálogo

Mutações no catálogo compartilhado exigem:

```text
app.role = phyllos_admin
```

O seed usa temporariamente:

```text
app.role = migration
```

Os clientes devem consultar o catálogo, mas não alterá-lo diretamente.

## Limitação ainda aberta

A ponte `materials.evidence_binding` armazena `evidence_id` e `document_id` como `TEXT` porque a persistência PostgreSQL de Evidence/Document ainda não está conectada ao runtime. Ela valida a existência do objeto da Materials KB, mas não consegue criar FK para uma tabela de evidência que ainda não existe no schema persistente.

Antes de declarar a integração concluída, é necessário:

1. persistir Evidence, Document e Assertion em PostgreSQL;
2. substituir a ponte textual por FKs reais;
3. implementar o adapter PostgreSQL no runtime;
4. executar testes de integração com RLS;
5. testar backup e restauração;
6. executar o piloto com dados reais.

## Arquivos revisados

- `db/migrations/002_materials_knowledge_base.sql`
- `db/seeds/002_materials_knowledge_base_seed.sql`
- `db/validation/002_materials_knowledge_base_validate.sql`
- `src/materials-repository.js`
- `test/materials-repository.test.js`
- `scripts/install-materials-kb-into-repo.sh`
- `scripts/deploy-materials-kb-db.sh`
- `scripts/test-materials-kb-postgres.sh`

Os arquivos originais foram preservados em `original/`.

## Gates de deploy

### Gate 1 — integração no repositório

- árvore Git limpa;
- Node.js 22+;
- branch dedicada;
- `node --check` aprovado;
- testes específicos aprovados;
- suíte atual do Evidence OS aprovada.

### Gate 2 — banco de staging

- PostgreSQL 15+;
- tabelas `organizations`, `skus` e `audit_events` existentes;
- migration em transação;
- seed idempotente;
- validação SQL aprovada;
- teste de RLS com dois tenants;
- teste de composição acima de 100%;
- teste de aprovação de claim sem revisão.

### Gate 3 — produção

- backup `pg_dump` gerado;
- restauração testada em ambiente isolado;
- adapter conectado ao runtime;
- testes de API contra PostgreSQL;
- observabilidade e alertas;
- confirmação explícita de produção;
- rollout sem prometer DPP plenamente conforme.

## Go/No-Go

| Entrega | Decisão |
|---|---|
| Aplicar os SQL originais diretamente | **NO-GO** |
| Adicionar o pacote revisado a uma branch | **GO** |
| Aplicar a migration revisada em staging | **GO condicionado** |
| Aplicar em produção sem adapter PostgreSQL | **NO-GO** |
| Usar o catálogo como base do próximo sprint | **GO** |
