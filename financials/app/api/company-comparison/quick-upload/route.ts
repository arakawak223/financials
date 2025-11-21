export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60秒のタイムアウト

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

/**
 * 企業間比較分析用の簡易PDFアップロード・処理
 * 新規企業登録時に決算書PDFをアップロードして、PL項目のみを抽出する
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // FormDataからパラメータを取得
    const formData = await request.formData()
    const file = formData.get('file') as File
    const companyId = formData.get('companyId') as string
    const fiscalYear = parseInt(formData.get('fiscalYear') as string)

    // バリデーション
    if (!file) {
      return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 400 })
    }
    if (!companyId || !fiscalYear) {
      return NextResponse.json({ error: '必須パラメータが不足しています' }, { status: 400 })
    }

    console.log('📤 企業間比較用PDF処理開始')
    console.log('  companyId:', companyId)
    console.log('  fiscalYear:', fiscalYear)
    console.log('  fileName:', file.name)

    // Step 1: ファイルをSupabase Storageにアップロード
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileExtension = file.name.split('.').pop() || 'pdf'
    const sanitizedFileName = `${randomUUID()}.${fileExtension}`
    const filename = `company-comparison/${companyId}/${fiscalYear}/${sanitizedFileName}`

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

    // 公開URLを取得
    const { data: urlData } = supabase
      .storage
      .from('financial-pdfs')
      .getPublicUrl(filename)

    // Step 2: 軽量な財務分析レコードを作成（企業間比較専用）
    const { data: existingAnalysis } = await supabase
      .from('financial_analyses')
      .select('id')
      .eq('company_id', companyId)
      .eq('analysis_purpose', 'comparison_only')
      .single()

    let analysisId: string

    if (existingAnalysis) {
      // 既存の比較専用分析がある場合は再利用
      analysisId = existingAnalysis.id
      console.log('  既存の比較用分析を使用:', analysisId)
    } else {
      // 新規作成
      const { data: newAnalysis, error: analysisError } = await supabase
        .from('financial_analyses')
        .insert({
          company_id: companyId,
          fiscal_year_start: fiscalYear,
          fiscal_year_end: fiscalYear,
          periods_count: 1,
          status: 'completed',
          analysis_purpose: 'comparison_only', // 比較専用フラグ
        })
        .select('id')
        .single()

      if (analysisError) {
        console.error('Analysis create error:', analysisError)
        return NextResponse.json(
          { error: '分析レコードの作成に失敗しました', details: analysisError.message },
          { status: 500 }
        )
      }

      analysisId = newAnalysis.id
      console.log('  新規比較用分析を作成:', analysisId)
    }

    // Step 3: 会計期間を作成
    const { data: existingPeriod } = await supabase
      .from('financial_periods')
      .select('id')
      .eq('analysis_id', analysisId)
      .eq('fiscal_year', fiscalYear)
      .single()

    let periodId: string

    if (existingPeriod) {
      periodId = existingPeriod.id
      console.log('  既存の期間を使用:', periodId)
    } else {
      const { data: newPeriod, error: periodError } = await supabase
        .from('financial_periods')
        .insert({
          analysis_id: analysisId,
          fiscal_year: fiscalYear,
          period_start_date: `${fiscalYear}-01-01`,
          period_end_date: `${fiscalYear}-12-31`,
        })
        .select('id')
        .single()

      if (periodError) {
        console.error('Period create error:', periodError)
        return NextResponse.json(
          { error: '期間レコードの作成に失敗しました', details: periodError.message },
          { status: 500 }
        )
      }

      periodId = newPeriod.id
      console.log('  新規期間を作成:', periodId)
    }

    // Step 4: uploaded_filesテーブルに記録
    const { data: uploadedFile, error: uploadError } = await supabase
      .from('uploaded_files')
      .insert({
        analysis_id: analysisId,
        file_type: 'financial_statement',
        fiscal_year: fiscalYear,
        file_name: file.name,
        file_path: uploadData.path,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        ocr_status: 'pending',
        data_type: 'actual', // 実績データ
      })
      .select()
      .single()

    if (uploadError) {
      console.error('Database error:', uploadError)
      await supabase.storage.from('financial-pdfs').remove([filename])
      return NextResponse.json(
        { error: 'ファイル情報の保存に失敗しました', details: uploadError.message },
        { status: 500 }
      )
    }

    console.log('✅ PDF処理メタデータ作成完了')

    // クライアント側で引き続きOCR・AI抽出を行うため、必要な情報を返却
    return NextResponse.json({
      success: true,
      file: uploadedFile,
      fileUrl: urlData.publicUrl,
      analysisId,
      periodId,
    })
  } catch (error) {
    console.error('Quick upload error:', error)
    return NextResponse.json(
      { error: 'アップロードエラー' },
      { status: 500 }
    )
  }
}
