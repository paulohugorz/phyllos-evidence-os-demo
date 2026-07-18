# Arquitetura da Base de Treinamento PI5

## Objetivo

Formar uma base capaz de calibrar o PI5 com alta confiabilidade, preservando a distinção entre observação física, documento, inferência, cálculo e validação profissional.

## Unidades fundamentais

1. **Produto:** referência comercial e família de produto.
2. **Lote:** contexto real de produção.
3. **Amostra física:** unidade mínima de coleta e revisão.
4. **Evidência:** imagem, documento, certificado ou relatório com hash.
5. **Medição:** valor observado, método, unidade e incerteza.
6. **Predição:** resultado PI5 congelado com todas as versões.
7. **Rótulo profissional:** avaliação independente vinculada à amostra e à predição.
8. **Adjudicação:** resolução formal de divergências.
9. **Versão de dataset:** seleção imutável com manifesto, splits e hashes.
10. **Execução de modelo:** treino ou avaliação ligado a uma versão congelada do dataset.

## Camadas de confiabilidade

- **Nível 0 — desconhecido:** sem fonte útil; nunca entra no treino.
- **Nível 1 — declarado:** informado pela marca ou fornecedor; pode apoiar exploração, mas não o conjunto ouro isoladamente.
- **Nível 2 — documentado:** acompanhado de documento rastreável.
- **Nível 3 — medido:** obtido por procedimento registrado e instrumento ou método definido.
- **Nível 4 — verificado:** medição ou documento validado independentemente.

## Formação do conjunto ouro

Uma amostra somente é elegível quando:

- não é sintética;
- está marcada como aceita após revisão de qualidade;
- possui cobertura mínima de 80%;
- possui confiança mínima de 70%;
- possui qualidade de evidência mínima de 80%;
- possui pelo menos duas avaliações independentes;
- não apresenta divergência acima dos limites do protocolo, ou foi adjudicada;
- não possui falha crítica de qualidade;
- não está em lista de exclusão;
- possui hashes de entradas e rótulos;
- possui grupo de linhagem definido.

## Prevenção de vazamento

Todas as observações relacionadas devem permanecer no mesmo split. O `lineage_group_key` deve agrupar, no mínimo:

- múltiplas imagens da mesma amostra;
- peças do mesmo lote quando são quase idênticas;
- correções da mesma observação;
- versões derivadas da mesma ficha técnica;
- registros com os mesmos arquivos ou hashes.

A separação deve ocorrer por grupo, nunca por imagem ou linha individual.

## Estratégia de divisão

Padrão inicial:

- treino: 70%;
- validação: 15%;
- teste: 15%.

A divisão é determinística por hash do grupo de linhagem e um segredo de split. O segredo não deve ser publicado. O conjunto de teste deve ser congelado e usado apenas em avaliações finais ou marcos de versão.

## Por que o modelo relacional é necessário

Um único JSON de predição não consegue representar com segurança:

- múltiplas fontes contraditórias;
- correções sem apagar histórico;
- duas revisões independentes;
- adjudicação;
- dependências entre medições;
- exclusões temporárias;
- versões imutáveis de dataset;
- prevenção de vazamento por família e lote.

A arquitetura mantém eventos e evidências imutáveis e constrói datasets derivados a partir deles.
