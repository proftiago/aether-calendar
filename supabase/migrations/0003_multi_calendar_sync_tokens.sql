-- Suporte a sincronizar mais de um calendário do Google. Antes só existia
-- 1 syncToken (coluna sync_token, texto) porque só sincronizava o "primary".
-- Agora cada calendário tem seu próprio syncToken, guardado num JSON.
--
-- Como aplicar: cole no SQL Editor do painel do Supabase e rode. Não
-- precisa apagar a coluna antiga (sync_token) — ela só fica sem uso.

alter table google_tokens add column if not exists sync_tokens jsonb not null default '{}'::jsonb;
