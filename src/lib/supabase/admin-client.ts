import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: any = null;

/**
 * Cria ou retorna uma instância singleton do cliente Supabase Admin (Service Role).
 */
export function getAdminClient() {
  if (supabaseInstance) return supabaseInstance;

  let url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  let key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_SERVICE_KEY || 
    process.env.SERVICE_ROLE_KEY || 
    ''
  ).trim();
  const isServer = typeof window === 'undefined';
  
  // Detecta se estamos na fase de build do Next.js ou se é um worker
  const isBuild = process.env.NEXT_PHASE === 'phase-production-build' || 
                  process.env.CI === 'true' ||
                  (process.env.NODE_ENV === 'production' && !process.env.SUPABASE_SERVICE_ROLE_KEY && isServer);

  // FALLBACK: Leitura direta do .env se estiver no servidor e a chave ou url estiverem vazias
  if ((!key || !url) && isServer) {
    try {
      const fs = require('fs');
      const path = require('path');
      const rootDir = process.cwd();
      
      const envPaths = [
        path.join(rootDir, '.env'),
        path.join(rootDir, '.env.local'),
        path.join(rootDir, '.env.production'),
        path.resolve(rootDir, '.env'),
        path.join(rootDir, '..', '.env'),
      ];
      
      console.log(`[SUPABASE_ADMIN_DEBUG] Chaves ou URL ausentes. Tentando fallback FS. Root: ${rootDir}`);

      for (const envPath of envPaths) {
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf8');
          // Regex mais agressiva: ignora comentários, espaços e aceita aspas simples/duplas
          if (!key) {
            const regexes = [
              /^\s*SUPABASE_SERVICE_ROLE_KEY\s*=\s*["']?([^"'\r\n\s#]+)["']?/m,
              /^\s*SUPABASE_SERVICE_KEY\s*=\s*["']?([^"'\r\n\s#]+)["']?/m,
              /^\s*SERVICE_ROLE_KEY\s*=\s*["']?([^"'\r\n\s#]+)["']?/m
            ];

            for (const r of regexes) {
              const match = envContent.match(r);
              if (match && match[1]) {
                key = match[1].trim();
                if (key) {
                  console.log(`[SUPABASE_ADMIN_INIT] Chave carregada via fallback FS: ${envPath}`);
                  break;
                }
              }
            }
          }

          if (!url) {
            const matchUrl = envContent.match(/^\s*NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^"'\r\n\s#]+)["']?/m);
            if (matchUrl && matchUrl[1]) {
              url = matchUrl[1].trim();
              console.log(`[SUPABASE_ADMIN_INIT] URL carregada via fallback FS: ${envPath}`);
            }
          }

          if (key && url) break;
        }
      }
    } catch (err: any) {
      console.warn(`[SUPABASE_ADMIN_WARN] Falha no fallback FS: ${err.message}`);
    }
  }

  if (!url || !key) {
    const msg = `[SUPABASE_ADMIN_ERROR] Credenciais ausentes. URL=${url ? 'OK' : 'MISSING'}, KEY=${key ? 'OK' : 'MISSING'}.`;

    if (isBuild) {
      console.warn(`[SUPABASE_ADMIN_BUILD_WARN] Suprimindo erro durante build: ${msg}`);
      return null;
    }
    
    console.error(msg);
    return null;
  }

  try {
    supabaseInstance = createSupabaseClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    return supabaseInstance;
  } catch (err) {
    console.error('[SUPABASE_ADMIN_FATAL] Falha ao inicializar cliente:', err);
    return null;
  }
}

/**
 * Proxy "Preguiçoso" (Lazy) para o cliente Supabase Admin.
 * Protege o build e adia a inicialização para o momento do uso.
 */
export const supabaseAdmin = new Proxy({} as any, {
  get(target, prop) {
    if (typeof prop === 'symbol' || prop === 'inspect' || prop === 'then' || prop === 'constructor' || prop === 'prototype') {
      return undefined;
    }

    const client = getAdminClient();
    
    if (!client) {
      const isBuild = process.env.NEXT_PHASE === 'phase-production-build' || process.env.CI === 'true';

      if (isBuild) {
        // DURANTE O BUILD: Retorna um Proxy "Dummy" que aceita tudo
        const noopProxy: any = new Proxy(() => noopProxy, {
          get: () => noopProxy,
          apply: () => noopProxy
        });
        return noopProxy;
      }

      // EM RUNTIME: Lança erro apenas se REALMENTE tentar usar o cliente sem chaves
      throw new Error(`[SUPABASE_ADMIN_ERROR] Credenciais ausentes no servidor. Verifique o arquivo .env.`);
    }

    const value = client[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
}) as ReturnType<typeof createSupabaseClient>;

export const createClient = getAdminClient;


