# PHYLLOS DPP Requirements v1

Pacote de requisitos para o Digital Product Passport verificável da PHYLLOS.

## Conteúdo

- `docs/01_PRD.md`
- `docs/02_REQUIREMENTS.md`
- `docs/03_DATA_MODEL.md`
- `docs/04_SECURITY.md`
- `docs/05_UX_PUBLIC.md`
- `docs/06_ROADMAP.md`
- `docs/07_SOURCES.md`
- `schemas/dpp-manifest.schema.json`
- `api/openapi.yaml`
- `tests/acceptance-tests.md`

## Decisão central

O QR é um identificador persistente. A autenticidade do passaporte é comprovada por manifesto canônico, hash, assinatura digital, cadeia de versões e status de revogação. Para prevenir clonagem física, o roadmap prevê serialização e mecanismos adicionais por nível de risco.
