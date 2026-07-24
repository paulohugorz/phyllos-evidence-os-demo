# Segurança, Antifraude e Modelo de Ameaças

## Objetivo

Garantir integridade do passaporte, autenticidade do emissor, rastreabilidade de versões e capacidade de detectar cópias suspeitas.

## Limite essencial

QR estático pode ser copiado. A solução reduz fraude, detecta adulteração e sinaliza clonagem; não prova sozinha que o objeto físico é original.

## Controles

### Identidade
- URI persistente
- IDs não reutilizáveis
- proteção contra enumeração para serial individual
- domínio oficial e HSTS

### Integridade
- canonicalização determinística
- SHA-256
- assinatura Ed25519 ou ECDSA aprovada pela política criptográfica
- chave em KMS/HSM
- rotação e versionamento de chaves
- cadeia de hashes entre versões

### Publicação
- transação atômica
- version freeze
- ledger append-only
- segregação de funções
- dupla aprovação para claims de alto risco

### Verificação
- endpoint independente de leitura
- cache com invalidação imediata para revogação
- status de credencial
- relatório explícito do que foi validado

### Clonagem
- serial por unidade para produtos de risco
- correlação de scans
- limites adaptativos
- detecção de viagem impossível
- código oculto ou NFC seguro em fases futuras

## Ameaças e mitigação

| Ameaça | Mitigação |
|---|---|
| Página falsa | domínio oficial, assinatura, verificador |
| Alteração de dados | hash e assinatura |
| Edição silenciosa | versões imutáveis |
| QR copiado | serial, telemetria de scans, desafio físico futuro |
| Chave comprometida | KMS/HSM, rotação, revogação |
| Insider publica claim falso | Evidence Gates, revisão, segregação |
| Enumeração de IDs | IDs opacos e rate limiting |
| Vazamento comercial | visibilidade por atributo |
| Reidentificação do consumidor | minimização e anonimização |
| Replay de publicação | nonce, idempotency key, version lock |
| Downgrade para versão antiga | current-version pointer e status superseded |

## Critérios de aceite de segurança

- alteração de um byte invalida assinatura;
- tentativa de editar versão publicada falha;
- chave privada não aparece em logs, variáveis ou banco;
- revogação reflete no verificador em até 60 segundos;
- evento de auditoria não pode ser atualizado ou apagado pela aplicação;
- tenant A não acessa dados restritos do tenant B.
