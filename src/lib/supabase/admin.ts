import { createClient } from '@supabase/supabase-js'

let supabaseInstance: any = null;

export const supabaseAdmin = new Proxy({}, {
  get(target, prop) {
    if (!supabaseInstance) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!url || !key) {
        throw new Error('Supabase Admin: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas.');
      }
      
      supabaseInstance = createClient(url, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    }
    return supabaseInstance[prop];
  }
}) as ReturnType<typeof createClient>;
