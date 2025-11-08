export const dynamic = 'force-dynamic';
export const maxDuration = 60; // PDF処理のため最大60秒に設定
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { FileType } from '@/lib/types/financial'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック（開発中は一時的に無効化）
    /*
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    */

    // フォームデータを取得
    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileType = formData.get('fileType') as FileType
    const fiscalYear = parseInt(formData.get('fiscalYear') as string)
    const analysisId = formData.get('analysisId') as string

    if (!file || !fileType || !fiscalYear || !analysisId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // PDFをSupabase Storageにアップロード
    const fileName = `${analysisId}/${fiscalYear}_${fileType}_${Date.now()}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('financial-pdfs')
      .upload(fileName, file, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload PDF' },
        { status: 500 }
      )
    }

    // ファイル情報をDBに保存
    const { data: fileRecord, error: fileError } = await supabase
      .from('uploaded_files')
      .insert({
        analysis_id: analysisId,
        file_type: fileType,
        fiscal_year: fiscalYear,
        file_name: file.name,
        file_path: uploadData.path,
        file_size_bytes: file.size,
        ocr_applied: false,
        uploaded_by: null, // 認証無効化中はnull
      })
      .select()
      .single()

    if (fileError) {
      console.error('File record error:', fileError)
      return NextResponse.json(
        { error: 'Failed to save file record' },
        { status: 500 }
      )
    }

    // PDF処理はクライアントサイドで行われる
    // このエンドポイントはファイルのアップロードのみを担当
    return NextResponse.json({
      success: true,
      fileId: fileRecord.id,
      message: 'File uploaded successfully. Please process on client side.',
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
