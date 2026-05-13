import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: any = null;

/**
 * Cria ou retorna uma instância singleton do cliente Supabase com a Service Role Key.
 * Use APENAS no lado do servidor.
 */
export function createClient() {
  if (supabaseInstance) return supabaseInstance;

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const isServer = typeof window === 'undefined';

  const envKeys = Object.keys(process.env).filter(k => k.includes('SUPABASE'));
  console.log(`[SUPABASE_ADMIN_DEBUG] isServer=${isServer}, url_len=${url.length}, key_len=${key.length}, envKeys=[${envKeys.join(', ')}]`);

  if (!url || !key) {
    const errorMsg = `[SUPABASE_ADMIN_ERROR] Variáveis ausentes. isServer=${isServer}, URL=${!!url} (${url.length} chars), KEY=${!!key} (${key.length} chars). Encontradas: [${envKeys.join(', ')}]. Verifique o .env e REINICIE o servidor.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    supabaseInstance = createSupabaseClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('[SUPABASE_ADMIN_SUCCESS] Cliente admin pronto.');
    return supabaseInstance;
  } catch (err: any) {
    console.error('[SUPABASE_ADMIN_FATAL]', err.message);
    throw err;
  }
}

/**
 * Proxy para o cliente Supabase Admin.
 * Tenta inicializar o cliente no primeiro acesso e lança erro se falhar.
 */
export const supabaseAdmin = new Proxy({} as any, {
  get(target, prop) {
    const client = createClient();
    const value = client[prop];
    
    // Se for uma função (como .from, .auth, etc), vinculamos ao contexto do cliente
    if (typeof value === 'function') {
      return value.bind(client);
    }
    
    return value;
  }
}) as ReturnType<typeof createSupabaseClient>;


