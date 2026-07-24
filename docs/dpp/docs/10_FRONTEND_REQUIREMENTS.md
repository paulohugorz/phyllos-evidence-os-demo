# Requisitos de Frontend — DPP e PI5

## Telas

### Central de DPP
Colunas:
- produto;
- lote;
- versão;
- status;
- completude;
- PI5;
- prontidão;
- última atualização;
- ações.

### Editor Wizard
- progresso;
- autosave;
- validação por etapa;
- origem de cada campo;
- vinculação de Evidence;
- controle de visibilidade;
- prévia permanente.

### Pré-visualização
- modos por perfil;
- banner de rascunho;
- link privado;
- comparação com versão anterior;
- painel técnico.

### Central de validação
- erros;
- alertas;
- lacunas;
- evidências vencidas;
- claims sem suporte;
- divergências;
- bloqueios de publicação.

### Dashboard PI5 empresarial
- produção acumulada;
- lotes;
- peças produzidas;
- peças aprovadas;
- rejeitos;
- impacto total;
- intensidade;
- cobertura;
- confiança;
- transparência ITM-aligned;
- histórico.

### Detalhe do lote
- contribuição ambiental;
- contribuição para cobertura;
- contribuição para transparência;
- efeito no score empresarial;
- entradas utilizadas;
- evidências.

## Ações principais

- salvar rascunho;
- salvar e continuar;
- importar;
- vincular evidência;
- visualizar como público;
- executar validação;
- compartilhar revisão;
- solicitar aprovação;
- recalcular PI5;
- gerar versão;
- publicar.

## Componentes

- DPPWizard
- DPPSectionStatus
- ProvenanceBadge
- EvidencePicker
- VisibilitySelector
- ReadinessMatrix
- PublicPreview
- ReviewerCommentPanel
- PI5SummaryCard
- PI5BatchContribution
- ITMComparisonBars
- CalculationHistory
- PublicationGatePanel
- AuthenticityBanner

## Requisitos de interação

- alterações críticas exigem confirmação;
- campos derivados mostram fórmula;
- dados estimados têm rótulo persistente;
- benchmark mostra fonte e versão;
- resultado realizado e projetado nunca usam a mesma série sem distinção visual e textual;
- DPP publicado é somente leitura;
- nova edição cria draft da próxima versão.
