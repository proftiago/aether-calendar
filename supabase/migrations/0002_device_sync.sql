-- Sincronização de dados locais (tarefas, calendários, configurações) entre
-- dispositivos. Cada "código de sincronização" (sync_id) é uma chave
-- gerada no navegador — funciona como uma senha compartilhada: quem tiver
-- o código consegue ler/escrever essa linha. Não é uma tabela de multi-tenant
-- com autenticação de verdade — é deliberadamente simples pra um app de uso
-- pessoal com poucos dispositivos, não pra múltiplos usuários.
--
-- Como aplicar: cole este arquivo inteiro no SQL Editor do painel do
-- Supabase (projeto aabcxhfzxpgtaikhqrdq) e rode. Não precisa mexer em
-- mais nada além disso.

create table if not exists aether_sync_data (
  sync_id text primary key,
  tasks jsonb not null default '[]'::jsonb,
  calendars jsonb not null default '[]'::jsonb,
  calendar_sets jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table aether_sync_data enable row level security;

-- Qualquer um com a anon key e o sync_id certo pode ler/escrever a própria
-- linha (identificada pelo sync_id, que o cliente já precisa conhecer pra
-- fazer a query). Isso é intencional: o "segredo" é o sync_id em si (um
-- UUID longo, não adivinhável), não uma sessão de usuário autenticado.
create policy "read own sync row" on aether_sync_data
  for select using (true);

create policy "upsert own sync row" on aether_sync_data
  for insert with check (true);

create policy "update own sync row" on aether_sync_data
  for update using (true);
