# Arquitetura MLOps do PI5

## Fluxo

1. A produção gera materiais, processos, técnicas, evidências e consumos.
2. O motor PI5 converte o registro em features e produz uma predição versionada.
3. O evento de predição é armazenado sem apagar entradas ou premissas.
4. Profissional habilitado registra score validado e observações.
5. Predições e feedback formam o dataset ouro.
6. A esteira treina um challenger de calibração.
7. Champion e challenger são avaliados no mesmo holdout.
8. Gates verificam MAE global, desempenho por categoria e volume mínimo.
9. A promoção gera alteração versionada para revisão em pull request.
10. Monitoramento acompanha drift, cobertura e qualidade dos rótulos.

## Princípio de segurança

O aprendizado não substitui a metodologia. O modelo aprende a calibrar o score com base em validações profissionais, mantendo pesos, benchmarks, limites e explicabilidade como ativos governados.

## Persistência

O protótipo grava eventos em diretório local e mantém fila no navegador quando a API está indisponível. Para operação real no Render, configure `PI5_DATA_DIR` em disco persistente ou conecte banco de dados/objeto externo.
