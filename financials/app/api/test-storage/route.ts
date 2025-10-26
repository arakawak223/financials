export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Supabase接続テスト
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Auth status:', user ? 'Authenticated' : 'Not authenticated')
    console.log('Auth error:', authError)

    // 2. Storageバケット一覧取得
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets()

    console.log('Buckets:', buckets)
    console.log('Buckets error:', bucketsError)

    // 3. financial-pdfsバケットの確認
    const targetBucket = buckets?.find(b => b.name === 'financial-pdfs')
    console.log('Target bucket found:', !!targetBucket)

    // 4. バケット内のファイル一覧取得（テスト）
    let filesError = null
    let filesList = null
    if (targetBucket) {
      const { data: files, error } = await supabase
        .storage
        .from('financial-pdfs')
        .list()
      filesError = error
      filesList = files
      console.log('Files in bucket:', files)
      console.log('Files error:', error)
    }

    return NextResponse.json({
      success: true,
      auth: {
        authenticated: !!user,
        error: authError?.message
      },
      storage: {
        buckets: buckets?.map(b => ({
          name: b.name,
          id: b.id,
          public: b.public
        })),
        bucketsError: bucketsError?.message,
        targetBucketExists: !!targetBucket,
        filesInBucket: filesList?.length || 0,
        filesError: filesError?.message
      },
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    })
  } catch (error) {
    console.error('Test storage error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
