# PHYLLOS Evidence OS — frontend demonstrável e vertical slice P0

Implementação de referência do primeiro Evidence Loop, com frontend demonstrável e sem dependências externas.

- Frontend: https://phyllos-evidence-os-demo.onrender.com
- Repositório: https://github.com/paulohugorz/phyllos-evidence-os-demo
- Direção de produto e agentes: [docs/ORIENTACAO_AGENTES.md](docs/ORIENTACAO_AGENTES.md)

## Executar

```bash
npm test
npm run demo
```

## Implementado

- dashboard do Evidence OS com identidade visual PHYLLOS;
- entrada guiada para identificação têxtil por imagem, etiqueta e observações;
- hipótese de tecido explicitamente separada de prova;
- calculadora de medidas e moldes com bases de saias, blusas, vestidos, mangas e calças;
- guia de tomada de medidas, tabela feminina 36–62 e redução orientada para malhas, adaptados metodologicamente de Marlene Mukai (2015);
- portfólio progressivo em quatro etapas, permitindo iniciar uma peça com dados mínimos e completar construção, produção e evidências depois;
- módulo Produção como entrada principal, derivado do cadastro da peça, com modos Encomenda e Lote, painel diário, Kanban, bloqueios, necessidade de material, qualidade, custo e evidências;
- projetos/compromissos ligados a um cliente e compostos por uma ou mais peças, com herança de modo, prazo, responsável e próxima ação;
- cálculo ambiental transversal, recebendo contexto de portfólio, tecido e molde;
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

O frontend publicado é um protótipo funcional. A imagem selecionada ainda não é processada por um modelo de visão; a hipótese têxtil usa as observações e o texto da etiqueta informados pelo usuário. A calculadora e o portfólio progressivo rodam no cliente; os rascunhos ficam no armazenamento local do navegador e ainda não são persistidos no Evidence Ledger.

Os alertas operacionais são regras determinísticas e explicáveis calculadas a partir dos dados do cadastro: prazo, bloqueio, próxima ação, responsável, necessidade de material e custo. Eles não executam mudanças e não comprovam a realidade da produção sem atualização humana.

As referências de modelagem foram transformadas em lógica interativa e orientação resumida, sem reproduzir páginas ou ilustrações do livro *Modelagem prática para confecção de roupas*, de Marlene Mukai, 3ª edição, 2015. Todo molde calculado deve ser conferido e testado antes do corte final.

O núcleo usa armazenamento em memória para validar contratos de domínio e testes. Ainda não é uma aplicação de produção. Os próximos passos são:

1. persistir entradas e resultados em uma API versionada e no Evidence Ledger;
2. implementar upload seguro, consentimento, object storage, quarentena e malware scan;
3. integrar inferência visual com confiança, top-k, abstenção e trilha de auditoria;
4. vincular identificação e medidas a organizações, produtos e versões;
5. portar os serviços para PostgreSQL/Drizzle e autenticação OIDC;
6. executar piloto com peças reais, testes E2E e staging.

Nenhum estado `proven` é produzido automaticamente. O sistema não certifica sustentabilidade. O cálculo ambiental publicado é uma estimativa demonstrativa, com fatores médios explícitos e faixa de incerteza; não substitui ACV, auditoria ou fatores verificados do fornecedor.
