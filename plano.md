Crie um aplicativo mobile de organização pessoal provisoriamente chamado **Nexo**.

A imagem anexada deve ser utilizada como **referência visual principal da interface**. Reproduza a linguagem visual observada nela: composição, densidade, espaçamentos, hierarquia, estrutura das telas, proporção dos elementos e sensação clean/minimalista. Não interprete a imagem apenas como inspiração genérica.

Porém, a imagem é apenas referência de UI/UX. A implementação funcional deve seguir rigorosamente a arquitetura e os fluxos descritos abaixo.

# 1. OBJETIVO DO APP

O Nexo é um aplicativo pessoal para centralizar:

* notas;
* tarefas;
* lembretes;
* calendário;
* arquivos;
* imagens;
* áudios;
* ideias;
* conteúdos rápidos ainda não organizados;
* espaços/pastas por contexto.

O princípio do aplicativo é:

**capturar rapidamente → organizar depois → encontrar facilmente → lembrar no momento certo.**

O usuário nunca deve precisar decidir toda a estrutura antes de anotar algo.

---

# 2. MODELO CENTRAL DE CONTEÚDO

Todo conteúdo criado deve ser tratado inicialmente como um `Item`.

Estrutura conceitual:

```text
Item
├── id
├── type
│   ├── note
│   ├── task
│   ├── reminder
│   ├── file
│   ├── image
│   ├── audio
│   └── quick_capture
├── title
├── content
├── createdAt
├── updatedAt
├── spaceId
├── tags[]
├── attachments[]
├── pinned
├── archived
└── metadata
```

Dependendo do tipo, `metadata` poderá conter:

```text
task:
- completed
- dueDate
- priority

reminder:
- reminderDate
- repeatRule

file:
- fileName
- mimeType
- path

audio:
- duration
- transcription
```

A arquitetura deve permitir que futuramente novos tipos sejam adicionados sem reescrever o aplicativo inteiro.

---

# 3. NAVEGAÇÃO PRINCIPAL

O fluxo principal deve ser:

```text
APP
 ↓
Splash
 ↓
Onboarding (somente primeiro acesso)
 ↓
Home
```

Depois do onboarding:

```text
APP
 ↓
Splash
 ↓
Home
```

A Home é o hub principal.

Estrutura:

```text
Home
├── Hoje
├── Caixa de entrada
├── Notas
├── Tarefas
├── Calendário
├── Espaços
├── Busca
└── Criar (+)
```

---

# 4. SPLASH

Criar uma splash extremamente simples.

Elementos:

```text
Logo
Nexo
frase curta opcional
```

Não adicionar cards, banners, ilustrações complexas ou informações desnecessárias.

Após a inicialização:

```text
primeiro acesso → Onboarding
usuário existente → Home
```

---

# 5. ONBOARDING

Criar onboarding curto, com no máximo 3 etapas.

Objetivos:

### Página 1

Explicar captura.

```text
Anote qualquer coisa.
```

### Página 2

Explicar organização.

```text
Organize quando quiser.
```

### Página 3

Explicar lembretes.

```text
Não esqueça o que importa.
```

A última etapa possui:

```text
Começar
```

Ao continuar:

```text
Onboarding
 ↓
Home
```

Salvar localmente que o onboarding já foi exibido.

---

# 6. HOME

A Home deve funcionar como índice do aplicativo.

Não transformar a Home em dashboard extremamente carregado.

Mostrar principalmente:

```text
saudação/data

Hoje
Caixa de entrada
Notas
Tarefas
Calendário
Espaços
```

Cada seção deve exibir um pequeno resumo.

Exemplo:

```text
Hoje
3 tarefas • 1 lembrete

Caixa de entrada
5 itens para organizar

Notas
12 notas

Tarefas
6 pendentes

Calendário
4 eventos hoje
```

Também deve existir uma ação global:

```text
+
```

Esse botão deve estar disponível nas áreas principais.

---

# 7. CAPTURA RÁPIDA

Ao tocar em `+`, NÃO abrir imediatamente uma tela complexa.

Abrir um `bottom sheet`.

Estrutura:

```text
O que você quer guardar?

[Apenas escreva...]

Nota
Tarefa
Lembrete
Arquivo
Foto
Áudio
```

O objetivo é permitir criação em poucos segundos.

---

# 8. CAPTURA POR TEXTO LIVRE

O campo:

```text
Apenas escreva...
```

deve permitir que o usuário registre algo sem selecionar previamente o tipo.

Exemplo:

```text
Comprar ração amanhã às 18h
```

O sistema poderá detectar:

```text
ação: Comprar ração
data: amanhã
hora: 18:00
tipo sugerido: tarefa/lembrete
```

Mostrar uma confirmação não intrusiva:

```text
Criar como tarefa?

Comprar ração
Amanhã • 18:00

[Editar] [Criar]
```

Se nenhum padrão for detectado:

```text
salvar como quick_capture
```

e enviar para:

```text
Caixa de entrada
```

Essa inteligência deve ser modular para permitir posteriormente integração com IA.

---

# 9. CRIAÇÃO DE NOTA

Fluxo:

```text
+
 ↓
Nota
 ↓
Editor
```

Tela do editor:

```text
Voltar                 Salvar

Título

Comece a escrever...


toolbar inferior
```

Toolbar:

```text
formatação
checklist
anexo
imagem
áudio
mais opções
```

Não mostrar todas as ferramentas o tempo inteiro.

O editor deve priorizar a escrita.

Salvar automaticamente durante edição.

---

# 10. NOTA

Uma nota pode conter blocos básicos:

```text
texto
título
subtítulo
lista
checklist
link
imagem
arquivo
áudio
```

Não construir inicialmente um editor tão complexo quanto Notion.

Priorizar:

```text
simplicidade
velocidade
estabilidade
```

---

# 11. VISUALIZAÇÃO DA NOTA

Ao tocar em uma nota:

```text
Nota
```

Mostrar:

```text
Título
conteúdo
anexos
tags
data de modificação
```

Menu contextual:

```text
Editar
Fixar
Mover
Adicionar lembrete
Criar tarefa relacionada
Duplicar
Compartilhar
Arquivar
Excluir
```

---

# 12. RELACIONAMENTO NOTA → TAREFA

Permitir:

```text
Nota
 ↓
Menu
 ↓
Criar tarefa relacionada
```

Abrir:

```text
Título da tarefa
Data
Hora
Prioridade
```

Ao salvar:

```text
Tarefa criada
```

A tarefa deve manter:

```text
sourceItemId = note.id
```

Assim, dentro da tarefa poderá aparecer:

```text
Relacionado a:
HTTP e REST
```

Não destruir ou converter a nota original.

---

# 13. TAREFAS

Tela principal:

```text
Tarefas

Hoje | Próximas | Todas
```

### Hoje

Mostrar tarefas vencidas + tarefas de hoje.

### Próximas

Agrupar:

```text
Amanhã
Esta semana
Depois
```

### Todas

Mostrar todas as tarefas não arquivadas.

---

# 14. ITEM DE TAREFA

Cada tarefa deve possuir:

```text
checkbox
título
horário opcional
espaço opcional
prioridade opcional
```

Interações:

```text
tocar checkbox → concluir
tocar tarefa → detalhes
```

Opcionalmente:

```text
swipe direita → concluir
swipe esquerda → ações rápidas
```

A interface não deve depender exclusivamente de gestos.

---

# 15. DETALHES DA TAREFA

Tela:

```text
Título

Data
Hora
Prioridade
Repetição
Espaço
Tags
Nota relacionada
Descrição
```

Ações:

```text
Concluir
Editar
Duplicar
Mover
Excluir
```

---

# 16. LEMBRETES

Fluxo:

```text
+
 ↓
Lembrete
 ↓
Novo lembrete
```

Campos:

```text
Título
Data
Horário
Repetição
Prioridade
Espaço
```

Ação:

```text
Criar lembrete
```

O sistema deve programar notificação local.

---

# 17. REPETIÇÃO

Suportar inicialmente:

```text
Nunca
Diariamente
Semanalmente
Mensalmente
Anualmente
Personalizado
```

Exemplo personalizado:

```text
Seg
Qua
Sex
```

Arquitetura deve permitir regras mais complexas posteriormente.

---

# 18. HOJE

A tela `Hoje` é diferente da Home.

Home = entrada no aplicativo.

Hoje = visão operacional do dia.

Estrutura:

```text
Hoje
data atual

resumo:
3 tarefas
1 lembrete
4 eventos

Próximo

Minhas tarefas

Lembretes

Eventos
```

Ordenação temporal.

O primeiro compromisso futuro pode aparecer como:

```text
Próximo

Estudar Backend
19:00
```

---

# 19. CALENDÁRIO

Criar visualização mensal simples.

Topo:

```text
< Setembro 2026 >
```

Dias possuem pequenos indicadores quando houver conteúdo.

Ao selecionar uma data:

```text
21
```

mostrar abaixo:

```text
09:00 Aula
14:00 Trabalho
19:00 Estudar Backend
22:00 Entregar atividade
```

Não tentar mostrar todo conteúdo dentro das células do calendário.

---

# 20. ITENS QUE APARECEM NO CALENDÁRIO

Exibir automaticamente itens que possuírem data:

```text
tarefas
lembretes
eventos
```

Notas normais não aparecem, salvo se o usuário adicionar explicitamente uma data.

---

# 21. CAIXA DE ENTRADA

A Inbox é essencial.

Ela contém itens ainda não organizados.

Exemplos:

```text
"Pesquisar Docker amanhã"

"Ideia: sistema financeiro"

imagem_3829.jpg

"Comprar SSD"

áudio_14h32.m4a
```

Cada item mostra:

```text
tipo
conteúdo resumido
data da captura
```

---

# 22. ORGANIZAÇÃO DA INBOX

Ao tocar em um item:

```text
Abrir conteúdo
```

Ações:

```text
Transformar em nota
Transformar em tarefa
Criar lembrete
Mover para espaço
Adicionar tags
Arquivar
Excluir
```

Quando organizado:

```text
remover automaticamente da Inbox
```

mas NÃO excluir o conteúdo.

---

# 23. ESPAÇOS

Os Espaços funcionam como grandes contextos.

Exemplos:

```text
Pessoal
Faculdade
Trabalho
Projetos
Finanças
```

Não utilizar estrutura de pastas infinitamente profunda inicialmente.

Modelo:

```text
Space
├── id
├── name
├── icon
├── createdAt
└── settings
```

---

# 24. TELA DE ESPAÇOS

Mostrar:

```text
Espaços                    +

Pessoal
Faculdade
Trabalho
Projetos
Finanças
```

Cada espaço pode mostrar quantidade de itens.

Exemplo:

```text
Faculdade                  8
```

---

# 25. DENTRO DO ESPAÇO

Exemplo:

```text
Faculdade

Notas | Tarefas | Arquivos
```

Mostrar apenas itens que possuem:

```text
spaceId = faculdade
```

Permitir botão:

```text
+
```

Quando o usuário criar algo dentro de Faculdade:

```text
spaceId = faculdade
```

automaticamente.

---

# 26. BUSCA GLOBAL

Busca deve funcionar em todas as entidades.

Campo:

```text
Pesquisar...
```

Filtros:

```text
Todos
Notas
Tarefas
Arquivos
Lembretes
```

Buscar em:

```text
title
content
tags
fileName
space
```

Ordenação:

```text
relevância
+
data recente
```

---

# 27. RESULTADO DA BUSCA

Cada resultado deve indicar claramente seu tipo.

Exemplo:

```text
HTTP e REST
Faculdade • Nota • Hoje

Estudar protocolo HTTP
Tarefa • Amanhã

Aula_HTTP.pdf
Arquivo • 18 setembro
```

Ao tocar:

```text
abrir entidade correspondente
```

---

# 28. ARQUIVOS

O usuário pode adicionar:

```text
PDF
documentos
imagens
outros arquivos
```

Arquivo pode existir:

```text
como item independente
```

ou:

```text
como anexo de uma nota/tarefa
```

Não duplicar fisicamente o arquivo quando apenas estiver relacionado a outro item.

---

# 29. ÁUDIO

Fluxo:

```text
+
 ↓
Áudio
 ↓
Gravação
```

Tela:

```text
timer

Cancelar
Pausar
Finalizar
```

Ao finalizar:

```text
Título opcional
Espaço
Salvar
```

Preparar arquitetura para futura transcrição automática.

---

# 30. IMAGEM

Fluxo:

```text
+
 ↓
Foto
```

Permitir:

```text
Câmera
Galeria
```

Depois:

```text
Adicionar título
Adicionar descrição
Escolher espaço
Salvar
```

---

# 31. TAGS

Itens podem possuir múltiplas tags.

Exemplo:

```text
#backend
#prova
#importante
```

Tag não substitui Espaço.

Diferença:

```text
Espaço = onde o item pertence
Tag = característica ou assunto
```

---

# 32. FIXADOS

Itens podem possuir:

```text
pinned = true
```

Itens fixados devem aparecer primeiro onde fizer sentido.

Não criar uma área excessivamente destacada na Home inicialmente.

---

# 33. ARQUIVAMENTO

Arquivar significa:

```text
esconder das áreas principais
```

sem apagar.

Tela futura ou configuração deve permitir visualizar:

```text
Arquivados
```

---

# 34. EXCLUSÃO

Ao excluir:

```text
Mover para lixeira
```

Não apagar imediatamente.

Lixeira pode manter itens temporariamente.

Estrutura preparada para:

```text
deletedAt
```

---

# 35. CONFIGURAÇÕES

Tela:

```text
Configurações

Notificações
Aparência
Privacidade
Exportar dados
Backup local
Ajuda
Sobre
```

Preparar sistema para:

```text
tema claro
tema escuro
tema do sistema
```

---

# 36. PERSISTÊNCIA

O aplicativo deve funcionar offline.

Todos os recursos principais precisam funcionar sem internet:

```text
criar notas
editar notas
tarefas
lembretes
espaços
busca
arquivos locais
```

Não utilizar backend para os dados principais do aplicativo.

O funcionamento deve ser integralmente local e offline.

---

# 37. ESTADOS IMPORTANTES

Todas as telas devem contemplar:

```text
loading
empty
success
error
```

Exemplo de `Notas` vazia:

```text
Nenhuma nota ainda.

Comece anotando algo.
```

Evitar telas vazias sem orientação.

---

# 38. FLUXO COMPLETO DE EXEMPLO 1

Usuário pensa:

```text
Preciso comprar SSD.
```

Fluxo:

```text
Home
 ↓
+
 ↓
digita "Comprar SSD"
 ↓
Salvar rápido
 ↓
Inbox
```

Depois:

```text
Inbox
 ↓
Comprar SSD
 ↓
Transformar em tarefa
 ↓
Selecionar amanhã
 ↓
Salvar
```

Resultado:

```text
Inbox → item removido

Tarefas → Comprar SSD

Calendário → Comprar SSD amanhã
```

---

# 39. FLUXO COMPLETO DE EXEMPLO 2

Usuário está estudando.

```text
+
 ↓
Nota
 ↓
Título:
HTTP e REST
 ↓
Escreve conteúdo
 ↓
Espaço:
Faculdade
 ↓
Salvar
```

Resultado:

```text
Notas
└── HTTP e REST

Espaços
└── Faculdade
    └── Notas
        └── HTTP e REST
```

Depois:

```text
HTTP e REST
 ↓
Criar tarefa relacionada
 ↓
Revisar HTTP
 ↓
Amanhã • 19h
```

Resultado:

```text
Tarefa:
Revisar HTTP

Relacionado a:
HTTP e REST
```

---

# 40. FLUXO COMPLETO DE EXEMPLO 3

Usuário escreve:

```text
Me lembrar de entregar o trabalho sexta às 22h
```

Sistema identifica:

```text
ação:
Entregar o trabalho

data:
sexta-feira

hora:
22:00
```

Apresentar:

```text
Criar lembrete

Entregar o trabalho
Sexta • 22:00

[Editar]
[Criar]
```

Após confirmação:

```text
Lembrete criado
 ↓
Hoje/Calendário quando aplicável
 ↓
Notificação no horário
```

---

# 41. REGRA DE UX PRINCIPAL

Nunca obrigar o usuário a preencher:

```text
pasta
tag
prioridade
descrição
data
```

para simplesmente salvar algo.

O fluxo mínimo precisa ser:

```text
+
 ↓
escrever
 ↓
salvar
```

Todo o resto é opcional.

---

# 42. REGRA DE COMPLEXIDADE

Não transformar o produto inicialmente em:

```text
Notion
Obsidian
ClickUp
Trello
Google Calendar
```

ao mesmo tempo.

O aplicativo deve parecer simples mesmo que internamente tenha uma arquitetura poderosa.

Prioridade:

```text
1. Capturar
2. Encontrar
3. Organizar
4. Lembrar
```

---

# 43. REFERÊNCIA VISUAL ANEXADA

Use a imagem fornecida como referência direta para as seguintes telas:

```text
01 Splash
02 Onboarding
03 Home
04 Captura rápida
05 Editor de nota
06 Nota aberta
07 Novo lembrete
08 Tarefas
09 Calendário
10 Caixa de entrada
11 Espaços
12 Espaço aberto
13 Busca
14 Hoje
15 Configurações
```

Preserve a mesma linguagem visual entre todas elas.

Esta referência representa um aplicativo mobile vertical para iOS e Android. Ela não deve ser interpretada como um layout de site desktop, dashboard web ou interface responsiva genérica.

O tamanho-base para composição e revisão visual é um telefone de aproximadamente 390 x 844 pontos. A implementação deve preservar as relações visuais da referência quando adaptada para outras larguras, sem simplesmente escalar todos os elementos proporcionalmente.

A imagem define principalmente:

```text
estrutura visual
hierarquia
densidade
posicionamento
espaçamento
proporção
sensação minimalista
```

Este documento define:

```text
comportamento
navegação
dados
estados
regras
relacionamento entre telas
```

Quando houver conflito:

```text
imagem → referência visual

este documento → referência funcional
```

Regra obrigatória de fidelidade:

```text
A imagem define o contrato visual do Nexo.
Este documento define o contrato funcional do Nexo.
```

Nenhuma tela pode introduzir, sem justificativa explícita:

```text
grade de cards como estrutura principal
dashboard carregado
menu lateral como navegação primária
gradientes decorativos
sombras fortes
múltiplos CTAs competindo
cores de accent sem função semântica
```

Os elementos exibidos na referência que contradigam o escopo funcional, como conta, sincronização ou sair, devem ser tratados apenas como referência de composição. Eles não autorizam a criação de autenticação ou backend.

---

# 44. PRINCÍPIO FINAL

O usuário deve conseguir abrir o aplicativo e fazer:

```text
abrir
+
escrever
salvar
```

em poucos segundos.

Depois, quando quiser, pode transformar aquilo em:

```text
nota
tarefa
lembrete
arquivo organizado
item de um espaço
```

A interface deve esconder a complexidade técnica e apresentar uma experiência extremamente simples, previsível e rápida.

---

# 45. DESIGN SYSTEM OBRIGATÓRIO

A imagem anexada continua sendo a principal referência visual. Entretanto, para manter consistência durante a implementação, utilize os tokens e regras abaixo.

O objetivo visual é:

```text
clean
minimalista
leve
premium
silencioso
organizado
sem poluição visual
```

Evitar aparência de:

```text
dashboard corporativo
app financeiro
Material Design genérico
cards excessivos
gradientes chamativos
glassmorphism exagerado
sombras fortes
interfaces gamer
interfaces coloridas demais
```

---

# 46. FONTE PRINCIPAL

Utilizar preferencialmente:

```text
Inter
```

Fallback:

```text
SF Pro Display
SF Pro Text
Roboto
sans-serif
```

No iOS, a fonte nativa do sistema pode ser utilizada se isso resultar em maior fidelidade à referência.

No Android, utilizar Inter para manter identidade consistente entre plataformas.

Não utilizar fontes decorativas.

---

# 47. ESCALA TIPOGRÁFICA

## Display / Destaques

```text
32px
font-weight: 700
line-height: 38px
```

Usar apenas em telas especiais de onboarding ou grandes mensagens.

---

## Título principal da tela

```text
24px
font-weight: 700
line-height: 30px
```

Exemplos:

```text
Hoje
Tarefas
Faculdade
Configurações
```

---

## Título secundário

```text
18px
font-weight: 600
line-height: 24px
```

---

## Texto principal

```text
16px
font-weight: 400
line-height: 22px
```

---

## Item de lista

```text
15–16px
font-weight: 500
```

---

## Texto secundário

```text
14px
font-weight: 400
line-height: 20px
```

---

## Metadata

```text
12–13px
font-weight: 400
```

Usar para:

```text
data
hora
quantidade
categoria
informação auxiliar
```

---

# 48. REGRA DE TIPOGRAFIA

Nunca utilizar mais de aproximadamente:

```text
3 pesos tipográficos
```

na mesma tela.

Preferência:

```text
Regular 400
Medium 500
Semibold 600
Bold 700 apenas em títulos importantes
```

Não utilizar texto completamente preto em todos os elementos.

Criar hierarquia usando:

```text
peso
tamanho
cor
espaçamento
```

e não adicionando caixas ou divisores desnecessários.

---

# 49. PALETA PRINCIPAL

## Background principal

```text
#FFFFFF
```

Tema claro.

---

## Background secundário

```text
#F7F8FA
```

Utilizar em:

```text
áreas secundárias
inputs
segmentados
blocos muito leves
```

---

## Background terciário

```text
#F2F3F5
```

---

## Texto principal

```text
#15171A
```

Evitar preto puro `#000000` para grandes quantidades de texto.

---

## Texto secundário

```text
#6F747C
```

---

## Texto terciário

```text
#A1A6AE
```

---

## Divisores

```text
#E9EAED
```

Extremamente discretos.

---

# 50. COR DE DESTAQUE

Usar azul como accent principal.

Cor base:

```text
#5267E8
```

Alternativa mais suave:

```text
#6375ED
```

Utilizar apenas em:

```text
ações principais
item selecionado
tabs selecionadas
links
botão +
indicadores
checkbox selecionado
pequenos detalhes
```

Não pintar grandes áreas da interface de azul.

O aplicativo deve continuar predominantemente neutro.

---

# 51. CORES SEMÂNTICAS

## Sucesso

```text
#36A269
```

## Aviso

```text
#E6A23C
```

## Erro

```text
#E45454
```

## Informação

```text
#5267E8
```

Essas cores devem aparecer apenas quando semanticamente necessárias.

---

# 52. TEMA ESCURO

Preparar suporte arquitetural para dark mode.

Exemplo:

```text
background: #111214

surface: #191B1E

surface-secondary: #202226

text-primary: #F5F5F6

text-secondary: #A7ABB2

divider: #2A2D31
```

Accent azul deve permanecer reconhecível.

O tema escuro não deve simplesmente inverter cores.

---

# 53. SISTEMA DE ESPAÇAMENTO

Utilizar grid baseado em:

```text
4px
```

Valores preferidos:

```text
4px
8px
12px
16px
20px
24px
32px
40px
48px
```

---

# 54. MARGEM HORIZONTAL

Margem principal:

```text
20px
```

Pode variar entre:

```text
18–24px
```

dependendo da largura do dispositivo.

Nunca encostar conteúdo nas laterais.

---

# 55. ESPAÇAMENTO ENTRE SEÇÕES

Entre blocos principais:

```text
24–32px
```

Entre itens relacionados:

```text
8–16px
```

Entre título e subtítulo:

```text
4–6px
```

O espaço vazio faz parte do design.

Não tentar preencher espaços vazios apenas porque estão disponíveis.

---

# 56. BORDER RADIUS

## Inputs

```text
12px
```

## Cards

```text
14–16px
```

## Bottom sheets

```text
24px nos cantos superiores
```

## Botões principais

```text
12–14px
```

## Pills / Tags

```text
999px
```

ou radius suficientemente alto para formato cápsula.

---

# 57. SOMBRAS

Utilizar sombras apenas quando necessárias para indicar elevação.

Exemplo:

```text
0 2px 12px rgba(0,0,0,0.04)
```

Não usar:

```text
sombras pesadas
sombras pretas
neon
glow
```

Muitos elementos devem funcionar apenas com:

```text
background
spacing
divider
```

sem sombra.

---

# 58. ÍCONES

Utilizar uma única família de ícones em todo o aplicativo.

Preferências:

```text
Lucide
Phosphor
SF Symbols no iOS
```

Se for necessário manter identidade multiplataforma:

```text
Lucide
```

é a preferência principal.

---

# 59. ESTILO DOS ÍCONES

Ícones devem ser:

```text
outline
simples
finos
consistentes
sem ilustrações tridimensionais
```

Espessura aproximada:

```text
1.75px – 2px
```

Tamanhos padrão:

```text
16px
20px
22px
24px
```

Evitar misturar:

```text
ícone filled
ícone outline
emoji
ícone 3D
```

na mesma interface.

---

# 60. TAMANHO DE ÁREA CLICÁVEL

Mesmo quando o ícone tiver apenas:

```text
20px
```

a região interativa deve possuir no mínimo:

```text
44x44px
```

Preferencialmente:

```text
48x48px
```

Não obrigar o usuário a tocar exatamente sobre um ícone pequeno.

---

# 61. BOTÃO PRINCIPAL

Exemplo:

```text
Criar lembrete
Começar
Salvar
```

Características:

```text
altura: 48–52px
border-radius: 12–14px
font-size: 15–16px
font-weight: 600
```

Quando utilizado como CTA principal, pode usar:

```text
background: #15171A
text: #FFFFFF
```

ou accent azul, dependendo da tela.

Não utilizar múltiplos botões primários concorrendo visualmente.

---

# 62. BOTÃO +

O botão global de criação precisa ser imediatamente reconhecível.

Pode ser:

```text
ícone + no header
```

ou:

```text
FAB discreto
```

dependendo da tela.

Não precisa existir um grande FAB permanente em todas as telas.

A localização deve permanecer previsível.

---

# 63. INPUTS

Inputs devem parecer leves.

Estrutura:

```text
background suave
sem borda forte
placeholder cinza
texto escuro
```

Estado de foco:

```text
accent discreto
```

Evitar bordas azuis grossas.

---

# 64. LISTAS

Listas são preferíveis a grandes conjuntos de cards.

Exemplo:

```text
[ícone] Hoje
        3 tarefas • 1 lembrete
                           >
```

Separar itens usando:

```text
spacing
divider leve
```

e não necessariamente caixas individuais.

Esta é uma regra visual importante.

---

# 65. CARDS

Cards só devem ser utilizados quando o conteúdo realmente representar uma unidade independente.

Não transformar cada elemento em card.

Usar card para:

```text
resumo
preview
destaque
grupo relacionado
```

Não usar card para:

```text
cada configuração
cada linha
cada opção de menu
```

---

# 66. BOTTOM SHEETS

Captura rápida e ações contextuais devem preferencialmente abrir como bottom sheet.

Características:

```text
fundo da tela escurecido levemente
sheet branco
cantos superiores arredondados
handle discreto
animação vertical suave
```

Nunca ocupar tela inteira quando não for necessário.

---

# 67. ANIMAÇÕES

As animações devem servir para transmitir continuidade.

Duração padrão:

```text
180–250ms
```

Animações mais complexas:

```text
250–350ms
```

Curvas:

```text
ease-out
ease-in-out
spring suave
```

Evitar:

```text
bounce exagerado
zoom agressivo
rotações
animações decorativas constantes
```

---

# 68. MICROINTERAÇÕES

Exemplos:

Ao concluir tarefa:

```text
checkbox anima suavemente
texto perde destaque
item muda de seção
```

Ao salvar nota:

```text
pequeno feedback visual
```

Ao mover conteúdo:

```text
feedback curto
```

Ao abrir bottom sheet:

```text
slide suave de baixo
```

Ao tocar:

```text
feedback visual imediatamente
```

---

# 69. HAPTIC FEEDBACK

Quando suportado:

Usar feedback tátil leve em:

```text
concluir tarefa
criar item
selecionar ação importante
arrastar item
```

Não vibrar em toda interação.

---

# 70. REGRA UX — CAPTURA PRIMEIRO

A ação mais importante do aplicativo é guardar algo rapidamente.

Fluxo ideal:

```text
abrir
+
digitar
salvar
```

A aplicação não pode exigir classificação antes de salvar.

---

# 71. REGRA UX — ORGANIZAR DEPOIS

Campos como:

```text
espaço
tag
prioridade
data
horário
descrição
```

devem ser opcionais.

A Inbox existe justamente para permitir captura sem organização prévia.

---

# 72. REGRA UX — PROGRESSIVE DISCLOSURE

Não mostrar opções avançadas antes que o usuário precise delas.

Exemplo:

Ao criar tarefa, mostrar inicialmente:

```text
Título
Data
Hora
```

Outras opções:

```text
Prioridade
Repetição
Tags
Espaço
```

podem aparecer em:

```text
Mais opções
```

ou abaixo de forma discreta.

---

# 73. REGRA UX — NÃO INTERROMPER

Evitar modais de confirmação para ações reversíveis.

Exemplo:

```text
concluir tarefa
arquivar
mover
```

Executar imediatamente e mostrar:

```text
Desfazer
```

---

# 74. REGRA UX — CONFIRMAR AÇÕES DESTRUTIVAS

Confirmar quando existir risco significativo de perda.

Exemplo:

```text
Excluir definitivamente
Apagar todos os dados
Remover arquivo permanentemente
```

---

# 75. REGRA UX — DESFAZER

Sempre que possível oferecer:

```text
Desfazer
```

após:

```text
arquivar
excluir para lixeira
concluir
mover
```

Toast/snackbar discreto.

---

# 76. REGRA UX — AUTOSAVE

Notas devem possuir salvamento automático.

Nunca obrigar o usuário a lembrar de salvar constantemente.

Pode existir botão visual de conclusão como:

```text
Concluir
Voltar
```

mas o conteúdo deve ser persistido continuamente.

---

# 77. REGRA UX — ESTADO VISÍVEL

O usuário deve conseguir entender:

```text
onde está
o que está selecionado
o que acabou de acontecer
```

Tabs selecionadas devem possuir estado visual.

Itens concluídos devem possuir estado visual.

Filtros ativos devem ser identificáveis.

---

# 78. REGRA UX — CONSISTÊNCIA

A mesma ação deve funcionar da mesma maneira em todas as telas.

Exemplo:

```text
+
```

sempre significa criar.

```text
...
```

sempre significa ações adicionais.

```text
< 
```

sempre significa voltar.

---

# 79. REGRA UX — NAVEGAÇÃO

Evitar mais de:

```text
3 níveis profundos
```

para tarefas comuns.

Exemplo ruim:

```text
Home
→ Menu
→ Organização
→ Pastas
→ Faculdade
→ Notas
→ Nota
```

Preferir:

```text
Home
→ Faculdade
→ Nota
```

---

# 80. REGRA UX — BUSCA GLOBAL

A busca deve estar facilmente disponível.

O usuário não precisa lembrar onde guardou algo.

Princípio:

```text
"Eu lembro o que escrevi,
não necessariamente onde coloquei."
```

Por isso a busca precisa encontrar conteúdo independentemente do espaço.

---

# 81. REGRA UX — EMPTY STATES

Nunca mostrar apenas:

```text
Nenhum resultado
```

quando for possível ajudar.

Exemplo:

```text
Nenhuma nota ainda.

Anote uma ideia, informação ou algo
que queira consultar depois.

[ Criar nota ]
```

---

# 82. REGRA UX — ERROS

Mensagens devem explicar:

```text
o que aconteceu
o que o usuário pode fazer
```

Evitar:

```text
Erro 503
Operação inválida
Unknown error
```

Preferir:

```text
Não foi possível salvar o arquivo.

Tente novamente.
```

Detalhes técnicos podem ir para logs.

---

# 83. REGRA UX — LOADING

Para operações locais rápidas:

```text
não mostrar spinner desnecessariamente
```

Para carregamentos perceptíveis:

utilizar:

```text
skeleton
progress
```

evitando tela bloqueada quando possível.

---

# 84. REGRA UX — OFFLINE FIRST

Se uma operação puder acontecer localmente, não bloquear porque a internet está indisponível.

Exemplo:

```text
criar nota
criar tarefa
editar nota
concluir tarefa
```

deve continuar funcionando.

Não depender de sincronização remota para concluir qualquer operação principal.

---

# 85. REGRA UX — NOTIFICAÇÕES

Não pedir permissão de notificações imediatamente ao abrir o aplicativo pela primeira vez.

Solicitar quando existir contexto.

Exemplo:

```text
usuário cria primeiro lembrete
 ↓
explicar por que notificações são necessárias
 ↓
solicitar permissão
```

---

# 86. REGRA UX — PERMISSÕES

Aplicar o mesmo princípio para:

```text
microfone
câmera
arquivos
notificações
```

Pedir somente quando a funcionalidade for utilizada.

---

# 87. REGRA UX — ACESSIBILIDADE

Suportar:

```text
font scaling
screen readers
contraste adequado
áreas clicáveis grandes
labels acessíveis
```

Não transmitir informação somente por cor.

Exemplo:

Prioridade alta não pode ser identificada exclusivamente por vermelho.

Adicionar:

```text
Alta
```

em texto.

---

# 88. CONTRASTE

Texto principal precisa manter contraste adequado.

Evitar textos extremamente claros como:

```text
#CCCCCC sobre branco
```

para informações essenciais.

Metadata pode ser discreta, mas deve continuar legível.

---

# 89. RESPONSIVIDADE

Projetar primeiro para smartphones.

Layouts devem adaptar-se a:

```text
320px
360px
390px
412px
430px
```

de largura aproximada.

Não criar interface baseada em dimensões fixas de uma única imagem.

A imagem anexada define proporção e composição, não tamanho absoluto.

---

# 90. SAFE AREAS

Respeitar:

```text
notch
status bar
navigation bar
gesture area
keyboard
```

Nenhum botão importante pode ficar escondido atrás das áreas do sistema.

---

# 91. TECLADO

Quando teclado estiver aberto:

```text
campos devem permanecer visíveis
toolbar deve adaptar
botões principais não devem ficar inacessíveis
```

No editor de notas, a experiência com teclado deve ser prioridade.

---

# 92. GESTOS

Gestos devem acelerar tarefas, mas nunca serem a única forma de realizar uma ação.

Exemplo:

```text
swipe → concluir
```

é aceitável.

Mas também deve existir:

```text
checkbox
```

---

# 93. FEEDBACK

Toda ação precisa produzir resposta perceptível.

Exemplo:

```text
tocar → feedback visual
salvar → confirmação discreta
erro → mensagem
concluir → estado atualizado
```

Nunca permitir que o usuário se pergunte:

```text
"será que funcionou?"
```

---

# 94. PRIORIDADE VISUAL

Em cada tela deve existir apenas:

```text
1 ação primária clara
```

Exemplo:

Novo lembrete:

```text
Criar lembrete
```

Outras ações devem parecer secundárias.

---

# 95. DENSIDADE

Manter aproximadamente:

```text
5–8 elementos principais visíveis
```

antes de começar a sensação de poluição.

Quando houver muitos itens:

```text
scroll
filtros
busca
agrupamento
```

em vez de reduzir tudo de tamanho.

---

# 96. CONTEÚDO

Utilizar linguagem simples.

Preferir:

```text
Criar nota
Mover
Excluir
Hoje
Amanhã
Concluído
```

Evitar linguagem técnica como:

```text
Instanciar item
Modificar entidade
Executar operação
```

---

# 97. NOMES DE AÇÕES

Utilizar verbos.

Exemplo:

```text
Criar
Salvar
Mover
Compartilhar
Excluir
Arquivar
Editar
```

Evitar labels ambíguas.

---

# 98. REFERÊNCIA VISUAL

A imagem fornecida representa o resultado visual desejado.

Ela deve ser usada como especificação de interface e não apenas como inspiração. A revisão deve verificar se a implementação mantém a mesma sensação de produto, mesmo quando textos, dados e estados forem diferentes.

Não copiar apenas:

```text
cores
```

Copiar principalmente:

```text
ritmo visual
espaço em branco
densidade
hierarquia
simplicidade
proporção
quantidade de informação por tela
estrutura
```

Se a implementação começar a parecer mais carregada que a referência, simplificar.

O teste de fidelidade deve responder positivamente às perguntas abaixo:

```text
A tela parece pertencer ao mesmo aplicativo?
A hierarquia pode ser entendida em poucos segundos?
As listas continuam sendo o elemento estrutural dominante?
O conteúdo continua mais importante que a moldura visual?
O botão + aparece de forma previsível e sem duplicidade?
```

---

# 99. REGRA MESTRA DE DESIGN

Antes de adicionar qualquer elemento, perguntar:

```text
O usuário precisa disso agora?
```

Se não:

```text
ocultar
mover para ação secundária
ou remover
```

Não adicionar elementos apenas para preencher espaço.

---

# 100. REGRA MESTRA DE UX

Qualquer ação comum deve buscar ficar entre:

```text
1 e 3 interações
```

Exemplos:

Criar nota:

```text
+
→ Nota
→ escrever
```

Concluir tarefa:

```text
checkbox
```

Abrir nota recente:

```text
Home
→ nota
```

Pesquisar:

```text
Busca
→ digitar
```

O aplicativo deve esconder complexidade interna e entregar uma experiência extremamente simples.

---

# 101. ARQUITETURA TÉCNICA OBRIGATÓRIA

Implementar o aplicativo utilizando:

```text
React Native
Expo
TypeScript
TypeScript strict mode
```

A arquitetura deve ser modular e organizada por `features`.

Separar claramente:

```text
interface
regras de negócio
persistência
serviços de plataforma
estado transitório
```

Nenhuma tela deve concentrar lógica de negócio complexa.

Componentes visuais não podem acessar o banco de dados diretamente.

---

# 102. ESTRUTURA DE PASTAS

Utilizar como base:

```text
src/
│
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   │
│   ├── today/
│   ├── inbox/
│   ├── notes/
│   ├── tasks/
│   ├── calendar/
│   ├── spaces/
│   ├── search/
│   └── settings/
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── IconButton.tsx
│   │   ├── Input.tsx
│   │   ├── Sheet.tsx
│   │   ├── ListItem.tsx
│   │   └── EmptyState.tsx
│   │
│   ├── notes/
│   ├── tasks/
│   ├── reminders/
│   └── spaces/
│
├── features/
│   ├── notes/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── types.ts
│   │
│   ├── tasks/
│   ├── reminders/
│   ├── inbox/
│   ├── spaces/
│   └── search/
│
├── database/
│   ├── schema/
│   ├── migrations/
│   ├── repositories/
│   └── database.ts
│
├── stores/
│   ├── ui.store.ts
│   ├── settings.store.ts
│   └── capture.store.ts
│
├── services/
│   ├── notifications/
│   ├── files/
│   ├── audio/
│   └── backup/
│
├── design/
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   ├── radius.ts
│   └── theme.ts
│
├── hooks/
├── utils/
├── constants/
└── types/
```

Essa estrutura deve continuar escalável sem transformar o projeto em uma coleção de arquivos globais sem domínio definido.

---

# 103. RESPONSABILIDADE DAS CAMADAS

## `app/`

Responsável principalmente por:

```text
rotas
composição das telas
navegação
integração entre features
```

As rotas devem permanecer finas.

Evitar colocar nelas:

```text
queries SQL
regras complexas
transformações extensas de dados
integrações de plataforma
```

## `components/ui/`

Contém componentes visuais genéricos e reutilizáveis.

Exemplos:

```text
Button
IconButton
Input
Sheet
ListItem
EmptyState
```

Esses componentes não devem conhecer regras específicas de notas, tarefas ou outros domínios.

## `features/`

Cada domínio deve concentrar sua própria implementação.

Exemplo:

```text
features/notes/
features/tasks/
features/reminders/
features/inbox/
features/spaces/
features/search/
```

Uma feature pode conter:

```text
components
hooks
services
types
regras específicas do domínio
```

Evitar dependências circulares entre features.

## `database/`

Responsável pela persistência local utilizando SQLite.

Separar:

```text
schema
migrations
repositories
conexão/configuração do banco
```

Toda evolução estrutural do banco deve ocorrer através de migrations.

## `services/`

Responsável por integrações com capacidades da plataforma.

Exemplos:

```text
notificações
arquivos
áudio
backup
```

Esses serviços devem oferecer APIs internas simples e esconder detalhes específicos do sistema operacional ou biblioteca utilizada.

## `design/`

Centralizar os tokens definidos neste documento:

```text
cores
tipografia
espaçamento
radius
tema
```

Evitar valores visuais importantes espalhados diretamente pelas telas.

---

# 104. PERSISTÊNCIA E REPOSITORIES

SQLite é a fonte primária dos dados persistentes do aplicativo.

O fluxo deve seguir aproximadamente:

```text
Tela / Componente
      ↓
Hook / Feature
      ↓
Service ou regra de negócio
      ↓
Repository
      ↓
SQLite
```

Não permitir:

```text
Tela → SQLite diretamente

Componente visual → query SQL

UI → migration
```

Repositories devem encapsular operações como:

```text
create
findById
list
update
archive
moveToTrash
search
```

Queries específicas devem permanecer dentro da camada de persistência.

---

# 105. USO DO ZUSTAND

Zustand deve ser utilizado apenas para estado global transitório ou preferências que façam sentido fora da persistência principal.

Exemplos adequados:

```text
estado de UI
bottom sheet aberto
filtros temporários
preferências globais carregadas
estado da captura rápida enquanto está em andamento
```

Não utilizar Zustand como fonte primária de:

```text
notas
tarefas
lembretes
arquivos
espaços
itens da Inbox
```

Dados persistentes devem continuar pertencendo ao SQLite.

O estado em memória pode refletir dados do banco para facilitar a interface, mas nunca substituir a camada de persistência.

---

# 106. REGRA DE SEPARAÇÃO DE RESPONSABILIDADES

Cada parte do projeto deve possuir uma responsabilidade clara.

Regra geral:

```text
UI apresenta e recebe interação

features coordenam comportamento

services executam integrações

repositories persistem e consultam dados

SQLite mantém o estado persistente

Zustand mantém estado transitório
```

Se uma tela começar a acumular validações, consultas, transformação de dados e integração com serviços, mover essas responsabilidades para a feature correspondente.

O objetivo é permitir que cada domínio evolua sem obrigar mudanças desnecessárias no restante do aplicativo.

---

# 107. AUTENTICAÇÃO E DADOS LOCAIS

O aplicativo não possui sistema de autenticação.

Não criar:

```text
login
cadastro
recuperação de senha
perfil de conta
OAuth
sessão de usuário
troca de conta
```

Todo o conteúdo pertence ao único usuário local do dispositivo.

Não existe conceito de múltiplos usuários dentro do aplicativo.

Os recursos principais devem funcionar completamente offline e sem necessidade de conta, servidor ou conexão com a internet.

Não exibir nas Configurações:

```text
Conta
Minha conta
Perfil
Sincronização de conta
Entrar
Sair
Conectar conta
```

Persistência principal:

```text
SQLite local
```

Arquivos e anexos devem permanecer armazenados localmente de acordo com as regras de persistência do aplicativo.

Recursos como exportação e backup local podem existir, mas não devem exigir autenticação ou transformar uma conta remota em requisito para utilizar o Nexo.


---

# 108. SISTEMA DE NOTIFICAÇÕES E LEMBRETES


Implementar um sistema completo de notificações locais utilizando:

```text
expo-notifications
```

O aplicativo não possui backend e não depende de push notifications remotas.

Todos os lembretes devem funcionar localmente e offline.

A arquitetura precisa separar:

```text
Reminder
        ↓
ReminderService
        ↓
NotificationScheduler
        ↓
expo-notifications
        ↓
Sistema operacional
```

Componentes React e telas NÃO devem chamar diretamente:

```text
Notifications.scheduleNotificationAsync()
```

Toda comunicação com `expo-notifications` deve passar por uma camada dedicada.

---

## 1. ARQUITETURA

Criar aproximadamente:

```text
src/
└── services/
    └── notifications/
        ├── notification.service.ts
        ├── notification.scheduler.ts
        ├── notification.permissions.ts
        ├── notification.channels.ts
        ├── notification.actions.ts
        ├── notification.types.ts
        └── notification.utils.ts
```

E:

```text
features/
└── reminders/
    ├── reminder.service.ts
    ├── reminder.repository.ts
    ├── reminder.types.ts
    └── reminder.utils.ts
```

Responsabilidades:

```text
ReminderRepository
→ banco de dados

ReminderService
→ regras de negócio

NotificationScheduler
→ agenda/cancela notificações nativas

NotificationPermissions
→ permissões

NotificationActions
→ interação com notificações

NotificationChannels
→ canais Android
```

---

## 2. PRINCÍPIO FUNDAMENTAL

O banco de dados é a fonte da verdade.

NUNCA considerar o agendamento nativo do sistema operacional como fonte primária.

Fluxo correto:

```text
Reminder no SQLite
        ↓
NotificationScheduler
        ↓
notificação nativa
```

Portanto:

```text
SQLite = estado real

Sistema operacional = mecanismo de entrega
```

Isso permite reconstruir notificações caso necessário.

---

## 3. MODELO DE REMINDER

Estrutura mínima:

```ts
type Reminder = {
  id: string;

  title: string;
  description?: string | null;

  scheduledAt: string;

  timezone: string;

  repeatRule?: RepeatRule | null;

  enabled: boolean;

  completed: boolean;

  snoozedUntil?: string | null;

  notificationId?: string | null;

  relatedItemId?: string | null;
  relatedItemType?: 'note' | 'task' | null;

  createdAt: string;
  updatedAt: string;
};
```

---

## 4. ID DA NOTIFICAÇÃO NATIVA

Quando:

```ts
scheduleNotificationAsync()
```

retornar um identificador, armazená-lo em:

```text
notificationId
```

Exemplo:

```text
Reminder
id: reminder_123

notificationId:
native_notification_xyz
```

Esse identificador deve permitir posteriormente:

```text
cancelar
reagendar
substituir
```

a notificação correspondente.

---

## 5. CRIAÇÃO DE LEMBRETE

Fluxo:

```text
Usuário cria lembrete
        ↓
validar dados
        ↓
salvar Reminder no SQLite
        ↓
agendar notificação
        ↓
salvar notificationId
        ↓
confirmar criação
```

Exemplo:

```text
Comprar ração
22/09/2026
18:00
```

Resultado:

```text
Reminder salvo

scheduledAt:
2026-09-22T18:00:00-03:00
```

e notificação correspondente agendada.

---

## 6. ORDEM DE PERSISTÊNCIA

Evitar estados inconsistentes.

Fluxo recomendado:

```text
1. criar registro local
2. tentar agendar
3. atualizar registro com notificationId
```

Se o agendamento falhar:

```text
registro continua existindo
+
notificationStatus = error
```

A interface deve informar que o lembrete foi salvo, mas a notificação não pôde ser ativada.

Nunca apagar silenciosamente o lembrete.

---

## 7. STATUS DE NOTIFICAÇÃO

Adicionar estado:

```ts
type NotificationStatus =
  | 'not_scheduled'
  | 'scheduled'
  | 'delivered'
  | 'cancelled'
  | 'permission_denied'
  | 'error';
```

Armazenar quando necessário.

Isso permite diagnosticar problemas sem perder o lembrete.

---

## 8. EDIÇÃO DE LEMBRETE

Quando usuário alterar:

```text
data
horário
recorrência
estado enabled
```

não manter o agendamento antigo.

Fluxo:

```text
Editar reminder
       ↓
cancelar notificationId antigo
       ↓
atualizar banco
       ↓
agendar nova notificação
       ↓
salvar novo notificationId
```

Nunca deixar duas notificações para o mesmo reminder por acidente.

---

## 9. CANCELAMENTO

Se usuário desativar um lembrete:

```text
enabled = false
```

executar:

```text
cancelScheduledNotification(notificationId)
```

Depois:

```text
notificationId = null
notificationStatus = cancelled
```

O Reminder permanece no banco.

---

## 10. EXCLUSÃO

Quando um reminder for enviado para a lixeira:

```text
Reminder
 ↓
cancelar notificação
 ↓
mover para lixeira
```

Não deixar notificações futuras ligadas a itens excluídos.

---

## 11. RESTAURAÇÃO DA LIXEIRA

Se o usuário restaurar um reminder e:

```text
scheduledAt > agora
```

perguntar/reaplicar automaticamente seu agendamento de acordo com o estado anterior.

Se:

```text
scheduledAt < agora
```

não criar uma notificação retroativa sem autorização.

---

## 12. PERMISSÃO DE NOTIFICAÇÃO

NÃO solicitar permissão na primeira abertura do aplicativo.

Fluxo correto:

```text
Usuário cria primeiro lembrete
        ↓
App explica:

"Para avisar você no horário escolhido,
o Nexo precisa permitir notificações."

        ↓
Continuar
        ↓
permission prompt do sistema
```

---

## 13. PERMISSÃO NEGADA

Se usuário recusar:

o Reminder ainda deve ser criado.

Estado:

```text
permission_denied
```

Mostrar informação discreta:

```text
Notificações desativadas

Este lembrete está salvo, mas o Nexo
não poderá avisar você.

[Ativar nas configurações]
```

Nunca bloquear acesso ao restante do aplicativo.

---

## 14. NÃO REPETIR PEDIDO DE PERMISSÃO

Se o sistema informar que não pode perguntar novamente:

não abrir repetidamente o permission dialog.

Mostrar:

```text
Ativar notificações

Abra as configurações do aparelho para
permitir que o Nexo envie lembretes.

[Abrir configurações]
```

---

## 15. NOTIFICAÇÃO PADRÃO

Estrutura:

```text
Título:
Comprar ração

Descrição:
Lembrete do Nexo
```

ou, quando houver descrição:

```text
Comprar ração

Passar no mercado depois da faculdade.
```

Evitar textos como:

```text
Você possui um novo lembrete!
```

O conteúdo importante deve aparecer imediatamente.

---

## 16. DADOS INTERNOS DA NOTIFICAÇÃO

Enviar em:

```ts
content.data
```

dados suficientes para identificar o conteúdo:

```ts
{
  reminderId: '...',
  itemId: '...',
  itemType: 'reminder'
}
```

Nunca armazenar grandes objetos inteiros dentro da notificação.

Usar IDs.

---

## 17. TOCAR NA NOTIFICAÇÃO

Ao tocar:

```text
notificação
    ↓
abrir Nexo
    ↓
resolver reminderId
    ↓
abrir detalhe do lembrete
```

Não abrir simplesmente a Home.

Utilizar deep linking compatível com Expo Router.

Exemplo conceitual:

```text
nexo://reminder/reminder_123
```

---

## 18. AÇÕES NA NOTIFICAÇÃO

Quando suportado, fornecer ações rápidas.

Para reminders simples:

```text
[Concluir]
[Adiar]
```

Ao tocar:

```text
Concluir
```

executar:

```text
completed = true
```

e atualizar o estado correspondente.

---

## 19. SNOOZE / ADIAR

Ao selecionar:

```text
Adiar
```

permitir opções:

```text
10 minutos
30 minutos
1 hora
Amanhã
Escolher horário
```

Não alterar necessariamente a data original do Reminder.

Utilizar:

```text
snoozedUntil
```

---

## 20. EXEMPLO DE SNOOZE

Reminder original:

```text
Comprar ração
18:00
```

Usuário toca:

```text
Adiar 30 minutos
```

Estado:

```text
scheduledAt:
18:00

snoozedUntil:
18:30
```

Nova notificação:

```text
18:30
```

Assim é possível saber que:

```text
18:00 = horário originalmente planejado
18:30 = adiamento temporário
```

---

## 21. SNOOZE NOVAMENTE

Permitir múltiplos snoozes.

Sempre:

```text
cancelar agendamento anterior de snooze
        ↓
criar novo
        ↓
atualizar snoozedUntil
```

Nunca acumular notificações duplicadas.

---

## 22. CONCLUIR REMINDER

Quando usuário concluir:

```text
completed = true
```

Cancelar qualquer:

```text
notificação futura
snooze pendente
```

Se não for recorrente:

```text
finalizar
```

Se for recorrente:

processar próxima ocorrência.

---

## 23. RECORRÊNCIA

Suportar:

```text
Nunca

Diariamente

Semanalmente

Mensalmente

Anualmente

Personalizado
```

---

## 24. MODELO DE REPEAT RULE

Não armazenar recorrência somente como texto.

Exemplo:

```ts
type RepeatRule =
  | {
      type: 'daily';
      interval: number;
    }
  | {
      type: 'weekly';
      interval: number;
      daysOfWeek: number[];
    }
  | {
      type: 'monthly';
      interval: number;
      dayOfMonth: number;
    }
  | {
      type: 'yearly';
      interval: number;
      month: number;
      day: number;
    };
```

Isso precisa ser serializável em JSON.

---

## 25. EXEMPLO — DIÁRIO

```text
Todos os dias
às 08:00
```

Representação:

```ts
{
  type: 'daily',
  interval: 1
}
```

---

## 26. EXEMPLO — DIAS ESPECÍFICOS

```text
Segunda
Quarta
Sexta
às 19:00
```

Representação conceitual:

```ts
{
  type: 'weekly',
  interval: 1,
  daysOfWeek: [1, 3, 5]
}
```

---

## 27. PRÓXIMA OCORRÊNCIA

Criar uma função central:

```ts
calculateNextOccurrence()
```

Ela deve receber:

```text
data atual
scheduledAt
repeatRule
timezone
```

e retornar:

```text
próxima data válida
```

NÃO espalhar cálculo de recorrência pelas telas.

---

## 28. RECORRÊNCIA E CONCLUSÃO

Exemplo:

```text
Tomar vitamina
todos os dias
08:00
```

Usuário conclui a ocorrência de hoje.

Não finalizar permanentemente o reminder.

Calcular:

```text
amanhã 08:00
```

e agendar próxima ocorrência.

---

## 29. NÃO CRIAR INFINITAS NOTIFICAÇÕES

Não gerar antecipadamente:

```text
365
1000
5000
```

notificações futuras.

Preferir:

```text
regra nativa de repetição
```

quando adequada,

ou:

```text
agendar próxima ocorrência
→ quando processada
→ calcular seguinte
```

dependendo da complexidade da recorrência.

---

## 30. TIMEZONE

Todo reminder deve saber em qual timezone foi criado.

Exemplo:

```text
America/Sao_Paulo
```

Não trabalhar somente com:

```text
18:00
```

sem contexto temporal.

---

## 31. DATAS NO BANCO

Persistir timestamps de forma consistente.

Separar:

```text
instante absoluto
+
timezone relevante
```

Não depender do locale da interface para armazenar datas.

A interface pode mostrar:

```text
22 de setembro
18:00
```

mas o banco deve usar formato técnico consistente.

---

## 32. TROCA DE TIMEZONE

Se o usuário viajar para outro fuso:

definir comportamento consistente.

Para lembretes comuns do Nexo, utilizar por padrão:

```text
wall-clock local
```

quando a intenção for:

```text
"Lembrar às 08:00"
```

Ou seja, preservar o significado humano da regra.

Exemplo:

```text
Tomar medicamento às 08:00
```

continua visualmente às 08:00 local quando essa for a regra escolhida.

Arquitetura deve permitir futuramente lembretes vinculados a instante absoluto.

---

## 33. REINICIALIZAÇÃO DO APARELHO

Após reboot:

as notificações futuras devem continuar funcionando.

Além do suporte nativo da biblioteca, implementar uma rotina de reconciliação.

Quando o app iniciar:

```text
SQLite
 ↓
buscar reminders ativos futuros
 ↓
consultar notificações atualmente agendadas
 ↓
comparar
 ↓
corrigir inconsistências
```

---

## 34. RECONCILIAÇÃO

Criar:

```ts
reconcileScheduledNotifications()
```

Ela deve:

```text
1. buscar reminders ativos
2. obter notificações nativas agendadas
3. comparar IDs
4. detectar ausências
5. reagendar o que estiver faltando
6. cancelar notificações órfãs pertencentes ao app
```

Isso fornece uma segunda camada de segurança.

---

## 35. QUANDO EXECUTAR RECONCILIAÇÃO

Executar, com controle para não repetir excessivamente:

```text
inicialização do aplicativo

retorno relevante ao foreground

após restauração de backup

após migration que afete reminders
```

Não executar consultas pesadas em cada renderização.

---

## 36. NOTIFICAÇÃO ÓRFÃ

Pode ocorrer:

```text
notificação existe no OS

mas reminder não existe mais no banco
```

Se for identificada como pertencente ao Nexo:

```text
cancelar
```

---

## 37. REMINDER SEM NOTIFICAÇÃO

Pode ocorrer:

```text
Reminder ativo no SQLite

mas notificationId não existe
```

Se:

```text
data futura
+
permissão disponível
```

reagendar.

---

## 38. REMINDER ATRASADO

Exemplo:

```text
horário programado:
14:00

app verifica:
16:00
```

Não gerar automaticamente uma notificação barulhenta às 16:00 como se ainda fossem 14:00.

Marcar:

```text
overdue
```

e mostrar dentro do aplicativo.

Para recorrentes:

calcular a próxima ocorrência futura válida.

---

## 39. CANAIS ANDROID

Criar canais previsíveis.

Exemplo:

```text
reminders
```

Nome:

```text
Lembretes
```

Descrição:

```text
Avisos de lembretes e tarefas programadas.
```

Importância adequada para lembretes.

Evitar criar dezenas de channels dinamicamente.

---

## 40. SOM

Configuração padrão:

```text
som do sistema
```

Permitir futuramente configuração:

```text
Som
Vibração
Silencioso
```

Não adicionar vários sons personalizados no MVP.

---

## 41. EXACT ALARM — ANDROID

Para lembretes com horário específico, preparar configuração Android adequada para alarmes exatos quando necessário.

Exemplo:

```text
18:00
```

deve buscar disparar próximo do horário solicitado.

Entretanto:

não utilizar mecanismos de "alarm clock" extremamente intrusivos para lembretes normais.

Separar conceitualmente:

```text
reminder normal
→ entrega apropriada/best effort

alarme crítico futuro
→ comportamento específico
```

O Nexo é um organizador pessoal, não um despertador crítico.

---

## 42. CONFIGURAÇÕES DE NOTIFICAÇÃO

Tela:

```text
Configurações
 ↓
Notificações
```

Exibir:

```text
Notificações
[ativadas pelo sistema]

Som
[ligado]

Vibração
[ligada]

Mostrar tarefas
[ligado]

Mostrar lembretes
[ligado]
```

Mas não criar opções sem função.

Toda preferência visível precisa efetivamente alterar comportamento.

---

## 43. NOTIFICAÇÕES PARA TAREFAS

Uma tarefa pode existir sem notificação.

Exemplo:

```text
Comprar SSD
Amanhã
```

não significa obrigatoriamente:

```text
notificar
```

Separar:

```text
dueDate
```

de:

```text
reminderAt
```

---

## 44. EXEMPLO

Tarefa:

```text
Entregar trabalho

Vencimento:
sexta 23:59

Lembrete:
sexta 20:00
```

Esses são dois conceitos diferentes.

---

## 45. TAREFA COM REMINDER

Estrutura conceitual:

```text
Task
 ↓
Reminder relacionado
 ↓
Notification
```

Não colocar toda lógica de notifications diretamente dentro de Task.

---

## 46. VÁRIOS LEMBRETES PARA UMA TAREFA

Arquitetura de dados deve possibilitar futuramente:

```text
1 dia antes
1 hora antes
no horário
```

Mesmo que o MVP inicialmente permita apenas um reminder por tarefa.

Não criar schema que torne essa expansão impossível.

---

## 47. FOREGROUND

Se uma notificação acontecer enquanto o usuário estiver com o aplicativo aberto:

definir comportamento.

Mostrar:

```text
banner do sistema
```

ou feedback interno equivalente,

sem abrir automaticamente outra tela.

Nunca interromper abruptamente o usuário.

---

## 48. APP FECHADO

Se o aplicativo estiver fechado:

a notificação local deve continuar dependendo do agendamento do sistema, não de JavaScript rodando permanentemente.

Não criar polling/background loop para verificar horário a cada minuto.

---

## 49. NÃO USAR SETTIMEOUT

É proibido implementar lembretes usando:

```ts
setTimeout()
setInterval()
```

como mecanismo principal.

Eles não são confiáveis quando:

```text
app fecha
app entra em background
aparelho reinicia
sistema mata processo
```

Sempre utilizar mecanismo nativo de notificações.

---

## 50. NÃO CRIAR LOOP DE BACKGROUND

Não criar serviço JavaScript permanente que:

```text
acorda
consulta banco
verifica data
```

a cada minuto.

Isso desperdiça bateria e não é necessário.

---

## 51. ATUALIZAÇÃO DE DATA

Se usuário editar:

```text
22/09 18:00
```

para:

```text
22/09 20:00
```

fluxo obrigatório:

```text
cancelar 18:00

persistir 20:00

agendar 20:00

salvar novo notificationId
```

---

## 52. DESATIVAR RECORRÊNCIA

Se:

```text
repeatRule != null
```

for alterado para:

```text
repeatRule = null
```

cancelar o mecanismo recorrente anterior e reagendar somente a ocorrência válida atual/futura.

---

## 53. ALTERAÇÃO DE REGRA RECORRENTE

Exemplo:

```text
Seg Qua Sex
```

vira:

```text
Ter Qui
```

Não tentar modificar parcialmente notificações antigas.

Fluxo:

```text
cancelar agenda antiga
 ↓
atualizar regra
 ↓
calcular próxima ocorrência
 ↓
agendar novamente
```

---

## 54. VALIDAÇÃO

Não permitir criar:

```text
lembrete único no passado
```

sem aviso.

Se horário selecionado já passou:

mostrar:

```text
Esse horário já passou.

[Escolher outro horário]
```

---

## 55. CRIAÇÃO MUITO PRÓXIMA

Se usuário criar:

```text
Agora + poucos segundos
```

o sistema deve lidar normalmente.

Não assumir que sempre haverá minutos de antecedência.

---

## 56. DUPLICIDADE

Criar mecanismos para evitar:

```text
mesmo reminder
+
duas notificações nativas
```

por consequência de:

```text
double tap
re-render
retry
reconciliação
```

Operações de scheduler devem ser idempotentes sempre que possível.

---

## 57. LOCK DE OPERAÇÃO

Durante:

```text
Criar lembrete
```

desabilitar temporariamente o CTA enquanto a operação principal estiver sendo processada.

Não permitir:

```text
tap
tap
tap
```

gerando registros duplicados.

---

## 58. DEBOUNCE NÃO É GARANTIA DE INTEGRIDADE

A proteção principal contra duplicidade deve existir também na camada de domínio/banco.

Não depender exclusivamente da UI.

---

## 59. LOGS

Registrar logs técnicos para desenvolvimento:

```text
reminder_created
notification_scheduled
notification_cancelled
notification_rescheduled
notification_permission_denied
notification_schedule_failed
notification_reconciled
```

Não registrar conteúdo privado da nota desnecessariamente.

Preferir IDs.

---

## 60. ERRO AO AGENDAR

Se:

```text
Reminder salvo
```

mas:

```text
scheduleNotificationAsync falhar
```

não desfazer automaticamente os dados pessoais do usuário.

Mostrar:

```text
Lembrete salvo

Não foi possível ativar a notificação.

[Tentar novamente]
```

---

## 61. RETRY

`Tentar novamente` deve chamar:

```text
NotificationScheduler.schedule(reminder)
```

sem criar outro Reminder.

---

## 62. TESTE DE NOTIFICAÇÃO

Nas configurações, opcionalmente disponibilizar:

```text
Enviar notificação de teste
```

útil para verificar:

```text
permissão
som
canal
funcionamento
```

Não precisa fazer parte da navegação principal.

---

## 63. BACKUP

Não salvar `notificationId` como se fosse permanentemente válido após restauração em outro aparelho.

Ao restaurar backup:

```text
importar reminders

limpar notificationIds antigos

recalcular notificações

reagendar no novo dispositivo
```

---

## 64. MIGRATIONS

Mudanças futuras no schema de recorrência não podem apagar reminders existentes.

Implementar migrations versionadas.

---

## 65. DEEP LINK SE ITEM NÃO EXISTIR

Se usuário tocar numa notificação cujo item já foi removido:

não causar erro.

Abrir:

```text
Home / Hoje
```

e descartar navegação inválida.

---

## 66. RELAÇÃO COM HOME/HOJE

Reminder ativo deve aparecer na tela Hoje quando:

```text
scheduledAt ocorre hoje
```

ou estiver atrasado conforme regra do produto.

Isso independe de a notificação estar ou não autorizada.

---

## 67. REGRA FUNDAMENTAL

Lembrete e notificação não são a mesma coisa.

```text
Reminder
=
dado do usuário

Notification
=
forma de avisá-lo
```

Portanto:

um problema com a notificação jamais deve causar perda do Reminder.

---

## 68. SERVIÇO ESPERADO

Criar interface aproximadamente equivalente a:

```ts
interface NotificationScheduler {
  schedule(reminder: Reminder): Promise<string>;

  cancel(notificationId: string): Promise<void>;

  reschedule(reminder: Reminder): Promise<string>;

  snooze(
    reminder: Reminder,
    until: Date
  ): Promise<string>;

  getScheduled(): Promise<ScheduledNotification[]>;

  reconcile(): Promise<void>;
}
```

A implementação concreta utiliza:

```text
expo-notifications
```

---

## 69. REMINDER SERVICE

Exemplo conceitual:

```ts
interface ReminderService {
  create(input: CreateReminderInput): Promise<Reminder>;

  update(
    id: string,
    input: UpdateReminderInput
  ): Promise<Reminder>;

  remove(id: string): Promise<void>;

  complete(id: string): Promise<void>;

  snooze(
    id: string,
    until: Date
  ): Promise<void>;

  enable(id: string): Promise<void>;

  disable(id: string): Promise<void>;
}
```

---

## 70. RESPONSABILIDADES

Não misturar:

```text
UI
banco
regra de recorrência
expo-notifications
```

Exemplo correto:

```text
Screen
 ↓
useReminder()
 ↓
ReminderService
 ├── ReminderRepository
 └── NotificationScheduler
```

---

## 71. UX FINAL

Criar lembrete precisa continuar simples.

Interface inicial:

```text
Novo lembrete

Título

Quando?
Hoje

Horário
18:00

Repetir
Nunca


[Criar lembrete]
```

Recursos avançados não podem transformar esse fluxo em formulário complexo.

---

## 72. REGRA DE CONFIABILIDADE

O sistema deve assumir que podem acontecer:

```text
reboot
app encerrado
permissão revogada
mudança de horário
mudança de timezone
edição de reminder
restauração de backup
falha de scheduler
notificação órfã
agendamento perdido
```

e possuir comportamento definido para cada situação.

Não construir o sistema apenas para o cenário:

```text
app aberto
+
usuário nunca altera nada
```

---

## 73. RESULTADO ESPERADO

O usuário deve poder:

```text
criar
editar
cancelar
concluir
repetir
adiar
restaurar
```

um lembrete sem precisar compreender como notificações funcionam.

A complexidade pertence à arquitetura.

A experiência final deve continuar:

```text
Título
Data
Hora
Criar
```

simples, previsível e confiável.


---

# 109. BANCO DE DADOS DEFINITIVO


Utilizar:

```text
Expo SQLite
+
Drizzle ORM
+
TypeScript
```

O banco local é a fonte primária de dados do aplicativo.

Não utilizar Zustand como banco persistente.

Estrutura conceitual:

```text
SQLite
├── notes
├── tasks
├── reminders
├── spaces
├── tags
├── item_tags
├── attachments
├── inbox_items
├── settings
└── trash_metadata
```

---

## 1. TABELA SPACES

```ts
type Space = {
  id: string;
  name: string;
  icon?: string | null;

  createdAt: string;
  updatedAt: string;

  archivedAt?: string | null;
  deletedAt?: string | null;
};
```

Regras:

```text
nome obrigatório
id UUID
sem pastas aninhadas no MVP
```

Índices:

```text
name
createdAt
deletedAt
```

---

## 2. TABELA NOTES

```ts
type Note = {
  id: string;

  title?: string | null;
  content: string;

  contentFormat: 'blocks-v1';

  spaceId?: string | null;

  pinned: boolean;
  archivedAt?: string | null;
  deletedAt?: string | null;

  createdAt: string;
  updatedAt: string;
};
```

`content` deve armazenar JSON serializado.

Não armazenar HTML como formato principal.

---

## 3. TABELA TASKS

```ts
type Task = {
  id: string;

  title: string;
  description?: string | null;

  dueAt?: string | null;
  timezone?: string | null;

  priority:
    | 'none'
    | 'low'
    | 'medium'
    | 'high';

  completedAt?: string | null;

  repeatRule?: string | null;

  parentSeriesId?: string | null;

  spaceId?: string | null;

  relatedNoteId?: string | null;

  createdAt: string;
  updatedAt: string;

  archivedAt?: string | null;
  deletedAt?: string | null;
};
```

---

## 4. TABELA REMINDERS

Utilizar o modelo definido anteriormente.

Acrescentar:

```ts
type Reminder = {
  id: string;

  title: string;
  description?: string | null;

  scheduledAt: string;
  timezone: string;

  repeatRule?: string | null;

  enabled: boolean;
  completedAt?: string | null;

  snoozedUntil?: string | null;

  notificationId?: string | null;

  notificationStatus:
    | 'not_scheduled'
    | 'scheduled'
    | 'delivered'
    | 'cancelled'
    | 'permission_denied'
    | 'error';

  relatedItemId?: string | null;
  relatedItemType?: 'note' | 'task' | null;

  createdAt: string;
  updatedAt: string;

  deletedAt?: string | null;
};
```

---

## 5. TABELA TAGS

```ts
type Tag = {
  id: string;

  name: string;

  createdAt: string;
  updatedAt: string;
};
```

Nome deve ser único ignorando maiúsculas/minúsculas.

Exemplo:

```text
Backend
backend
BACKEND
```

devem ser interpretados como mesma tag.

---

## 6. TABELA ITEM_TAGS

Tabela de relacionamento.

```ts
type ItemTag = {
  id: string;

  itemId: string;

  itemType:
    | 'note'
    | 'task'
    | 'reminder';

  tagId: string;
};
```

Criar constraint evitando duplicação:

```text
itemId + itemType + tagId
```

---

## 7. TABELA ATTACHMENTS

```ts
type Attachment = {
  id: string;

  itemId: string;

  itemType:
    | 'note'
    | 'task';

  type:
    | 'image'
    | 'audio'
    | 'file';

  originalName?: string | null;

  localPath: string;

  mimeType?: string | null;

  sizeBytes?: number | null;

  thumbnailPath?: string | null;

  durationMs?: number | null;

  createdAt: string;

  deletedAt?: string | null;
};
```

---

## 8. TABELA INBOX_ITEMS

Não duplicar conteúdo completo desnecessariamente.

Inbox funciona como estado de organização.

```ts
type InboxItem = {
  id: string;

  itemId: string;

  itemType:
    | 'quick_capture'
    | 'note'
    | 'task'
    | 'file'
    | 'image'
    | 'audio';

  rawText?: string | null;

  createdAt: string;

  organizedAt?: string | null;
  deletedAt?: string | null;
};
```

---

## 9. TABELA SETTINGS

Utilizar modelo chave/valor tipado.

```ts
type Setting = {
  key: string;
  value: string;
  updatedAt: string;
};
```

Exemplos:

```text
theme
week_start
time_format
notifications_enabled
sound_enabled
vibration_enabled
onboarding_completed
```

---

## 10. IDS

Utilizar UUID.

Nunca utilizar:

```text
array index
timestamp puro
incremento improvisado
```

como identificador de domínio.

---

## 11. FOREIGN KEYS

Ativar foreign keys no SQLite.

Definir comportamento explícito.

Exemplo:

```text
space removido
→ item NÃO deve ser apagado
→ spaceId = null
```

Nota excluída:

```text
tarefa relacionada
→ relatedNoteId = null
```

Attachment pertencente a item excluído definitivamente:

```text
→ remover attachment
→ remover arquivo físico
```

---

## 12. MIGRATIONS

Toda alteração do banco deve possuir migration.

Estrutura:

```text
database/
└── migrations/
    ├── 0001_initial.ts
    ├── 0002_add_reminders.ts
    └── ...
```

É proibido:

```text
apagar banco para atualizar schema
```

em produção.

As migrations devem preservar os dados existentes.

---

## EDITOR DE NOTAS

Utilizar um formato próprio simples de blocos.

Não tentar recriar o Notion inteiro.

Modelo:

```ts
type NoteBlock =
  | TextBlock
  | HeadingBlock
  | ChecklistBlock
  | BulletListBlock
  | ImageBlock
  | FileBlock
  | AudioBlock
  | LinkBlock;
```

---

## 13. TEXT BLOCK

```ts
type TextBlock = {
  id: string;
  type: 'text';
  text: string;
};
```

---

## 14. HEADING

```ts
type HeadingBlock = {
  id: string;
  type: 'heading';

  level: 1 | 2 | 3;

  text: string;
};
```

---

## 15. CHECKLIST

```ts
type ChecklistBlock = {
  id: string;
  type: 'checklist';

  items: {
    id: string;
    text: string;
    checked: boolean;
  }[];
};
```

---

## 16. BULLET LIST

```ts
type BulletListBlock = {
  id: string;
  type: 'bullet-list';

  items: {
    id: string;
    text: string;
  }[];
};
```

---

## 17. IMAGE BLOCK

```ts
type ImageBlock = {
  id: string;
  type: 'image';

  attachmentId: string;

  caption?: string;
};
```

Não guardar imagem em base64 dentro da nota.

---

## 18. FILE BLOCK

```ts
type FileBlock = {
  id: string;
  type: 'file';

  attachmentId: string;
};
```

---

## 19. AUDIO BLOCK

```ts
type AudioBlock = {
  id: string;
  type: 'audio';

  attachmentId: string;
};
```

---

## 20. LINK BLOCK

```ts
type LinkBlock = {
  id: string;
  type: 'link';

  url: string;

  label?: string;
};
```

---

## 21. FORMATO SALVO

Exemplo:

```json
{
  "version": 1,
  "blocks": [
    {
      "id": "block-1",
      "type": "heading",
      "level": 1,
      "text": "HTTP"
    },
    {
      "id": "block-2",
      "type": "text",
      "text": "HTTP é..."
    }
  ]
}
```

Salvar esse objeto como JSON serializado em:

```text
notes.content
```

---

## 22. AUTOSAVE

Implementar autosave.

Regras:

```text
alteração
→ aguardar pequeno debounce
→ persistir
```

Debounce aproximado:

```text
500–1000ms
```

Também salvar quando:

```text
usuário sair da tela
app for para background
editor perder contexto
```

Nunca depender apenas do botão Salvar.

---

## 23. UNDO / REDO

Manter histórico somente durante sessão de edição.

Não persistir toda pilha de undo no SQLite.

---

## 24. DRAFT

Se nota ainda não possuir conteúdo significativo:

pode permanecer como draft temporário.

Não criar dezenas de notas vazias quando usuário abre e fecha editor.

---

## BUSCA LOCAL

Criar serviço independente:

```text
SearchService
```

A busca deve pesquisar:

```text
notes.title
notes.content
tasks.title
tasks.description
reminders.title
tags.name
spaces.name
attachments.originalName
```

---

## 25. NORMALIZAÇÃO

Busca deve ignorar:

```text
maiúsculas/minúsculas
acentos
```

Exemplo:

```text
programacao
```

deve encontrar:

```text
Programação
```

Criar função:

```ts
normalizeSearchText()
```

---

## 26. TOKENIZAÇÃO

Uma busca:

```text
prova backend
```

deve procurar termos:

```text
prova
backend
```

e priorizar itens contendo ambos.

---

## 27. ORDENAÇÃO DA BUSCA

Priorizar aproximadamente:

```text
1. título exato
2. título contendo termo
3. tags
4. conteúdo
5. itens mais recentes
```

---

## 28. FILTROS

Permitir:

```text
Todos
Notas
Tarefas
Lembretes
Arquivos
```

Também preparar suporte para:

```text
Espaço
Tag
Data
```

---

## 29. PERFORMANCE DA BUSCA

Não executar busca a cada caractere sem controle.

Utilizar debounce aproximado:

```text
200–300ms
```

Para bases pequenas:

usar SQLite normalmente.

Para crescimento:

preparar arquitetura compatível com:

```text
SQLite FTS5
```

Não exigir FTS no primeiro MVP se não houver necessidade real.

---

## BACKUP E RESTAURAÇÃO

Como o app é local-first, backup é obrigatório.

O usuário deve conseguir exportar um pacote completo.

Formato:

```text
nexo-backup-YYYY-MM-DD.zip
```

Conteúdo:

```text
backup.json
attachments/
```

---

## 30. BACKUP.JSON

Estrutura:

```json
{
  "version": 1,
  "createdAt": "...",
  "appVersion": "...",
  "data": {
    "spaces": [],
    "notes": [],
    "tasks": [],
    "reminders": [],
    "tags": [],
    "itemTags": [],
    "attachments": [],
    "settings": {}
  }
}
```

---

## 31. ARQUIVOS DO BACKUP

Estrutura:

```text
attachments/
├── images/
├── audio/
└── files/
```

Nunca guardar paths absolutos do aparelho como caminho permanente no backup.

Utilizar paths relativos.

---

## 32. RESTAURAÇÃO

Fluxo:

```text
Selecionar backup
 ↓
Validar arquivo
 ↓
Validar versão
 ↓
Mostrar resumo
 ↓
Confirmar
 ↓
Criar snapshot local de segurança
 ↓
Importar dados
 ↓
Copiar anexos
 ↓
Executar migrations necessárias
 ↓
Reconstruir notificações
```

---

## 33. BACKUP INVÁLIDO

Se pacote estiver:

```text
corrompido
incompleto
versão incompatível
```

não sobrescrever banco atual.

Mostrar erro e manter dados existentes intactos.

---

## 34. CONFLITO NA RESTAURAÇÃO

No MVP utilizar:

```text
restauração completa
```

em vez de tentar merge complexo.

Opções:

```text
Substituir dados atuais
Cancelar
```

Antes de substituir:

criar backup automático local de segurança.

---

## ARQUIVOS E MÍDIA

Criar estrutura interna controlada pelo aplicativo.

Exemplo:

```text
NexoData/
├── images/
├── thumbnails/
├── audio/
├── files/
├── exports/
└── temp/
```

---

## 35. NOMES FÍSICOS

Nunca confiar no nome original como nome real de armazenamento.

Utilizar:

```text
UUID.ext
```

Exemplo:

```text
4bdc...9a2.jpg
```

Guardar nome original apenas como metadata.

---

## 36. IMAGENS

Ao importar imagem:

```text
copiar para armazenamento interno
gerar thumbnail
salvar metadata
```

Não depender do path externo da galeria.

---

## 37. THUMBNAILS

Gerar versões menores para listas.

Não carregar imagem original 4K em cada item de lista.

---

## 38. ÁUDIO

Salvar:

```text
arquivo local
durationMs
mimeType
sizeBytes
```

Preparar campo futuro para:

```text
transcription
```

sem exigir transcrição no MVP.

---

## 39. ARQUIVOS TEMPORÁRIOS

Tudo dentro de:

```text
temp/
```

deve poder ser limpo sem destruir dados do usuário.

---

## 40. LIMPEZA DE ÓRFÃOS

Criar rotina:

```text
cleanupOrphanFiles()
```

Ela compara:

```text
attachments no banco
vs
arquivos físicos
```

e identifica órfãos.

Não executar exclusão perigosa automaticamente sem validação.

---

## 41. LIMITE DE ARQUIVO

Definir limite inicial razoável.

Exemplo:

```text
100 MB por arquivo
```

Se ultrapassar:

mostrar mensagem antes da cópia.

---

## LIXEIRA E ARQUIVAMENTO

Arquivar e excluir são ações diferentes.

---

## 42. ARQUIVAR

Arquivar:

```text
archivedAt = timestamp
```

O item:

```text
continua existindo
não aparece nas listas principais
pode ser restaurado
```

---

## 43. EXCLUIR

Excluir normalmente:

```text
deletedAt = timestamp
```

Isso move para:

```text
Lixeira
```

Não excluir fisicamente naquele momento.

---

## 44. RETENÇÃO

Manter itens na lixeira por:

```text
30 dias
```

Após isso:

podem ser excluídos definitivamente.

Antes da exclusão definitiva:

remover também anexos físicos relacionados.

---

## 45. RESTAURAR

Ao restaurar:

```text
deletedAt = null
```

Se item pertencia a um Space inexistente:

```text
spaceId = null
```

---

## 46. ESVAZIAR LIXEIRA

Ação:

```text
Esvaziar lixeira
```

deve exigir confirmação.

Essa é uma ação destrutiva irreversível.

---

## INBOX

A Inbox representa conteúdo ainda não organizado.

---

## 47. ENTRA NA INBOX QUANDO

Entram automaticamente:

```text
quick capture
nota criada sem espaço via captura rápida
imagem capturada rapidamente
áudio rápido
arquivo rápido
```

---

## 48. NÃO ENTRA NA INBOX QUANDO

Não entra se criado explicitamente dentro de:

```text
Space
Tarefas
Notas
Calendário
```

com contexto já definido.

---

## 49. ORGANIZAR ITEM

Ações possíveis:

```text
Transformar em nota
Transformar em tarefa
Criar lembrete
Mover para espaço
Adicionar tags
Arquivar
Excluir
```

---

## 50. SAÍDA DA INBOX

Quando usuário organizar:

```text
organizedAt = timestamp
```

O conteúdo permanece no app.

A Inbox apenas deixa de exibi-lo.

---

## TAREFAS RECORRENTES

Utilizar função central:

```ts
calculateNextTaskOccurrence()
```

---

## 51. REGRA DE CONCLUSÃO

Tarefa normal:

```text
Concluir
→ completedAt = now
```

Tarefa recorrente:

```text
Concluir ocorrência
→ marcar ocorrência atual concluída
→ calcular próxima
→ gerar/agendar próxima ocorrência
```

---

## 52. NÃO ALTERAR DATA ORIGINAL

Não simplesmente mover a mesma tarefa para amanhã apagando o histórico.

Manter referência da série:

```text
parentSeriesId
```

---

## 53. EDITAR TAREFA RECORRENTE

Ao editar:

```text
Editar esta ocorrência
Editar esta e próximas
```

No MVP, pode simplificar para:

```text
Editar série
```

se edição individual aumentar muito a complexidade.

Mas deixar arquitetura preparada.

---

## 54. TAREFA ATRASADA

Se:

```text
dueAt < agora
completedAt = null
```

estado:

```text
overdue
```

Não alterar automaticamente data.

Mostrar na seção:

```text
Atrasadas
```

---

## 55. RECORRENTE ATRASADA

Não gerar dezenas de tarefas acumuladas automaticamente.

Exemplo:

usuário ficou 30 dias sem abrir app.

Uma tarefa diária não deve criar necessariamente 30 ocorrências visíveis.

Regra padrão:

```text
preservar ocorrência pendente atual
+
calcular próxima futura quando processada
```

---

## CALENDÁRIO

Calendário é uma visualização dos dados existentes.

Não criar cópias dos itens.

---

## 56. ITENS DO CALENDÁRIO

Mostrar:

```text
tasks com dueAt
reminders com scheduledAt
```

Preparar tipo futuro:

```text
events
```

sem exigir no MVP.

---

## 57. SEMANA

Configuração:

```text
Domingo
Segunda-feira
```

Padrão pode utilizar locale do aparelho.

Usuário pode alterar.

---

## 58. TIMEZONE

Utilizar timezone local do dispositivo como padrão.

Persistir timezone quando necessário.

Não fazer cálculos de datas usando apenas strings visuais.

---

## 59. ALL DAY

Tarefa pode possuir:

```text
data sem horário
```

Representar explicitamente:

```text
allDay = true
```

ou estrutura equivalente.

Não inventar:

```text
00:00
```

como se fosse horário real escolhido pelo usuário.

---

## 60. TELA MENSAL

Calendário mensal:

```text
não carregar todos os dados históricos
```

Consultar somente intervalo necessário:

```text
mês atual
+
pequena margem anterior/posterior
```

---

## TEMA CLARO / ESCURO

Suportar:

```ts
type ThemePreference =
  | 'system'
  | 'light'
  | 'dark';
```

Padrão:

```text
system
```

---

## 61. TOKENS

Todos os componentes devem consumir:

```text
theme.colors
theme.spacing
theme.radius
theme.typography
```

Proibido:

```text
'#ffffff'
'#000000'
```

espalhados em componentes.

---

## 62. LIGHT

Utilizar paleta definida anteriormente.

---

## 63. DARK

Base:

```text
background: #111214
surface: #191B1E
surfaceSecondary: #202226
textPrimary: #F5F5F6
textSecondary: #A7ABB2
divider: #2A2D31
```

---

## 64. SYSTEM

Observar configuração do sistema operacional.

Se usuário mudar tema com app aberto:

interface deve atualizar sem reiniciar.

---

## CONFIGURAÇÕES

Não criar opções falsas.

Tela deve conter apenas recursos implementados.

Estrutura inicial:

```text
Aparência
Notificações
Calendário
Dados e backup
Armazenamento
Privacidade
Sobre
```

---

## 65. APARÊNCIA

```text
Tema
→ Sistema
→ Claro
→ Escuro
```

---

## 66. NOTIFICAÇÕES

```text
Status da permissão
Som
Vibração
Teste de notificação
```

---

## 67. CALENDÁRIO

```text
Primeiro dia da semana
Formato de hora
```

Formato:

```text
24h
12h
Sistema
```

---

## 68. DADOS E BACKUP

```text
Criar backup
Restaurar backup
Exportar dados
```

---

## 69. ARMAZENAMENTO

Mostrar:

```text
Imagens
Áudios
Arquivos
Cache
Total
```

Permitir:

```text
Limpar cache
```

Nunca apagar anexos reais ao limpar cache.

---

## PERFORMANCE

O app deve permanecer rápido com milhares de itens.

---

## 70. LISTAS

Utilizar:

```text
FlatList
```

ou solução equivalente virtualizada.

Não renderizar listas extensas com:

```text
.map()
```

dentro de ScrollView.

---

## 71. PAGINAÇÃO

Consultas grandes:

```text
limit
offset/cursor
```

Exemplo inicial:

```text
50 itens
```

Carregar mais ao aproximar do final.

---

## 72. SELECT

Evitar:

```text
SELECT *
```

quando a tela precisa apenas de:

```text
id
title
updatedAt
```

---

## 73. ÍNDICES

Criar índices especialmente para:

```text
updatedAt
createdAt
spaceId
dueAt
scheduledAt
deletedAt
archivedAt
```

---

## 74. N+1

Evitar consultas repetidas por item.

Buscar relacionamentos em lote quando necessário.

---

## 75. IMAGENS

Listas utilizam thumbnail.

Imagem original somente quando aberta.

---

## 76. MEMOIZATION

Não usar:

```text
useMemo
useCallback
React.memo
```

em tudo automaticamente.

Usar quando houver benefício medido ou justificável.

---

## TRATAMENTO DE ERROS

Criar erros tipados.

Exemplo:

```ts
type AppErrorCode =
  | 'DATABASE_ERROR'
  | 'FILE_NOT_FOUND'
  | 'STORAGE_FULL'
  | 'PERMISSION_DENIED'
  | 'INVALID_BACKUP'
  | 'NOTIFICATION_ERROR'
  | 'UNKNOWN';
```

---

## 77. BANCO CORROMPIDO

Nunca resetar automaticamente.

Fluxo:

```text
detectar falha
 ↓
tentar recuperação segura
 ↓
oferecer exportação/backup quando possível
 ↓
informar usuário
```

Não apagar dados silenciosamente.

---

## 78. ARMAZENAMENTO CHEIO

Antes de copiar arquivo grande:

verificar erros retornados pelo sistema.

Se falhar:

```text
Não foi possível salvar o arquivo.

O armazenamento do dispositivo pode estar cheio.
```

Remover arquivo temporário parcial.

---

## 79. ARQUIVO AUSENTE

Se attachment existe no banco mas arquivo não existe fisicamente:

mostrar:

```text
Arquivo indisponível
```

Não quebrar a nota inteira.

---

## 80. PERMISSÃO NEGADA

Sempre oferecer alternativa.

Exemplo:

Câmera negada:

```text
Escolher da galeria
Abrir configurações
Cancelar
```

---

## TESTES

Utilizar:

```text
unit tests
integration tests
component tests
```

Sem tentar testar cada linha.

Priorizar regras críticas.

---

## 81. TESTES DO BANCO

Testar:

```text
migrations
CRUD
foreign keys
soft delete
restore
```

---

## 82. TAREFAS

Testar:

```text
conclusão
overdue
recorrência
próxima ocorrência
```

---

## 83. REMINDERS

Testar:

```text
criação
cancelamento
reagendamento
snooze
recorrência
reconciliação
```

Mockar APIs nativas quando necessário.

---

## 84. BUSCA

Testar:

```text
acentos
maiúsculas
múltiplos termos
filtros
```

Exemplo:

```text
programacao
```

encontra:

```text
Programação
```

---

## 85. BACKUP

Testar:

```text
exportar
restaurar
backup inválido
attachment ausente
versão antiga
```

---

## BUILD E QUALIDADE

Configurar:

```text
TypeScript strict
ESLint
Prettier
```

---

## 86. TYPESCRIPT

Obrigatório:

```json
{
  "strict": true
}
```

Evitar:

```text
any
@ts-ignore
non-null assertion sem necessidade
```

---

## 87. ESLINT

Validar:

```text
imports
hooks
unused variables
TypeScript
React
```

---

## 88. PRETTIER

Formato consistente automático.

Não discutir estilo manual arquivo por arquivo.

---

## 89. AMBIENTES

Ter:

```text
development
preview
production
```

---

## 90. DEVELOPMENT

Pode possuir:

```text
logs
seed
debug menu
dados falsos
```

---

## 91. PREVIEW

Build semelhante a produção para testes internos.

---

## 92. PRODUCTION

Remover:

```text
debug menu
logs excessivos
seed automático
```

---

## CRITÉRIOS DE ACEITE

Uma feature só é considerada pronta quando:

```text
funciona
persiste
sobrevive reinício
possui estado vazio
possui erro tratado
segue design system
possui TypeScript válido
não gera warnings relevantes
```

---

## 93. HOME

Pronta quando:

```text
mostra dados reais
contadores são corretos
navegação funciona
+
abre captura rápida
```

---

## 94. NOTAS

Pronta quando:

```text
criar
editar
autosave
abrir
arquivar
excluir
restaurar
```

funcionam.

---

## 95. TAREFAS

Pronta quando:

```text
criar
editar
concluir
atrasar
recorrer
excluir
restaurar
```

funcionam.

---

## 96. LEMBRETES

Prontos quando:

```text
criar
agendar
editar
cancelar
snooze
recorrer
reconciliar
```

funcionam.

---

## 97. BACKUP

Pronto quando:

```text
exportar
apagar app/dados de teste
restaurar
```

reproduz corretamente:

```text
notas
tarefas
espaços
tags
attachments
```

---

## LIMITES DO MVP

A IA não deve inventar funcionalidades fora do escopo.

O MVP NÃO possui:

```text
login
cadastro
conta
backend obrigatório
sincronização em nuvem
colaboração
compartilhamento entre usuários
chat
comentários
equipes
workspaces compartilhados
rede social
web app
desktop app
editor Notion completo
canvas infinito
planilhas
Kanban completo
email interno
integração Google Calendar
integração Outlook
IA obrigatória
OCR
transcrição automática
sincronização multi-dispositivo
```

---

## 98. IA

A arquitetura pode permitir IA futuramente.

Mas no MVP:

```text
IA não é dependência
```

Nenhum fluxo essencial deve exigir modelo externo.

---

## 99. BACKEND

Não criar:

```text
API
Supabase
Firebase
Node server
Express
Nest
```

sem necessidade.

O MVP é:

```text
local-first
offline
single-user
```

---

## 100. REGRA CONTRA FEATURE CREEP

Se alguma funcionalidade não estiver explicitamente descrita na especificação:

não adicioná-la automaticamente.

Priorizar:

```text
estabilidade
simplicidade
consistência
```

em vez de quantidade de funções.

---

## 101. REGRA CONTRA PLACEHOLDERS FALSOS

Não criar:

```text
botão sem função
tela falsa
dados permanentes mockados
"em breve"
```

como se fossem funcionalidades concluídas.

Se algo ainda não estiver implementado:

não apresentá-lo como funcional.

---

## 102. REGRA FINAL DE ARQUITETURA

Fluxo esperado:

```text
UI
 ↓
Hook / Controller
 ↓
Service / Use Case
 ↓
Repository
 ↓
Drizzle
 ↓
SQLite
```

Para funcionalidades nativas:

```text
Service
 ↓
Adapter
 ↓
Expo API
```

Exemplo:

```text
ReminderService
 ↓
NotificationScheduler
 ↓
expo-notifications
```

---

## 103. RESULTADO ESPERADO

O aplicativo precisa continuar simples para o usuário mesmo com toda essa estrutura interna.

A experiência deve permanecer:

```text
Abrir
 ↓
+
 ↓
Escrever
 ↓
Salvar
```

e depois:

```text
Organizar quando quiser.
```

Toda complexidade de:

```text
SQLite
arquivos
recorrência
backup
notificações
migrations
índices
estado
```

deve permanecer invisível para o usuário final.


---

# 110. PLANO DE EXECUÇÃO, DECISÕES E CRITÉRIOS DE ACEITE

Esta seção transforma a especificação anterior em um contrato de implementação. Suas decisões são normativas quando houver conflito ou ambiguidade em seções anteriores.

## 110.1 OBJETIVO

Implementar o Nexo como aplicativo mobile local-first, single-user e offline-first.

O MVP deve entregar uma experiência funcional de:

- capturar conteúdo rapidamente;
- criar e editar notas;
- criar e concluir tarefas;
- criar, editar, adiar e concluir lembretes;
- organizar conteúdo em espaços, tags, arquivos e lixeira;
- encontrar conteúdo por busca;
- receber notificações locais confiáveis.

Toda funcionalidade fora desse conjunto deve ser tratada como pós-MVP.

## 110.2 DECISÕES CANÔNICAS DE MODELO

### Item

Item é um conceito de domínio e uma projeção unificada para listas, busca e tela Hoje.

No MVP, não criar uma tabela persistente genérica items para duplicar os dados. As tabelas de domínio são a fonte de verdade:

- notes;
- tasks;
- reminders;
- spaces;
- inbox_items;
- attachments;
- tags;
- item_tags;
- settings;
- trash_metadata.

Cada feature pode converter seu registro para um UnifiedItem quando a interface precisar de uma lista unificada.

Não manter o mesmo conteúdo duplicado em items e nas tabelas de domínio.

### Nota

A tabela notes é a fonte de verdade das notas.

O campo content usa o formato blocks-v1, armazenado como JSON validado. HTML não é o formato principal.

### Tarefa

A tabela tasks é a fonte de verdade das tarefas.

dueAt representa vencimento. Ele não cria notificação automaticamente.

Um lembrete de tarefa é um registro separado em reminders, relacionado por relatedItemId e relatedItemType.

### Lembrete

A tabela reminders é a fonte de verdade dos lembretes. Notification é apenas o mecanismo nativo de entrega.

Campos obrigatórios do domínio:

- id;
- title;
- description;
- scheduledAt;
- timezone;
- repeatRule;
- enabled;
- completed;
- snoozedUntil;
- notificationId;
- notificationStatus;
- relatedItemId;
- relatedItemType;
- createdAt;
- updatedAt;
- deletedAt.

notificationId pode ser nulo, pode mudar e nunca deve ser tratado como identidade permanente do lembrete.

### Recorrência

No domínio TypeScript, repeatRule é um objeto discriminado ou null, nunca uma string livre.

A representação mínima é:

- daily: interval;
- weekly: interval e daysOfWeek;
- monthly: interval e dayOfMonth;
- yearly: interval, month e day;
- custom: estrutura explicitamente definida antes de ser implementada.

No SQLite, repeatRule pode ser armazenado como texto JSON, mas deve ser validado na entrada e na leitura.

A função calculateNextOccurrence é a única responsável por calcular a próxima ocorrência.

### Datas

Persistir instantes em formato ISO 8601 UTC e guardar separadamente o timezone IANA relevante, como America/Sao_Paulo.

A recorrência wall-clock deve preservar o horário humano escolhido. Nunca calcular recorrência apenas com strings de horário sem timezone.

### Exclusão

A exclusão comum é soft delete com deletedAt. A remoção física só ocorre na limpeza definitiva da lixeira, depois de cancelar notificações e remover ou invalidar anexos relacionados.

## 110.3 ESTRUTURA DE PROJETO DEFINITIVA

Usar app/ na raiz como diretório de rotas do Expo Router. Usar src/ para domínio, dados, serviços e componentes. Não alternar entre app/ e src/app/ durante a implementação.

Estrutura mínima:

- app/: rotas e layouts;
- src/features/: regras por domínio;
- src/components/: componentes reutilizáveis;
- src/database/: schema, migrations, conexão e repositories;
- src/services/: notificações, arquivos, áudio e backup;
- src/stores/: apenas estado transitório;
- src/design/: tokens visuais;
- src/types/: tipos compartilhados;
- drizzle/: migrations geradas;
- tests/: testes unitários e de integração.

As rotas devem permanecer finas. Telas não acessam SQLite, Drizzle ou APIs Expo diretamente.

## 110.4 BIBLIOTECAS OFICIAIS DO PROJETO

Escolher as versões compatíveis com o Expo SDK adotado e registrar tudo no lockfile. Não misturar bibliotecas equivalentes sem decisão explícita.

| Responsabilidade | Biblioteca definida |
| --- | --- |
| Navegação e deep links | expo-router |
| Banco local | expo-sqlite |
| ORM e schema | drizzle-orm com driver expo-sqlite |
| Geração de migrations | drizzle-kit |
| Migrações embutidas no app | babel-plugin-inline-import e configuração Metro necessária |
| Estado transitório | zustand |
| Validação de dados e backups | zod |
| Datas e timezone | date-fns e date-fns-tz |
| Arquivos locais | expo-file-system |
| Seleção de arquivos | expo-document-picker |
| Imagens e câmera | expo-image-picker |
| Gravação e reprodução de áudio | expo-audio |
| Notificações | expo-notifications |
| Testes de componentes | jest-expo e @testing-library/react-native |
| Testes de fluxo mobile | Maestro ou equivalente, definido antes da fase de validação |

Não usar expo-av para áudio novo. A implementação deve seguir expo-audio.

## 110.5 FASES E PRIORIDADES

### P0 — Fundação

Obrigatório antes de qualquer feature:

- criar o projeto Expo com TypeScript strict;
- configurar Expo Router;
- configurar lint, formatador, testes e typecheck;
- criar tokens de design;
- configurar SQLite, Drizzle e migrations;
- criar inicialização única do banco;
- configurar tratamento de erros e logs;
- configurar build de desenvolvimento Android e iOS.

Critério de saída: o app abre em instalação limpa, aplica migrations sem erro e exibe uma tela inicial real.

### P1 — Captura e dados essenciais

Implementar:

- Home;
- Inbox;
- captura rápida;
- criação e edição de nota;
- criação e edição de tarefa;
- conclusão de tarefa;
- persistência local;
- autosave de nota;
- lixeira e restauração básica.

Critério de saída: o usuário consegue capturar, fechar o app, reabrir e encontrar seus dados sem mock permanente.

### P2 — Organização e consulta

Implementar:

- Hoje;
- Próximas tarefas;
- calendário básico;
- espaços;
- tags;
- fixados;
- arquivamento;
- busca global;
- empty states;
- filtros e ordenação.

Critério de saída: todo conteúdo persistido pode ser encontrado e organizado sem navegar por mais de três níveis comuns.

### P3 — Lembretes e notificações

Implementar:

- criação, edição, cancelamento e conclusão;
- pedido contextual de permissão;
- status de notificação;
- scheduler dedicado;
- recorrência;
- snooze;
- ações rápidas;
- deep link;
- reconciliação;
- comportamento em foreground, app fechado e após reboot;
- configurações de notificações.

Critério de saída: cada reminder permanece salvo mesmo quando a permissão é negada ou o agendamento falha.

### P4 — Arquivos e áudio

Implementar:

- importar arquivo;
- capturar ou selecionar imagem;
- gravar áudio;
- reproduzir áudio;
- salvar metadados no banco;
- copiar arquivos para diretório controlado pelo app;
- detectar arquivo ausente;
- limite de tamanho;
- limpeza de temporários.

Critério de saída: anexos continuam abrindo após reiniciar o app e não dependem do caminho temporário original.

### P5 — Backup e release candidate

Implementar:

- exportação;
- importação;
- versionamento de backup;
- restauração segura;
- acessibilidade;
- performance;
- testes de regressão;
- revisão visual;
- builds de release;
- documentação de recuperação.

Critério de saída: uma instalação nova consegue restaurar um backup válido sem importar notificationIds antigos nem corromper dados existentes.

## 110.6 ORDEM DE IMPLEMENTAÇÃO

Executar as fases nesta ordem:

1. Fundação e configuração do projeto.
2. Schema canônico e migrations iniciais.
3. Repositories e testes da persistência.
4. Inbox e captura rápida.
5. Notas.
6. Tarefas.
7. Lembretes sem notificações.
8. Scheduler e permissões.
9. Recorrência, snooze e deep links.
10. Hoje, calendário, espaços, tags e busca.
11. Arquivos, imagens e áudio.
12. Backup e restauração.
13. Acessibilidade, performance e release.

Não iniciar uma tela antes de existir o service e o repository necessários para seus dados principais.

## 110.7 CONTRATO DE BACKUP

O backup deve usar o formato versionado Nexo Backup, com extensão .nexo-backup.

O pacote deve conter:

- manifest.json;
- data/notes.json;
- data/tasks.json;
- data/reminders.json;
- data/spaces.json;
- data/tags.json;
- data/inbox-items.json;
- data/settings.json;
- data/trash-metadata.json;
- attachments/;
- checksum ou validação de integridade.

O manifest deve conter:

- formatVersion;
- schemaVersion;
- exportedAt;
- appVersion;
- deviceTimezone;
- contagem de registros;
- lista de arquivos e tamanhos;
- checksum quando disponível.

Regras de exportação:

- exportar dados persistentes;
- preservar IDs dos registros;
- exportar anexos existentes;
- não tratar notificationId como dado portátil;
- não exportar tokens, credenciais ou dados secretos;
- informar arquivos ausentes sem interromper todo o backup.

Regras de importação:

1. validar formato, versão e integridade;
2. extrair para área temporária;
3. validar JSON e referências;
4. aplicar migrations compatíveis;
5. importar dentro de transação quando possível;
6. copiar anexos para o armazenamento interno;
7. limpar notificationIds;
8. reagendar reminders futuros no dispositivo atual;
9. gerar relatório de itens importados, ignorados e com erro;
10. remover a área temporária mesmo quando ocorrer falha.

Nunca sobrescrever o banco atual sem confirmação explícita ou estratégia clara de mesclagem. O MVP pode oferecer restauração substitutiva e deve declarar isso antes da confirmação.

## 110.8 CRITÉRIOS DE ACEITE

### Fundação

- instalação limpa abre sem erro;
- migrations são aplicadas uma única vez;
- reabrir o app não duplica tabelas nem dados;
- typecheck não apresenta erros;
- nenhuma rota faz query SQL diretamente.

### Notas

- criar nota persiste título e blocos;
- editar nota salva automaticamente;
- fechar e reabrir preserva o conteúdo;
- conteúdo inválido não quebra a tela;
- nota pode ser arquivada, enviada para lixeira e restaurada;
- busca encontra título e conteúdo indexável.

### Tarefas

- criar tarefa sem lembrete;
- definir dueAt sem gerar notificação;
- concluir e desfazer;
- listar por Hoje, Próximas e Todas;
- recorrência não cria cópias infinitas;
- soft delete não deixa a tarefa visível nas listas normais.

### Lembretes

- criar lembrete com título, data e hora;
- salvar mesmo sem permissão;
- exibir permission_denied ou error quando aplicável;
- editar cancela o agendamento anterior;
- desativar remove a notificação futura;
- concluir remove notificações pendentes;
- snooze não altera o horário original;
- recorrentes calculam somente a próxima ocorrência necessária;
- tocar na notificação abre o reminder correto;
- item inexistente abre fallback seguro;
- reminder órfão não permanece no sistema operacional.

### Organização

- criar, editar e arquivar espaço;
- aplicar e remover tags;
- fixar e desafixar item;
- restaurar da lixeira;
- busca funciona independentemente do espaço;
- empty states oferecem ação útil.

### Arquivos e áudio

- arquivo é copiado para armazenamento controlado pelo app;
- caminho temporário não é usado como caminho permanente;
- arquivo ausente mostra estado compreensível;
- imagem usa thumbnail quando apropriado;
- áudio pode ser reproduzido e removido;
- permissões são pedidas somente no contexto da ação;
- arquivo acima do limite é recusado antes de consumir armazenamento excessivo.

### Backup

- exportar e importar em instalação limpa;
- backup inválido não altera o banco;
- schema antigo passa por migration;
- notificationIds antigos não são reutilizados;
- anexos restaurados abrem;
- referências quebradas aparecem no relatório.

### UX e acessibilidade

- ações principais são concluídas em até três interações comuns;
- áreas tocáveis têm no mínimo 44 por 44 pontos;
- labels existem para leitores de tela;
- a interface suporta aumento de fonte;
- contraste não depende somente de cor;
- toda operação apresenta sucesso, erro ou estado de processamento;
- não existem botões sem função nem dados mockados apresentados como reais.

## 110.9 MATRIZ MÍNIMA DE TESTES

| Cenário | Resultado esperado |
| --- | --- |
| Primeiro acesso | onboarding aparece uma vez e depois vai para Home |
| App encerrado | dados locais permanecem disponíveis |
| Criar reminder com permissão concedida | notificação é agendada e vinculada ao ID |
| Criar reminder com permissão negada | reminder é salvo com status adequado |
| Agendamento falha | dado não é apagado e existe opção de retry |
| Editar horário | agenda antiga é cancelada e uma nova é criada |
| Desativar reminder | nenhuma notificação futura permanece |
| Concluir reminder recorrente | próxima ocorrência é calculada |
| Adiar duas vezes | só o último snooze permanece |
| App em foreground | feedback não interrompe a navegação |
| Toque na notificação | detalhe correto é aberto |
| Item removido antes do toque | fallback seguro é aberto |
| Reboot | reminders futuros são reconciliados |
| Permission prompt indisponível | usuário é direcionado às configurações |
| Mudança de timezone | regra wall-clock mantém comportamento definido |
| Reminder atrasado | aparece como overdue sem alerta retroativo automático |
| Notificação órfã | é cancelada |
| Backup restaurado | dados entram, notificationIds são limpos e reminders são reagendados |
| Arquivo ausente | item permanece listado com estado de indisponível |
| Duplo toque em salvar | não cria duplicidade |
| Migration antiga | dados existentes continuam legíveis |
| Fonte ampliada | conteúdo e CTA continuam acessíveis |
| Build Android e iOS | projeto compila sem configuração manual escondida |

## 110.10 DEFINITION OF DONE

Uma feature só é considerada concluída quando:

- possui tipo de domínio;
- possui schema e migration, se persistente;
- possui repository;
- possui service ou use case;
- possui estados de loading, vazio e erro;
- possui testes do fluxo principal;
- não acessa a plataforma diretamente pela UI;
- funciona após fechar e reabrir o app;
- não usa mock como fonte de verdade;
- tem critério de aceite validado;
- não introduz dependência circular;
- está coberta pelo backup quando for dado persistente;
- possui comportamento definido para exclusão e restauração.

O MVP não deve ser declarado pronto apenas porque a tela está visualmente completa.

## 110.11 FORA DO MVP

Não implementar sem uma nova decisão de escopo:

- login ou contas;
- backend;
- sincronização entre dispositivos;
- compartilhamento ou colaboração;
- rede social;
- chat ou e-mail interno;
- Google Calendar ou Outlook;
- IA obrigatória;
- OCR;
- transcrição automática;
- editor Notion completo;
- canvas infinito;
- planilhas;
- Kanban completo;
- automações complexas;
- alarmes críticos;
- criptografia avançada de banco;
- suporte multiusuário.

## 110.12 CHECKPOINTS DE REVISÃO

Ao terminar cada fase, revisar:

- o schema ainda é canônico;
- os dados continuam offline;
- a UI não absorveu regra de negócio;
- não surgiram placeholders falsos;
- as migrations funcionam em instalação nova e atualização;
- o backup continua compatível;
- os critérios de aceite da fase estão verdes.

Se uma decisão nova contradizer este plano, atualizar primeiro esta seção e só depois implementar.

## 110.13 RESULTADO EXECUTÁVEL

O plano está pronto para implementação quando o time consegue responder, sem interpretação adicional:

- o que implementar primeiro;
- qual tabela é a fonte de verdade;
- qual biblioteca usar;
- como persistir cada dado;
- como testar cada fluxo;
- quando uma feature está concluída;
- o que não deve ser implementado no MVP.

A experiência final continua simples:

Abrir → capturar → salvar → organizar depois.

A complexidade fica no domínio, nos repositories, nas migrations e nos serviços, nunca na tela.


---

# 111. CONTROLE DE VERSÃO, GIT FLOW E CI/CD

O desenvolvimento deve ser rastreável, revisável e reproduzível. Nenhuma alteração relevante deve existir somente no computador de uma pessoa.

## 111.1 REPOSITÓRIO

O repositório deve conter, no mínimo:

- código-fonte;
- package.json;
- package-lock.json;
- README.md;
- CONTRIBUTING.md;
- CHANGELOG.md;
- .gitignore;
- .gitattributes;
- .editorconfig;
- .env.example;
- configuração do Expo;
- configuração do Drizzle;
- migrations;
- testes;
- workflows de CI;
- templates de Pull Request e Issue.

Nunca versionar:

- .env com valores reais;
- tokens;
- senhas;
- certificados privados;
- keystores;
- arquivos de banco local de desenvolvimento;
- backups reais do usuário;
- diretórios de build;
- node_modules;
- arquivos temporários;
- credenciais do EAS ou das lojas.

## 111.2 ESTRATÉGIA GIT FLOW

Usar Git Flow simplificado:

- main: código de produção;
- develop: integração do próximo ciclo;
- feature/nome-curto: nova funcionalidade;
- fix/nome-curto: correção comum;
- refactor/nome-curto: refatoração sem mudança funcional intencional;
- chore/nome-curto: manutenção técnica;
- docs/nome-curto: documentação;
- test/nome-curto: testes;
- release/vX.Y.Z: preparação de release;
- hotfix/nome-curto: correção urgente em produção.

Regras:

- nunca fazer commit diretamente em main;
- nunca fazer commit diretamente em develop;
- toda alteração entra por Pull Request;
- toda feature nasce de develop;
- toda feature retorna para develop;
- release nasce de develop;
- release é integrada em main e depois sincronizada de volta para develop;
- hotfix nasce de main e é integrado em main e develop;
- não reutilizar uma branch encerrada para outra tarefa;
- apagar branches remotas depois do merge, salvo necessidade documentada.

## 111.3 FLUXO DE UMA FEATURE

Fluxo esperado:

1. atualizar develop localmente;
2. criar feature branch;
3. implementar uma mudança pequena e coesa;
4. executar testes localmente;
5. fazer commits organizados;
6. abrir Pull Request para develop;
7. corrigir falhas apontadas pelo CI;
8. obter revisão;
9. fazer merge;
10. apagar a branch concluída.

Exemplo de nomenclatura:

- feature/reminder-snooze;
- fix/notification-permission-state;
- refactor/reminder-repository;
- test/recurrence-cases.

Não acumular várias funcionalidades independentes na mesma branch.

## 111.4 CONVENTIONAL COMMITS

Usar Conventional Commits:

- feat: nova funcionalidade;
- fix: correção;
- refactor: alteração estrutural sem mudança funcional;
- test: criação ou ajuste de testes;
- docs: documentação;
- chore: manutenção;
- build: configuração de build ou dependências;
- ci: pipeline;
- perf: melhoria de desempenho;
- style: formatação sem mudança de comportamento;
- revert: reversão.

Formato:

tipo(escopo): resumo curto no imperativo

Exemplos:

- feat(reminders): add snooze action;
- fix(notifications): preserve reminder when permission is denied;
- test(recurrence): cover monthly dates;
- ci: run typecheck on pull requests.

Regras:

- um commit deve representar uma intenção;
- não misturar refatoração ampla com mudança funcional sem necessidade;
- não adicionar código quebrado esperando consertá-lo em outro commit;
- mensagens devem explicar o que mudou;
- usar body do commit quando a decisão técnica não for óbvia;
- breaking changes devem ser documentadas no commit e no changelog.

## 111.5 PULL REQUESTS

Todo Pull Request deve informar:

- objetivo;
- contexto do problema;
- escopo da alteração;
- arquivos ou módulos afetados;
- decisões técnicas;
- migrations criadas;
- impacto em backup;
- impacto em notificações;
- como testar;
- screenshots ou vídeo quando houver mudança visual;
- limitações conhecidas;
- itens pendentes, se existirem.

Checklist obrigatório:

- [ ] typecheck executado;
- [ ] lint executado;
- [ ] testes executados;
- [ ] migrations revisadas;
- [ ] não há segredo no diff;
- [ ] não há mock apresentado como funcionalidade real;
- [ ] acessibilidade considerada;
- [ ] backup considerado quando houve alteração de dados;
- [ ] notificações consideradas quando houve alteração em Reminder ou Task;
- [ ] documentação atualizada quando necessário.

Regras de revisão:

- pelo menos uma aprovação para alterações comuns;
- duas aprovações para schema, migrations, backup, autenticação futura ou pipeline;
- o autor não deve aprovar sozinho uma alteração crítica;
- comentários de revisão devem ser resolvidos ou justificados;
- CI precisa estar verde antes do merge;
- não fazer merge com testes desabilitados para ocultar falhas.

## 111.6 POLÍTICA DE MERGE

Usar squash merge para feature, fix, refactor, test e chore, mantendo a branch principal com histórico legível.

Para release e hotfix, preservar merge explícito quando isso ajudar a rastrear a publicação.

Não usar force push em main ou develop.

Não reescrever histórico compartilhado.

Branches protegidas devem exigir:

- Pull Request;
- revisão aprovada;
- checks obrigatórios;
- branch atualizada quando necessário;
- ausência de conflitos;
- histórico sem alterações forçadas.

## 111.7 CI OBRIGATÓRIA EM PULL REQUEST

Executar automaticamente em toda Pull Request para develop e main:

1. instalar Node.js na versão definida pelo projeto;
2. instalar dependências usando npm ci e package-lock.json;
3. validar configuração do projeto;
4. executar format check;
5. executar lint;
6. executar TypeScript strict typecheck;
7. executar testes unitários;
8. executar testes de integração de repositories e services;
9. validar migrations;
10. executar Expo Doctor;
11. verificar dependências vulneráveis em nível alto ou crítico;
12. publicar relatório de falhas com logs legíveis.

O CI não deve depender de dados locais, arquivos pessoais ou serviços externos não declarados.

Se uma etapa precisar de segredo, usar secret do provedor de CI. Nunca colocar o valor no YAML ou no código.

## 111.8 JOBS RECOMENDADOS

Separar o pipeline em jobs independentes:

- quality: formatação, lint e typecheck;
- unit: testes puros de domínio;
- integration: SQLite, Drizzle, repositories e migrations;
- app: validação do Expo e bundle de desenvolvimento;
- security: auditoria de dependências e verificação de segredos;
- e2e: fluxos mobile em ambiente controlado;
- summary: resultado consolidado e artefatos.

Jobs independentes devem executar em paralelo quando não houver dependência.

A pipeline deve armazenar como artefato:

- relatório de testes;
- cobertura;
- logs de build;
- bundle de preview quando produzido;
- screenshots de E2E quando houver falha.

## 111.9 QUANDO EXECUTAR CADA VERIFICAÇÃO

Em toda Pull Request:

- format;
- lint;
- typecheck;
- testes unitários;
- testes de integração;
- validação de migrations;
- Expo Doctor;
- auditoria básica.

Em develop após merge:

- todos os checks de Pull Request;
- build de desenvolvimento;
- testes E2E principais;
- publicação em ambiente de preview ou staging.

Em release:

- todos os checks;
- build Android;
- build iOS;
- testes E2E de regressão;
- validação de migrations em banco vazio e banco com dados de exemplo;
- validação de backup e restauração;
- revisão manual de notificações;
- revisão manual das telas principais.

Em hotfix:

- checks mínimos obrigatórios;
- teste específico da falha;
- build da plataforma afetada;
- validação de que o hotfix também foi sincronizado para develop.

## 111.10 CD E AMBIENTES

Usar ambientes separados:

- preview: associado a Pull Requests;
- staging: associado a develop;
- production: associado a main e tags de release.

Nenhum build de produção deve ser criado a partir de uma branch feature.

A publicação deve ser manualmente aprovada depois que o CI de release terminar.

O pipeline deve registrar:

- commit publicado;
- versão;
- ambiente;
- plataforma;
- responsável;
- resultado do build;
- link ou identificador do artefato.

## 111.11 VERSIONAMENTO E RELEASES

Usar Semantic Versioning:

- MAJOR: mudança incompatível;
- MINOR: nova funcionalidade compatível;
- PATCH: correção compatível.

Tags devem seguir:

- v0.1.0;
- v0.2.0;
- v1.0.0;
- v1.0.1.

Antes de uma release:

1. confirmar critérios de aceite;
2. revisar CHANGELOG.md;
3. criar release/vX.Y.Z;
4. atualizar versão do app;
5. validar migrations;
6. executar backup e restauração;
7. executar testes de regressão;
8. criar Pull Request para main;
9. aprovar e fazer merge;
10. criar tag;
11. gerar build;
12. publicar conforme aprovação;
13. sincronizar main de volta para develop;
14. registrar notas de release.

## 111.12 MIGRATIONS E COMPATIBILIDADE

Toda alteração persistente deve incluir migration versionada no mesmo Pull Request.

A migration deve:

- ter nome ou número previsível;
- ser revisada manualmente;
- funcionar em instalação limpa;
- funcionar em atualização;
- preservar dados existentes;
- ser segura para retry quando possível;
- ter teste de aplicação;
- ter plano de rollback ou recuperação.

Nunca editar uma migration já publicada. Criar uma nova migration.

Uma release não deve exigir que o usuário apague o banco para atualizar.

## 111.13 EAS E BUILDS NATIVOS

Usar o serviço de build escolhido pelo projeto, preferencialmente EAS Build para artefatos Expo.

Separar:

- build de desenvolvimento;
- build interno de staging;
- build de produção.

Credenciais de assinatura devem permanecer no provedor seguro de build ou no gerenciador de segredos.

Alterações somente JavaScript podem usar atualização OTA se forem compatíveis com o binário instalado.

Alterações em:

- permissões;
- plugins;
- código nativo;
- canais;
- configuração de notificações;
- configuração de áudio;
- schema que dependa de código nativo;

exigem novo build nativo e não devem ser tratadas como OTA simples.

## 111.14 VARIÁVEIS E SEGREDOS

Versionar apenas .env.example com nomes e exemplos não sensíveis.

Separar configurações por ambiente.

Regras:

- não usar segredo em código client-side;
- variáveis EXPO_PUBLIC_ são consideradas públicas;
- não colocar tokens reais em logs;
- rotacionar qualquer segredo exposto;
- bloquear o merge se houver segredo detectado;
- documentar como configurar o ambiente local;
- CI deve falhar quando uma variável obrigatória estiver ausente.

Como o MVP não possui backend, não criar segredos fictícios apenas para preencher configuração.

## 111.15 RECUPERAÇÃO E ROLLBACK

Antes de publicar:

- confirmar que a versão anterior está identificada;
- manter o artefato anterior disponível;
- registrar migrations incluídas;
- verificar compatibilidade de backup;
- definir como interromper a distribuição;
- definir como publicar hotfix.

Em caso de falha:

1. interromper a promoção;
2. preservar logs e artefatos;
3. avaliar se o problema é JavaScript, nativo, migration ou dados;
4. reverter apenas se for seguro;
5. criar hotfix quando necessário;
6. nunca apagar dados do usuário como estratégia de rollback;
7. documentar a causa e a correção.

## 111.16 DEFINITION OF DONE DE ENGENHARIA

Uma alteração só está pronta quando:

- está em branch adequada;
- possui commits compreensíveis;
- passou pelo Pull Request;
- recebeu revisão necessária;
- todos os checks obrigatórios estão verdes;
- testes novos foram adicionados quando aplicável;
- migrations e backup foram avaliados;
- nenhuma credencial foi exposta;
- documentação foi atualizada;
- o impacto em release foi classificado;
- a branch foi integrada ao destino correto;
- o artefato pode ser reproduzido pelo CI.

O projeto não deve considerar uma feature concluída apenas porque funciona na máquina do autor.

## 111.17 ARQUIVOS DE GOVERNANÇA A CRIAR

Criar antes da primeira feature:

- CONTRIBUTING.md;
- CHANGELOG.md;
- .github/pull_request_template.md;
- .github/ISSUE_TEMPLATE/bug_report.md;
- .github/ISSUE_TEMPLATE/feature_request.md;
- .github/workflows/ci.yml;
- .github/workflows/e2e.yml;
- .github/workflows/release.yml;
- .github/dependabot.yml ou mecanismo equivalente;
- .nvmrc ou versão de Node definida no package.json.

## 111.18 RESULTADO ESPERADO

Qualquer colaborador deve conseguir:

1. clonar o repositório;
2. instalar dependências;
3. configurar o ambiente seguindo o README;
4. executar o app;
5. criar uma branch;
6. implementar uma alteração;
7. validar localmente;
8. abrir Pull Request;
9. receber feedback automático do CI;
10. gerar um build reproduzível;
11. publicar uma release rastreável.

O Git, o CI e o processo de release devem proteger a qualidade sem tornar o fluxo de desenvolvimento mais complexo do que o necessário.


---

# 112. DIREÇÃO VISUAL E ESPECIFICAÇÃO DO LAYOUT

Esta seção transforma a imagem de referência fornecida em uma especificação visual e de navegação implementável.

A imagem define:

- composição;
- ritmo visual;
- densidade;
- hierarquia;
- proporções;
- relação entre telas;
- comportamento esperado dos componentes.

A imagem não define:

- tamanho absoluto em pixels;
- conteúdo obrigatório;
- uso de conta ou sincronização;
- cópia literal de textos;
- cópia de ícones ou assets;
- obrigação de implementar todos os recursos mostrados na referência.

## 112.1 DIREÇÃO DE DESIGN

### Pessoa e contexto

O Nexo é aberto por uma pessoa que quer guardar algo rapidamente, consultar o que importa hoje ou recuperar uma informação sem pensar em onde ela foi armazenada.

A interface deve transmitir:

- calma;
- confiança;
- clareza;
- leveza;
- sensação de espaço pessoal;
- rapidez sem parecer apressada.

### Direção escolhida

Usar a direção Warmth & Approachability como base, com organização funcional e densidade controlada.

Não transformar o Nexo em:

- dashboard corporativo;
- sistema de gestão pesado;
- mural de cards;
- editor complexo;
- aplicativo com aparência de calendário empresarial.

### Mundo de cores

A linguagem visual deve lembrar:

- papel branco;
- tinta azul;
- grafite;
- luz suave de uma mesa;
- blocos de papel organizados;
- pequenos marcadores coloridos de contexto.

### Assinatura visual do Nexo

A assinatura do produto é:

captura rápida em bottom sheet → organização em listas lineares → detalhe progressivo.

O usuário deve reconhecer o Nexo pela combinação de:

- listas leves com ícones coloridos;
- linhas de navegação com título, resumo e chevron;
- botão + sempre previsível;
- bottom sheet de captura;
- branco amplo com accent azul;
- CTA escuro, simples e forte;
- pouca decoração e muita hierarquia.

### Padrões a rejeitar

Rejeitar:

- grade de cards como estrutura principal;
- múltiplos CTAs coloridos na mesma tela;
- gradientes decorativos;
- sombras fortes em todos os elementos;
- menu lateral como navegação primária no celular;
- textos técnicos;
- ícones misturados entre outline, filled, 3D e emoji;
- telas cheias de configurações expostas;
- aparência de CRM, kanban corporativo ou rede social.

## 112.2 TOKENS VISUAIS CANÔNICOS

Os valores abaixo são pontos de partida para o design system. Devem ficar centralizados em src/design e não espalhados pelas telas.

### Superfícies

- background principal: #F8F9FC;
- superfície elevada: #FFFFFF;
- superfície de input: #F3F5FA;
- superfície selecionada: #EEF2FF;
- overlay de modal: rgba(15, 20, 35, 0.42).

### Texto

- texto principal: #171B2D;
- texto secundário: #647087;
- texto terciário: #8E98AA;
- placeholder: #AAB2C0;
- texto sobre CTA escuro: #FFFFFF.

### Accent e semântica

- accent principal: azul funcional;
- accent suave: azul muito claro para seleção e fundo de ícone;
- CTA principal: azul-marinho quase preto;
- sucesso: verde;
- aviso: âmbar;
- erro: vermelho;
- informação: azul.

Uma cor nunca deve ser a única forma de comunicar estado. Combinar cor com texto, ícone, check ou posição.

### Espaçamento

Usar base de 4px e os valores mais frequentes:

- 4px: microespaço;
- 8px: ícone e texto;
- 12px: conteúdo interno compacto;
- 16px: margem horizontal padrão;
- 20px: agrupamento confortável;
- 24px: separação entre seções;
- 32px: separação de blocos importantes.

Em telefones entre 320px e 430px, a margem horizontal padrão deve ser 16px. Nunca comprimir conteúdo reduzindo todos os textos; primeiro reduzir elementos secundários.

### Raios

- input: 10–12px;
- item selecionado: 10–12px;
- botão principal: 12–14px;
- bottom sheet: 24px nos cantos superiores;
- chip/tag: 999px;
- FAB: 999px.

### Profundidade

Usar surface shift como estratégia principal:

- listas: superfície do canvas;
- inputs e filtros: superfície inset;
- bottom sheet: superfície branca com sombra sutil;
- FAB: superfície branca com sombra sutil;
- modal: overlay e sombra mais forte;
- evitar sombras em cada linha de lista.

### Tipografia

Usar fonte nativa do sistema como primeira opção, com fallback consistente.

Escala recomendada:

- display do onboarding: 30–32px, peso 700;
- título de tela: 22–24px, peso 700;
- título de seção: 16–18px, peso 600;
- texto de item: 14–16px, peso 500;
- corpo: 14–16px, peso 400;
- metadata: 12–13px, peso 400;
- botão: 14–16px, peso 600.

Títulos grandes devem ter tracking levemente negativo e textos longos devem usar line-height confortável.

### Ícones

Usar uma única família de ícones outline, preferencialmente lucide-react-native ou equivalente consistente.

Regras:

- stroke de aproximadamente 1.75–2px;
- tamanhos visuais de 16, 20 e 24px;
- áreas interativas de pelo menos 44x44pt;
- ícones decorativos devem ser ignorados por leitores de tela;
- ícones de ação devem possuir label acessível;
- estado ativo pode usar preenchimento suave no container, sem misturar famílias.

## 112.3 COMPOSIÇÃO GLOBAL

### Área segura

Toda tela deve respeitar:

- status bar;
- notch;
- home indicator;
- teclado;
- bottom tabs;
- safe area inferior.

O conteúdo não pode ficar escondido atrás de áreas do sistema.

O canvas principal deve permanecer visualmente aberto, com fundo claro levemente azulado, texto escuro de alto contraste e superfícies brancas apenas quando houver necessidade de separar uma camada ou ação. A composição não deve ser preenchida artificialmente.

### Header

O header padrão é leve e contextual:

- altura visual aproximada de 52–60px;
- título alinhado à esquerda;
- ação principal ou menu alinhado à direita;
- fundo igual ao canvas ou levemente translúcido;
- sem barra pesada;
- sem logo repetido em todas as telas;
- voltar com área de toque grande.

### Navegação inferior

Usar uma barra inferior fixa com quatro destinos principais:

1. Início;
2. Hoje;
3. Caixa de entrada;
4. Espaços.

Configurações deve ser acessada pelo header ou pela área de mais opções, não ocupar uma tab principal no MVP.

A tab ativa deve combinar:

- ícone;
- contraste maior;
- label quando houver espaço;
- estado visual que não dependa somente de cor.

A barra não deve aparecer em:

- splash;
- onboarding;
- editor de nota;
- criação de lembrete;
- bottom sheets;
- fluxos modais.

### Ação global de criação

Usar uma única convenção:

- no Home, botão + no header;
- em listas de tarefas, calendário, espaços e resultados, botão + no header ou FAB;
- não mostrar header + e FAB para a mesma ação na mesma tela;
- o botão + sempre abre o mesmo fluxo de captura rápida;
- ações específicas podem abrir o formulário já filtrado para Nota, Tarefa ou Lembrete.

O `+` é uma âncora de navegação do produto. Sua posição pode variar conforme a tela, mas seu significado não:

```text
+ → captura rápida
```

Não utilizar simultaneamente um `+` no header e um FAB para a mesma ação. O FAB só deve existir quando a ação de criação precisar permanecer acessível durante a rolagem.

### Listas

A lista é o padrão principal do produto.

Cada linha deve poder conter:

- ícone de tipo;
- título;
- metadata curta;
- estado ou contador;
- chevron somente quando houver navegação;
- ação contextual por swipe ou menu.

Não transformar cada linha em card independente. Usar divisores leves ou espaçamento para separar grupos.

As linhas devem preservar o ritmo observado na referência:

```text
ícone discreto → título → resumo ou metadata → chevron/estado
```

O ícone orienta o reconhecimento do tipo; ele não deve virar ilustração dominante. A informação secundária deve desaparecer antes do título quando faltar espaço horizontal.

## 112.4 MAPA DAS TELAS DA REFERÊNCIA

A imagem apresenta 15 estados principais. A implementação deve manter a mesma sequência mental, mesmo quando uma tela for dividida em rotas menores.

### 01. Splash

Composição:

- fundo claro;
- logo Nexo centralizado;
- frase curta abaixo;
- indicador discreto na parte inferior;
- nenhum botão;
- nenhum banner;
- nenhum pedido de permissão.

Comportamento:

- inicializar banco e preferências;
- decidir entre onboarding e Home;
- não permanecer mais que o necessário;
- se houver erro de inicialização, mostrar erro compreensível com tentativa novamente.

Critério visual: deve parecer uma abertura calma, não uma tela de carregamento técnica.

### 02. Onboarding

Composição:

- ação Pular no canto superior direito;
- headline forte alinhada à esquerda;
- subtítulo curto;
- preview em camadas de notas, tarefas, lembretes e arquivos;
- indicador de páginas;
- CTA Começar na parte inferior.

Regras:

- no máximo três etapas;
- cada etapa comunica uma única ideia;
- não pedir notificações, microfone ou arquivos no onboarding;
- Pular e Começar devem registrar onboarding concluído;
- o CTA fica próximo da área de alcance do polegar;
- preview é ilustrativo e não deve parecer conteúdo real salvo.

### 03. Tela inicial

Composição:

- saudação contextual: Bom dia, Boa tarde ou Boa noite;
- nome local do usuário somente se existir uma preferência local;
- data abaixo em texto secundário;
- botão + no canto superior direito;
- lista de destinos operacionais;
- navegação inferior.

Linhas recomendadas:

- Hoje;
- Caixa de entrada;
- Notas;
- Tarefas;
- Calendário;
- Tudo ou Busca.

Cada linha deve mostrar:

- ícone em container circular ou quadrado suave;
- título;
- resumo quantitativo ou texto auxiliar;
- chevron;
- divisor discreto.

Não adicionar dashboard com muitos números, gráficos ou cards na Home.

### 04. Captura rápida

Abrir como bottom sheet.

Composição:

- canvas escurecido suavemente;
- handle no topo;
- título O que você quer guardar?;
- campo Apenas escreva...;
- opções em lista;
- fechamento por gesto, botão ou toque fora quando não houver dados pendentes.

Opções:

- Nota;
- Tarefa;
- Lembrete;
- Arquivo;
- Foto;
- Áudio.

Cada opção deve ter:

- ícone;
- título;
- descrição de uma linha;
- área de toque mínima de 44pt.

A opção de texto livre deve permitir salvar primeiro na Inbox e classificar depois.

### 05. Criando uma nota

Composição:

- voltar no topo esquerdo;
- Salvar ou indicador de autosave no topo direito;
- título grande com placeholder discreto;
- corpo livre;
- toolbar inferior com texto, checklist, anexo, imagem, áudio e mais;
- teclado não deve esconder a área de edição.

Comportamento:

- autosave após alteração;
- nota sem título pode ser salva usando o primeiro trecho como resumo;
- toolbar deve ser secundária ao conteúdo;
- ação de voltar nunca deve perder texto;
- mostrar estado Salvando, Salvo ou Não foi possível salvar sem interromper a digitação.

### 06. Nota completa

Composição:

- voltar;
- menu de mais ações;
- título com maior contraste;
- corpo com blocos bem espaçados;
- checklists;
- referências;
- tags;
- anexos em linhas compactas.

Ações:

- editar;
- fixar;
- mover para espaço;
- adicionar lembrete;
- criar tarefa relacionada;
- arquivar;
- enviar para lixeira;
- desfazer ações reversíveis por snackbar.

Não exibir todas as ações no topo. Colocar ações secundárias em menu.

### 07. Criando um lembrete

Composição:

- voltar;
- título Novo lembrete;
- campo de título em superfície elevada;
- linhas de configuração com ícone, label, valor e chevron;
- CTA Criar lembrete fixado na parte inferior quando seguro;
- teclado e safe area respeitados.

Campos iniciais visíveis:

- título;
- data;
- horário;
- repetir.

Campos secundários:

- prioridade;
- espaço;
- descrição;
- item relacionado;
- opções avançadas.

O fluxo inicial deve parecer curto. Não mostrar o schema, status técnico ou IDs para o usuário.

### 08. Tarefas

Composição:

- título Tarefas;
- botão +;
- tabs Hoje, Próximas e Todas;
- lista de checkboxes;
- horário abaixo quando existir;
- prioridade como texto ou pill discreta;
- grupo Concluídas recolhido por padrão.

Comportamento:

- tocar no checkbox conclui imediatamente;
- mostrar Desfazer;
- swipe pode concluir, mas checkbox continua disponível;
- não usar cor vermelha isolada para prioridade alta;
- tarefa sem lembrete continua válida;
- loading usa skeleton com formato de lista;
- lista vazia mostra CTA Criar tarefa.

### 09. Calendário

Composição:

- mês e ano no header;
- navegação para mês anterior e próximo;
- linha compacta de dias;
- dia selecionado com círculo azul;
- pontos ou pequenos marcadores sob dias com eventos;
- timeline vertical para o dia escolhido.

Regras:

- eventos usam ícones ou labels além das cores;
- lembretes e tarefas devem ser distinguíveis;
- tocar no evento abre detalhe;
- trocar de dia não deve resetar filtros;
- calendário mensal não deve virar uma grade visual pesada.

### 10. Caixa de entrada

Composição:

- título Caixa de entrada;
- contador de itens não organizados;
- busca ou filtro acessível;
- lista cronológica;
- ícone indicando tipo de conteúdo;
- metadata de data e hora;
- ações para organizar, mover, arquivar ou apagar.

A Inbox deve aceitar conteúdo incompleto:

- sem título;
- sem espaço;
- sem tag;
- sem classificação;
- criado por captura rápida.

O empty state deve explicar que a Inbox é o lugar para guardar agora e organizar depois.

### 11. Espaços

Composição:

- título Espaços;
- botão +;
- lista linear de espaços;
- ícone;
- nome;
- contador de itens;
- item Novo espaço no final ou CTA contextual.

Não usar pastas aninhadas no MVP.

Os espaços devem parecer contextos pessoais, não diretórios técnicos.

### 12. Dentro de um espaço

Composição:

- voltar;
- nome do espaço;
- menu de mais ações;
- tabs Notas, Tarefas e Arquivos;
- lista filtrada;
- botão + contextual.

A troca de tabs deve preservar o espaço atual.

Ações do espaço:

- editar nome e ícone;
- arquivar;
- mover conteúdo;
- excluir com confirmação;
- visualizar itens sem classificação quando aplicável.

### 13. Busca

Composição:

- campo de busca no topo;
- botão cancelar;
- chips Todos, Notas, Tarefas, Arquivos e Lembretes;
- resultados em lista;
- ícone e tipo do resultado;
- contexto do espaço e data;
- destaque discreto do trecho encontrado.

A busca deve começar global por padrão.

Estados:

- antes de pesquisar;
- digitando;
- resultados;
- nenhum resultado;
- erro;
- busca sem conexão, que continua funcionando localmente.

### 14. Hoje

Composição:

- título Hoje;
- data abaixo;
- três resumos compactos: tarefas, lembretes e eventos;
- seção Próximo;
- seção Minhas tarefas;
- timeline ou lista operacional;
- botão +.

A tela Hoje não deve duplicar toda a Home. Ela deve responder:

- o que precisa de atenção agora;
- qual é o próximo compromisso;
- quais tarefas estão pendentes;
- quais lembretes estão atrasados.

### 15. Configurações

Composição:

- voltar;
- título Configurações;
- grupos de linhas com ícone, título, descrição e chevron;
- divisores leves;
- ações destrutivas isoladas no final.

Seções do escopo pessoal:

- Notificações;
- Aparência;
- Armazenamento;
- Backup e restauração;
- Privacidade local;
- Ajuda e diagnóstico.

A imagem mostra Conta e sincronização, mas isso não deve ser implementado no MVP pessoal offline. Não exibir login, logout, conta, sincronização ou perfil como se existissem.

## 112.5 COMPONENTES REUTILIZÁVEIS

Criar componentes visuais com estados consistentes:

- AppHeader;
- ScreenContainer;
- BottomTabBar;
- ModuleIcon;
- ListRow;
- SectionHeader;
- CountBadge;
- FilterChip;
- SegmentedTabs;
- Checkbox;
- PriorityPill;
- PrimaryButton;
- IconButton;
- TextInput;
- RichTextEditor;
- QuickCaptureSheet;
- BottomSheet;
- Snackbar;
- EmptyState;
- ErrorState;
- LoadingSkeleton;
- CalendarHeader;
- CalendarDayStrip;
- TimelineEvent;
- AttachmentRow;
- TagChip;
- SettingsRow;
- ConfirmDialog.

Cada componente interativo deve definir:

- default;
- pressed;
- focused;
- disabled;
- loading;
- error;
- selected;
- accessibility label;
- hit area;
- comportamento com fonte ampliada.

## 112.6 ESTADOS VISUAIS OBRIGATÓRIOS

Toda tela de dados precisa definir:

- carregando;
- vazia;
- com dados;
- erro;
- salvando;
- salvo;
- offline;
- item arquivado;
- item na lixeira;
- conteúdo indisponível;
- permissão negada, quando aplicável.

Nunca mostrar uma tela branca enquanto uma query ou operação local está em andamento.

## 112.7 MOVIMENTO E TRANSIÇÕES

Usar movimento discreto:

- press de botão: aproximadamente 100ms;
- mudança de estado: 150–200ms;
- abertura de bottom sheet: 220–280ms;
- fechamento de bottom sheet: 160–220ms;
- troca de tela: cross-fade ou slide curto;
- checkbox: pequena transição de escala/opacidade;
- snackbar: entrada curta pela borda inferior.

Regras:

- animar preferencialmente transform e opacity;
- não usar bounce exagerado;
- não animar cada item de lista repetidamente;
- respeitar reduced motion;
- não usar animação para mascarar carregamento lento;
- nunca atrasar uma ação simples por causa da animação.

## 112.8 RESPONSIVIDADE

A referência visual é vertical e mobile-first.

Validar no mínimo em:

- 320px;
- 360px;
- 375px;
- 390px;
- 412px;
- 430px.

Regras:

- margem horizontal de 16px como padrão;
- título pode quebrar em duas linhas;
- CTA nunca pode ficar escondido pelo teclado;
- bottom sheet deve poder rolar em telas pequenas;
- linhas não devem depender de uma largura fixa;
- metadata pode ser ocultada antes do título;
- ícones permanecem tocáveis mesmo quando o texto quebra.

Tablet ou web não fazem parte do MVP, mas a arquitetura não deve impedir adaptação futura.

## 112.9 ACESSIBILIDADE VISUAL E INTERATIVA

Obrigatório:

- contraste adequado para texto e controles;
- áreas de toque de 44pt ou mais, preferencialmente 48pt;
- labels para ícones sem texto;
- anúncio de mudanças em snackbar e status;
- foco lógico em bottom sheets e diálogos;
- retorno do foco ao elemento que abriu o modal quando aplicável;
- suporte a fonte ampliada;
- não depender somente de azul, vermelho ou verde;
- estados de checkbox e prioridade identificáveis por forma, texto ou ícone;
- opção de reduzir movimento;
- testes com VoiceOver ou TalkBack no fluxo de criação, busca e conclusão.

## 112.10 NAVEGAÇÃO E ROTAS

Usar rotas coerentes com a estrutura definida:

- app/index.tsx: entrada e decisão de onboarding;
- app/onboarding.tsx;
- app/(tabs)/index.tsx: Home;
- app/(tabs)/today.tsx;
- app/(tabs)/inbox.tsx;
- app/(tabs)/spaces.tsx;
- app/tasks/index.tsx;
- app/tasks/new.tsx;
- app/tasks/[id].tsx;
- app/notes/new.tsx;
- app/notes/[id].tsx;
- app/reminders/new.tsx;
- app/reminders/[id].tsx;
- app/calendar.tsx;
- app/search.tsx;
- app/settings/index.tsx;
- app/settings/notifications.tsx;
- app/settings/appearance.tsx;
- app/settings/backup.tsx.

Deep links de notificação devem apontar para a rota de detalhe correspondente.

Não criar uma rota para cada variação visual; estados devem ser controlados por dados e parâmetros.

## 112.11 REGRAS DE CONTEÚDO

Usar linguagem curta e humana:

- Hoje;
- Caixa de entrada;
- Criar nota;
- Salvar;
- Concluir;
- Adiar;
- Mover;
- Organizar depois;
- Tentar novamente.

Evitar:

- instanciar;
- entidade;
- sincronização indisponível quando não existe sincronização;
- erro técnico;
- operação inválida;
- conteúdo desconhecido.

Textos de erro devem explicar:

1. o que aconteceu;
2. se os dados foram preservados;
3. qual é a próxima ação.

## 112.12 CHECKLIST DE FIDELIDADE VISUAL

Antes de considerar a interface pronta:

- comparar as 15 telas com a referência;
- verificar se a Home continua linear e não virou dashboard;
- conferir se o + aparece no lugar esperado;
- conferir se bottom sheet e editor não cobrem o teclado;
- verificar proporção entre título, metadata e ícone;
- verificar que não há excesso de cards;
- validar que apenas uma ação é primária por tela;
- executar squint test para confirmar a hierarquia;
- executar swap test para evitar uma interface genérica;
- validar contraste e áreas de toque;
- revisar todos os estados vazio, erro, loading e sucesso;
- testar em todas as larguras definidas;
- comparar screenshots no mesmo tamanho da referência;
- usar 390 x 844 pontos como composição-base;
- comparar a mesma rota com dados reais, não somente com placeholders;
- confirmar a presença ou ausência da navegação inferior conforme o fluxo;
- confirmar que nunca existem dois controles de criação para a mesma ação;
- conferir que a quebra de títulos e metadados mantém a hierarquia da referência;
- conferir que o espaço em branco não foi substituído por cards, banners ou elementos decorativos;
- registrar divergências visuais antes de considerar a tela aprovada.

## 112.13 DECISÃO FINAL DE DESIGN

O Nexo deve parecer uma ferramenta pessoal silenciosa e confiável.

A interface não compete com o conteúdo. Ela:

- mostra o essencial;
- oferece o próximo passo;
- esconde complexidade;
- permite capturar antes de organizar;
- usa azul para orientar, não para decorar;
- usa listas para dar continuidade;
- usa bottom sheets para ações contextuais;
- usa espaço em branco para reduzir carga mental.

Se uma nova tela parecer mais carregada, colorida ou complexa do que a referência, simplificar antes de adicionar mais elementos.


---

# 113. REGRA OBRIGATÓRIA DE ENCERRAMENTO DE ETAPA

Nenhuma etapa, fase ou feature pode ser considerada finalizada apenas porque o código foi escrito ou a tela está funcionando localmente.

Ao final de cada etapa, é obrigatório executar um teste de regressão amplo e deixar o repositório completamente organizado.

## 113.1 TESTE EM MASSA OBRIGATÓRIO

“Teste em massa” significa validar a etapa atual e confirmar que ela não quebrou o restante do aplicativo.

Executar obrigatoriamente:

- testes unitários;
- testes de integração;
- testes dos repositories;
- testes das migrations;
- testes dos services;
- testes dos fluxos principais;
- testes de navegação;
- testes de estados vazio, loading e erro;
- testes de criação, edição, exclusão, restauração e undo;
- testes offline;
- testes de fechamento e reabertura do app;
- testes de permissões quando a etapa envolver recursos nativos;
- testes de notificações quando a etapa envolver tarefas ou lembretes;
- testes de backup e restauração quando houver alteração persistente;
- typecheck em modo strict;
- lint;
- format check;
- validação do bundle ou build de desenvolvimento.

Para etapas visuais, executar também:

- revisão manual das telas afetadas;
- comparação com a referência visual;
- validação em 320px, 375px, 390px e 430px;
- teste de teclado;
- teste de fonte ampliada;
- teste de áreas clicáveis;
- teste de dark mode quando suportado;
- teste de reduced motion quando houver animação.

Para etapas de banco ou dados, executar também:

- instalação limpa;
- atualização a partir de uma versão anterior;
- aplicação das migrations;
- leitura dos dados existentes;
- validação de índices e referências;
- teste de backup;
- teste de restauração;
- teste de falha parcial sem perda de dados.

Para etapas de notificações, executar também:

- permissão concedida;
- permissão negada;
- permissão revogada;
- app em foreground;
- app fechado;
- reboot;
- edição do lembrete;
- cancelamento;
- snooze;
- recorrência;
- deep link;
- notificação órfã;
- reminder sem notificationId.

Se qualquer teste obrigatório falhar, a etapa permanece em andamento.

Não marcar como concluído usando:

- teste manual isolado;
- “funciona no meu aparelho”;
- screenshot sem fluxo funcional;
- teste pulado sem justificativa documentada;
- mock como substituto de integração real.

## 113.2 CONTROLE GIT OBRIGATÓRIO

Antes de encerrar a etapa:

1. revisar todo o diff;
2. verificar git status;
3. confirmar que nenhum arquivo importante ficou fora do commit;
4. confirmar que não existem arquivos temporários;
5. confirmar que não existem credenciais ou dados pessoais;
6. confirmar que migrations, testes e documentação foram incluídos;
7. confirmar que o formato dos arquivos está correto;
8. confirmar que não há mudanças acidentais fora do escopo;
9. atualizar CHANGELOG.md quando a etapa alterar comportamento;
10. atualizar plano.md quando uma decisão ou requisito tiver mudado;
11. executar os checks do CI localmente;
12. criar commit com Conventional Commit;
13. integrar a branch conforme a estratégia Git definida;
14. confirmar que a branch de destino está atualizada;
15. confirmar que o CI remoto está verde;
16. confirmar que não existem conflitos pendentes;
17. deixar o working tree limpo.

O commit deve ser pequeno o suficiente para explicar a etapa e grande o suficiente para manter o projeto consistente.

Exemplos:

- feat(notes): complete note editor stage;
- feat(reminders): complete local scheduling stage;
- test(database): cover migration regression suite;
- chore(ui): organize design tokens and screens.

## 113.3 EVIDÊNCIA DA ETAPA

Cada etapa finalizada deve deixar registro de:

- nome da etapa;
- data;
- commit ou tag;
- testes executados;
- resultado dos testes;
- plataforma testada;
- migrations envolvidas;
- limitações conhecidas;
- próximo passo.

O registro pode ficar em:

- CHANGELOG.md;
- descrição do Pull Request;
- issue da etapa;
- checklist do plano;
- nota de release pessoal.

Não depender apenas da memória ou de mensagens no chat.

## 113.4 CRITÉRIO DE CONCLUSÃO

Uma etapa só pode receber o status concluída quando todos os itens forem verdadeiros:

- funcionalidade implementada;
- critérios de aceite atendidos;
- teste em massa executado;
- regressões avaliadas;
- typecheck sem erros;
- lint sem erros;
- testes automatizados aprovados;
- validação manual concluída;
- documentação atualizada;
- diff revisado;
- commit criado;
- Git organizado;
- CI verde;
- working tree limpo;
- próximo passo definido.

Se algum item estiver pendente, o status correto é em andamento, bloqueado ou aguardando correção.

## 113.5 REGRA DE ARRUMAÇÃO

Ao terminar cada etapa:

- remover código morto;
- remover imports não utilizados;
- remover logs temporários;
- remover arquivos temporários;
- consolidar estilos duplicados;
- organizar nomes de arquivos;
- revisar comentários;
- atualizar tipos;
- atualizar migrations;
- atualizar testes;
- atualizar documentação;
- não deixar TODO crítico sem registro;
- não deixar botão sem função;
- não deixar mock permanente;
- não deixar branch esquecida sem motivo.

O resultado final de cada etapa deve ser um ponto estável do projeto, fácil de continuar, revisar ou recuperar.

## 113.6 REGRA FINAL

Não existe “etapa concluída parcialmente”.

Existe apenas:

- etapa em andamento;
- etapa bloqueada;
- etapa concluída e validada.

A regra vale para:

- funcionalidades;
- telas;
- banco;
- notificações;
- arquivos;
- áudio;
- backup;
- design system;
- CI;
- releases.

Toda conclusão deve deixar o código testado, o histórico Git rastreável e o projeto limpo para a próxima etapa.
