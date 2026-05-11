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

  if (!url || !key) {
    console.error(`[SUPABASE_ADMIN_ERROR] Variáveis ausentes: URL=${!!url}, KEY=${!!key}`);
    // Não lançamos erro aqui para não quebrar a avaliação do módulo no build, 
    // mas o cliente não será criado.
    return null;
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
    return null;
  }
}

// Handler para evitar erros de 'undefined' ao acessar propriedades de um cliente nulo
export const supabaseAdmin = new Proxy({}, {
  get(target, prop) {
    const client = createClient();
    if (!client) {
      console.error(`[SUPABASE_ADMIN_PROXY_ERROR] Tentativa de acessar '${String(prop)}' sem cliente inicializado.`);
      return () => { throw new Error("Supabase Admin não inicializado. Verifique as variáveis de ambiente."); };
    }
    return (client as any)[prop];
  }
}) as ReturnType<typeof createSupabaseClient>;

