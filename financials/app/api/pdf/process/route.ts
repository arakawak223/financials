import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractFinancialDataFromPdf } from '@/lib/utils/pdf-processor'
import type { FileType } from '@/lib/types/financial'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
        file_size: file.size,
        mime_type: file.type,
        ocr_status: 'pending',
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

    // PDFからデータを抽出（非同期処理）
    // 本番環境では、これはバックグラウンドジョブで実行すべき
    try {
      const extractResult = await extractFinancialDataFromPdf(
        file,
        fileType,
        fiscalYear
      )

      // 抽出結果をDBに保存
      const { error: updateError } = await supabase
        .from('uploaded_files')
        .update({
          ocr_status: extractResult.success ? 'completed' : 'failed',
          ocr_result: extractResult,
        })
        .eq('id', fileRecord.id)

      if (updateError) {
        console.error('Update error:', updateError)
      }

      return NextResponse.json({
        success: true,
        fileId: fileRecord.id,
        extractResult,
      })
    } catch (extractError) {
      console.error('Extract error:', extractError)

      // エラーステータスを更新
      await supabase
        .from('uploaded_files')
        .update({
          ocr_status: 'failed',
          ocr_result: {
            success: false,
            errors: [extractError instanceof Error ? extractError.message : 'Unknown error'],
          },
        })
        .eq('id', fileRecord.id)

      return NextResponse.json({
        success: false,
        fileId: fileRecord.id,
        error: 'PDF extraction failed',
      })
    }
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
