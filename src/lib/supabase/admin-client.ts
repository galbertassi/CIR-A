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
      // Silencioso durante build para não quebrar a CI
    }
  }

  // Se as variáveis ainda estiverem ausentes, retornamos null ou lançamos erro APENAS se for uma tentativa de uso real
  // Para o build do Next.js, não podemos lançar erro no nível do módulo.
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
 * A inicialização é "preguiçosa" (lazy): só ocorre quando o cliente é efetivamente utilizado.
 * Isso evita que o 'npm run build' quebre na Vercel/CI caso as variáveis de ambiente 
 * não estejam disponíveis no momento da compilação.
 */
export const supabaseAdmin = new Proxy({} as any, {
  get(target, prop) {
    const client = getAdminClient();
    
    if (!client) {
      throw new Error(
        `[SUPABASE_ADMIN_ERROR] Tentativa de usar supabaseAdmin sem credenciais configuradas. ` +
        `Verifique SUPABASE_SERVICE_ROLE_KEY no seu ambiente.`
      );
    }

    const value = client[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
}) as ReturnType<typeof createSupabaseClient>;
