export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateAllMetrics, calculateDepreciationFromAccountDetails, calculateCapexAuto } from '@/lib/utils/financial-calculations'
import type { PeriodFinancialData, AccountType } from '@/lib/types/financial'

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
  try {
    // 環境変数の状態を確認（デバッグ用）
    const openaiKey = process.env.OPENAI_API_KEY
    console.log('🔍 環境変数チェック (再計算API):')
    console.log('  OPENAI_API_KEY:', openaiKey ? `設定済み (長さ: ${openaiKey.length}, 先頭: ${openaiKey.substring(0, 7)})` : '❌ 未設定')
    console.log('  NODE_ENV:', process.env.NODE_ENV)
    console.log('  VERCEL:', process.env.VERCEL)
    console.log('  VERCEL_ENV:', process.env.VERCEL_ENV)

    const supabase = await createClient()
    const params = await context.params
    const analysisId = params.id

    console.log('🔄 財務指標再計算API開始: analysisId =', analysisId)

    // 分析データを取得
    const { data: analysis, error: analysisError } = await supabase
      .from('financial_analyses')
      .select('*, companies(name)')
      .eq('id', analysisId)
      .single()

    if (analysisError || !analysis) {
      console.error('❌ 分析データ取得エラー:', analysisError)
      return NextResponse.json(
        { error: 'Analysis not found', details: analysisError?.message },
        { status: 404 }
      )
    }

    console.log('✅ 分析データ取得成功:', analysis.id)

    // 期間データを取得
    const { data: periodsData, error: periodsError } = await supabase
      .from('financial_periods')
      .select(
        `
        *,
        balance_sheet_items(*),
        profit_loss_items(*),
        manual_inputs(*),
        account_details(*)
      `
      )
      .eq('analysis_id', analysisId)
      .order('fiscal_year', { ascending: true })

    if (periodsError || !periodsData) {
      console.error('❌ 期間データ取得エラー:', periodsError)
      return NextResponse.json(
        { error: 'Failed to fetch periods' },
        { status: 500 }
      )
    }

    console.log('📊 取得した期間数:', periodsData.length)

    // データを変換
    type PeriodData = {
      id: string
      fiscal_year: number
      period_start_date?: string
      period_end_date?: string
      balance_sheet_items?: Array<Record<string, unknown>>
      profit_loss_items?: Array<Record<string, unknown>>
      manual_inputs?: Array<{ input_type: string; amount?: number }>
      account_details?: Array<{ account_category: string; account_name: string; amount?: number; notes?: string }>
    }

    const periods: PeriodFinancialData[] = periodsData.map((p: PeriodData) => {
      const balanceSheetRaw = Array.isArray(p.balance_sheet_items)
        ? (p.balance_sheet_items.length > 0 ? p.balance_sheet_items[0] : {})
        : (p.balance_sheet_items || {})

      const profitLossRaw = Array.isArray(p.profit_loss_items)
        ? (p.profit_loss_items.length > 0 ? p.profit_loss_items[0] : {})
        : (p.profit_loss_items || {})

      const balanceSheetData = convertKeysToCamelCase<PeriodFinancialData['balanceSheet']>(balanceSheetRaw)
      const profitLossData = convertKeysToCamelCase<PeriodFinancialData['profitLoss']>(profitLossRaw)

      const fixedAssetDisposalValue = p.manual_inputs?.find((m) => m.input_type === 'fixed_asset_disposal_value')?.amount

      const accountDetails = (p.account_details || []).map((detail) => ({
        accountType: (detail.account_category || 'other') as AccountType,
        itemName: detail.account_name,
        amount: detail.amount,
        note: detail.notes,
      }))

      return {
        fiscalYear: p.fiscal_year,
        periodStartDate: p.period_start_date ? new Date(p.period_start_date) : undefined,
        periodEndDate: p.period_end_date ? new Date(p.period_end_date) : undefined,
        balanceSheet: balanceSheetData,
        profitLoss: profitLossData,
        manualInputs: {
          depreciation: 0,
          capex: 0,
          fixedAssetDisposalValue,
        },
        accountDetails,
        metrics: undefined,
      }
    })

    // 減価償却費とCAPEXを自動計算
    console.log('💡 減価償却費とCAPEXの自動計算開始')
    for (let i = 0; i < periods.length; i++) {
      const autoDepreciation = calculateDepreciationFromAccountDetails(periods[i])
      periods[i].manualInputs.depreciation = autoDepreciation

      const previousPeriod = i > 0 ? periods[i - 1] : null
      const autoCapex = calculateCapexAuto(periods[i], previousPeriod)
      periods[i].manualInputs.capex = autoCapex ?? 0

      console.log(`  期間 ${periods[i].fiscalYear}: 減価償却費=${autoDepreciation}, CAPEX=${autoCapex}`)
    }

    // 各期間の財務指標を計算
    console.log('📊 財務指標計算開始:', periods.length, '期間')
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < periods.length; i++) {
      console.log(`\n期間 ${i + 1}/${periods.length} (${periods[i].fiscalYear}):`)

      const previousPeriod = i > 0 ? periods[i - 1] : null
      const metrics = calculateAllMetrics(periods[i], previousPeriod)

      console.log('  計算された指標:', {
        netCash: metrics.netCash,
        currentRatio: metrics.currentRatio,
        ebitda: metrics.ebitda,
        fcf: metrics.fcf,
      })

      periods[i].metrics = metrics

      const periodRecord = periodsData[i]

      // キャメルケースからスネークケースに変換
      const metricsForDb = {
        analysis_id: analysisId,
        period_id: periodRecord.id,
        net_cash: metrics.netCash,
        current_ratio: metrics.currentRatio,
        equity_ratio: metrics.equityRatio,
        accounts_receivable_turnover_months: metrics.receivablesTurnoverMonths,
        inventory_turnover_months: metrics.inventoryTurnoverMonths,
        ebitda: metrics.ebitda,
        fcf: metrics.fcf,
        sales_growth_rate: metrics.salesGrowthRate,
        operating_income_growth_rate: metrics.operatingIncomeGrowthRate,
        ebitda_growth_rate: metrics.ebitdaGrowthRate,
        gross_profit_margin: metrics.grossProfitMargin,
        operating_profit_margin: metrics.operatingProfitMargin,
        ebitda_margin: metrics.ebitdaMargin,
        ebitda_to_interest_bearing_debt: metrics.ebitdaToInterestBearingDebt,
        roe: metrics.roe,
        roa: metrics.roa,
      }

      // 既存の指標を削除してから挿入
      const { error: deleteError } = await supabase
        .from('financial_metrics')
        .delete()
        .eq('analysis_id', analysisId)
        .eq('period_id', periodRecord.id)

      if (deleteError) {
        console.error('  ❌ 既存指標削除エラー:', deleteError)
        errorCount++
      }

      // 新規レコードを挿入
      const { error: insertError } = await supabase
        .from('financial_metrics')
        .insert(metricsForDb)

      if (insertError) {
        console.error('  ❌ 指標挿入エラー:', insertError)
        errorCount++
      } else {
        console.log('  ✅ 指標保存成功')
        successCount++
      }

      // 自動計算した減価償却費とCAPEXをmanual_inputsテーブルに保存
      const depreciation = periods[i].manualInputs.depreciation ?? 0
      const capex = periods[i].manualInputs.capex ?? 0

      // 減価償却費を保存
      await supabase.from('manual_inputs')
        .delete()
        .eq('period_id', periodRecord.id)
        .eq('input_type', 'depreciation')

      await supabase.from('manual_inputs').insert({
        period_id: periodRecord.id,
        input_type: 'depreciation',
        amount: depreciation,
      })

      // CAPEXを保存
      await supabase.from('manual_inputs')
        .delete()
        .eq('period_id', periodRecord.id)
        .eq('input_type', 'capex')

      await supabase.from('manual_inputs').insert({
        period_id: periodRecord.id,
        input_type: 'capex',
        amount: capex,
      })

      console.log('  ✅ 減価償却費とCAPEX保存完了')
    }

    console.log('\n✅ 財務指標再計算完了')
    console.log(`  成功: ${successCount}期間`)
    console.log(`  失敗: ${errorCount}期間`)

    return NextResponse.json({
      success: true,
      message: '財務指標を再計算しました',
      periodsProcessed: periods.length,
      successCount,
      errorCount,
    })
  } catch (error) {
    console.error('❌ 再計算API エラー:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
