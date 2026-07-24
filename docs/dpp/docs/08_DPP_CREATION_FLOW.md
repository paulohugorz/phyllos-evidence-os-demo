# Fluxo de Geração, Consulta Prévia e Publicação do DPP

## 1. Objetivo

Definir como o usuário cria, consulta, revisa, valida e publica um Digital Product Passport dentro do PHYLLOS Evidence OS sem editar código, JSON ou APIs.

## 2. Entrada principal

Menu:

- Passaportes
  - Todos
  - Criar passaporte
  - Rascunhos
  - Em revisão
  - Prontos para publicar
  - Publicados
  - Suspensos
  - Revogados

Ação principal:

`+ Criar Digital Product Passport`

## 3. Origem do passaporte

O usuário deve poder criar a partir de:

- produto existente;
- modelo existente;
- lote de produção;
- ordem de produção;
- item individual;
- estrutura de outro DPP.

A opção recomendada no frontend é `Criar a partir de um lote de produção`.

## 4. Wizard obrigatório

1. Escopo
2. Produto
3. Lote e produção
4. Materiais e composição
5. Cadeia de fornecimento
6. Evidências e certificados
7. Impacto ambiental
8. PI5
9. Transparência alinhada ao ITM
10. Cuidados e circularidade
11. Revisão
12. Pré-visualização
13. Publicação

Requisitos:

- salvamento automático;
- retomada de rascunho;
- indicador de completude;
- validação por etapa;
- navegação para frente e para trás;
- bloqueios críticos visíveis;
- histórico de alterações do rascunho.

## 5. Formas de preenchimento

Cada seção deve permitir:

- preenchimento manual;
- importação do cadastro PHYLLOS;
- importação de planilha;
- vínculo com Evidence existente;
- integração futura por ERP/API.

Cada valor deve guardar:

- origem;
- autor;
- data;
- escopo;
- evidência;
- status de revisão;
- visibilidade;
- provenance_status;
- confiança.

## 6. Consulta antes de publicar

Ação permanente no editor:

`Visualizar como público`

Modos:

- consumidor;
- comprador B2B;
- auditor;
- autoridade;
- visão técnica PHYLLOS.

A prévia deve possuir banner:

> PRÉ-VISUALIZAÇÃO — Este passaporte ainda não foi publicado. Os dados podem ser alterados e não possuem validade pública.

Requisitos:

- URL privada temporária;
- não indexável;
- token revogável;
- prazo configurável;
- marca d’água;
- comentários;
- registro de acesso;
- controle de perfil.

## 7. Matriz de prontidão

O frontend deve mostrar por seção:

- preenchimento;
- evidência;
- revisão;
- visibilidade;
- bloqueios;
- status.

Exemplo de estados:

- pronto;
- atenção;
- incompleto;
- bloqueado.

## 8. Tela final de revisão

A revisão final deve conter:

1. Dados públicos
2. Dados restritos
3. Alegações e evidências
4. Alterações desde a versão anterior
5. Bloqueios
6. Resultado do PI5
7. Comparação de transparência com ITM
8. Manifesto técnico
9. Resultado da verificação criptográfica

## 9. Publicação

A publicação deve executar atomicamente:

1. Evidence Gates
2. Validação do schema
3. Congelamento do rascunho
4. Snapshot do PI5
5. Snapshot da avaliação ITM-aligned
6. Canonicalização
7. Hash
8. Assinatura
9. Criação da PassportVersion
10. Atualização do resolver
11. Geração do QR
12. Registro append-only

Falha em qualquer etapa deve cancelar a transação lógica e impedir publicação parcial.

## 10. Estados do rascunho

- draft
- incomplete
- evidence_pending
- review_pending
- correction_required
- ready_to_publish
- publishing
- published
- publication_failed
