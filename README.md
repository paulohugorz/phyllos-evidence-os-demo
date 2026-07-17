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
- calculadora de medidas com entradas, folgas e resultado explicado;
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

O frontend publicado é um protótipo funcional. A imagem selecionada ainda não é processada por um modelo de visão; a hipótese têxtil usa as observações e o texto da etiqueta informados pelo usuário. A calculadora roda no cliente e seus resultados ainda não são persistidos no Evidence Ledger.

O núcleo usa armazenamento em memória para validar contratos de domínio e testes. Ainda não é uma aplicação de produção. Os próximos passos são:

1. persistir entradas e resultados em uma API versionada e no Evidence Ledger;
2. implementar upload seguro, consentimento, object storage, quarentena e malware scan;
3. integrar inferência visual com confiança, top-k, abstenção e trilha de auditoria;
4. vincular identificação e medidas a organizações, produtos e versões;
5. portar os serviços para PostgreSQL/Drizzle e autenticação OIDC;
6. executar piloto com peças reais, testes E2E e staging.

Nenhum estado `proven` é produzido automaticamente. O sistema não certifica sustentabilidade nem publica cálculo ambiental.
