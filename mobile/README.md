# PHYLLOS Evidence OS Mobile

Aplicativo nativo Android/iOS construído com Expo e Expo Router.

## Escopo da versão 0.1

- onboarding móvel;
- central de links rápidos;
- cadastro local de peças;
- acompanhamento das etapas da produção;
- fotos por câmera ou galeria;
- cálculo PHYLLOS Impact 5 conectado ao backend;
- cálculo PI5 offline com fila de sincronização;
- assistente experimental de identificação de tecido;
- central de ajuda e mapa entre módulos;
- persistência no aparelho com SQLite KV Store.

## Backend

Por padrão, o aplicativo usa:

`https://phyllos-evidence-os-demo.onrender.com`

Crie um arquivo `.env` para alterar:

```bash
EXPO_PUBLIC_API_BASE_URL=https://seu-backend.example.com
EXPO_PUBLIC_WEB_PORTAL_URL=https://seu-portal.example.com
```

## Rodar no Expo Go

A versão usa Expo SDK 54 para compatibilidade com o Expo Go durante o período de transição do SDK 57.

```bash
npm install
npx expo start --tunnel
```

No celular:

1. instale o Expo Go;
2. conecte celular e computador à internet;
3. leia o QR Code exibido pelo Terminal;
4. aguarde a abertura da PHYLLOS Evidence OS.

## Verificação

```bash
npm run typecheck
npm run lint
npm run doctor
```

## Gerar aplicativo instalável

```bash
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --profile preview --platform android
npx eas-cli@latest build --profile preview --platform ios
```

Antes da publicação em lojas, substitua o `projectId` de exemplo do `app.json` pelo valor criado pelo `eas init`.
