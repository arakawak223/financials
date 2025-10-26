export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const params = await context.params
    const analysisId = params.id

    // FormDataからファイルを取得
    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileType = formData.get('fileType') as string
    const fiscalYear = parseInt(formData.get('fiscalYear') as string)

    if (!file) {
      return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 400 })
    }

    // ファイルをSupabase Storageにアップロード
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // ファイル名をサニタイズ（日本語や特殊文字を除去）
    const fileExtension = file.name.split('.').pop() || 'pdf'
    const sanitizedFileName = `${randomUUID()}.${fileExtension}`
    const filename = `${analysisId}/${fiscalYear}/${fileType}/${sanitizedFileName}`

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
      console.error('Storage error details:', JSON.stringify(storageError, null, 2))
      console.error('Bucket name:', 'financial-pdfs')
      console.error('Filename:', filename)
      return NextResponse.json(
        {
          error: 'ファイルのアップロードに失敗しました',
          details: storageError.message,
          errorCode: storageError.name,
          bucket: 'financial-pdfs'
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
        analysis_id: analysisId,
        file_type: fileType,
        fiscal_year: fiscalYear,
        file_name: file.name,
        file_path: uploadData.path,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        ocr_status: 'pending',
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
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'アップロードエラー' },
      { status: 500 }
    )
  }
}
