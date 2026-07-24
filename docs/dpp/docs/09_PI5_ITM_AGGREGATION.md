# PI5 por Peça, Lote e Empresa + Comparação ITM

## 1. Objetivo

Calcular e exibir o PI5 em três níveis:

- peça/item;
- lote;
- empresa.

O resultado empresarial deve ser atualizado conforme a produção ocorre, sem alterar silenciosamente snapshots de DPP já publicados.

## 2. Separações obrigatórias

O frontend deve sempre separar:

- desempenho ambiental;
- transparência alinhada ao ITM;
- cobertura dos dados;
- confiança das evidências;
- realizado;
- projetado.

Nunca chamar o resultado PHYLLOS de `score oficial ITM`.

Nome obrigatório:

`Score PHYLLOS de transparência alinhado às dimensões do ITM`

## 3. PI5 por peça

Para métricas absolutas atribuídas ao lote:

`impacto_unitario = impacto_total_atribuido_ao_lote / unidades_aprovadas`

Perdas e rejeitos devem ser tratados conforme metodologia versionada e nunca eliminados silenciosamente.

## 4. PI5 por lote

Deve conter:

- impacto total;
- impacto unitário;
- quantidade planejada;
- quantidade produzida;
- quantidade aprovada;
- rejeitos;
- perdas;
- cobertura;
- confiança;
- composição;
- fatores;
- metodologia;
- versão do cálculo;
- comparação com lotes equivalentes.

## 5. PI5 empresarial

### Realizado
Inclui somente lotes concluídos e dados efetivos.

### Projetado
Inclui ordens planejadas e lotes em produção.

### Agregação absoluta
`total_empresa = soma(dos impactos realizados dos lotes válidos)`

### Intensidade por peça
`intensidade_media = soma(impactos dos lotes) / soma(unidades aprovadas)`

### Score ponderado
`score_empresa = soma(score_lote * peso_lote) / soma(peso_lote)`

O peso deve ser configurável por:

- unidades;
- massa;
- valor;
- outra regra aprovada.

## 6. Gatilhos de recálculo

- conclusão de lote;
- alteração de quantidade;
- alteração de perdas;
- mudança de material;
- nova evidência;
- validação de dado estimado;
- atualização de fator;
- correção de composição;
- revogação de lote;
- nova versão de DPP;
- alteração de metodologia.

## 7. Histórico

Cada recálculo deve registrar:

- valor anterior;
- valor novo;
- evento;
- lote causador;
- dados de entrada;
- versão da metodologia;
- executor;
- timestamp;
- status realizado/projetado.

## 8. ITM-aligned

Dimensões iniciais:

- rastreabilidade;
- emissões de GEE;
- descarbonização;
- energia renovável;
- transição justa.

A comparação por lote deve ser nomeada:

- `Contribuição do lote para a transparência empresarial`; ou
- `Perfil de transparência alinhado às dimensões do ITM`.

A interface pode exibir:

| Dimensão | Lote | Empresa | Benchmark ITM |
|---|---:|---:|---:|

## 9. Componente operacional e corporativo

`score_dimensao_empresa = peso_operacional * score_operacional + peso_corporativo * score_corporativo`

Configuração inicial sugerida:

- operacional: 70%;
- corporativo: 30%.

Os pesos são configuráveis e versionados.

## 10. Questionário frontend

Cada dimensão deve permitir:

- resposta;
- escopo;
- evidência;
- data;
- responsável;
- visibilidade;
- confiança;
- observação;
- status de revisão.

## 11. Snapshot no DPP

Ao publicar um DPP:

- congelar PI5 da peça/lote;
- congelar metodologia;
- congelar versão dos fatores;
- congelar benchmark ITM usado;
- guardar timestamp;
- guardar confiança e cobertura.

O dashboard empresarial pode continuar evoluindo, mas o DPP publicado preserva o snapshot.
