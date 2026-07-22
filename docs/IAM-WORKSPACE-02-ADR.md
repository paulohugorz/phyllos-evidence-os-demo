# PHYLLOS IAM-WORKSPACE-02

## Colaboração multiusuário, concorrência, idempotência e sincronização

**Status:** aprovado para detalhamento; implementação bloqueada pelos gates do IAM-WORKSPACE-01  
**Dependência:** [IAM-WORKSPACE-01 v1.2](IAM-WORKSPACE-01-ADR-v1.2.md)  
**Objetivo:** permitir trabalho simultâneo no mesmo workspace sem perda silenciosa, duplicação, vazamento ou inconsistência.

## Separação dos ciclos

O IAM-WORKSPACE-01 estabelece quem é a pessoa, onde ela pode operar e quais ações pode executar. Este ADR estabelece como várias pessoas já autorizadas operam simultaneamente.

Controle de versão nunca concede autorização. Toda operação concorrente continua exigindo sessão válida, usuário ativo, membership, permissão, recurso no workspace correto, RLS e auditoria.

## Invariantes

1. Atualização baseada em versão antiga não sobrescreve silenciosamente o estado atual.
2. Retry não cria recursos ou consequências duplicadas.
3. O mesmo comando crítico não é executado duas vezes.
4. Corridas de membership não deixam workspace sem owner.
5. Aceites simultâneos geram no máximo uma membership.
6. Alterações confirmadas tornam-se visíveis dentro da meta de sincronização.
7. Cache nunca atravessa workspaces.
8. Saturação degrada com backpressure controlado.
9. Conflitos e deduplicações relevantes são auditados.
10. Concorrência não relaxa IAM-01.

## Concorrência otimista

Recursos editáveis recebem:

```text
version bigint NOT NULL DEFAULT 1
updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
updated_by_user_id uuid
```

Updates incluem `workspace_id` e a versão esperada:

```sql
UPDATE domain.resources
SET name = $1,
    version = version + 1,
    updated_at = clock_timestamp(),
    updated_by_user_id = $2
WHERE id = $3
  AND workspace_id = $4
  AND version = $5
RETURNING *;
```

Nenhuma linha atualizada exige distinção segura entre recurso invisível/inexistente e conflito de versão. Recursos de outro workspace nunca são revelados.

## Contrato HTTP

O MVP aceita versão por `If-Match` ou `expected_version`, conforme decisão única do contrato de API. Versão desatualizada retorna `409 Conflict`:

```json
{
  "error": "RESOURCE_VERSION_CONFLICT",
  "message": "O recurso foi alterado por outra pessoa.",
  "resource_id": "resource-id",
  "expected_version": 12,
  "current_version": 14,
  "conflict_id": "conflict-id"
}
```

O payload respeita a autorização de leitura. `404` não revela recurso invisível; `403` representa ação conhecida e proibida.

## Reconciliação no frontend

Ao receber conflito, o frontend:

1. interrompe autosave;
2. preserva a edição local;
3. busca a versão atual;
4. compara versão-base, edição local e servidor;
5. combina alterações não conflitantes;
6. apresenta conflitos de campo para decisão humana;
7. reenvia usando a versão atual.

Textos longos e estruturas complexas começam com detecção por recurso, diff e reconciliação humana. CRDT, OT e edição caractere a caractere ficam fora do MVP.

## Idempotência

`Idempotency-Key` é obrigatório para workspace, convite, aceite, recurso material, evidência, publicação, retirada, ownership, mudança de papel e comandos irreversíveis.

```text
idempotency_records
  id
  workspace_id
  actor_user_id
  idempotency_key
  operation
  request_hash
  status
  response_status
  response_body
  resource_type
  resource_id
  created_at
  completed_at
  expires_at
```

```sql
UNIQUE (workspace_id, actor_user_id, operation, idempotency_key)
```

- mesma chave e mesmo request: reproduz resultado;
- mesma chave e payload diferente: `409 IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST`;
- request em andamento: `409 IDEMPOTENCY_REQUEST_IN_PROGRESS` ou espera curta limitada.

O request hash usa payload canônico, operação, workspace, ator, versão do schema e SHA-256.

## Convites e memberships

Convite ativo equivalente é único por workspace e e-mail normalizado. Aceite bloqueia o convite, valida estado, expiração e e-mail autenticado, cria ou reativa membership, consome o convite e audita na mesma transação.

Operações de ownership bloqueiam as memberships relevantes com `FOR UPDATE`. Remoção e rebaixamento verificam owners ativos sob lock. Transferência de ownership é um comando transacional único; endpoints independentes não podem deixar estado parcial.

## Sincronização inicial

O piloto adota `polling incremental + invalidação por versão`:

```text
updated_since
cursor
workspace_revision
```

SSE pode evoluir para avisos de alteração e progresso. WebSocket exige ADR próprio e necessidade comprovada.

Eventos de invalidação carregam somente IDs, versão, operação e timestamp, nunca conteúdo privado completo.

## Cache

Toda chave inclui:

```text
environment:workspace_id:resource_type:resource_or_query:policy_version
```

Invalidação ocorre somente após commit, cobre recurso e listagens afetadas, atualiza a revisão do workspace e publica evento. Falha mantém o banco como fonte oficial, usa TTL, contador e detecção de versão divergente.

## Pool de conexões

O orçamento define `pool_min`, `pool_max`, timeouts de conexão, ociosidade, transação e statement, considerando instâncias, workers, jobs, migrations, administração e margem.

Transações são curtas e não esperam Resend, Neon Auth, uploads, serviços externos, processamento pesado ou interação humana.

## Backpressure e filas

Leitura simples, edição curta, membership e aceite permanecem síncronos. Documentos, evidências pesadas, exportações, notificações, telemetria e lotes são candidatos a fila.

Filas possuem limite, backoff, dead-letter, idempotência, lease, timeout, prioridade e quota por workspace. Saturação retorna `429` ou `503` com `Retry-After`.

## Outbox transacional

Mutação, auditoria crítica e `INSERT` na outbox ocorrem na mesma transação. Workers processam e-mail, invalidação, notificações, índices e integrações depois do commit.

```text
outbox_events
  id
  workspace_id
  event_type
  aggregate_type
  aggregate_id
  aggregate_version
  payload
  status
  attempt_count
  available_at
  created_at
  processed_at
```

## Metas iniciais do piloto

Estas metas são critérios de engenharia, não promessa comercial:

```text
workspaces ativos: 20
usuários cadastrados: 100
usuários por workspace: 20
usuários simultâneos totais: 25
simultâneos no mesmo workspace: 10
escritas sustentadas: 5/s
leituras sustentadas: 25/s
p95 leitura simples: 800 ms
p95 escrita curta: 1.500 ms
propagação por polling: 10 s
erro normal: < 1%
duplicação por retry: zero
perda silenciosa: zero
acesso cross-workspace: zero
```

## Telemetria

Métricas mínimas:

```text
optimistic_conflict_total
idempotency_replay_total
idempotency_payload_mismatch_total
duplicate_prevented_total
membership_concurrency_conflict_total
last_owner_block_total
pool_wait_total
pool_timeout_total
transaction_timeout_total
queue_depth
queue_retry_total
queue_dead_letter_total
cache_invalidation_failure_total
sync_lag_seconds
outbox_pending_total
outbox_oldest_age_seconds
```

Dimensões são pseudonimizadas e limitadas.

## Testes obrigatórios

- dois usuários editam a mesma versão; segundo recebe `409` e mantém rascunho;
- retry com mesma chave cria um único recurso;
- convites concorrentes geram uma única membership;
- revogação durante aceite é segura;
- corridas de owners não removem o último owner;
- publicação concorrente preserva cadeia e versão;
- cache e eventos não atravessam workspace;
- eventos duplicados ou fora de ordem não regridem estado;
- pool saturado, timeout, fila cheia, reinício de worker e perda de resposta degradam de forma controlada;
- RLS e autorização permanecem válidos em conexões independentes.

## Gates

IAM-WORKSPACE-02 somente será aprovado quando:

- recursos editáveis tiverem versão;
- stale updates retornarem `409`;
- frontend preservar e reconciliar edições;
- comandos críticos exigirem idempotência;
- retries não duplicarem efeitos;
- ownership e convites forem seguros sob corrida;
- cache estiver segregado e invalidar somente após commit;
- pool tiver orçamento e timeouts;
- operações externas não ocorrerem dentro de transações;
- filas, workers e outbox forem idempotentes;
- testes multiusuário e metas de capacidade forem medidos;
- saturação gerar backpressure;
- nenhum conflito perder atualização;
- nenhum evento expuser dados privados;
- IAM-01 continuar válido sob concorrência.

## Sequência

1. Concluir IAM-WORKSPACE-01.
2. Concorrência otimista e reconciliação básica.
3. Idempotência, convites, memberships e último owner.
4. Polling incremental, revisão do workspace, cache e outbox.
5. Orçamento do pool, filas, testes de carga e alertas.

A alegação de “workspace multiusuário operacional” permanece proibida até a aprovação destes gates.

