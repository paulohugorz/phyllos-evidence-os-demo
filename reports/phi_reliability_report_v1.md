# Relatório de Confiabilidade PI5/Phi-5 v1

## Decisão executiva
**Estado: experimental. Produção autônoma bloqueada.**

## O que foi executado
- geração e separação de fixtures sintéticos;
- treino e avaliação do baseline sintético;
- prevenção de vazamento por linhagem;
- cálculo de MAE, RMSE, R², Top-1, Top-3, F1, Brier e ECE;
- transformação dos resultados para o protocolo experimental v1;
- cálculo de intervalo de Wilson para a definição de sucesso.

## Resultado conservador do smoke test
Para `P(|erro global| ≤ 0,10)`:
- taxa observada: 73.27%;
- intervalo de Wilson 95%: 63.90%–80.93%;
- confiabilidade mínima: 63.90%.

## Limitações bloqueadoras
- 100% dos casos são sintéticos;
- Phi-5 real ainda não possui `configuration_id` completo;
- não há telemetria de latência, memória, tokens ou custo;
- abstinência e risco seletivo não foram instrumentados;
- falhas críticas e alucinação não foram avaliadas;
- classificação Top-1 foi 54.46%;
- F1 macro foi 0.509;
- categoria `generic` teve F1 igual a zero.

## Próximo gate
1. completar `phi5-candidate-001`;
2. executar smoke test com aproximadamente 10 casos por família;
3. executar piloto com pelo menos 30 casos por cenário prioritário;
4. reservar teste cego antes de ajustes;
5. somente então emitir confiabilidade por cenário.
