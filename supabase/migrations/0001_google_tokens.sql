-- Aether Calendar — armazenamento do token do Google (uso pessoal, single-user)
--
-- Só existe uma linha ("default"), guardada aqui porque o app roda sem
-- Supabase Auth (é de uso pessoal). Ninguém além das Edge Functions (que
-- usam a service_role key, nunca exposta ao navegador) consegue ler ou
-- escrever nesta tabela — RLS está ligado e não existe nenhuma policy,
-- então o acesso via anon/authenticated key fica bloqueado por padrão.

create table if not exists google_tokens (
  id text primary key default 'default',
  access_token text not null,
  refresh_token text not null,
  expiry timestamptz not null,
  scope text,
  sync_token text,
  updated_at timestamptz not null default now()
);

alter table google_tokens enable row level security;
-- Nenhuma policy criada de propósito: apenas a service_role (usada nas
-- Edge Functions) consegue acessar esta tabela.
