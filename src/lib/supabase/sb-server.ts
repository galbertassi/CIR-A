import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  let supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  let supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  const isServer = typeof window === 'undefined';

  if ((!supabaseUrl || !supabaseAnonKey) && isServer) {
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

      for (const envPath of envPaths) {
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf8');
          
          if (!supabaseUrl) {
            const matchUrl = envContent.match(/^\s*NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^"'\r\n\s#]+)["']?/m);
            if (matchUrl && matchUrl[1]) {
              supabaseUrl = matchUrl[1].trim();
            }
          }

          if (!supabaseAnonKey) {
            const matchKey = envContent.match(/^\s*NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*["']?([^"'\r\n\s#]+)["']?/m);
            if (matchKey && matchKey[1]) {
              supabaseAnonKey = matchKey[1].trim();
            }
          }

          if (supabaseUrl && supabaseAnonKey) break;
        }
      }
    } catch (err: any) {
      console.warn(`[SUPABASE_SERVER_WARN] Falha no fallback FS: ${err.message}`);
    }
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    const errorMsg = `[SUPABASE_SERVER_ERROR] Variáveis ausentes: ${!supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL ' : ''}${!supabaseAnonKey ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : ''}. Verifique seu arquivo .env ou as Configurações da Vercel.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch (error) {
            console.log(error)
          }
        },
      },
    }
  )
}