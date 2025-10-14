import { NextRequest, NextResponse } from 'next/server'

// Supabaseへのプロキシ - クライアントからのリクエストをローカルSupabaseに転送
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

export async function DELETE(
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

async function proxyToSupabase(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await context.params
  const path = params.path.join('/')

  // ローカルSupabase URLを構築
  const supabaseUrl = 'http://127.0.0.1:54321'
  const targetUrl = `${supabaseUrl}/${path}${request.nextUrl.search}`

  // リクエストヘッダーをコピー
  const headers = new Headers()
  request.headers.forEach((value, key) => {
    // Hostヘッダーは除外（新しいホストに自動設定される）
    if (key.toLowerCase() !== 'host') {
      headers.set(key, value)
    }
  })

  // リクエストボディを取得
  let body = null
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      body = await request.text()
    } catch (e) {
      // ボディがない場合は無視
    }
  }

  try {
    // Supabaseにリクエストを転送
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: body || undefined,
    })

    // レスポンスヘッダーをコピー
    const responseHeaders = new Headers()
    response.headers.forEach((value, key) => {
      responseHeaders.set(key, value)
    })

    // レスポンスボディを取得
    const responseBody = await response.arrayBuffer()

    // レスポンスを返す
    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('Supabase proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to Supabase' },
      { status: 500 }
    )
  }
}
