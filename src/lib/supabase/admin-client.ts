import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: any = null;

/**
 * Cria ou retorna uma instância singleton do cliente Supabase Admin (Service Role).
 * Inclui fallback robusto para leitura de arquivo .env caso process.env falhe.
 */
export function getAdminClient() {
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
          // Regex que aceita \r\n (Windows) e ignora espaços/aspas
          const match = envContent.match(/^SUPABASE_SERVICE_ROLE_KEY\s*=\s*["']?([^"'\r\n\s]+)["']?\s*$/m);
          
          if (match && match[1]) {
            key = match[1].trim();
            if (key) break;
          }
        }
      }
    } catch (err) {
      console.warn('[SUPABASE_ADMIN_FALLBACK_ERROR]', err);
    }
  }

  if (!url || !key) {
    const errorMsg = `[SUPABASE_ADMIN_ERROR] Credenciais ausentes. Verifique seu arquivo .env.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  supabaseInstance = createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return supabaseInstance;
}

export const supabaseAdmin = getAdminClient();
