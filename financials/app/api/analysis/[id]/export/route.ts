export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exportToExcel } from '@/lib/utils/excel-exporter'
import { exportToPowerPoint } from '@/lib/utils/powerpoint-exporter'
import type { FinancialAnalysis, PeriodFinancialData } from '@/lib/types/financial'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const params = await context.params
    const analysisId = params.id

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

    // リクエストボディから出力形式を取得
    const body = await request.json()
    const { format } = body // 'excel' または 'powerpoint'

    if (!format || (format !== 'excel' && format !== 'powerpoint')) {
      return NextResponse.json(
        { error: 'Invalid format. Use "excel" or "powerpoint"' },
        { status: 400 }
      )
    }

    // 分析データを取得（/api/analysis/[id]/route.ts と同じロジック）
    const { data: analysis, error: analysisError } = await supabase
      .from('financial_analyses')
      .select('*, companies(name, industry_id)')
      .eq('id', analysisId)
      .single()

    if (analysisError || !analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      )
    }

    // 期間データを取得
    const { data: periodsData, error: periodsError } = await supabase
      .from('financial_periods')
      .select(
        `
        *,
        balance_sheet_items(*),
        profit_loss_items(*),
        manual_inputs(*),
        financial_metrics(*)
      `
      )
      .eq('analysis_id', analysisId)
      .order('fiscal_year', { ascending: true })

    if (periodsError) {
      console.error('Periods fetch error:', periodsError)
      return NextResponse.json(
        { error: 'Failed to fetch periods' },
        { status: 500 }
      )
    }

    // コメントを取得
    const { data: commentsData } = await supabase
      .from('analysis_comments')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('display_order', { ascending: true })

    // データを変換
    const periods: PeriodFinancialData[] =
      periodsData?.map((p) => ({
        fiscalYear: p.fiscal_year,
        periodStartDate: p.period_start_date
          ? new Date(p.period_start_date)
          : undefined,
        periodEndDate: p.period_end_date
          ? new Date(p.period_end_date)
          : undefined,
        balanceSheet: p.balance_sheet_items || {},
        profitLoss: p.profit_loss_items || {},
        manualInputs: {
          depreciation: Array.isArray(p.manual_inputs)
            ? p.manual_inputs.find(
                (m: { input_type: string; amount?: number }) =>
                  m.input_type === 'depreciation'
              )?.amount
            : undefined,
          capex: Array.isArray(p.manual_inputs)
            ? p.manual_inputs.find(
                (m: { input_type: string; amount?: number }) =>
                  m.input_type === 'capex'
              )?.amount
            : undefined,
        },
        accountDetails: [],
        metrics: p.financial_metrics || undefined,
      })) || []

    const comments =
      commentsData?.map((c) => ({
        id: c.id,
        commentType: c.comment_type,
        aiGeneratedText: c.ai_generated_text,
        editedText: c.edited_text,
        isEdited: c.is_edited,
        displayOrder: c.display_order,
      })) || []

    const companyData = analysis.companies as
      | { name: string; industry_id?: string }
      | null

    const financialAnalysis: FinancialAnalysis = {
      id: analysis.id,
      companyId: analysis.company_id,
      companyName: companyData?.name || '不明',
      analysisDate: new Date(analysis.analysis_date),
      fiscalYearStart: analysis.fiscal_year_start,
      fiscalYearEnd: analysis.fiscal_year_end,
      periodsCount: analysis.periods_count,
      status: analysis.status,
      periods,
      comments,
      createdAt: new Date(analysis.created_at),
      updatedAt: new Date(analysis.updated_at),
    }

    // 形式に応じて出力
    let blob: Blob
    let filename: string
    let contentType: string

    if (format === 'excel') {
      blob = await exportToExcel(financialAnalysis)
      filename = `${financialAnalysis.companyName}_財務分析_${financialAnalysis.analysisDate.toISOString().split('T')[0]}.xlsx`
      contentType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    } else {
      blob = await exportToPowerPoint(financialAnalysis)
      filename = `${financialAnalysis.companyName}_財務分析_${financialAnalysis.analysisDate.toISOString().split('T')[0]}.pptx`
      contentType =
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    }

    // Blobをバッファに変換
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // レスポンスを返す
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Export API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
