# PHYLLOS Impact 5 — PI5 v0.2

## Resultado composto

O resultado mantém quatro saídas separadas:

- score ambiental de 0 a 5;
- intervalo de incerteza;
- cobertura dos dados;
- confiança das evidências.

## Dados ausentes

Dados ausentes nunca são tratados como impacto zero. O motor utiliza referência neutra da categoria para o cálculo provisório e reduz a cobertura. Quando a cobertura fica abaixo de 60%, o gate bloqueia a publicação comparável.

## Proveniência

Cada campo pode registrar fonte, estado epistemológico, método, responsável, dispositivo, validade, evidências, derivações, incerteza declarada e conflitos.

## Calibração restrita

O modelo supervisionado calibra o score-base dentro de um ajuste máximo. Ele não pode remover travas críticas, elevar confiança nem alterar o gate de publicação.

## Reprodutibilidade

Cada predição gera um snapshot com hash canônico de inputs, proveniência, metodologia, benchmark, modelo e resultado. O endpoint de replay verifica integridade e recalcula o resultado com os artefatos preservados.
