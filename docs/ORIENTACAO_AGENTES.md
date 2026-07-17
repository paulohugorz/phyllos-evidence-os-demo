# Orientação canônica aos agentes PHYLLOS

Atualizada em 17/07/2026.

## Fonte de verdade

O caminho vigente é o PHYLLOS Evidence OS, demonstrado em https://phyllos-evidence-os-demo.onrender.com e versionado em https://github.com/paulohugorz/phyllos-evidence-os-demo.

Em caso de divergência, a prioridade é: código e testes da branch principal; PRD e backlog vigentes no Notion; este documento; documentos históricos. Planos antigos de Railway, DPP isolado ou catálogos de agentes não reconciliados não devem orientar novas entregas.

## Norte do produto

Transformar dados informados ou capturados em evidências rastreáveis que apoiem decisões e ações verificáveis:

`dado → evidência → risco/oportunidade → decisão → plano de ação → acompanhamento → resultado verificável`

O frontend deve deixar claro como o usuário fornece cada entrada, de onde cada resultado veio e qual é o seu grau epistemológico. Uma hipótese útil não é uma prova.

## Estado atual

| Capacidade | Estado | Regra de comunicação |
| --- | --- | --- |
| Dashboard Evidence OS | Demonstrável no Render | Usar como porta de entrada do produto |
| Identificação têxtil | Protótipo orientado por observações e etiqueta | A imagem ainda não é analisada por modelo; exibir hipótese e confiança, nunca certeza |
| Calculadora de medidas | Funcional no cliente | Mostrar entradas, folgas, fórmula e resultado; ainda sem persistência |
| Evidence Loop de domínio | Coberto por testes, em memória | Não apresentar como infraestrutura de produção |
| DPP/claims | Direção futura apoiada por evidências | Não declarar certificação, conformidade ou sustentabilidade automaticamente |

## Próxima sequência de entrega

1. Definir contratos e persistir as entradas de identificação e medidas no Evidence Ledger.
2. Implementar upload seguro de imagens, consentimento, retenção e rastreabilidade.
3. Integrar inferência visual com top-k, confiança, abstenção, versão do modelo e auditoria.
4. Vincular resultados a organização, produto, peça, lote e versão.
5. Validar o fluxo com peças reais e medir conclusão, correções e valor para o usuário.
6. Só então ampliar automações, claims e publicação de DPP.

## Regras não negociáveis

- Nunca converter inferência, ausência de dado ou texto do usuário em fato comprovado.
- Registrar origem, autor, data, versão, método e transformação de cada evidência.
- Exibir lacunas e permitir correção humana antes de decisões ou publicação.
- Não prometer LCA oficial, auditoria, certificação, conformidade ou benefício ambiental sem fonte apropriada.
- Manter isolamento por tenant, autorização deny-by-default e auditabilidade.
- Cada tarefa deve ter critério de aceite verificável e evidência exigida no backlog.

## Roteamento dos agentes

- `execution-orchestrator`: mantém sequência, dependências, WIP e coerência entre Git e Notion.
- `tech-lead-fullstack-data`: decide contratos, arquitetura, modelo de dados e limites técnicos.
- `backend-data-engineer`: persiste ledger, uploads, inferências, cálculos e auditoria.
- `frontend-integrations-engineer`: torna entradas compreensíveis, acessíveis e conectadas às APIs.
- `devops-security-agent`: Render, CI/CD, segredos, storage, observabilidade e segurança.
- `regulatory-specialist` e `regulatory-analyst`: regras, fontes, claims, DPP e limites regulatórios.
- `implementation-cs-lead` e `implementation-cs-analyst`: piloto, onboarding, feedback e métricas de adoção.
- `sales-partnerships-lead` e `account-executive-partnerships`: validação comercial sem promessas além da evidência.
- `finance-administration`: custo, capacidade, contratos e sustentabilidade operacional.

Paulo mantém as decisões humanas de fundador, produto, dados e direção de design. Os nomes antigos do catálogo de 26 agentes permanecem apenas como compatibilidade temporária do schema do backlog até a migração para esta estrutura de 12 agentes.

## Definição de pronto

Uma entrega só está pronta quando código, testes, documentação, ambiente publicado e backlog contam a mesma história; as entradas do usuário são explícitas; o resultado é reproduzível; limitações e confiança estão visíveis; e existe evidência anexável do aceite.
