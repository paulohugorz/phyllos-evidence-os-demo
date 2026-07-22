# IAM-WORKSPACE-01 — Execution Brief da Fase 0

## Resultado esperado

Determinar se Neon Auth funciona com o servidor Node atual, o frontend servido na mesma origem e o Render Free, sem afetar produção nem o acesso público do Evidence OS.

## Feature flag

```text
IAM_PHASE0_ENABLED=false
```

O valor padrão é `false`. Quando ausente ou inválido, o aplicativo mantém o comportamento demonstrativo atual. A flag de teste nunca será habilitada no serviço público antes do go humano.

## Ambiente isolado

- branch Neon exclusiva;
- credencial exclusiva do spike;
- usuários e e-mails sintéticos;
- callback e origem de teste;
- logs redigidos;
- prazo e responsável pelo descarte;
- nenhum dado copiado de produção.

## Casos de teste

| ID | Cenário | Evidência esperada |
| --- | --- | --- |
| IAM0-01 | Login OTP válido | sessão criada sem OTP nos logs |
| IAM0-02 | Código inválido/expirado | resposta neutra e rate limit |
| IAM0-03 | Cookie no Render HTTPS | `HttpOnly`, `Secure` e política SameSite registrada |
| IAM0-04 | Logout | sessão deixa de autorizar |
| IAM0-05 | Revogação | sessão revogada falha na próxima operação |
| IAM0-06 | Usuário PHYLLOS suspenso | backend nega mesmo com sessão Neon válida |
| IAM0-07 | Cold start | sessão e callback continuam funcionais |
| IAM0-08 | Neon Auth indisponível | erro controlado, sem bypass |
| IAM0-09 | Neon Postgres indisponível | erro controlado, sem fallback inseguro |
| IAM0-10 | E-mail indisponível | login OTP falha; DPP público e logout permanecem |
| IAM0-11 | DPP sem cookie | rota pública continua acessível |
| IAM0-12 | Sessão inválida na rota pública | conteúdo público permanece acessível e privado não vaza |
| IAM0-13 | Feature flag desligada | comportamento atual preservado |
| IAM0-14 | Proxy e forwarded headers | origem e callback HTTPS resolvidos corretamente |

## Evidências

Para cada caso registrar:

- data e ambiente;
- versão/commit;
- entrada sintética;
- resultado esperado e observado;
- log redigido;
- captura ou resposta HTTP quando aplicável;
- limitação encontrada;
- responsável pelo teste.

## Go/no-go

O relatório final deve recomendar `go`, `go com condições` ou `no-go`. A decisão técnica não promove automaticamente a próxima fase; o founder registra a decisão humana.

## Rollback e descarte

1. manter `IAM_PHASE0_ENABLED=false` em produção;
2. revogar credenciais do spike;
3. remover callback e domínio de teste;
4. excluir os usuários sintéticos;
5. descartar a branch Neon após preservar as evidências permitidas;
6. confirmar que nenhuma variável do spike permaneceu no Render público.

