import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: any = null;

/**
 * Cria ou retorna uma instância singleton do cliente Supabase com a Service Role Key.
 * Use APENAS no lado do servidor.
 */
export function createClient() {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log(`[SUPABASE_ADMIN_INIT] Verificando chaves... URL: ${url ? 'OK' : 'AUSENTE'}, KEY: ${key ? 'OK' : 'AUSENTE'}`);

  if (!url || !key) {
    const errorMsg = `Supabase Admin: Variáveis de ambiente ausentes. URL: ${!!url}, KEY: ${!!key}.`;
    console.error(`[SUPABASE_ADMIN_ERROR] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  try {
    supabaseInstance = createSupabaseClient(url.trim(), key.trim(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('[SUPABASE_ADMIN_SUCCESS] Cliente admin pronto.');
    return supabaseInstance;
  } catch (err: any) {
    console.error('[SUPABASE_ADMIN_FATAL] Erro ao instanciar createSupabaseClient:', err.message);
    throw err;
  }
}

// Mantendo compatibilidade com código que usa a constante (via Proxy ou Getter)
export const supabaseAdmin = new Proxy({}, {
  get(target, prop) {
    const client = createClient();
    return (client as any)[prop];
  }
}) as ReturnType<typeof createSupabaseClient>;

