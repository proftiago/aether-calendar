# Publicar o Aether de verdade + sincronizar com o Google Calendar

Esse guia cobre as partes que só dá pra fazer com a sua conta (Google Cloud,
Supabase, Netlify) — o código já está todo pronto no repo. São ~20-30 min,
a maior parte é esperar telas carregarem.

Ordem recomendada: **Supabase → Google Cloud → Supabase de novo (secrets)
→ Netlify → testar**. A pegadinha é que o Google pede a URL da função antes
de ela existir, e a função precisa do Client ID/Secret do Google — então dá
uma volta.

---

## 1. Criar o projeto Supabase

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
   → nome `aether-calendar`, escolha uma senha de banco (guarde, mas não vai
   precisar usar diretamente) e a região mais próxima (`South America (São
   Paulo)` se disponível).
2. Espere o projeto provisionar (~2 min).
3. Em **Project Settings → Data API**, anote a **Project URL** (algo como
   `https://xxxxxxxx.supabase.co`). A URL das funções vai ser essa mesma,
   trocando `.co` por `.co/functions/v1` — ex:
   `https://xxxxxxxx.supabase.co/functions/v1`.

## 2. Rodar a migration (cria a tabela de tokens)

No painel do Supabase, vá em **SQL Editor → New query**, cole o conteúdo de
`supabase/migrations/0001_google_tokens.sql` (está no zip do projeto) e
clique **Run**.

(Se preferir CLI: `supabase link --project-ref xxxxxxxx` e depois
`supabase db push`, mas colar no SQL Editor é mais rápido pra uma tabela só.)

## 3. Criar as credenciais no Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) → crie um
   projeto novo (ou use um existente) → nome sugerido `Aether Calendar`.
2. **APIs & Services → Library** → busque "Google Calendar API" → **Enable**.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External**
   - Nome do app: `Aether Calendar`, seu e-mail em "User support email" e
     "Developer contact"
   - Scopes: adicione `.../auth/calendar` (Google Calendar API — acesso
     completo, necessário pra escrita)
   - Test users: adicione **o seu próprio e-mail do Google**
   - Salve. Não precisa publicar/verificar o app — como é só pra você, fica
     em modo "Testing" indefinidamente (só reautoriza a cada 7 dias nesse
     modo — se isso incomodar, dá pra publicar o app depois sem verificação
     do Google já que o escopo de calendário sozinho não exige verificação
     obrigatória para poucos usuários, mas Testing já resolve o essencial).
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Nome: `Aether Calendar Web`
   - **Authorized redirect URIs** → adicione:
     `https://SEU-PROJETO.supabase.co/functions/v1/google-oauth-callback`
     (troque `SEU-PROJETO` pelo ref do seu projeto Supabase, do passo 1)
   - Create → copie o **Client ID** e o **Client Secret** que aparecem.

## 4. Configurar as secrets do Supabase e fazer deploy das funções

Você precisa do [Supabase CLI](https://supabase.com/docs/guides/cli)
instalado (`npm install -g supabase` ou via pacote do Arch/AUR).

```bash
cd aether-calendar
supabase login
supabase link --project-ref SEU-PROJETO

# gere uma chave só sua pro app se autenticar com as funções:
openssl rand -hex 32
# copie o resultado — vai usar duas vezes: aqui embaixo e no passo 5

supabase secrets set \
  GOOGLE_CLIENT_ID="seu-client-id.apps.googleusercontent.com" \
  GOOGLE_CLIENT_SECRET="seu-client-secret" \
  GOOGLE_REDIRECT_URI="https://SEU-PROJETO.supabase.co/functions/v1/google-oauth-callback" \
  APP_URL="https://SEU-SITE.netlify.app" \
  AETHER_API_KEY="a-chave-que-voce-gerou-com-openssl"

supabase functions deploy google-oauth-callback --no-verify-jwt
supabase functions deploy google-calendar --no-verify-jwt
```

O `--no-verify-jwt` é importante: o Aether não usa Supabase Auth (é um app
pessoal sem login), então as funções precisam aceitar chamadas sem token do
Supabase — a segurança vem da `AETHER_API_KEY` que a própria função checa.

**`APP_URL`** é a URL onde o Aether vai estar publicado (passo 6). Se ainda
não tiver isso, pode colocar um valor provisório e atualizar depois com
`supabase secrets set APP_URL="..."` — não precisa reimplantar as funções
pra isso.

## 5. Configurar o frontend

Crie `.env.local` na raiz do projeto (não é versionado):

```bash
cp .env.example .env.local
```

Preencha:

```
VITE_SUPABASE_FUNCTIONS_URL=https://SEU-PROJETO.supabase.co/functions/v1
VITE_AETHER_API_KEY=a-mesma-chave-do-passo-4
VITE_GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
```

Teste local: `npm run dev -- --host`, abra o app, clique em "Conectar Google
Calendar" no cabeçalho — deve abrir a tela de consentimento do Google.

## 6. Publicar no Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import an
   existing project** → conecte o repo do Aether (ou `netlify deploy --prod`
   via CLI se preferir sem Git).
2. Build command e publish directory já vêm do `netlify.toml` do projeto.
3. Em **Site configuration → Environment variables**, adicione as mesmas
   três variáveis do passo 5 (`VITE_SUPABASE_FUNCTIONS_URL`,
   `VITE_AETHER_API_KEY`, `VITE_GOOGLE_CLIENT_ID`).
4. Deploy. Anote a URL final (ex: `https://aether-calendar.netlify.app`).
5. Atualize o `APP_URL` nas secrets do Supabase com essa URL definitiva:
   ```bash
   supabase secrets set APP_URL="https://aether-calendar.netlify.app"
   ```

## 7. Testar de ponta a ponta

1. Abra a URL do Netlify no celular e no PC.
2. "Adicionar à tela de início" no celular (é a instalação como PWA).
3. Clique em "Conectar Google Calendar", autorize com a conta de teste que
   você adicionou no passo 3.
4. Você deve ser redirecionado de volta pro Aether com "Google Calendar
   conectado" e, em alguns segundos, seus eventos do Google aparecendo.
5. Crie um evento no Aether → confira se ele aparece no Google Calendar de
   verdade. Edite/mova/exclua → confira que reflete lá também.

## Limitações desta primeira versão da sincronização

- Só sincroniza o calendário **principal** (primary) da conta Google — os
  eventos importados entram todos no calendário "Pessoal" do Aether por
  enquanto.
- Eventos **recorrentes criados no Aether** (com "Repetir semanalmente")
  ficam só locais — não são empurrados pro Google ainda. Eventos
  recorrentes que **já existem no Google** chegam certinho (o Google manda
  cada ocorrência já expandida), só não dá pra editar a série inteira por
  esse caminho.
- Sincronização automática a cada 5 min + quando você volta pra aba. Não
  tem "sincronizar agora" manual nesta versão.
- Se o app Google ficar em modo "Testing" (passo 3), o Google pede
  reautorização a cada 7 dias — é só clicar em conectar de novo.
