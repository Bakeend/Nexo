# Builds Android

A versão estável do Android é **1.0.0**. `npm run build:android` apenas exporta os arquivos do app; ele não gera um APK instalável.

## Gerar o APK de produção

Na raiz do repositorio, execute:

```sh
eas build --platform android --profile production
```

O perfil `production` em `eas.json` gera um APK instalável, usa o ambiente `production` e deixa o EAS incrementar o `versionCode` Android remoto a cada build.

## Regra para futuras versões

1. Mantenha `package.json` e `expo.version` em `app.json` sincronizados com SemVer (`MAJOR.MINOR.PATCH`).
2. Antes de uma nova versão estável, atualize os dois campos juntos: patch para correções, minor para recursos compatíveis e major para mudanças incompatíveis.
3. Gere releases estáveis pelo perfil EAS `production`. Deixe o EAS incrementar o `versionCode` remoto; nunca reutilize ou reduza um código já publicado.

A versão do app identifica a release para as pessoas. O `versionCode` identifica cada build e precisa continuar crescendo; ele fica sob controle remoto do EAS.
