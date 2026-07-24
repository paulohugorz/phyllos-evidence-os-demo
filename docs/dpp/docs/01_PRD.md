# PHYLLOS DPP Verificável — PRD v1.0

## 1. Visão

Construir um Digital Product Passport público, navegável, verificável e orientado por evidências para produtos têxteis. O passaporte deve permitir consulta humana e por máquinas, preservar histórico, diferenciar fato de estimativa e reduzir fraude por adulteração, clonagem e falsificação de páginas.

## 2. Princípios

1. **Evidence first:** nenhuma alegação pública sem Evidence, Assertion, Review e PublicationDecision.
2. **Identidade persistente:** cada passaporte aponta para produto, lote e, quando aplicável, item.
3. **Imutabilidade de publicação:** versão publicada não é editada; correções geram nova versão.
4. **Interoperabilidade:** dados estruturados, pesquisáveis, transferíveis, sem dependência do fornecedor.
5. **Privacidade por padrão:** nenhum dado pessoal do consumidor no DPP sem base legal e consentimento.
6. **Transparência não é sustentabilidade:** desempenho, transparência, cobertura e confiança são exibidos separadamente.
7. **Verificação explícita:** o sistema informa exatamente o que foi verificado.
8. **QR como ponte, não como prova:** o QR identifica; a assinatura digital comprova integridade do passaporte.

## 3. Personas

- Consumidor
- Comprador B2B
- Marca/fabricante
- Importador ou representante econômico
- Fornecedor
- Auditor/revisor
- Reparador
- Reciclador
- Autoridade de mercado e alfândega
- Administrador PHYLLOS

## 4. Jornadas principais

### 4.1 Consumidor
Escaneia QR → acessa página pública → vê identidade, composição, origem, cuidados, circularidade, impacto, PI5, evidências resumidas e status de autenticidade.

### 4.2 Operador econômico
Cria produto/lote → vincula materiais e cadeia → anexa evidências → submete alegações → revisa → executa Evidence Gates → publica → registra no resolver e, quando exigido, no registro europeu.

### 4.3 Auditor
Consulta versão, evidências autorizadas, cadeia de hashes, assinatura, revisões e decisões de publicação.

### 4.4 Autoridade
Consulta dados estruturados, identificadores, responsável econômico, conformidade, histórico e status de revogação.

## 5. Escopo MVP

- Passaporte por modelo e lote
- Página pública responsiva
- JSON e JSON-LD
- Identificador persistente
- QR Code
- Manifesto canônico
- SHA-256
- Assinatura digital
- Histórico append-only
- Resumo de evidências
- Controle de visibilidade
- Estado de revogação
- Endpoint de verificação
- PI5 integrado
- Logs de consulta sem dados pessoais desnecessários

## 6. Fora do MVP

- Blockchain
- NFC criptográfico
- serialização obrigatória por unidade
- marketplace de revenda
- transferência de propriedade
- detecção avançada de falsificação física
- registro automático em todos os sistemas externos

## 7. Métricas de sucesso

- 100% das alegações públicas com provenance
- 100% das versões publicadas com hash e assinatura verificáveis
- 0 edição silenciosa de versão publicada
- p95 da página pública abaixo de 2,5 s em conexão móvel adequada
- 99,9% de disponibilidade do resolver
- 100% dos passaportes exportáveis em formato estruturado
- taxa de erro de resolução de QR inferior a 0,1%
- trilha de auditoria completa para publicação, substituição e revogação

## 8. Estados

draft → evidence_pending → review_pending → publication_blocked → ready_to_publish → published → superseded | suspended | revoked
