import { createClient } from '@supabase/supabase-js';

// Mesmo projeto Supabase já usado pro token do Google (aabcxhfzxpgtaikhqrdq).
// A anon key é pública por natureza (protegida pela política de RLS da
// tabela aether_sync_data, não por estar "escondida") — mas eu não tenho
// essa chave salva, então ela vem de variável de ambiente, do mesmo jeito
// que as outras credenciais do projeto (ver .env.example).
const SUPABASE_URL = 'https://aabcxhfzxpgtaikhqrdq.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export function isSyncConfigured(): boolean {
  return !!SUPABASE_ANON_KEY;
}
