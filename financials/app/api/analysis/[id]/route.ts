import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { FinancialAnalysis, PeriodFinancialData, AccountType } from '@/lib/types/financial'

export const dynamic = 'force-dynamic';

// スネークケースをキャメルケースに変換するヘルパー関数
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

function convertKeysToCamelCase<T = any>(obj: Record<string, any> | null | undefined): T {
  if (!obj || typeof obj !== 'object') return {} as T

  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key)
    result[camelKey] = value
  }
  return result as T
}

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
        account_details(*),
        financial_metrics(*)
      `
      )
      .eq('analysis_id', analysisId)
      .order('fiscal_year', { ascending: true })

    console.log('📊 GET API: Periods data fetched:', periodsData?.length, 'periods')
    if (periodsData && periodsData.length > 0) {
      periodsData.forEach((p, i) => {
        console.log(`📊 GET API: Period ${i + 1} (${p.fiscal_year}):`)
        console.log('  - balance_sheet_items type:', Array.isArray(p.balance_sheet_items) ? 'array' : typeof p.balance_sheet_items)
        console.log('  - balance_sheet_items:', JSON.stringify(p.balance_sheet_items, null, 2))
        console.log('  - profit_loss_items type:', Array.isArray(p.profit_loss_items) ? 'array' : typeof p.profit_loss_items)
        console.log('  - profit_loss_items:', JSON.stringify(p.profit_loss_items, null, 2))
        console.log('  - manual_inputs:', Array.isArray(p.manual_inputs) ? p.manual_inputs.length : 'not array', p.manual_inputs)
      })
    }

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

      // Net Cash のログ出力（デバッグ用）
      if (rawMetrics) {
        console.log(`  財務指標読み込み (${p.fiscal_year}年度): net_cash =`, rawMetrics.net_cash)
      }

      // balance_sheet_itemsとprofit_loss_itemsは、UNIQUE制約があるため
      // 配列またはオブジェクトとして返される可能性がある
      const balanceSheetRaw = Array.isArray(p.balance_sheet_items)
        ? (p.balance_sheet_items.length > 0 ? p.balance_sheet_items[0] : {})
        : (p.balance_sheet_items || {})

      const profitLossRaw = Array.isArray(p.profit_loss_items)
        ? (p.profit_loss_items.length > 0 ? p.profit_loss_items[0] : {})
        : (p.profit_loss_items || {})

      // スネークケースからキャメルケースに変換
      const balanceSheetData = convertKeysToCamelCase<PeriodFinancialData['balanceSheet']>(balanceSheetRaw)
      const profitLossData = convertKeysToCamelCase<PeriodFinancialData['profitLoss']>(profitLossRaw)

      console.log(`📊 GET API: Converted data for ${p.fiscal_year}:`)
      console.log('  - balanceSheetData keys:', Object.keys(balanceSheetData))
      console.log('  - balanceSheetData:', JSON.stringify(balanceSheetData, null, 2))
      console.log('  - profitLossData keys:', Object.keys(profitLossData))
      console.log('  - profitLossData:', JSON.stringify(profitLossData, null, 2))

      // account_detailsを変換
      const accountDetails = (Array.isArray(p.account_details) ? p.account_details : []).map((detail: any) => ({
        accountType: (detail.account_category || 'other') as AccountType,
        itemName: detail.account_name,
        amount: detail.amount,
        note: detail.notes,
        formatItemId: detail.format_item_id, // 科目テンプレート項目IDを追加
      }))

      return {
        fiscalYear: p.fiscal_year,
        periodStartDate: p.period_start_date ? new Date(p.period_start_date) : undefined,
        periodEndDate: p.period_end_date ? new Date(p.period_end_date) : undefined,
        balanceSheet: balanceSheetData,
        profitLoss: profitLossData,
        manualInputs: {
          depreciation: Array.isArray(p.manual_inputs)
            ? p.manual_inputs.find((m: { input_type: string; amount?: number }) => m.input_type === 'depreciation')?.amount
            : undefined,
          capex: Array.isArray(p.manual_inputs)
            ? p.manual_inputs.find((m: { input_type: string; amount?: number }) => m.input_type === 'capex')?.amount
            : undefined,
          fixedAssetDisposalValue: Array.isArray(p.manual_inputs)
            ? p.manual_inputs.find((m: { input_type: string; amount?: number }) => m.input_type === 'fixed_asset_disposal_value')?.amount
            : undefined,
        },
        accountDetails,
        metrics: rawMetrics ? {
          netCash: rawMetrics.net_cash,
          currentRatio: rawMetrics.current_ratio,
          equityRatio: rawMetrics.equity_ratio,
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
      editedText: c.user_edited_text,
      isEdited: c.is_edited,
      displayOrder: c.display_order,
    })) || []

    const companyData = analysis.companies as {
      name: string
      industry_id?: string
    } | null

    // 業種情報を取得
    let industryName: string | undefined
    if (companyData?.industry_id) {
      const { data: industryData } = await supabase
        .from('industries')
        .select('name')
        .eq('id', companyData.industry_id)
        .single()
      industryName = industryData?.name
    }

    const financialAnalysis: FinancialAnalysis = {
      id: analysis.id,
      companyId: analysis.company_id,
      companyName: companyData?.name || '不明',
      industryName,
      analysisDate: new Date(analysis.analysis_date),
      fiscalYearStart: analysis.fiscal_year_start,
      fiscalYearEnd: analysis.fiscal_year_end,
      periodsCount: analysis.periods_count,
      formatId: analysis.format_id,  // 科目テンプレートIDを追加
      status: analysis.status,
      periods,
      comments,
      createdAt: new Date(analysis.created_at),
      updatedAt: new Date(analysis.updated_at),
    }

    console.log('📊 GET API: Final response being sent to frontend:')
    console.log('  - periods count:', financialAnalysis.periods.length)
    financialAnalysis.periods.forEach((period, i) => {
      console.log(`  - Period ${i + 1} (${period.fiscalYear}):`)
      console.log('    - balanceSheet keys:', Object.keys(period.balanceSheet || {}))
      console.log('    - profitLoss keys:', Object.keys(period.profitLoss || {}))
      if (period.profitLoss) {
        console.log('    - profitLoss.netSales:', period.profitLoss.netSales)
        console.log('    - profitLoss.costOfSales:', period.profitLoss.costOfSales)
        console.log('    - profitLoss.grossProfit:', period.profitLoss.grossProfit)
      }
    })

    return NextResponse.json({ success: true, analysis: financialAnalysis })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
