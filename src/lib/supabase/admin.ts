import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: any = null;

/**
 * Cria ou retorna uma instância singleton do cliente Supabase com a Service Role Key.
 * Inclui fallback robusto para leitura do arquivo .env.
 */
export function createClient() {
  if (supabaseInstance) return supabaseInstance;

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  let key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const isServer = typeof window === 'undefined';

  // FALLBACK: Leitura direta do .env se estiver no servidor e a chave estiver vazia
  if (!key && isServer) {
    try {
      const fs = require('fs');
      const path = require('path');
      const rootDir = process.cwd();
      
      const envPaths = [
        path.join(rootDir, '.env'),
        path.join(rootDir, '.env.local'),
        '.env',
        '.env.local'
      ];
      
      for (const envPath of envPaths) {
        const absolutePath = path.isAbsolute(envPath) ? envPath : path.resolve(rootDir, envPath);
        if (fs.existsSync(absolutePath)) {
          const envContent = fs.readFileSync(absolutePath, 'utf8');
          const match = envContent.match(/^SUPABASE_SERVICE_ROLE_KEY\s*=\s*["']?([^"'\r\n\s]+)["']?\s*$/m);
          if (match && match[1]) {
            key = match[1].trim();
            if (key) break;
          }
        }
      }
    } catch (err) {
      // Silencioso durante build
    }
  }

  // Não lançar erro aqui para evitar quebra do 'npm run build' na Vercel/CI
  if (!url || !key) {
    return null;
  }

  supabaseInstance = createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return supabaseInstance;
}

/**
 * Proxy para o cliente Supabase Admin.
 * A inicialização é tardia (lazy) para suportar ambientes de build onde as envs 
 * podem não estar presentes momentaneamente.
 */
export const supabaseAdmin = new Proxy({} as any, {
  get(target, prop) {
    const client = createClient();
    
    if (!client) {
      throw new Error(
        `[SUPABASE_ADMIN_ERROR] Credenciais ausentes. Verifique seu arquivo .env.`
      );
    }

    const value = client[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
}) as ReturnType<typeof createSupabaseClient>;
