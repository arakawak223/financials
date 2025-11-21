export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60秒のタイムアウト

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // FormDataからパラメータを取得
    const formData = await request.formData()
    const file = formData.get('file') as File
    const companyId = formData.get('companyId') as string
    const periodId = formData.get('periodId') as string
    const fiscalYear = parseInt(formData.get('fiscalYear') as string)
    const dataType = formData.get('dataType') as string // 'budget' | 'actual'

    // バリデーション
    if (!file) {
      return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 400 })
    }
    if (!companyId || !periodId || !fiscalYear || !dataType) {
      return NextResponse.json({ error: '必須パラメータが不足しています' }, { status: 400 })
    }
    if (!['budget', 'actual'].includes(dataType)) {
      return NextResponse.json({ error: 'dataTypeは"budget"または"actual"である必要があります' }, { status: 400 })
    }

    // ファイルをSupabase Storageにアップロード
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // ファイル名をサニタイズ（日本語や特殊文字を除去）
    const fileExtension = file.name.split('.').pop() || 'pdf'
    const sanitizedFileName = `${randomUUID()}.${fileExtension}`
    const filename = `budget-vs-actual/${companyId}/${fiscalYear}/${dataType}/${sanitizedFileName}`

    // Supabase Storageにアップロード
    const { data: uploadData, error: storageError } = await supabase
      .storage
      .from('financial-pdfs')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (storageError) {
      console.error('Storage upload error:', storageError)
      return NextResponse.json(
        {
          error: 'ファイルのアップロードに失敗しました',
          details: storageError.message,
        },
        { status: 500 }
      )
    }

    // 公開URLを取得
    const { data: urlData } = supabase
      .storage
      .from('financial-pdfs')
      .getPublicUrl(filename)

    // データベースにファイル情報を保存
    const { data: uploadedFile, error: uploadError } = await supabase
      .from('uploaded_files')
      .insert({
        analysis_id: null, // 予算実績分析ではanalysis_idは使用しない
        file_type: dataType === 'budget' ? 'budget_statement' : 'financial_statement',
        fiscal_year: fiscalYear,
        file_name: file.name,
        file_path: uploadData.path,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        ocr_status: 'pending',
        data_type: dataType, // 予算/実績の区分
      })
      .select()
      .single()

    if (uploadError) {
      console.error('Database error:', uploadError)
      // アップロードしたファイルを削除
      await supabase.storage.from('financial-pdfs').remove([filename])
      return NextResponse.json(
        { error: 'ファイル情報の保存に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      file: uploadedFile,
      fileUrl: urlData.publicUrl,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'アップロードエラー' },
      { status: 500 }
    )
  }
}
