-- Fecha um buraco real: a tabela aether_sync_data (sincronização entre
-- dispositivos) foi criada antes de Notas/Hábitos/Páginas existirem no
-- app. Esses três recursos nunca foram incluídos na sincronização —
-- hoje eles só vivem no armazenamento local do navegador, sem backup
-- nenhum (o Google Calendar só protege eventos). Essa migração adiciona
-- as colunas que faltam pra fechar esse buraco.
--
-- Como aplicar: cole no SQL Editor do painel do Supabase (mesmo projeto
-- de sempre, aabcxhfzxpgtaikhqrdq) e rode.

alter table aether_sync_data add column if not exists notes jsonb not null default '[]'::jsonb;
alter table aether_sync_data add column if not exists habits jsonb not null default '[]'::jsonb;
alter table aether_sync_data add column if not exists pages jsonb not null default '[]'::jsonb;
