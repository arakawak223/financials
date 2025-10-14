import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateAllMetrics } from '@/lib/utils/financial-calculations'
import { generateAnalysisComments } from '@/lib/utils/ai-comment-generator'
import type { FinancialAnalysis, PeriodFinancialData } from '@/lib/types/financial'

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

    const body = await request.json()
    const { analysisId } = body

    if (!analysisId) {
      return NextResponse.json(
        { error: 'Missing analysisId' },
        { status: 400 }
      )
    }

    // 分析データを取得
    const { data: analysis, error: analysisError } = await supabase
      .from('financial_analyses')
      .select('*, companies(name)')
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
        manual_inputs(*)
      `
      )
      .eq('analysis_id', analysisId)
      .order('fiscal_year', { ascending: true })

    if (periodsError || !periodsData) {
      return NextResponse.json(
        { error: 'Failed to fetch periods' },
        { status: 500 }
      )
    }

    // データを変換
    type PeriodData = {
      fiscal_year: number
      period_start_date?: string
      period_end_date?: string
      balance_sheet_items?: Array<Record<string, unknown>>
      profit_loss_items?: Array<Record<string, unknown>>
      manual_inputs?: Array<{ input_type: string; amount?: number }>
    }

    const periods: PeriodFinancialData[] = periodsData.map((p: PeriodData) => ({
      fiscalYear: p.fiscal_year,
      periodStartDate: p.period_start_date ? new Date(p.period_start_date) : undefined,
      periodEndDate: p.period_end_date ? new Date(p.period_end_date) : undefined,
      balanceSheet: (p.balance_sheet_items?.[0] || {}) as PeriodFinancialData['balanceSheet'],
      profitLoss: (p.profit_loss_items?.[0] || {}) as PeriodFinancialData['profitLoss'],
      manualInputs: {
        depreciation: p.manual_inputs?.find((m) => m.input_type === 'depreciation')
          ?.amount,
        capex: p.manual_inputs?.find((m) => m.input_type === 'capex')?.amount,
      },
      accountDetails: [],
      metrics: undefined,
    }))

    // 各期間の財務指標を計算
    for (let i = 0; i < periods.length; i++) {
      const previousPeriod = i > 0 ? periods[i - 1] : null
      const metrics = calculateAllMetrics(periods[i], previousPeriod)
      periods[i].metrics = metrics

      // 計算した指標をDBに保存
      const periodRecord = periodsData[i]
      await supabase.from('financial_metrics').upsert({
        analysis_id: analysisId,
        period_id: periodRecord.id,
        ...metrics,
      })
    }

    // 分析オブジェクトを構築
    const financialAnalysis: FinancialAnalysis = {
      id: analysis.id,
      companyId: analysis.company_id,
      companyName: analysis.companies?.name || '不明',
      analysisDate: new Date(analysis.analysis_date),
      fiscalYearStart: analysis.fiscal_year_start,
      fiscalYearEnd: analysis.fiscal_year_end,
      periodsCount: analysis.periods_count,
      status: analysis.status,
      periods,
      comments: [],
      createdAt: new Date(analysis.created_at),
      updatedAt: new Date(analysis.updated_at),
    }

    // AIコメントを生成
    try {
      const comments = await generateAnalysisComments(financialAnalysis)

      // コメントをDBに保存
      for (const comment of comments) {
        await supabase.from('analysis_comments').insert({
          analysis_id: analysisId,
          comment_type: comment.commentType,
          ai_generated_text: comment.aiGeneratedText,
          is_edited: false,
          display_order: comment.displayOrder,
          created_by: user.id,
        })
      }

      financialAnalysis.comments = comments
    } catch (commentError) {
      console.error('Comment generation error:', commentError)
      // コメント生成失敗してもエラーにしない
    }

    // 分析ステータスを完了に更新
    await supabase
      .from('financial_analyses')
      .update({ status: 'completed' })
      .eq('id', analysisId)

    return NextResponse.json({
      success: true,
      analysis: financialAnalysis,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
