# Arquitetura móvel PHYLLOS Evidence OS

## Aplicativo

- Expo SDK 54 + React Native;
- Expo Router para navegação;
- SQLite KV Store para persistência local;
- Image Picker para câmera e galeria;
- fila offline de cálculos PI5;
- conexão com a API pública do Evidence OS.

## Fluxo de dados

1. A usuária cadastra a peça no celular.
2. O registro permanece no SQLite do aparelho.
3. Fotos e mudanças de etapa atualizam o registro local.
4. O PI5 tenta consultar `/api/v1/pi5/predict`.
5. Sem conexão, o aplicativo executa a baseline metodológica local.
6. O cálculo offline entra na fila.
7. Quando a conexão volta, a fila envia novamente os inputs ao modelo champion.

## Limite da versão 0.1

O backend atual não possui autenticação, conta de ateliê nem CRUD remoto de peças. Portanto, a sincronização desta versão cobre o PI5. A versão 0.2 deverá adicionar:

- login;
- organização/ateliê;
- API de produtos e produção;
- upload de imagens para object storage;
- sincronização bidirecional;
- controle de conflitos;
- notificações de prazo;
- autorização por papéis.
