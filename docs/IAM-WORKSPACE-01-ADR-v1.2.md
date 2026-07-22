# PHYLLOS IAM-WORKSPACE-01 — ADR v1.2

**Status:** aprovado exclusivamente para a Fase 0  
**Demais fases:** bloqueadas até decisão humana de go/no-go  
**Estratégia:** Neon Auth para identidade e sessão; autorização PHYLLOS no backend Node; contexto transacional próprio; PostgreSQL RLS como defesa em profundidade.

> Colaboração simultânea, concorrência e sincronização pertencem ao ciclo dependente [IAM-WORKSPACE-02](IAM-WORKSPACE-02-ADR.md). A conclusão deste ADR não autoriza a alegação de workspace multiusuário operacional.

## Decisões vinculantes

1. A Fase 0 usa branch Neon isolada, dados sintéticos, feature flag e descarte planejado.
2. Nenhuma migration definitiva ou credencial de produção é alterada durante o spike.
3. A PHYLLOS não mantém uma segunda tabela de sessões no MVP.
4. Usuário de domínio, workspace, membership, papéis e permissões pertencem à PHYLLOS.
5. O workspace ativo é preferência de interface, nunca prova de autorização.
6. Todo recurso privado pertence a um `workspace_id`; DPP público usa projeção própria por allowlist.
7. Operações protegidas usam uma conexão reservada do `BEGIN` ao `COMMIT` ou `ROLLBACK`.
8. RLS é defesa em profundidade e não protege contra comprometimento total do backend ou SQL arbitrário.
9. Auditoria crítica participa da mesma transação da mutação.
10. Produção não executará DDL no startup após a Fase 0.1.

## Limite da Fase 0

O spike deve provar na aplicação Node e no Render:

- inicialização e encapsulamento do Neon Auth;
- login por código de e-mail;
- cookie `HttpOnly` em HTTPS;
- criação e leitura da sessão;
- logout e revogação;
- usuário PHYLLOS suspenso com sessão Neon ainda válida;
- domínio confiável, callback, proxy e forwarded headers;
- cold start;
- falhas de Neon Auth, Neon Postgres e e-mail;
- feature flag e rollback para o modo demonstrativo;
- DPP e QR públicos sem autenticação ou regressão.

O spike não pode:

- alterar o banco principal;
- substituir `DATABASE_URL` de produção;
- criar usuários reais;
- habilitar workspaces no ambiente publicado;
- ativar RLS nas tabelas atuais;
- promover login social, times ou convites.

## Arquitetura de identidade

```text
Neon Auth
    -> principal autenticado
    -> identity_binding
    -> usuário PHYLLOS ativo
    -> membership ativa
    -> política versionada
    -> operação no workspace autorizado
```

O domínio acessa o provedor somente por uma interface `IdentityService`. IDs externos aparecem apenas em `identity_bindings(provider, provider_subject)`.

## Transação autorizada

Repositórios multiworkspace recebem um `AuthorizedTransaction`, nunca o pool global. A implementação reserva um client, inicia a transação, define `app.user_id`, `app.workspace_id`, `app.membership_id` e `app.policy_version_id` com `set_config(..., true)`, executa a operação e registra a auditoria crítica antes do commit.

Chamadas independentes `pool.query("BEGIN")`, `pool.query("set_config")` e `pool.query(...)` são proibidas porque não comprovam o uso da mesma conexão física.

## Papéis PostgreSQL da Fase 0.1

Papéis sem login:

- `phyllos_object_owner`;
- `phyllos_audit_owner`;
- `phyllos_retention_owner`.

Papéis operacionais:

- `phyllos_migrator`: migrations por `SET ROLE`, sem uso pelo servidor web;
- `phyllos_runtime`: DML mínimo, sem ownership, DDL ou `BYPASSRLS`;
- `phyllos_audit_writer`: somente eventos não críticos;
- `phyllos_retention_job`: somente funções de retenção aprovadas.

O usuário proprietário original do Neon permanece para administração emergencial, mas deverá sair do Render depois dos testes da Fase 0.1.

## Auditoria crítica

O runtime não escreve diretamente em `audit_events`. Ele recebe apenas `EXECUTE` em `audit.record_event(...)`, função `SECURITY DEFINER`, pertencente a papel sem login, com `search_path` fixo, parâmetros tipados, ações e metadados em allowlist, sem SQL dinâmico e sem privilégio de `PUBLIC`.

Falha de auditoria em transferência de ownership, papel privilegiado, identidade, suspensão, publicação, retirada ou política provoca rollback da operação.

## Políticas versionadas

- apenas uma versão pode estar ativa;
- versões ativas são imutáveis;
- `role_permissions` inclui `policy_version_id`;
- mudanças criam uma versão draft completa;
- ativação e aposentadoria são atômicas;
- canonicalização `PHYLLOS-POLICY-JCS-1`, RFC 8785;
- hash SHA-256 em hexadecimal minúsculo com prefixo `sha256:`;
- test vectors ficam versionados no repositório.

## Publicação pública

O DPP público consulta apenas `passport_publications`. O payload publicado é imutável, versionado e calculado por allowlist. O hash usa `PHYLLOS-PASSPORT-JCS-1` e SHA-256. Correções geram uma nova publicação ligada por `supersedes_publication_id`; retirada altera somente disponibilidade e preserva o snapshot interno.

Slugs, URLs e QR Codes existentes devem continuar resolvendo. Qualquer mudança inevitável exige redirecionamento permanente e teste de regressão.

## DDL e deploy

O servidor atual cria tabelas PI5 e de telemetria no startup. A Fase 0.1 deverá extrair todo DDL para migrations antes de introduzir `phyllos_runtime`. Produção não executará `CREATE`, `ALTER`, criação de índices, funções ou extensões no startup.

## Dados, auditoria e operação

- timestamps são gerados pelo banco em `timestamptz` e serializados em UTC;
- tokens, cookies, OTPs, senhas, secrets e payloads completos não entram em logs;
- negações repetidas usam rate limit, agregação e deduplicação;
- contadores operacionais agregados ficam no PostgreSQL;
- falha do serviço de e-mail não bloqueia DPP público, sessão válida, logout ou health check;
- Resend e domínio transacional só serão configurados depois da prova técnica do fluxo.

## Gates da Fase 0

A decisão de go/no-go requer:

- relatório de compatibilidade Neon Auth + Node + Render;
- evidência de login, logout e revogação;
- diagrama do fluxo de cookies;
- teste de cold start e falhas dos provedores;
- comprovação de que o DPP público permanece acessível;
- riscos e adaptações documentados;
- parecer de segurança;
- decisão humana registrada.

Sem esses itens, Fase 0.1, migrations, RLS e troca da credencial do Render permanecem bloqueados.
