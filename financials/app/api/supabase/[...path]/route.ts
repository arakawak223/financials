import { NextRequest, NextResponse } from 'next/server'

/**
 * Supabaseプロキシ - CodespacesでブラウザからローカルSupabaseにアクセスするためのプロキシ
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleSupabaseRequest(request, await params)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleSupabaseRequest(request, await params)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleSupabaseRequest(request, await params)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleSupabaseRequest(request, await params)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleSupabaseRequest(request, await params)
}

async function handleSupabaseRequest(
  request: NextRequest,
  params: { path: string[] }
) {
  try {
    const supabaseUrl = 'http://127.0.0.1:54321'
    const path = params.path.join('/')
    const searchParams = request.nextUrl.searchParams.toString()
    const targetUrl = `${supabaseUrl}/${path}${searchParams ? `?${searchParams}` : ''}`

    // リクエストヘッダーをコピー
    const headers = new Headers()
    request.headers.forEach((value, key) => {
      // ホストヘッダーは除外
      if (key.toLowerCase() !== 'host') {
        headers.set(key, value)
      }
    })

    // リクエストボディを取得（GETでない場合）
    let body: string | undefined
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.text()
    }

    // ローカルSupabaseにリクエストを転送
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

    // CORSヘッダーを追加
    responseHeaders.set('Access-Control-Allow-Origin', '*')
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    responseHeaders.set('Access-Control-Allow-Headers', '*')

    const responseBody = await response.text()

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('Supabase proxy error:', error)
    return NextResponse.json(
      {
        error: 'Proxy error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// OPTIONSメソッド（CORS preflight）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  })
}
