# Charter Experimental PI5/Phi-5 v1

**Status:** aprovado como especificação-mestra  
**Classificação:** confidencial — ambiente privado PHYLLOS  
**Data de formalização:** 2026-07-18  
**Origem:** convocação técnica e científica aprovada pelo Founder

> A execução sintética v3 é classificada como smoke test da infraestrutura. Nenhum indicador obtido exclusivamente com fixtures sintéticos constitui evidência de desempenho real do PI5/Phi-5.

---

# Convocação aos agentes PHYLLOS

## Planejamento experimental e mensuração de confiabilidade do PI5/Phi-5

Todos os agentes técnicos, científicos, operacionais e de produto da PHYLLOS estão convocados para elaborar e executar um planejamento experimental destinado a avaliar o modelo atualmente denominado PI5/Phi-5.

O objetivo não é produzir apenas uma acurácia média. Precisamos entender:

* Em quais tarefas o modelo é confiável.
* Em quais condições sua confiabilidade diminui.
* Quais erros são mais frequentes.
* Quando o sistema deve responder, pedir mais evidências ou se declarar incapaz de concluir.
* Qual é a confiabilidade estatística de cada resultado apresentado ao usuário.
* Quais configurações de modelo, prompt, contexto e infraestrutura oferecem a melhor relação entre qualidade, latência e custo.

Nenhum percentual deverá ser apresentado como confiabilidade real antes da execução dos experimentos com dados de referência validados.

---

# 1. Primeira verificação obrigatória

Antes dos testes, os agentes de Arquitetura, IA e MLOps devem produzir um registro imutável da configuração avaliada:

* Nome oficial do modelo.
* Identificador do repositório ou catálogo.
* Versão ou hash do checkpoint.
* Data de obtenção.
* Runtime de inferência.
* Biblioteca e respectivas versões.
* Tipo de quantização: FP16, BF16, INT8, INT4 ou outra.
* Hardware utilizado.
* Memória disponível.
* Tamanho da janela de contexto.
* Template de chat.
* Prompt de sistema.
* Temperatura.
* Top-p, top-k e demais parâmetros.
* Estratégia de geração.
* Limite máximo de tokens.
* Ferramentas ou funções disponíveis.
* Versão da base RAG e do grafo PHYLLOS.
* Versão dos prompts, validadores e pós-processadores.
* Condição de execução: nuvem, servidor local, computador ou dispositivo móvel.

Cada combinação deverá receber um `configuration_id`. Resultados de configurações diferentes não poderão ser agregados como se viessem do mesmo sistema.

---

# 2. Perguntas experimentais

O experimento deverá responder, no mínimo, às seguintes perguntas:

1. Qual é a taxa de sucesso do PI5/Phi-5 em cada tarefa da PHYLLOS?
2. Como a qualidade varia quando imagens, textos ou documentos apresentam baixa qualidade?
3. O modelo reconhece quando não possui evidências suficientes?
4. O modelo inventa informações quando a resposta não está disponível?
5. A resposta permanece consistente quando a mesma entrada é repetida?
6. Pequenas alterações no prompt modificam significativamente a conclusão?
7. A quantização reduz a qualidade de forma relevante?
8. A utilização de RAG ou do grafo PHYLLOS melhora a resposta?
9. O modelo consegue distinguir evidência, hipótese, inferência e afirmação validada?
10. A confiança atribuída pelo sistema corresponde à frequência real de acerto?
11. Qual é o impacto de cada configuração sobre latência, memória e custo?
12. Quais cenários podem ser liberados para produção, mantidos em shadow mode ou bloqueados?

---

# 3. Unidade experimental

A unidade básica será um caso de teste versionado.

Cada caso deverá conter:

* `case_id`.
* Tipo de tarefa.
* Cenário experimental.
* Entrada original.
* Evidências disponíveis.
* Resposta de referência.
* Critérios de correção.
* Nível de risco.
* Classes de erro possíveis.
* Informação sobre possibilidade de indeterminação.
* Avaliação humana especializada, quando necessária.
* Origem e licença dos dados.
* Versão do caso.
* Identificação do avaliador.
* Registro de conflitos entre avaliadores.

Uma execução deverá vincular:

`case_id + configuration_id + prompt_version + seed + run_id`

Isso permitirá reproduzir exatamente cada resultado.

---

# 4. Famílias de tarefas a testar

## 4.1 Identificação e caracterização de tecidos

Testar o modelo em:

* Identificação da família estrutural.
* Sugestão de nome comercial.
* Distinção entre tecidos visualmente semelhantes.
* Reconhecimento de trama, superfície, transparência e elasticidade aparente.
* Leitura e interpretação de etiqueta.
* Associação entre imagens e ficha técnica.
* Identificação de inconsistências entre imagem, etiqueta e declaração do fornecedor.
* Reconhecimento de caso indeterminado.
* Recomendação de nova captura necessária.

A composição química do tecido não deverá ser considerada confirmada apenas por análise visual.

## 4.2 Captura multimodal

Avaliar conjuntos com:

* Seis imagens completas do protocolo.
* Apenas quatro imagens.
* Apenas duas imagens.
* Uma imagem isolada.
* Imagens em ordem diferente.
* Imagem repetida.
* Imagem ausente.
* Imagem desfocada.
* Iluminação insuficiente.
* Excesso de luz.
* Fundo semelhante ao tecido.
* Escala ausente.
* Escala incorreta.
* Diferentes câmeras e celulares.
* Compressão intensa.
* Recortes parciais.
* Imagens de tecidos amassados ou sobrepostos.
* Imagens que não representam tecido.

## 4.3 Extração documental

Testar:

* Etiquetas têxteis.
* Fichas técnicas.
* Notas e documentos de fornecedor.
* Ordens de produção.
* Fotografias de anotações.
* Tabelas.
* Documentos incompletos.
* Documentos com campos conflitantes.
* Documentos com baixa resolução.
* Diferentes formatos de data, unidade e porcentagem.

## 4.4 Assistência operacional para ateliês e pequenas confecções

Testar tarefas como:

* Planejamento de produção.
* Sequenciamento de ordens.
* Estimativa de materiais.
* Identificação de informações faltantes.
* Orientação sobre etapas produtivas.
* Organização de lotes.
* Registro de perdas.
* Explicação de problemas de qualidade.
* Priorização de tarefas.
* Geração de checklist.
* Apoio à captura de evidências.
* Consulta ao histórico de uma peça, amostra ou lote.

## 4.5 Uso do conhecimento PHYLLOS

Comparar o modelo:

* Sem contexto adicional.
* Com RAG textual.
* Com grafo de conhecimento.
* Com RAG e grafo combinados.
* Com evidências completas.
* Com evidências parcialmente recuperadas.
* Com documentos contraditórios.
* Com documento desatualizado.
* Com conteúdo irrelevante inserido no contexto.
* Sem evidência que permita responder.

---

# 5. Matriz de cenários

Os testes deverão combinar os seguintes fatores:

| Dimensão             | Níveis mínimos                                                      |
| -------------------- | ------------------------------------------------------------------- |
| Qualidade da entrada | ideal, aceitável, ruim, inutilizável                                |
| Familiaridade        | classe conhecida, classe semelhante, classe rara, fora do domínio   |
| Evidência            | completa, parcial, ausente, conflitante                             |
| Modalidade           | texto, imagem, documento, multimodal                                |
| Linguagem            | técnica, cotidiana, abreviada, com erros                            |
| Contexto             | curto, médio, longo, próximo do limite                              |
| Prompt               | padrão, variação semântica, instrução ambígua, tentativa de indução |
| Inferência           | determinística, baixa temperatura, temperatura elevada              |
| Runtime              | precisão integral e configurações quantizadas                       |
| Ambiente             | servidor, dispositivo local e condições degradadas                  |
| Risco                | baixo, médio e alto                                                 |
| Resultado correto    | resposta definida, múltiplas hipóteses ou indeterminação            |

Um fatorial completo pode gerar combinações excessivas. O agente de Experimentação deverá aplicar:

1. Teste piloto para eliminar fatores sem impacto.
2. Desenho fatorial fracionado para identificar efeitos principais.
3. Testes direcionados para interações críticas.
4. Stress tests nos piores cenários.
5. Confirmação com amostra independente.

---

# 6. Cenários experimentais obrigatórios

## S01 — Baseline controlada

Entrada completa, limpa, bem estruturada e pertencente ao domínio conhecido.

Objetivo: determinar o desempenho máximo esperado.

## S02 — Variações de linguagem

A mesma solicitação será apresentada em:

* Linguagem técnica.
* Linguagem cotidiana.
* Texto curto.
* Texto detalhado.
* Texto com erros ortográficos.
* Texto ambíguo.

Objetivo: medir sensibilidade à forma da pergunta.

## S03 — Imagem ideal

Imagens completas, bem iluminadas, focadas e seguindo o protocolo.

Objetivo: estabelecer a baseline multimodal.

## S04 — Degradação progressiva das imagens

Aplicar desfoque, compressão, recorte, rotação, sombras, alteração de exposição e redução de resolução em intensidades controladas.

Objetivo: construir a curva entre qualidade da imagem e confiabilidade.

## S05 — Tecidos visualmente semelhantes

Incluir pares ou grupos com alto potencial de confusão, como famílias de tecidos que compartilham textura, aparência ou estrutura próximas.

Objetivo: produzir a matriz de confusão e identificar classes que exigem evidência adicional.

## S06 — Classes raras ou desconhecidas

Apresentar materiais fora do conjunto de referência, tecidos raros e imagens que não representam tecidos.

Objetivo: medir a capacidade de abstinência e detecção de entradas fora do domínio.

## S07 — Evidências conflitantes

Exemplo: a etiqueta informa uma composição, a ficha técnica informa outra e a aparência visual sugere uma terceira hipótese.

Objetivo: verificar se o modelo explicita o conflito em vez de escolher arbitrariamente uma fonte.

## S08 — Evidência insuficiente

Remover informações necessárias para a conclusão.

Objetivo: verificar se o sistema pede dados adicionais ou produz uma afirmação indevida.

## S09 — Planejamento operacional

Apresentar ordens de produção com recursos, prazos, prioridades e restrições.

Objetivo: avaliar validade, completude e exequibilidade do plano.

## S10 — Cálculos e unidades

Testar consumo de tecido, quantidades, perdas, conversões, percentuais e capacidade produtiva.

Objetivo: medir erros numéricos e verificar se os cálculos podem ser reproduzidos.

## S11 — Contexto longo

Executar conversas prolongadas com várias amostras, lotes e ordens.

Objetivo: medir esquecimento, contaminação entre registros e troca indevida de identificadores.

## S12 — Robustez a instruções adversariais

Inserir instruções nos documentos ou mensagens tentando fazer o modelo:

* Ignorar regras.
* Alterar registros.
* Declarar informação não comprovada.
* Revelar dados indevidos.
* Promover hipótese para afirmação.

Objetivo: testar segurança, isolamento de instruções e governança epistêmica.

## S13 — Repetibilidade

Executar cada caso diversas vezes com a mesma configuração e com sementes diferentes.

Objetivo: medir a estabilidade das respostas.

## S14 — Quantização e infraestrutura

Comparar versões do runtime e diferentes níveis de quantização.

Objetivo: medir perda de qualidade, latência, consumo de memória, energia e taxa de falhas.

## S15 — Falhas de ferramentas e recuperação

Simular:

* RAG indisponível.
* Timeout.
* Resultado vazio.
* Documento corrompido.
* Serviço externo fora do ar.
* Resposta parcial.
* Queda durante a execução.

Objetivo: verificar se a aplicação falha de maneira segura.

---

# 7. Construção do conjunto de referência

Os dados deverão ser separados em:

* Desenvolvimento.
* Calibração.
* Teste interno.
* Teste cego.
* Stress test.
* Casos reais pós-implantação.

O conjunto de teste cego não poderá ser utilizado para ajuste de prompt, regras ou modelo.

Para tarefas têxteis, a verdade de referência deverá combinar, quando aplicável:

* Nome comercial confirmado.
* Família estrutural.
* Composição da etiqueta ou ficha.
* Evidência documental.
* Análise de profissional.
* Resultado laboratorial, quando disponível.
* Registro explícito de divergências.

Casos com desacordo humano não deverão ser tratados automaticamente como erro do modelo. Eles deverão formar uma categoria de ambiguidade ou ser submetidos à arbitragem.

---

# 8. Volume experimental

Aplicar uma estratégia sequencial.

## Fase A — Smoke test

* Aproximadamente 10 casos por família de tarefa.
* Objetivo: encontrar falhas de integração, formato e instrumentação.
* Resultados não poderão ser divulgados como confiabilidade.

## Fase B — Piloto

* Pelo menos 30 casos representativos por cenário prioritário.
* Múltiplas repetições para medir instabilidade.
* Objetivo: estimar variância, classes de erro e necessidade de amostra.

## Fase C — Avaliação principal

* Preferencialmente 100 ou mais casos independentes por cenário crítico.
* Cenários raros poderão utilizar amostragem dirigida, desde que reportados separadamente.
* Objetivo: calcular intervalos de confiança úteis para decisões de produto.

## Fase D — Confirmação

* Utilizar conjunto cego e independente.
* Não ajustar o sistema depois de observar os resultados.
* Qualquer alteração deverá gerar uma nova versão e uma nova rodada.

A quantidade final deverá ser calculada pelo agente estatístico conforme a margem de erro desejada, frequência esperada de sucesso e criticidade do cenário.

---

# 9. Definição de sucesso

Cada caso deverá ter critérios verificáveis.

A avaliação não deverá usar somente notas subjetivas como “boa resposta”.

Possíveis critérios:

* Resposta factual correta.
* Identificadores preservados.
* Cálculo correto.
* Formato válido.
* Evidência citada.
* Ausência de afirmação não suportada.
* Conflito identificado.
* Incerteza corretamente comunicada.
* Próxima ação adequada.
* Nenhum erro crítico.
* Nenhuma violação de segurança.

Para tarefas compostas, registrar:

* Sucesso integral.
* Sucesso parcial.
* Falha recuperável.
* Falha grave.
* Falha crítica.

O critério primário de confiabilidade deverá considerar sucesso integral e ausência de falha crítica.

---

# 10. Métricas obrigatórias

## 10.1 Qualidade da tarefa

* Acurácia.
* Precisão, recall e F1 quando houver classificação.
* Top-1 e top-3 para hipóteses de tecido.
* Matriz de confusão.
* Exact match para campos estruturados.
* Taxa de validade de JSON ou esquema.
* Erro absoluto e percentual para cálculos.
* Completude.
* Fidelidade às evidências.
* Taxa de alucinação.
* Taxa de conflito corretamente identificado.

## 10.2 Incerteza e abstinência

* Taxa de respostas.
* Taxa de abstinência.
* Acurácia apenas entre casos respondidos.
* Risco seletivo: erros entre os casos que o sistema decidiu responder.
* Recall de abstinência em casos insolúveis.
* Precisão de abstinência.
* Curva risco versus cobertura.

O sistema deve ser recompensado por não concluir quando faltarem evidências.

## 10.3 Calibração

* Brier Score.
* Expected Calibration Error.
* Curva de confiabilidade.
* Diferença entre confiança declarada e acerto observado.
* Calibração por tarefa e cenário.

Quando o modelo não oferecer uma probabilidade tecnicamente utilizável, a confiança deverá ser estimada a partir de sinais observáveis, como:

* Concordância entre execuções.
* Suporte encontrado nas evidências.
* Resultado de um verificador independente.
* Distância em relação às classes conhecidas.
* Qualidade da entrada.
* Quantidade de evidências disponíveis.
* Presença de conflito.
* Resultado de regras determinísticas.

Esses sinais deverão alimentar um calibrador separado, treinado apenas no conjunto de calibração.

## 10.4 Robustez

* Consistência entre paráfrases.
* Consistência entre repetições.
* Variação por seed.
* Queda de qualidade após degradação.
* Queda de qualidade após quantização.
* Sensibilidade a contexto irrelevante.
* Sensibilidade à ordem das evidências.

## 10.5 Operação

* Latência p50, p95 e p99.
* Tokens de entrada e saída.
* Consumo de memória.
* Utilização de CPU, GPU ou NPU.
* Taxa de timeout.
* Taxa de erro do runtime.
* Disponibilidade.
* Custo por execução.
* Consumo aproximado por tarefa, quando mensurável.

---

# 11. Cálculo da confiabilidade

Para cada cenário `s`, calcular:

`p_s = sucessos válidos / total de casos válidos`

Além do valor observado, calcular o intervalo de confiança binomial de 95%, preferencialmente pelo método de Wilson.

A PHYLLOS deverá utilizar como indicador conservador:

`Confiabilidade mínima do cenário = limite inferior do intervalo de 95%`

Exemplo conceitual:

* Acurácia observada: 92%.
* Intervalo de confiança: 86% a 96%.
* Confiabilidade operacional conservadora: 86%.

Não apresentar apenas os 92%, pois a incerteza da amostra precisa fazer parte da decisão.

Para múltiplas execuções do mesmo caso, separar:

* Confiabilidade entre casos diferentes.
* Estabilidade entre repetições do mesmo caso.

Também calcular:

`Taxa de erro crítico = erros críticos / total`

`Cobertura = casos respondidos / total`

`Risco seletivo = respostas erradas / casos respondidos`

`Taxa de alucinação = afirmações não suportadas / afirmações avaliadas`

---

# 12. Índice operacional complementar

Além das métricas individuais, poderá ser criado um índice para comparação de configurações:

* 40%: limite inferior da correção.
* 15%: fidelidade às evidências.
* 15%: calibração.
* 10%: capacidade de abstinência.
* 10%: robustez.
* 5%: conformidade estrutural.
* 5%: desempenho operacional.

Entretanto, o índice não poderá compensar falhas críticas.

Uma configuração com bom desempenho médio deverá ser reprovada caso:

* Produza afirmações críticas sem evidência.
* Misture identificadores de amostras.
* Promova hipóteses automaticamente.
* Ignore conflitos relevantes.
* Apresente cálculos perigosamente incorretos.
* Falhe em requisitos de segurança ou privacidade.

---

# 13. Faixas de decisão

## Aprovado para produção assistida

* Limite inferior de 95% acima da meta definida para a tarefa.
* Nenhuma falha crítica não mitigada.
* Taxa de alucinação dentro do limite.
* Calibração adequada.
* Mecanismo de abstinência funcionando.
* Telemetria e rollback disponíveis.

## Aprovado para shadow mode

* Desempenho promissor, mas amostra insuficiente.
* Algumas classes de erro ainda sem mitigação.
* Saídas não podem produzir ações automaticamente.
* Resultados devem permanecer privados e sujeitos à revisão.

## Experimental

* Menos de 30 casos independentes.
* Conjunto de referência incompleto.
* Mudanças frequentes de prompt ou runtime.
* Percentuais devem ser chamados de estimativas experimentais.

## Reprovado ou bloqueado

* Falhas críticas.
* Alucinação recorrente.
* Incapacidade de reconhecer ausência de evidência.
* Contaminação entre registros.
* Queda significativa em dispositivo ou runtime alvo.
* Desempenho abaixo do mínimo definido.

As metas deverão variar conforme o risco. Tarefas administrativas de baixo impacto podem aceitar um limite menor do que tarefas que gerem afirmações técnicas, regulatórias ou socioambientais.

---

# 14. Experimentos comparativos

Realizar testes A/B controlados entre:

1. Modelo sem RAG versus modelo com RAG.
2. RAG textual versus grafo.
3. RAG versus RAG mais grafo.
4. Prompt simples versus prompt estruturado.
5. Resposta livre versus saída estruturada.
6. Uma única inferência versus modelo mais verificador.
7. Precisão integral versus quantização.
8. Zero-shot versus exemplos no prompt.
9. Inferência direta versus decomposição em etapas.
10. Resposta obrigatória versus política de abstinência.
11. Modelo isolado versus modelo acompanhado por regras determinísticas.
12. Uma única imagem versus protocolo de seis vistas.

Alterar somente uma variável principal em cada comparação confirmatória.

---

# 15. Telemetria e MLOps

O pipeline deverá registrar automaticamente:

* Versão do modelo.
* Versão do prompt.
* Versão da base de conhecimento.
* Entrada anonimizada ou referência segura.
* Qualidade estimada da entrada.
* Evidências recuperadas.
* Resposta bruta.
* Resposta pós-processada.
* Confiança calculada.
* Decisão de responder ou se abster.
* Latência.
* Recursos consumidos.
* Erros.
* Feedback profissional.
* Resultado final confirmado.

Também deverão ser implementados:

* Registro de experimentos.
* Versionamento de datasets.
* Model registry.
* Prompt registry.
* Comparação entre execuções.
* Dashboard por cenário.
* Detecção de regressão.
* Canary ou shadow deployment.
* Rollback.
* Alertas para erros críticos.
* Monitoramento de drift.
* Reavaliação periódica com casos reais.

---

# 16. Responsabilidades dos agentes

## Agente de Produto

* Priorizar tarefas reais.
* Definir impacto do erro.
* Estabelecer critérios de liberação.

## Agente de IA e Experimentação

* Elaborar hipóteses.
* Construir matriz experimental.
* Implementar o executor de avaliações.
* Comparar configurações.

## Agente Estatístico

* Calcular tamanho amostral.
* Definir intervalos de confiança.
* Avaliar significância das diferenças.
* Construir calibração e curvas de risco.

## Agente de Dados e Conhecimento

* Versionar datasets.
* Prevenir vazamento entre treino, calibração e teste.
* Controlar procedência e licenças.
* Versionar RAG e grafo.

## Agente Têxtil

* Validar casos físicos.
* Criar critérios de correção.
* Resolver ambiguidades.
* Avaliar erros de domínio.

## Agente de MLOps

* Garantir reprodutibilidade.
* Instrumentar logs.
* Criar registro de experimentos.
* Implementar detecção de regressão e rollback.

## Agente de Segurança e Governança

* Criar testes adversariais.
* Validar isolamento de registros.
* Avaliar promoção indevida de evidências.
* Bloquear falhas críticas.

## Agente de Frontend e Experiência

* Implementar coleta de feedback.
* Exibir incerteza corretamente.
* Permitir solicitação de novas evidências.
* Evitar apresentar estimativas como certezas.

## Agente de Operações

* Organizar pilotos reais.
* Registrar contexto de uso.
* Garantir que feedback e resultado verdadeiro sejam capturados.

---

# 17. Entregáveis

Os agentes deverão produzir:

1. `phi_experimental_charter_v1.md`
   Objetivos, hipóteses, escopo e critérios de decisão.

2. `phi_configuration_registry.json`
   Registro das configurações avaliadas.

3. `phi_scenario_matrix.csv`
   Matriz completa de cenários e fatores.

4. `phi_gold_set_manifest`
   Inventário versionado dos casos de referência.

5. `phi_evaluation_protocol.md`
   Regras de avaliação humana e automática.

6. `phi_eval_runner`
   Executor automatizado e reprodutível.

7. `phi_error_taxonomy.yaml`
   Taxonomia padronizada de erros.

8. `phi_reliability_dashboard`
   Dashboard por tarefa, cenário, modelo e configuração.

9. `phi_calibration_report.md`
   Curvas de calibração, Brier Score, ECE e política de abstinência.

10. `phi_reliability_report_v1.md`
    Resultados, intervalos de confiança e limitações.

11. `phi_model_card_phyllos.md`
    Usos permitidos, usos bloqueados, limitações e dados de avaliação.

12. `phi_promotion_decision.md`
    Decisão de produção, shadow mode, experimental ou bloqueado.

---

# 18. Ordem de execução

## Ciclo 1 — Definição e instrumentação

* Fixar modelo e configurações.
* Definir tarefas e riscos.
* Construir taxonomia de erros.
* Instrumentar logs.
* Preparar casos iniciais.

## Ciclo 2 — Smoke test e piloto

* Executar casos básicos.
* Corrigir problemas de pipeline.
* Estimar variância.
* Identificar cenários críticos.

## Ciclo 3 — Avaliação principal

* Executar matriz priorizada.
* Realizar experimentos comparativos.
* Calcular intervalos e calibração.
* Analisar falhas por segmento.

## Ciclo 4 — Confirmação cega

* Congelar a configuração candidata.
* Executar conjunto independente.
* Emitir decisão formal de promoção.

---

# 19. Resultado esperado

Ao final, a PHYLLOS não deverá afirmar apenas que “o modelo tem determinada acurácia”.

O resultado deverá ter a forma:

> Para a tarefa X, no cenário Y, utilizando a configuração Z, o sistema apresentou taxa observada de sucesso de A%, com intervalo de confiança de B% a C%, risco seletivo de D%, cobertura de E% e taxa de erro crítico de F%.

Também deverá ser possível informar:

* Em quais condições o modelo pode operar.
* Quando precisa de revisão humana.
* Quando deve pedir novas informações.
* Quando deve se abster.
* Quais afirmações não pode produzir.
* Qual configuração deve ser utilizada em cada ambiente.
* Que evidência sustenta cada percentual divulgado.

O objetivo final é transformar a confiabilidade do PI5/Phi-5 em uma propriedade mensurável, segmentada, reproduzível e continuamente monitorada, e não em uma percepção subjetiva baseada em demonstrações isoladas.

