<p align="center">
  <img src="assets/readme-banner.svg" alt="Nexo — aplicativo pessoal local-first para notas, tarefas e lembretes" width="100%" />
</p>

<p align="center">
  <strong>Capture ideias, organize tarefas e lembre do que importa — sem depender da nuvem.</strong>
</p>

<p align="center">
  <img alt="Expo SDK 57" src="https://img.shields.io/badge/Expo%20SDK-57-000020?logo=expo&logoColor=white" />
  <img alt="React Native 0.86" src="https://img.shields.io/badge/React%20Native-0.86-20232A?logo=react&logoColor=61DAFB" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" />
  <img alt="Local-first" src="https://img.shields.io/badge/arquitetura-local--first-4B6FF3" />
  <img alt="Versão 1.0.0" src="https://img.shields.io/badge/vers%C3%A3o-1.0.0-209B78" />
</p>

---

## Sobre o Nexo

**Nexo** é um aplicativo pessoal para transformar pensamentos soltos em algo fácil de encontrar e acompanhar.

Notas, tarefas, lembretes, arquivos, fotos e áudios ficam reunidos em um único lugar. O projeto segue uma abordagem **local-first**: o conteúdo principal permanece no dispositivo, o app funciona sem backend e não exige conta para organizar sua vida.

### O que torna o Nexo diferente

- **Local-first:** seus dados não dependem de um servidor para existir.
- **Funciona offline:** notas, tarefas, busca e organização continuam disponíveis sem internet.
- **Sem conta obrigatória:** atualmente não há login, backend ou sincronização em nuvem.
- **Tudo conectado:** notas podem se relacionar com tarefas, Espaços e tags.
- **Captura rápida:** texto, links, fotos, PDFs e outros conteúdos podem entrar direto na Caixa de entrada.
- **Backup portátil:** dados e anexos podem ser exportados e restaurados em um arquivo `.nexo-backup`.

## Recursos

| Área | O que você pode fazer |
| --- | --- |
| 📝 **Notas** | Criar conteúdo com texto formatado, títulos, listas, checklists, links e anexos. |
| ✅ **Tarefas** | Definir prioridade, data e horário, concluir tarefas e relacioná-las a notas. |
| 🔔 **Lembretes** | Agendar alertas locais e configurar repetições em plataformas nativas compatíveis. |
| 🗂️ **Espaços e tags** | Separar conteúdos por contexto, projeto ou assunto. |
| 📌 **Fixados** | Manter notas, tarefas, arquivos e Espaços importantes em destaque na Home. |
| 📅 **Hoje e Calendário** | Acompanhar tarefas e lembretes por data, incluindo itens atrasados. |
| 🔎 **Busca** | Pesquisar notas, tarefas, lembretes e capturas da Caixa de entrada. |
| 📎 **Mídia** | Anexar imagens, documentos e gravações de áudio. |
| 📲 **Compartilhar para o Nexo** | No Android, receber texto, URLs, fotos e PDFs pelo menu Compartilhar do sistema. |
| 💾 **Backup** | Exportar e restaurar dados e anexos sem depender de uma conta online. |

## Dados e privacidade

O Nexo foi desenhado para manter o fluxo principal no próprio dispositivo.

- O banco local usa **SQLite** com **Drizzle ORM**.
- No Android e iOS, anexos ficam no armazenamento interno do app.
- Na web, arquivos ficam no **IndexedDB** do navegador.
- Atualmente não há conta, backend nem sincronização em nuvem.
- A importação aceita arquivos de até **50 MB**.
- No backup, cada mídia pode ter até **50 MB**, o conjunto de mídias até **100 MB** e o arquivo final até **160 MB**.
- A restauração de um backup substitui os dados atuais após confirmação.

## Stack

- **Expo SDK 57**
- **React Native 0.86**
- **React 19**
- **TypeScript** em modo strict
- **Expo Router**
- **Expo SQLite + Drizzle ORM**
- **Zustand**
- **Expo Notifications**
- **Expo Audio**
- **Expo Image Picker**
- **Expo Document Picker**
- **Expo File System**
- **Jest + Testing Library**
- **Maestro** para fluxos móveis de regressão

## Rodando localmente

### Pré-requisitos

- **Node.js 24.16.0** (definido em `.nvmrc`)
- **npm 11.13.0**
- Android Studio/emulador para Android, quando necessário
- macOS + Xcode para o simulador iOS

### Instalação

```bash
git clone https://github.com/Bakeend/nexo.git
cd nexo
npm install
npm start
```

Para abrir diretamente em uma plataforma:

```bash
npm run android
npm run ios
npm run web
```

> O simulador iOS exige macOS. `npm run web` inicia o servidor web local com os cabeçalhos de isolamento usados pelo app e, por padrão, utiliza `http://localhost:8082`. Para iniciar o servidor web padrão do Expo, use `npm run web:expo`.

## Qualidade e testes

Antes de enviar alterações, rode:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run doctor
```

Os principais fluxos móveis automatizados ficam em `.maestro/` e usam o package Android `com.bakeend.nexo`:

```bash
maestro test .maestro/onboarding.yaml
maestro test .maestro/capture.yaml
maestro test .maestro/note-task.yaml
```

## Build Android

`npm run build:android` executa `expo export --platform android`; esse comando **não gera um APK instalável**.

Os perfis EAS disponíveis em `eas.json` são:

- `development`
- `preview`
- `production`

Para gerar o APK estável e seguir a estratégia de versionamento do projeto, consulte **[BUILDING.md](BUILDING.md)**.

> Depois de alterar os filtros nativos usados pelo menu Compartilhar do Android, é necessário gerar um novo build de desenvolvimento ou preview para o Nexo aparecer como destino de compartilhamento.

## Estrutura do projeto

```text
nexo/
├── app/                 # Rotas e telas do Expo Router
├── assets/              # Ícones, onboarding, sons e imagens
├── drizzle/             # Migrations do banco local
├── src/
│   ├── components/      # Componentes reutilizáveis
│   ├── database/        # Schema, migrations e repositories
│   ├── design/          # Tema, cores e tokens visuais
│   ├── features/        # Regras específicas de domínio
│   ├── motion/          # Animações
│   ├── navigation/      # Comportamentos compartilhados de navegação
│   ├── services/        # Mídia, notificações, backup e compartilhamento
│   ├── stores/          # Estado e preferências da interface
│   ├── types/           # Tipos compartilhados
│   └── utils/           # Funções auxiliares
├── tests/               # Testes automatizados
└── .maestro/            # Fluxos E2E mobile
```

O alias `@/` aponta para `src/`.

## Contribuindo

Contribuições e melhorias são bem-vindas. Antes de começar, veja **[CONTRIBUTING.md](CONTRIBUTING.md)** para conhecer o fluxo de branches, commits e verificações do projeto.

---

<p align="center">
  Feito para manter ideias, tarefas e lembretes próximos de você — inclusive quando a internet não está.
</p>
