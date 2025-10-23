import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { FinancialAnalysis, PeriodFinancialData } from '@/lib/types/financial'

export const dynamic = 'force-dynamic';

export async function GET(
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

    // 分析データを取得
    console.log('Fetching analysis with ID:', analysisId)
    const { data: analysis, error: analysisError } = await supabase
      .from('financial_analyses')
      .select('*, companies(name)')
      .eq('id', analysisId)
      .single()

    if (analysisError) {
      console.error('Analysis fetch error:', analysisError)
      return NextResponse.json(
        { error: 'Analysis not found', details: analysisError.message },
        { status: 404 }
      )
    }

    if (!analysis) {
      console.error('Analysis is null')
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
    const periods: PeriodFinancialData[] = periodsData?.map((p) => {
      const rawMetrics = Array.isArray(p.financial_metrics) && p.financial_metrics.length > 0
        ? p.financial_metrics[0]
        : null

      return {
        fiscalYear: p.fiscal_year,
        periodStartDate: p.period_start_date ? new Date(p.period_start_date) : undefined,
        periodEndDate: p.period_end_date ? new Date(p.period_end_date) : undefined,
        balanceSheet: p.balance_sheet_items || {},
        profitLoss: p.profit_loss_items || {},
        manualInputs: {
          depreciation: Array.isArray(p.manual_inputs)
            ? p.manual_inputs.find((m: { input_type: string; amount?: number }) => m.input_type === 'depreciation')?.amount
            : undefined,
          capex: Array.isArray(p.manual_inputs)
            ? p.manual_inputs.find((m: { input_type: string; amount?: number }) => m.input_type === 'capex')?.amount
            : undefined,
        },
        accountDetails: [],
        metrics: rawMetrics ? {
          netCash: rawMetrics.net_cash,
          currentRatio: rawMetrics.current_ratio,
          receivablesTurnoverMonths: rawMetrics.accounts_receivable_turnover_months,
          inventoryTurnoverMonths: rawMetrics.inventory_turnover_months,
          ebitda: rawMetrics.ebitda,
          fcf: rawMetrics.fcf,
          salesGrowthRate: rawMetrics.sales_growth_rate,
          operatingIncomeGrowthRate: rawMetrics.operating_income_growth_rate,
          ebitdaGrowthRate: rawMetrics.ebitda_growth_rate,
          grossProfitMargin: rawMetrics.gross_profit_margin,
          operatingProfitMargin: rawMetrics.operating_profit_margin,
          ebitdaMargin: rawMetrics.ebitda_margin,
          ebitdaToInterestBearingDebt: rawMetrics.ebitda_to_interest_bearing_debt,
          roe: rawMetrics.roe,
          roa: rawMetrics.roa,
        } : undefined,
      }
    }) || []

    const comments = commentsData?.map((c) => ({
      id: c.id,
      commentType: c.comment_type,
      aiGeneratedText: c.ai_generated_text,
      editedText: c.edited_text,
      isEdited: c.is_edited,
      displayOrder: c.display_order,
    })) || []

    const companyData = analysis.companies as { name: string; industry_id?: string } | null

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

    return NextResponse.json({ success: true, analysis: financialAnalysis })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
