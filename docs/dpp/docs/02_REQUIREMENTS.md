# Requisitos Funcionais e Não Funcionais

## RF-001 — Identificador persistente
O sistema deve emitir um `passport_id` globalmente único, estável e não reutilizável.

**Aceite**
- não há colisões;
- ID revogado nunca é reutilizado;
- resolução permanece possível após substituição de versão.

## RF-002 — Níveis de identificação
Suportar `model`, `batch` e `item`, com configuração por categoria de produto.

## RF-003 — URI canônica
Gerar URI determinística em HTTPS, compatível com GS1 Digital Link quando houver identificadores GS1.

## RF-004 — Manifesto canônico
Gerar representação determinística do passaporte, com tipos, unidades, datas e ordenação normalizados.

## RF-005 — Hash
Calcular SHA-256 do manifesto canônico.

## RF-006 — Assinatura
Assinar o hash usando chave gerenciada por serviço de chaves. A chave privada nunca deve ser exportada para aplicação ou banco.

## RF-007 — Cadeia de versões
Cada versão deve conter `previous_version_hash`, exceto a primeira.

## RF-008 — Publicação imutável
Uma versão publicada não pode ser alterada nem excluída por usuários da aplicação.

## RF-009 — Evidência por alegação
Cada `Assertion` pública deve possuir pelo menos uma evidência aceita e uma revisão concluída.

## RF-010 — Evidence Gates
Bloquear publicação quando:
- composição não fecha em 100%, dentro da tolerância configurada;
- lote obrigatório ausente;
- operador econômico ausente;
- evidência obrigatória ausente ou vencida;
- métrica sem método, unidade ou escopo;
- alegação pública não revisada;
- assinatura não gerada;
- dado pessoal indevido detectado.

## RF-011 — Perfis de acesso
Suportar `public`, `business_partner`, `auditor`, `authority` e `internal`.

## RF-012 — Página pública
Exibir:
- identidade e status;
- composição;
- materiais;
- cadeia;
- produção;
- desempenho ambiental;
- PI5;
- certificados;
- cuidados;
- circularidade;
- evidências resumidas;
- histórico;
- autenticidade.

## RF-013 — Dados estruturados
Disponibilizar HTML, JSON e JSON-LD por negociação de conteúdo ou endpoints equivalentes.

## RF-014 — Resolver
Resolver o identificador para múltiplos recursos: passaporte, dados estruturados, cuidados, reparo, reciclagem e verificação.

## RF-015 — Verificação
O endpoint de verificação deve retornar:
- existência;
- emissor;
- assinatura;
- hash;
- versão vigente;
- estado;
- data de emissão;
- alerta de clonagem, quando aplicável.

## RF-016 — Revogação
Permitir suspensão e revogação com motivo, data, ator e registro append-only.

## RF-017 — QR Code
Gerar QR a partir da URI canônica. O QR nunca deve embutir alegações ambientais ou dados pessoais.

## RF-018 — Eventos de escaneamento
Registrar somente dados mínimos para segurança e operação, com retenção definida e anonimização.

## RF-019 — Detecção de clonagem
Sinalizar padrões como:
- volume incompatível;
- localidades distantes em janela impossível;
- serial consultado antes da emissão;
- serial revogado ou destruído;
- repetição anômala por canal.

## RF-020 — Integração PI5
Publicar separadamente:
- desempenho ambiental;
- transparência;
- cobertura;
- confiança;
- benchmark e limitações.

## RF-021 — Exportação
Exportar pacote de auditoria contendo manifesto, assinatura, cadeia de versões, evidências autorizadas e decisões.

## RF-022 — Internacionalização
Suportar idiomas, unidades canônicas, apresentação regional e vocabulários traduzidos sem alterar o dado-base.

## RNF-001 — Disponibilidade
Resolver: 99,9% mensal. Página pública: 99,5% mensal no MVP.

## RNF-002 — Performance
p95 do resolver < 300 ms sem redirecionamento externo; p95 do HTML < 2,5 s.

## RNF-003 — Segurança
TLS, CSP, HSTS, proteção contra enumeração, rate limiting, segregação de tenant, rotação de chaves e logs invioláveis.

## RNF-004 — Escalabilidade
Arquitetura preparada para milhões de identificadores e picos de leitura muito superiores à escrita.

## RNF-005 — Portabilidade
Exportação integral sem formato proprietário obrigatório.

## RNF-006 — Acessibilidade
WCAG 2.2 AA para página pública.

## RNF-007 — Observabilidade
Métricas, tracing, logs estruturados e alertas de assinatura, resolução, publicação e revogação.

## RNF-008 — Retenção
Políticas configuráveis por classe de dado e obrigação regulatória.

## RNF-009 — Backup independente
Capacidade de replicar passaportes e metadados necessários para continuidade de acesso.

## RNF-010 — Integridade temporal
Todos os tempos em UTC, sincronização confiável e carimbo de tempo para publicação.
