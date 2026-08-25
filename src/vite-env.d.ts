/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_FUNCTIONS_URL?: string;
  readonly VITE_AETHER_API_KEY?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
