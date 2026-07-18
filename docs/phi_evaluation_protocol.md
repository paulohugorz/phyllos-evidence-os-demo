# Protocolo de Avaliação PI5/Phi-5 v1

## Princípio
A unidade experimental é `case_id + case_version + configuration_id + prompt_version + seed + run_id`.

## Estados de resultado
- `integral_success`: todos os critérios obrigatórios cumpridos e nenhuma falha crítica.
- `partial_success`: resposta útil com omissões não críticas.
- `recoverable_failure`: falha detectada, com pedido correto de nova evidência ou recuperação segura.
- `severe_failure`: resposta incorreta com impacto relevante, mas sem violação crítica.
- `critical_failure`: afirmação crítica sem evidência, mistura de identificadores, promoção indevida de hipótese, violação de segurança ou cálculo perigoso.

## Sucesso primário
Uma execução é sucesso válido quando:
1. o caso é válido;
2. o resultado é `integral_success`;
3. não existe falha crítica;
4. todos os critérios primários do caso foram satisfeitos.

## Confiabilidade por cenário
Para cada cenário:
- `p = sucessos válidos / casos válidos`;
- calcular intervalo de Wilson de 95%;
- usar o limite inferior como confiabilidade operacional conservadora.

Na execução sintética v3, para a definição `|erro global| ≤ 0,10`:
- sucessos: 74;
- casos: 101;
- taxa observada: 73.267%;
- IC de Wilson 95%: 63.901%–80.929%;
- confiabilidade conservadora: 63.901%.

Esse cálculo é apenas smoke test porque os casos são sintéticos.

## Abstinência
- cobertura: casos respondidos / total;
- risco seletivo: respostas erradas / casos respondidos;
- recall de abstinência: abstinências corretas / casos insolúveis;
- precisão de abstinência: abstinências corretas / total de abstinências.

## Alucinação
Registrar em dois níveis:
- taxa de execuções com pelo menos uma afirmação não suportada;
- afirmações não suportadas / afirmações avaliadas.

## Calibração
- Brier Score;
- Expected Calibration Error;
- curva de confiabilidade;
- avaliação por tarefa, cenário e configuração;
- o calibrador é treinado somente no conjunto de calibração.

## Repetibilidade
Executar o mesmo caso com sementes e repetições controladas. Separar:
- variação entre casos;
- variação dentro do mesmo caso;
- consistência estrutural;
- consistência da decisão de responder ou se abster.

## Comparações A/B
Uma comparação confirmatória deve alterar somente uma variável principal. O teste cego não poderá orientar ajuste.

## Proibição de agregação
Não agregar resultados entre configurações diferentes sem demonstrar equivalência de:
- checkpoint;
- quantização;
- runtime;
- prompt;
- RAG/grafo;
- validadores;
- pós-processadores;
- versão do conjunto de referência.
