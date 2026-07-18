# Execução dos Agentes PHYLLOS — PI5 v3

> **Resultado sintético.** Este relatório valida banco, geração, splits, treinamento, avaliação e calibração. Não demonstra desempenho empírico do PI5 em amostras físicas.

## Execução

- Dataset: `phyllos-pi5-synthetic-validation`
- Versão: `3.0.0-synthetic`
- Registros aceitos: **664**
- Quarentena: **56**
- Treino: **472**
- Validação: **97**
- Teste: **95**
- Problemas de vazamento: **0**
- Hash do dataset: `ad6a73c07e07cafd789b925cad53b74fd552215ec4536d2edc365395a6c3ebe8`

## Score global no teste

- MAE: **0.070**
- RMSE: **0.087**
- R²: **0.874**
- Correlação de Pearson: **0.936**
- Erro absoluto P90: **0.144**
- IC bootstrap 95% do MAE: **0.060 a 0.080**

## Confiança e calibração

A confiança representa P(|erro global| <= 0.1). O limiar desta execução sintética é deliberadamente exigente para testar a calibração.

- Brier Score: **0.193**
- Expected Calibration Error: **0.042**
- Confiança média declarada: **0.716**
- Acerto observado na tolerância: **0.726**
- Acerto com erro ≤ 0,10: **0.726**
- Acerto com erro ≤ 0,25: **1.000**
- Acerto com erro ≤ 0,50: **1.000**
- Cobertura do intervalo preditivo: **0.916**
- Raio do intervalo: **±0.159**

## Identificação de categoria sintética

- Acurácia Top-1: **0.558**
- Acurácia Top-3: **0.874**
- F1 macro: **0.542**

## Desempenho por categoria

| Categoria | N | MAE | RMSE | R² |
|---|---:|---:|---:|---:|
| calca | 17 | 0.065 | 0.080 | 0.821 |
| camisa | 15 | 0.069 | 0.085 | 0.764 |
| camiseta | 16 | 0.066 | 0.082 | 0.719 |
| generic | 16 | 0.069 | 0.088 | 0.748 |
| jaqueta | 15 | 0.053 | 0.075 | 0.926 |
| vestido | 16 | 0.097 | 0.110 | 0.833 |

## Decisão dos agentes

1. A esteira está apta a gerar, dividir e avaliar fixtures sintéticos.
2. Os splits são feitos por linhagem e não apresentaram vazamento nesta execução.
3. O motor produz métricas globais, por dimensão, por categoria, calibração e intervalos de confiança.
4. Os resultados não autorizam alegações de acurácia real.
5. O próximo gate científico continua sendo o piloto físico com rótulos profissionais.

## Governança

- Fixtures permanecem com `synthetic=true`.
- A versão sintética deve ser registrada com propósito `infrastructure_validation_only`.
- O conjunto físico de teste deve ser congelado antes de ajustes empíricos.
- Nenhum artefato confidencial deve ser enviado ao GitHub público.
