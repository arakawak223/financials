export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const formData = await request.formData()
    const file = formData.get('file') as File
    const companyId = formData.get('companyId') as string
    const fiscalYear = parseInt(formData.get('fiscalYear') as string)
    const planId = formData.get('planId') as string | null
    const periodIndex = parseInt(formData.get('periodIndex') as string || '0') // 0, 1, 2 for 3 periods

    if (!file) {
      return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 400 })
    }
    if (!companyId || !fiscalYear) {
      return NextResponse.json({ error: '必須パラメータが不足しています' }, { status: 400 })
    }

    // ファイルをSupabase Storageにアップロード
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileExtension = file.name.split('.').pop() || 'pdf'
    const sanitizedFileName = `${randomUUID()}.${fileExtension}`
    const filename = `business-plan/${companyId}/${fiscalYear}/period-${periodIndex}/${sanitizedFileName}`

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
        { error: 'ファイルのアップロードに失敗しました', details: storageError.message },
        { status: 500 }
      )
    }

    const { data: urlData } = supabase
      .storage
      .from('financial-pdfs')
      .getPublicUrl(filename)

    // データベースにファイル情報を保存
    const { data: uploadedFile, error: uploadError } = await supabase
      .from('uploaded_files')
      .insert({
        analysis_id: null,
        file_type: 'financial_statement',
        fiscal_year: fiscalYear,
        file_name: file.name,
        file_path: uploadData.path,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        ocr_status: 'pending',
        data_type: 'historical',
      })
      .select()
      .single()

    if (uploadError) {
      console.error('Database error:', uploadError)
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
      periodIndex,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'アップロードエラー' },
      { status: 500 }
    )
  }
}
