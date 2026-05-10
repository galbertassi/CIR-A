import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  return NextResponse.json({
    supabase: {
      url: supabaseUrl ? `${supabaseUrl.substring(0, 15)}...` : 'MISSING',
      key: supabaseKey ? `${supabaseKey.substring(0, 10)}...` : 'MISSING',
      keyLength: supabaseKey ? supabaseKey.length : 0,
    },
    siteUrl: siteUrl || 'MISSING',
    nodeEnv: process.env.NODE_ENV,
  })
}
