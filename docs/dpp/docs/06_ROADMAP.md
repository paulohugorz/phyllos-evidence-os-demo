# Roadmap de Implementação

## Fase 0 — Decisões arquiteturais
- definir domínio do resolver;
- definir padrão de identificadores;
- escolher canonicalização;
- escolher KMS e algoritmo;
- aprovar política de visibilidade;
- mapear dados existentes no Evidence OS.

## Fase 1 — DPP Core
- entidades e migrações;
- manifesto;
- versão imutável;
- Evidence Gates;
- hash;
- página pública inicial;
- JSON;
- QR por modelo/lote.

## Fase 2 — Verificação
- assinatura em KMS;
- endpoint `/verify`;
- revogação;
- cadeia de versões;
- pacote de auditoria;
- cache seguro.

## Fase 3 — Interoperabilidade
- JSON-LD;
- GS1 Digital Link;
- resolver conforme padrão;
- cadastro e metadados necessários ao registro europeu;
- vocabulários controlados.

## Fase 4 — Segurança física
- serial por item;
- detecção de clonagem;
- código oculto;
- estudo NFC seguro.

## Fase 5 — Ciclo de vida
- reparo;
- revenda;
- reciclagem;
- atualização por atores autorizados;
- transferência de responsabilidade.

## Definition of Done do MVP
- página pública;
- manifesto validado por schema;
- assinatura verificável;
- histórico imutável;
- QR persistente;
- gates ativos;
- testes de tenant e segurança;
- documentação de API;
- runbook de revogação;
- monitoramento e backup.
