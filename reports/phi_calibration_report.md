# Relatório de Calibração PI5 — Smoke Test Sintético v3

## Escopo
Configuração: `pi5-smoke-synthetic-v3`  
Definição de acerto: `|erro global| ≤ 0,10`  
Casos de teste: 101 sintéticos

## Resultados
- acerto observado: 73.27%;
- IC de Wilson 95%: 63.90%–80.93%;
- confiabilidade conservadora: 63.90%;
- confiança média declarada: 78.26%;
- ECE: 0.0500;
- Brier Score: 0.2000;
- cobertura do intervalo preditivo de 90%: 84.16%.

## Interpretação
A confiança média excede o acerto observado. A faixa de 80%–90% apresentou sobreconfiança relevante. O intervalo nominal de 90% cobriu somente 84.16%, portanto está estreito.

## Decisão
Calibração reprovada para comunicação operacional. Permitida somente como demonstração sintética de instrumentação.

## Próxima validação
Repetir por tarefa e cenário em conjunto de calibração físico, preservando conjunto cego independente.
