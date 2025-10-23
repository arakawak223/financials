export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'
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

    // ファイルを一時保存（本番環境ではS3やSupabase Storageを使用）
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const filename = `${randomUUID()}_${file.name}`
    const filepath = join(process.cwd(), 'uploads', filename)

    // アップロードディレクトリがない場合は作成
    try {
      await writeFile(filepath, buffer)
    } catch (error) {
      console.error('File write error:', error)
      // ディレクトリが存在しない場合は作成
      const { mkdir } = await import('fs/promises')
      await mkdir(join(process.cwd(), 'uploads'), { recursive: true })
      await writeFile(filepath, buffer)
    }

    // データベースにファイル情報を保存
    const { data: uploadedFile, error: uploadError } = await supabase
      .from('uploaded_files')
      .insert({
        analysis_id: analysisId,
        file_type: fileType,
        fiscal_year: fiscalYear,
        file_name: file.name,
        file_path: filepath,
        file_size: file.size,
        mime_type: file.type,
        ocr_status: 'pending',
      })
      .select()
      .single()

    if (uploadError) {
      console.error('Database error:', uploadError)
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
