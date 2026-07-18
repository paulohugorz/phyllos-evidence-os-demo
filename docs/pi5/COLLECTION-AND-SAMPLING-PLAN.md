# Plano de Coleta e Amostragem PI5

## Princípio

A confiabilidade depende mais da diversidade, independência e qualidade das amostras do que do volume bruto.

## Gates sugeridos

- **Piloto de protocolo:** pelo menos 70 amostras ouro. Serve para corrigir captura e rotulagem; não sustenta afirmações gerais de desempenho.
- **Primeira avaliação por categoria:** 50 amostras ouro por categoria principal.
- **Calibração confiável:** 100 amostras ouro por categoria principal.
- **Base madura:** 200 amostras ouro por categoria, com diversidade de materiais, fornecedores, regiões e processos.

Com seis categorias, o alvo de calibração confiável é aproximadamente 600 amostras ouro. A base madura alcança aproximadamente 1.200.

## Estratos mínimos

Para cada categoria, distribuir amostras por:

- material e composição;
- gramatura;
- construção têxtil;
- fornecedor e organização;
- região de produção;
- processo de tingimento e acabamento;
- intensidade de impacto baixa, média e alta;
- qualidade da evidência;
- lotes e períodos diferentes.

## Limites de concentração

- uma organização não deve dominar mais de 20% do conjunto ouro;
- uma família de produto não deve dominar mais de 10%;
- uma categoria não deve ser avaliada por apenas um revisor recorrente;
- dados declarados não devem dominar o conjunto de treino;
- extremos e casos conflitantes devem ser deliberadamente coletados.

## Holdout

O conjunto de teste deve permanecer congelado e inacessível ao processo de ajuste. A divisão ocorre por linhagem, não por imagem, peça individual ou linha.

## Cálculo operacional

Use:

```bash
npm run sampling:plan -- --margin=0.15 --stddev=0.8 --categories=camiseta,camisa,calca,vestido,jaqueta,generic
```

O resultado é uma estimativa de planejamento, não uma garantia estatística isolada. A decisão final deve considerar métricas observadas no piloto.
