# Regras de Qualidade da Base PI5

## Bloqueios críticos

- hash de evidência ausente ou inválido;
- amostra sintética marcada como real;
- mesma evidência em splits diferentes;
- mesma linhagem em splits diferentes;
- rótulo sem profissional identificado;
- rótulo sem predição e versão metodológica correspondentes;
- adulteração de evento imutável;
- composição percentual incompatível;
- unidade desconhecida sem conversão explícita;
- documento revogado usado como válido;
- conflito crítico não adjudicado.

## Alertas

- cobertura abaixo de 80%;
- confiança abaixo de 70%;
- qualidade de evidência abaixo de 80%;
- apenas duas categorias representadas;
- concentração excessiva em uma organização, fornecedor ou família;
- medição antiga para processo que pode ter mudado;
- valores extremos sem confirmação;
- baixa concordância entre revisores.

## Métricas de acompanhamento

- completude por dimensão;
- proporção de fontes declaradas, documentadas, medidas e verificadas;
- duplicidade por hash;
- taxa de aprovação para ouro;
- taxa de adjudicação;
- distribuição por categoria, material, fornecedor e organização;
- erro do modelo por categoria e nível de evidência;
- cobertura de extremos;
- idade média das medições;
- taxa de exclusão após auditoria.
