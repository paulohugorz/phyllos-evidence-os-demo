# PI5 v0.2 — núcleo técnico governado

> Documento confidencial de desenvolvimento. Não publicar antes da decisão de depósito de patente.

## Problema técnico

Dados ambientais de produção têxtil chegam incompletos, com origens, qualidades, versões e momentos de captura diferentes. Sem controle técnico, dados ausentes podem produzir resultados favoráveis, eventos offline podem duplicar registros e modelos de calibração podem violar regras metodológicas.

## Solução implementada

- valores ausentes recebem referência neutra e reduzem cobertura, em vez de gerar score artificialmente alto;
- proveniência é registrada por campo;
- cobertura e confiança podem ser derivadas da evidência;
- incerteza é propagada para cada dimensão e para o score global;
- um gate automático decide se o resultado é bloqueado, experimental, estimado ou contextualizado;
- o calibrador só altera o score dentro de limite configurado;
- a trava de dimensão crítica permanece invariante após calibração;
- cada predição gera snapshot com hashes de metodologia, benchmark, modelo, inputs e proveniência;
- o replay verifica integridade e reproduz o resultado histórico;
- a persistência local e PostgreSQL rejeitam colisões de idempotência;
- o sistema recomenda as próximas evidências com maior ganho esperado de confiança.

## Invariantes

1. Aprendizado de máquina não muda o gate de publicação.
2. Aprendizado de máquina não remove a trava crítica.
3. Documentação não reduz impacto automaticamente.
4. Correções são novos eventos.
5. Um mesmo ID não pode representar dois payloads diferentes.
6. Resultado histórico deve ser reproduzível pelo snapshot.

## Próximos incrementos confidenciais

- propagação probabilística por grafo de derivação;
- valor informacional baseado em mudança esperada de decisão;
- reconciliação de conflitos entre especialistas;
- sincronização offline multi-dispositivo com resolução append-only;
- benchmark adaptativo submetido a revisão e versionamento.
