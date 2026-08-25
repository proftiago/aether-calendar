# Aether Calendar

Calendário para power users: múltiplos calendários, criação de eventos por
linguagem natural (pt-BR), time-blocking de tarefas por drag-and-drop,
views Dia/Semana/Mês/Agenda, e utilitários de produtividade (encontrar
horário livre, link de agendamento, colapso de horário não-produtivo,
estimativa de deslocamento, clima do dia).

Recriado a partir do handoff de design `Aether Calendar.dc.html` — fidelidade
visual alta, com a lógica de datas/recorrência preparada para produção
(UTC + timeZone, RRULE via `rrule`, Pointer Events para drag/resize).

## Estado atual

**Uso real, com dados persistidos localmente e sincronização de verdade com
o Google Calendar (leitura + escrita).** Eventos, tarefas, calendários e
calendar sets são salvos automaticamente no `localStorage` do navegador. A
integração com o Google usa um backend leve (Supabase Edge Functions) que
guarda o token com segurança — veja **[docs/GOOGLE_SETUP.md](docs/GOOGLE_SETUP.md)**
para o passo a passo de configuração (Google Cloud Console, Supabase,
Netlify). Sem esse setup, o botão "Conectar Google Calendar" continua
funcionando com dados simulados, então o app é 100% usável mesmo sem a
integração real.

### Funcionalidades

- **Eventos recorrentes** — repetição semanal por dias da semana, com data
  opcional de término. No drawer de um evento recorrente, dá pra editar ou
  excluir só aquela ocorrência, ou a série inteira.
- **Mobile mais usável** — FAB para criar evento, toolbar compacta com menu
  "⋯" em telas estreitas, busca do header colapsável, área de toque maior
  para redimensionar eventos, view "Dia" como padrão no celular.
- **Assistente de horários** (botão ✨ flutuante) — sugere os 3 melhores
  horários livres pra agendar algo, considerando fragmentação do dia,
  período preferencial e prioridade. É uma heurística local (calculada no
  navegador a partir da sua agenda real) — **não chama nenhuma IA externa**,
  porque isso exigiria expor uma chave de API num app estático hospedado no
  Netlify, o que não é seguro. Ver `src/lib/suggest.ts` para o comentário
  sobre como plugar um backend real (ex: Supabase Edge Function chamando a
  API da Anthropic) sem precisar mudar a interface.
- **Calendar sets de verdade** — além de Tudo/Só Trabalho/Só Pessoal, dá pra
  criar sets customizados a partir da seleção atual de calendários visíveis
  (botão "+" na sidebar), com nome próprio e opção de excluir.
- **Google Calendar real** — leitura e escrita via OAuth 2.0. Criar, editar,
  mover e excluir eventos no Aether reflete no Google Calendar de verdade
  (exceto recorrência criada no Aether, que fica local por enquanto — ver
  limitações no guia de setup). Sem a configuração do backend, o toggle
  volta a simular a conexão com dados de exemplo.
- **Configurações** (menu do avatar → Configurações) — visualização do
  calendário (fins de semana, números da semana, início da semana),
  formato de hora 12h/24h, tema claro/escuro/automático, status e
  desconexão do Google, e uma seção de dados com "remover dados de
  exemplo" e "apagar tudo".
- **Visual inspirado no Notion Calendar** — mini-calendário navegável na
  sidebar (com números da semana), avatar com menu no canto superior
  direito, tema escuro mais próximo do preto do que do cinza-azulado,
  rótulo de fuso "GMT-3" na grade, painel de atalhos úteis à direita
  (ativa/desativa pelo ícone no header ou `Cmd/Ctrl+K` → "Mostrar/ocultar
  atalhos"), menu de comando (`Cmd/Ctrl+K`) com busca de ações, e preview
  ao passar o mouse sobre um evento (telas largas).
- **Tema dark blue + gold** — paleta escura com tom azul-marinho (em vez de
  cinza neutro) e dourado como cor de destaque secundária (Focus Mode,
  mapa de calor).
- **Analytics** (Configurações → Analytics) — distribuição do tempo da
  semana (Reuniões/Trabalho/Pessoal/Família) e mapa de calor dos horários
  de pico, calculados a partir dos seus próprios eventos.
- **Focus Mode** — botão dourado no header (ou `Cmd/Ctrl+K` → "Iniciar
  Focus Mode") que esconde sidebar/distrações e mostra só o compromisso
  atual e o próximo, com contagem regressiva.
- **Reagendamento inteligente** — detecta blocos de tempo de tarefas que
  ficaram sobrepostos com outro compromisso (ex: uma reunião que "invadiu"
  um bloco de foco) e realoca automaticamente pro próximo horário livre.
  Acessível pelo menu "⋯" da toolbar ou `Cmd/Ctrl+K` → "Reorganizar
  conflitos de agenda". Só mexe em blocos derivados de tarefa — nunca em
  compromissos normais.

## Rodando localmente

```bash
npm install
npm run dev -- --host
```

Abre em `http://localhost:5173`. Com `--host`, o terminal mostra também um
IP de rede — acesse por ele no celular/tablet na mesma Wi-Fi pra testar.

## Build de produção

```bash
npm run build
```

Gera `dist/` com o app + service worker (PWA instalável — "Adicionar à tela
de início" no celular/tablet, ou instalar como app no desktop via Chrome/Edge).

## Deploy (mesmo padrão da Gestão)

Sugestão: Netlify, igual ao `gestao.fastfluent.com.br`.

1. `netlify.toml` na raiz:
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```
2. Conectar o repo no Netlify (ou `netlify deploy --prod` via CLI).
3. Abrir a URL publicada no celular/tablet e usar "Adicionar à tela de
   início" — o `vite-plugin-pwa` já gera o manifest e o service worker.

**Atenção com o localStorage em produção:** como os dados vivem só no
navegador, cada domínio/dispositivo tem sua própria cópia. Se você
acessar `localhost:5173` durante o desenvolvimento e depois a URL do
Netlify, são dois "bancos de dados" separados — normal, mas vale saber.

## Estrutura

```
src/
  lib/          — datas/timezone, RRULE, layout de sobreposição, parser de
                   linguagem natural, horário livre, sugestão de melhor
                   horário, clima/deslocamento, persistência (localStorage)
  store/        — Context + useReducer com todo o estado da aplicação
  components/   — Header, Sidebar, Toolbar, Drawer, Modal, popovers,
                   assistente de IA, etc.
  components/views/ — DayWeekGrid, MonthView, AgendaView
```

## Próximos passos (fora do escopo desta versão)

- **Persistência multi-dispositivo dos dados locais** — trocar localStorage
  por uma tabela no mesmo Supabase que já guarda o token do Google (os
  eventos locais/tarefas continuam sem sincronizar entre aparelhos por
  enquanto; só a parte do Google já sincroniza de verdade)
- Recorrência empurrada pro Google (RRULE completo na escrita)
- Sincronizar mais de um calendário do Google (hoje só o "primary")
- Recorrência mais completa no Aether (mensal, `count`) — a base (`rrule`)
  já suporta, falta expor na UI
- Acessibilidade: navegação por teclado na grade, `role`/`label` nos
  eventos, focus trap no modal

## Fluxo de atualização

Desde 25/08/2026, o deploy é automático: todo push na branch `main` do
GitHub (`proftiago/aether-calendar`) já dispara um build e publica sozinho
no Netlify — sem precisar baixar zip, rodar build local nem arrastar pasta.
Pra pegar as mudanças no seu PC (uso local/dev), basta `git pull`.
