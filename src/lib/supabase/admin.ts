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
    console.log(`[SUPABASE_ADMIN_INIT] Verificando env... URL=${!!url}, KEY_ENV=${!!key}`);
  }

  // FALLBACK DE SEGURANÇA: Leitura direta do arquivo .env se o Next.js falhar no carregamento
  if (!key && isServer) {
    try {
      const fs = require('fs');
      const path = require('path');
      const rootDir = process.cwd();
      const envPath = path.join(rootDir, '.env');
      
      console.log(`[SUPABASE_ADMIN_FALLBACK] Tentando ler .env em: ${envPath}`);
      
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split(/\r?\n/);
        
        // Tenta encontrar a chave com regex para ser mais flexível
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
            const rawValue = trimmedLine.substring('SUPABASE_SERVICE_ROLE_KEY='.length);
            key = rawValue.trim().replace(/^["']|["']$/g, '');
            if (key) {
              console.log(`[SUPABASE_ADMIN_FALLBACK_SUCCESS] Chave recuperada via FS. Len=${key.length}`);
              break;
            }
          }
        }
      } else {
        console.warn(`[SUPABASE_ADMIN_FALLBACK_WARN] Arquivo .env não encontrado.`);
      }
    } catch (err) {
      console.warn('[SUPABASE_ADMIN_FALLBACK_ERROR] Falha ao ler .env manualmente:', err);
    }
  }

  if (!url || !key) {
    const envKeys = Object.keys(process.env).filter(k => k.includes('SUPABASE'));
    const errorMsg = `[SUPABASE_ADMIN_ERROR] Variáveis ausentes. isServer=${isServer}, URL=${!!url} (${url.length} chars), KEY=${!!key} (${key.length} chars). Encontradas no process.env: [${envKeys.join(', ')}]. Verifique o .env e REINICIE o servidor.`;
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


