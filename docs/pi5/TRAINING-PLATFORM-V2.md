# PHYLLOS PI5 — Training Platform v2

Plataforma privada para construir a base de dados de maior confiabilidade possível para calibração e avaliação do PHYLLOS Impact 5.

## Entregas

- PostgreSQL normalizado e append-only;
- amostras físicas, evidências, medições e cadeia de custódia;
- protocolos de captura versionados;
- instrumentos e calibrações;
- referências metodológicas e fatores versionados;
- revisão profissional cega;
- atribuições independentes e controle de conflito de interesse;
- consenso dimensional e adjudicação;
- rótulos ouro imutáveis;
- confiabilidade por amostra;
- quarentena operacional;
- exportação de registros elegíveis;
- splits por linhagem;
- auditoria de hashes e vazamento;
- API privada autenticada;
- planejamento estatístico de coleta;
- 17 testes automatizados sem dependências externas.

## Instalação

Use o instalador entregue junto com o ZIP. Ele aplica os arquivos na cópia privada do PI5, cria uma branch local, executa testes e não faz push.

## Execução local

```bash
cp .env.training.example .env.training
set -a
source .env.training
set +a

docker compose -f docker-compose.pi5-training.yml up -d
npm run training:migrate
npm run training:seed
npm run training:serve
```

A API escuta apenas em `127.0.0.1:3001`.

## Construção do dataset

```bash
npm run training:export
PI5_SPLIT_SALT='segredo-privado' npm run dataset:build -- --version=1.0.0
npm run dataset:audit
```

## Segurança

Mantenha o pacote, a branch, a base, os manifests, os salts e os datasets fora de repositórios públicos até a decisão sobre propriedade intelectual e consentimentos.
