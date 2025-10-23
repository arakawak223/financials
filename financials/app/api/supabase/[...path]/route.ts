export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyToSupabase(request, context)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyToSupabase(request, context)
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyToSupabase(request, context)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyToSupabase(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyToSupabase(request, context)
}

async function proxyToSupabase(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const params = await context.params
    const path = params.path.join('/')
    const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321'

    // 元のリクエストのクエリパラメータを取得
    const searchParams = request.nextUrl.searchParams.toString()
    const queryString = searchParams ? `?${searchParams}` : ''

    // Supabaseへのプロキシリクエストを構築
    const targetUrl = `${supabaseUrl}/${path}${queryString}`

    console.log(`Proxying request to: ${targetUrl}`)

    // 元のリクエストのヘッダーをコピー
    const headers = new Headers()
    request.headers.forEach((value, key) => {
      // Hostヘッダーは除外（Supabaseのホストに変更される必要がある）
      if (key.toLowerCase() !== 'host') {
        headers.set(key, value)
      }
    })

    // リクエストボディを取得（存在する場合）
    const body = request.method !== 'GET' && request.method !== 'HEAD'
      ? await request.text()
      : undefined

    // Supabaseへリクエストを転送
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    })

    // レスポンスヘッダーをコピー
    const responseHeaders = new Headers()
    response.headers.forEach((value, key) => {
      responseHeaders.set(key, value)
    })

    // レスポンスボディを取得
    const responseBody = await response.text()

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('Supabase proxy error:', error)
    return NextResponse.json(
      { error: 'Proxy error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
