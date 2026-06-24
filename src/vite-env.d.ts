/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_FINNHUB_API_KEY?: string;
  readonly VITE_PUBLIC_ONLY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
