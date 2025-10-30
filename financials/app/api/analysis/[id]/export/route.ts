export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exportToExcel } from '@/lib/utils/excel-exporter'
import { exportToPowerPoint } from '@/lib/utils/powerpoint-exporter'
import type { FinancialAnalysis, PeriodFinancialData } from '@/lib/types/financial'

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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  console.log('📤 Export API: Request received')
  try {
    const supabase = await createClient()
    const params = await context.params
    const analysisId = params.id
    console.log('📤 Export API: Analysis ID:', analysisId)

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
    console.log('📤 Export API: Format requested:', format)

    if (!format || (format !== 'excel' && format !== 'powerpoint')) {
      console.log('❌ Export API: Invalid format')
      return NextResponse.json(
        { error: 'Invalid format. Use "excel" or "powerpoint"' },
        { status: 400 }
      )
    }

    // 分析データを取得（/api/analysis/[id]/route.ts と同じロジック）
    console.log('📤 Export API: Fetching analysis data...')
    const { data: analysis, error: analysisError } = await supabase
      .from('financial_analyses')
      .select('*, companies(name)')
      .eq('id', analysisId)
      .single()

    if (analysisError || !analysis) {
      console.log('❌ Export API: Analysis not found:', analysisError)
      return NextResponse.json(
        { error: 'Analysis not found', details: analysisError?.message },
        { status: 404 }
      )
    }
    console.log('✅ Export API: Analysis found:', analysis.id)

    // 期間データを取得
    console.log('📤 Export API: Fetching periods data...')
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
      console.error('❌ Export API: Periods fetch error:', periodsError)
      return NextResponse.json(
        { error: 'Failed to fetch periods', details: periodsError.message },
        { status: 500 }
      )
    }
    console.log('✅ Export API: Periods fetched:', periodsData?.length)

    // コメントを取得
    const { data: commentsData } = await supabase
      .from('analysis_comments')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('display_order', { ascending: true })

    // データを変換
    const periods: PeriodFinancialData[] =
      periodsData?.map((p: any) => {
        // balance_sheet_itemsとprofit_loss_itemsは配列またはオブジェクトとして返される可能性がある
        const balanceSheetRaw = Array.isArray(p.balance_sheet_items)
          ? (p.balance_sheet_items.length > 0 ? p.balance_sheet_items[0] : {})
          : (p.balance_sheet_items || {})

        const profitLossRaw = Array.isArray(p.profit_loss_items)
          ? (p.profit_loss_items.length > 0 ? p.profit_loss_items[0] : {})
          : (p.profit_loss_items || {})

        const metricsRaw = Array.isArray(p.financial_metrics)
          ? (p.financial_metrics.length > 0 ? p.financial_metrics[0] : null)
          : (p.financial_metrics || null)

        // スネークケースからキャメルケースに変換
        const balanceSheet = convertKeysToCamelCase<PeriodFinancialData['balanceSheet']>(balanceSheetRaw)
        const profitLoss = convertKeysToCamelCase<PeriodFinancialData['profitLoss']>(profitLossRaw)

        // メトリクスを明示的にマッピング（equityRatioを含む）
        const metrics = metricsRaw ? {
          netCash: metricsRaw.net_cash,
          currentRatio: metricsRaw.current_ratio,
          equityRatio: metricsRaw.equity_ratio,
          receivablesTurnoverMonths: metricsRaw.accounts_receivable_turnover_months,
          inventoryTurnoverMonths: metricsRaw.inventory_turnover_months,
          ebitda: metricsRaw.ebitda,
          fcf: metricsRaw.fcf,
          salesGrowthRate: metricsRaw.sales_growth_rate,
          operatingIncomeGrowthRate: metricsRaw.operating_income_growth_rate,
          ebitdaGrowthRate: metricsRaw.ebitda_growth_rate,
          grossProfitMargin: metricsRaw.gross_profit_margin,
          operatingProfitMargin: metricsRaw.operating_profit_margin,
          ebitdaMargin: metricsRaw.ebitda_margin,
          ebitdaToInterestBearingDebt: metricsRaw.ebitda_to_interest_bearing_debt,
          roe: metricsRaw.roe,
          roa: metricsRaw.roa,
        } : undefined

        return {
          fiscalYear: p.fiscal_year,
          periodStartDate: p.period_start_date
            ? new Date(p.period_start_date)
            : undefined,
          periodEndDate: p.period_end_date
            ? new Date(p.period_end_date)
            : undefined,
          balanceSheet,
          profitLoss,
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
          metrics,
        }
      }) || []

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
    console.log('📤 Export API: Starting file generation...')
    let blob: Blob
    let filename: string
    let contentType: string

    if (format === 'excel') {
      console.log('📊 Export API: Generating Excel file...')
      blob = await exportToExcel(financialAnalysis)
      filename = `${financialAnalysis.companyName}_財務分析_${financialAnalysis.analysisDate.toISOString().split('T')[0]}.xlsx`
      contentType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      console.log('✅ Export API: Excel file generated')
    } else {
      console.log('📊 Export API: Generating PowerPoint file...')
      blob = await exportToPowerPoint(financialAnalysis)
      filename = `${financialAnalysis.companyName}_財務分析_${financialAnalysis.analysisDate.toISOString().split('T')[0]}.pptx`
      contentType =
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      console.log('✅ Export API: PowerPoint file generated')
    }

    // Blobをバッファに変換
    console.log('📤 Export API: Converting blob to buffer...')
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log('📤 Export API: Buffer size:', buffer.length)

    // レスポンスを返す
    console.log('📤 Export API: Sending response...')
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('❌ Export API error:', error)
    if (error instanceof Error) {
      console.error('  Message:', error.message)
      console.error('  Stack:', error.stack)
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
