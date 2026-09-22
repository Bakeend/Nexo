# Nexo

Aplicativo pessoal mobile para capturar, organizar e lembrar do que importa.

## Stack

- Expo SDK 57 / React Native
- TypeScript strict
- Expo Router
- SQLite + Drizzle ORM
- Zustand para estado transitório
- Notificações locais, arquivos, imagens e áudio

## Desenvolvimento

```bash
npm install
npm start
npm run typecheck
npm run lint
npm test
npm run doctor
npm run build:android
```

Android é a plataforma de validação local. Os dados principais são locais e funcionam sem backend.

## Fluxos móveis

Os fluxos de regressão ficam em `.maestro/` e usam o package Android `com.bakeend.nexo`:

```bash
maestro test .maestro/onboarding.yaml
maestro test .maestro/capture.yaml
maestro test .maestro/note-task.yaml
```

Para builds instaláveis, use os perfis definidos em `eas.json` (`development`, `preview` e `production`).

Backups usam a extensão `.nexo-backup`, são versionados e restauram os dados locais sem reutilizar `notificationId` nativo.

## Estrutura

- `app/`: rotas e composição de telas
- `src/features/`: regras por domínio
- `src/database/`: schema, migrations e repositories
- `src/services/`: plataforma, notificações, mídia e backup
- `src/components/`: componentes reutilizáveis
- `src/design/`: tokens visuais
- `tests/`: testes automatizados
