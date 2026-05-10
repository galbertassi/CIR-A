'use server'

import { createClient } from '../../lib/supabase/sb-server'
import { prisma } from '../../lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ActionResult } from '@/lib/action-types'

export async function login(formData: FormData) {
  let isRedirect = false
  let errorMsg = null

  try {
    const email = (formData.get('email') as string)?.toLowerCase().trim()
    const password = formData.get('password') as string

    console.log('[Auth] >>> Tentativa de login iniciada:', { email, hasPassword: !!password });

    if (!email || !password) {
      console.warn('[Auth] !!! E-mail ou senha ausentes no formData');
      return { success: false, error: 'E-mail e senha são obrigatórios.' }
    }

    const supabase = await createClient()

    console.log('[Auth] >>> Início da tentativa de login para:', email)

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      const keyPreview = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
        ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 8)}...${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(-4)}`
        : 'AUSENTE';
        
      console.error('[Auth] !!! Erro Supabase signIn:', {
        message: error.message,
        status: error.status,
        name: error.name,
        key_preview: keyPreview
      })

      if (error.message.includes('API key')) {
        errorMsg = `Erro de API Key: A chave no seu arquivo .env parece inválida (Preview: ${keyPreview}). As chaves do Supabase devem ser JWTs começando com 'eyJ'.`
      } else {
        errorMsg = error.message === 'Invalid login credentials' 
          ? 'E-mail ou senha incorretos.' 
          : `Erro de autenticação: ${error.message}`
      }
    } else if (authData.user) {
      console.log('[Auth] >>> Login Supabase OK. User ID:', authData.user.id)
      console.log('[Auth] >>> Metadados do usuário:', authData.user.user_metadata)
      
      // Sincronização com Prisma
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: authData.user.id }
        })

        if (!dbUser) {
          console.warn('[Auth] !!! Usuário ausente no Prisma. Criando perfil...')
          const userCount = await prisma.user.count()
          const newUser = await prisma.user.create({
            data: {
              id: authData.user.id,
              email: authData.user.email || email,
              name: authData.user.user_metadata?.full_name || email.split('@')[0],
              role: userCount === 0 ? 'ADMIN' : 'REGULADOR',
              canCancelPatient: userCount === 0,
              canPrintReports: true,
            }
          })
          console.log('[Auth] >>> Perfil Prisma sincronizado com sucesso:', newUser.id)
        } else {
          console.log('[Auth] >>> Perfil Prisma já existe para este usuário:', dbUser.id)
        }
      } catch (prismaErr) {
        console.error('[Auth] !!! Erro Crítico na sincronização Prisma:', prismaErr)
        // Mesmo com erro no Prisma, permitimos o redirect se o Supabase logou, 
        // mas idealmente o Prisma deveria estar OK.
      }

      isRedirect = true
    } else {
      console.warn('[Auth] !!! Supabase não retornou erro nem usuário.')
      errorMsg = 'Falha desconhecida na autenticação (Supabase retornou vazio).'
    }
  } catch (err: any) {
    if (err.digest?.includes('NEXT_REDIRECT') || err.message?.includes('NEXT_REDIRECT')) {
      throw err
    }
    console.error('[Auth] !!! Erro Excepcional na Action Login:', err)
    errorMsg = 'Erro interno de servidor. Tente novamente mais tarde.'
  }

  if (isRedirect) {
    console.log('[Auth] >>> Redirecionando para Dashboard (/) ...')
    revalidatePath('/', 'layout')
    redirect('/')
  }

  console.log('[Auth] >>> Login falhou. Retornando erro para o cliente.')
  return { success: false, error: errorMsg }
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const confirmEmail = formData.get('confirmEmail') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (email !== confirmEmail) {
    return { success: false, error: 'Os e-mails informados não coincidem.' }
  }

  if (password !== confirmPassword) {
    return { success: false, error: 'As senhas informadas não coincidem.' }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://cir-a-fo1k.vercel.app'}/auth/callback`,
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  if (data.user) {
    try {
      // Bootstrap: If this is the first user, make them ADMIN
      const userCount = await prisma.user.count()
      const isFirstUser = userCount === 0

      // Create local user in Prisma
      await prisma.user.create({
        data: {
          id: data.user.id,
          name: name,
          email: email,
          role: isFirstUser ? 'ADMIN' : 'REGULADOR',
          canCancelPatient: isFirstUser,
          canPrintReports: true, // Todos podem imprimir por padrão
        },
      })
    } catch (e) {
      console.error('Prisma Error:', e)
      // If prisma fails, we might want to delete the supabase user, 
      // but for simplicity we'll just return an error.
    }
  }

  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function sendPasswordResetAction(email: string): Promise<ActionResult> {
  const supabase = await createClient()
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://cir-a-fo1k.vercel.app'
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
  })

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}

export async function updatePasswordAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (password !== confirmPassword) {
    return { success: false, error: 'As senhas não coincidem.' }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { success: false, error: error.message }
  return { success: true, data: undefined }
}
