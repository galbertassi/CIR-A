import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Configuração do Supabase (URL/KEY) não encontrada. Verifique as variáveis de ambiente.')
  }

  return createServerClient(
    supabaseUrl.trim(),
    supabaseAnonKey.trim(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (error) {
            // Isso acontece se for chamado de um Server Component
            // Mas em Server Actions e Route Handlers deve funcionar.
          }
        },
      },
    }
  )
}
