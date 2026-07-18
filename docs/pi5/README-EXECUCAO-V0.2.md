# PHYLLOS PI5 v0.2 — implementação privada

Este pacote implementa o primeiro núcleo técnico derivado do diagnóstico de patenteabilidade.

## Conteúdo

- proveniência por campo;
- cobertura e confiança derivadas de evidências;
- intervalos de incerteza por dimensão e score;
- gate automático de publicação;
- calibração residual restrita;
- trava crítica preservada após calibração;
- snapshot com hashes de metodologia, benchmark e modelo;
- replay determinístico;
- recomendação da próxima melhor evidência;
- idempotência consistente em arquivo e PostgreSQL;
- MLOps treinando apenas ajuste residual limitado;
- testes Node e Python.

## Confidencialidade

O pacote não deve ser enviado ao repositório público antes da decisão sobre depósito de patente. O script de aplicação cria uma branch local sem push.
