export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'

export async function GET() {
  // セキュリティのため、APIキーの一部のみ表示
  const openaiKey = process.env.OPENAI_API_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anthropicKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercel: process.env.VERCEL ? 'true' : 'false',
    vercelEnv: process.env.VERCEL_ENV || 'not set',
    envVars: {
      OPENAI_API_KEY: openaiKey ? {
        exists: true,
        length: openaiKey.length,
        prefix: openaiKey.substring(0, 7),
        suffix: openaiKey.substring(openaiKey.length - 4)
      } : {
        exists: false,
        value: 'NOT SET'
      },
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? {
        exists: true,
        value: supabaseUrl
      } : {
        exists: false
      },
      NEXT_PUBLIC_ANTHROPIC_API_KEY: anthropicKey ? {
        exists: true,
        length: anthropicKey.length,
        prefix: anthropicKey.substring(0, 7)
      } : {
        exists: false
      }
    }
  })
}
