# Plano de Testes e Critérios de Aceite

## Identidade
- gerar dois passaportes não produz colisão;
- mesmo conjunto canônico de identificadores produz mesma URI;
- ID revogado não pode ser reutilizado.

## Publicação
- versão sem lote obrigatório é bloqueada;
- composição fora da tolerância é bloqueada;
- claim sem evidência aceita é bloqueado;
- publicação bem-sucedida gera hash, assinatura e evento append-only;
- segunda publicação cria nova versão e preserva a anterior.

## Integridade
- modificação de qualquer campo invalida assinatura;
- `previous_version_hash` corresponde à versão anterior;
- manifesto reserializado canonicamente gera o mesmo hash.

## Visibilidade
- público não recebe campos `internal`;
- auditor autorizado recebe os campos previstos;
- dados de um tenant não aparecem para outro.

## Resolver
- identificador válido resolve;
- versão antiga indica `superseded`;
- revogado continua consultável com estado correto;
- formato JSON-LD é negociável.

## QR
- conteúdo do QR é somente URI canônica;
- QR permanece resolvível após troca de hospedagem do passaporte;
- não há dados pessoais no payload.

## PI5
- desempenho, transparência, cobertura e confiança são campos separados;
- benchmark possui versão e fonte;
- estimativas exibem método e incerteza.

## Segurança
- rate limiting;
- tentativa de enumeração gera alerta;
- revogação propaga ao cache;
- chave privada não é exposta;
- logs não contêm dados sensíveis.

## UX
- página funciona em 360 px;
- navegação por teclado;
- estado não depende apenas de cor;
- cada métrica mostra provenance;
- gráficos possuem alternativa textual.
