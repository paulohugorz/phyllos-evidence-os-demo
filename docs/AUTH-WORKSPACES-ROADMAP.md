# Autenticação e workspaces — próximo ciclo

> **Substituído para execução:** o baseline vigente é o [ADR IAM-WORKSPACE-01 v1.2](IAM-WORKSPACE-01-ADR-v1.2.md). Este arquivo permanece como histórico do direcionamento inicial.

## Resultado esperado

Após autenticar por e-mail ou provedor social, cada pessoa entra em um workspace individual ou cria/participa de um workspace de time. Recursos, evidências, eventos e configurações pertencem ao workspace ativo e nunca são consultados apenas por `userId`.

## Fluxo

1. Entrar com e-mail (link mágico ou código) ou login social OIDC.
2. Verificar e normalizar a identidade sem duplicar a mesma pessoa entre provedores.
3. Criar automaticamente um workspace individual no primeiro acesso.
4. Permitir criar workspace de time, nomeá-lo e alternar o workspace ativo.
5. Convidar e-mails com token de uso único, validade e revogação.
6. Aceitar convite autenticado e criar membership com papel explícito.
7. Registrar em audit log: login, logout, troca de workspace, convite, aceite, mudança de papel e remoção.

## Modelo mínimo

- `users`: pessoa e estado da conta;
- `identities`: e-mail ou identidade OIDC vinculada ao usuário;
- `sessions`: sessão, expiração, rotação e revogação;
- `workspaces`: `individual` ou `team`;
- `memberships`: usuário, workspace, papel e estado;
- `invitations`: e-mail normalizado, papel, token hash, expiração e aceite;
- recursos de domínio recebem `workspace_id` obrigatório.

Papéis iniciais: `owner`, `admin`, `member`, `reviewer` e `viewer`. Ações de evidência e revisão devem preservar segregação de funções; `owner` não significa revisor independente.

## Gates antes de implementar

- escolher provedor de identidade com análise de terceiro e plano de saída;
- definir sessão segura, cookies `HttpOnly`, `Secure`, `SameSite`, CSRF e rotação;
- rate limit e proteção contra enumeração de e-mails;
- consentimento, aviso de privacidade, retenção e direitos do titular;
- autorização deny-by-default testada em cada rota e consulta;
- migração do tenant demonstrativo para `workspace_id` sem vazamento entre times;
- testes de convite expirado/revogado, troca de papel, remoção e acesso cruzado;
- recovery administrado sem permitir tomada de conta.

## Sequência recomendada

1. ADR de identidade e sessão.
2. Schema e migrations de usuários, workspaces, memberships e convites.
3. Middleware de autenticação e autorização por workspace.
4. Login por e-mail; depois OIDC social usando o mesmo modelo de identidade.
5. Interface de seleção, criação e administração do time.
6. Testes de isolamento, segurança e auditoria.
7. Migração controlada dos dados demonstrativos e piloto.
