import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('[SUPABASE_CLIENT_ERROR] Variáveis NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes.');
    // Retornamos um cliente "dummy" ou deixamos falhar com erro claro
    return createBrowserClient(url || '', key || '');
  }

  return createBrowserClient(url.trim(), key.trim())
}
