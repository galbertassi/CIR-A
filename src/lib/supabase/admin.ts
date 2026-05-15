import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: any = null;

/**
 * Cria ou retorna uma instância singleton do cliente Supabase com a Service Role Key.
 * Use APENAS no lado do servidor.
 */
export function createClient() {
  if (supabaseInstance) return supabaseInstance;

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  let key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const isServer = typeof window === 'undefined';

  // LOG DE DEPURAÇÃO INICIAL (Apenas em dev/servidor)
  if (isServer) {
    console.log(`[SUPABASE_ADMIN_INIT] Verificando env... URL=${!!url} (${url.length} chars), KEY_ENV=${!!key} (${key.length} chars)`);
    if (!key) {
      console.warn('[SUPABASE_ADMIN_WARN] SUPABASE_SERVICE_ROLE_KEY não encontrada no process.env');
    }
  }

  // FALLBACK DE SEGURANÇA: Leitura direta do arquivo .env se o Next.js falhar no carregamento
  if (!key && isServer) {
    try {
      const fs = require('fs');
      const path = require('path');
      const rootDir = process.cwd();
      const envPaths = [
        path.join(rootDir, '.env'),
        path.join(rootDir, '.env.local'),
        path.resolve('.env')
      ];
      
      for (const envPath of envPaths) {
        if (fs.existsSync(envPath)) {
          console.log(`[SUPABASE_ADMIN_FALLBACK] Tentando ler: ${envPath}`);
          const envContent = fs.readFileSync(envPath, 'utf8');
          const lines = envContent.split(/\r?\n/);
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
              const rawValue = trimmedLine.substring('SUPABASE_SERVICE_ROLE_KEY='.length);
              key = rawValue.trim().replace(/^["']|["']$/g, '');
              if (key) {
                console.log(`[SUPABASE_ADMIN_FALLBACK_SUCCESS] Chave recuperada de ${path.basename(envPath)}. Len=${key.length}`);
                break;
              }
            }
          }
          if (key) break;
        }
      }
    } catch (err) {
      console.warn('[SUPABASE_ADMIN_FALLBACK_ERROR] Falha ao ler .env manualmente:', err);
    }
  }

  if (!url || !key) {
    const envKeys = Object.keys(process.env).filter(k => k.includes('SUPABASE'));
    const errorMsg = `[SUPABASE_ADMIN_ERROR] Variáveis ausentes. isServer=${isServer}, URL=${!!url} (${url.length} chars), KEY=${!!key} (${key.length} chars). Encontradas no process.env: [${envKeys.join(', ')}].\nIMPORTANTE: Verifique se a variável SUPABASE_SERVICE_ROLE_KEY está definida no .env ou no dashboard da Vercel.`;
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


