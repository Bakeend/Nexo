# Contribuindo

Use branches curtas a partir de `develop` e commits Conventional Commits.

Antes de abrir uma alteração:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
```

Alterações persistentes devem incluir migration e teste de atualização. Alterações de lembretes devem cobrir permissão, cancelamento e recorrência.
