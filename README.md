# Nexo

Aplicativo pessoal para capturar, organizar e lembrar do que importa. O Nexo é local-first: os dados ficam no dispositivo e o app funciona sem backend.

## O que dá para fazer

- **Capturar rapidamente:** guardar uma ideia na Caixa de entrada ou começar uma nota, tarefa, lembrete, arquivo, foto ou gravação de áudio.
- **Escrever notas:** combinar texto formatado, títulos, listas, checklists, links e anexos.
- **Organizar tarefas:** definir prioridade, data e horário, relacionar uma tarefa a uma nota e acompanhar tarefas pendentes ou concluídas.
- **Criar lembretes:** agendar alertas locais e configurar repetições. As notificações dependem da permissão do dispositivo e estão disponíveis em plataformas nativas compatíveis.
- **Agrupar por Espaços e tags:** organizar conteúdo por contexto e assunto.
- **Fixar itens:** manter notas, tarefas, arquivos e Espaços importantes na área **Fixados** da Home. Essa área só aparece quando há itens fixados.
- **Consultar Hoje e Calendário:** ver tarefas e lembretes por data. Tarefas cujo horário já passou entram em **Atrasadas**.
- **Pesquisar:** buscar notas, tarefas, lembretes e capturas da Caixa de entrada, incluindo Espaços e tags associados.
- **Anexar mídia:** guardar imagens, documentos e áudio localmente.
- **Compartilhar para o Nexo no Android:** enviar texto, URLs, fotos e PDFs pelo menu do sistema; cada conteúdo chega inicialmente à Caixa de entrada.
- **Fazer backup:** exportar ou restaurar os dados e os arquivos anexados em um arquivo `.nexo-backup`. A restauração substitui os dados atuais após confirmação.

## Armazenamento

- O banco usa SQLite com Drizzle ORM.
- No Android e iOS, anexos ficam no armazenamento interno do app. Na web, arquivos ficam no IndexedDB do navegador.
- Atualmente não há conta, backend nem sincronização na nuvem.
- A importação de arquivos aceita até 50 MB por arquivo. No backup, cada arquivo de mídia pode ter até 50 MB, a mídia somada até 100 MB e o arquivo final até 160 MB.

As instrucoes para gerar o APK estavel e versionar builds futuras estao em [BUILDING.md](BUILDING.md).

## Tecnologias

- Expo SDK 57 e React Native
- TypeScript em modo strict
- Expo Router para navegação
- Expo SQLite e Drizzle ORM para dados locais
- Zustand para preferências e estado da interface
- Expo Notifications, Expo Audio, Expo Image Picker, Document Picker e File System

## Desenvolvimento

Use Node.js e a versão de npm indicada em `package.json` (`npm@11.13.0`). Na raiz do projeto:

```bash
npm install
npm start
```

Para iniciar diretamente em uma plataforma:

```bash
npm run android
npm run ios
npm run web
```

O simulador iOS exige macOS. `npm run web` inicia o servidor web local com os cabeçalhos de isolamento usados pelo app; por padrão, ele fica em `http://localhost:8082`. `npm run web:expo` inicia o servidor web do Expo sem esse proxy.

## Verificações

```bash
npm run typecheck
npm run lint
npm test
npm run format:check
npm run doctor
```

`npm run build:android` executa `expo export --platform android` para exportar os arquivos do app; não gera um APK instalável. Os perfis de build EAS estão definidos em `eas.json`: `development`, `preview` e `production`.

O recebimento pelo menu Compartilhar usa filtros nativos do Android. Depois de alterar essa configuração, é necessário gerar um novo build de desenvolvimento ou preview para o Nexo aparecer como destino de compartilhamento.

Os fluxos móveis de regressão ficam em `.maestro/` e usam o package Android `com.bakeend.nexo`:

```bash
maestro test .maestro/onboarding.yaml
maestro test .maestro/capture.yaml
maestro test .maestro/note-task.yaml
```

## Estrutura do projeto

- `app/`: rotas e telas do Expo Router; as telas principais ficam em `app/(tabs)/`.
- `src/components/`: componentes reutilizáveis da interface.
- `src/database/`: schema SQLite, migrations e repositories.
- `src/design/`: cores, tipografia e tokens visuais.
- `src/features/`: regras específicas de busca e tarefas.
- `src/motion/`: componentes e configurações de animação.
- `src/navigation/`: comportamento compartilhado de navegação.
- `src/services/`: mídia, notificações, backup, compartilhamento e sons.
- `src/stores/`: estado e preferências da interface.
- `src/types/` e `src/utils/`: tipos e funções auxiliares.
- `tests/`: testes automatizados.
- `.maestro/`: fluxos móveis automatizados.

O alias `@/` aponta para `src/`.
