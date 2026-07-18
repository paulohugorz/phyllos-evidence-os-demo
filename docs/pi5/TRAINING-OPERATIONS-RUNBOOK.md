# Runbook Operacional — Base de Treinamento PI5 v2

## Objetivo

Operar a coleta, revisão e congelamento de dados de treinamento sem misturar hipótese, evidência e rótulo profissional.

## Fluxo obrigatório

1. Cadastrar organização, atores e especialistas.
2. Cadastrar produto e amostra física com `lineage_group_key`.
3. Registrar cadeia de custódia.
4. Capturar evidências originais e seus hashes.
5. Registrar medições com método, unidade, incerteza e calibração.
6. Executar o PI5 e congelar a predição usada na revisão.
7. Abrir sessão de rotulagem cega.
8. Designar dois revisores qualificados e independentes.
9. Coletar avaliações sem mostrar predição ou avaliação do par.
10. Resolver consenso ou adjudicar conflitos.
11. Congelar o rótulo ouro imutável.
12. Exportar apenas registros elegíveis.
13. Construir splits por grupo de linhagem.
14. Auditar hashes, duplicidade, distribuição e vazamento.
15. Congelar versão do dataset antes de qualquer treinamento.

## Gates de bloqueio

- amostra sintética;
- cadeia de custódia quebrada;
- evidência sem hash;
- instrumento sem calibração válida;
- revisor não qualificado;
- conflito de interesse;
- menos de dois revisores;
- divergência não adjudicada;
- confiabilidade abaixo de 80;
- cobertura abaixo de 80;
- confiança abaixo de 70;
- mesmo grupo de linhagem em splits diferentes;
- manifesto ou arquivo com hash divergente.

## API local

A API deve ser executada somente em `127.0.0.1` ou em rede privada.

Variáveis obrigatórias:

```bash
DATABASE_URL=postgresql://...
PI5_TRAINING_API_KEY=segredo-forte
PI5_TRAINING_PORT=3001
```

Inicialização:

```bash
npm run training:serve
```

## Incidente de qualidade

Quando uma falha for encontrada:

1. não alterar registros históricos;
2. criar item de quarentena;
3. registrar evidência do problema;
4. criar nova medição, revisão ou adjudicação;
5. revogar ou depreciar datasets afetados;
6. reprocessar e gerar nova versão;
7. preservar o dataset anterior para auditoria.
