export const dynamic = 'force-dynamic';
export const maxDuration = 60; // AI処理のため最大60秒に設定
// Force recompile
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateAllMetrics, calculateDepreciationFromAccountDetails, calculateCapexAuto } from '@/lib/utils/financial-calculations'
import { generateAnalysisComments } from '@/lib/utils/ai-comment-generator'
import type { FinancialAnalysis, PeriodFinancialData, AccountType } from '@/lib/types/financial'

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

export async function POST(request: NextRequest) {
  try {
    // 環境変数の状態を確認（デバッグ用）
    const openaiKey = process.env.OPENAI_API_KEY
    console.log('🔍 環境変数チェック:')
    console.log('  OPENAI_API_KEY:', openaiKey ? `設定済み (長さ: ${openaiKey.length}, 先頭: ${openaiKey.substring(0, 7)})` : '❌ 未設定')
    console.log('  NODE_ENV:', process.env.NODE_ENV)
    console.log('  VERCEL:', process.env.VERCEL)
    console.log('  VERCEL_ENV:', process.env.VERCEL_ENV)

    const supabase = await createClient()

    // 認証チェック（開発中は一時的に無効化）
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // 開発中はユーザーIDがnullでも許可
    const userId = user?.id || null

    const body = await request.json()
    const { analysisId, skipComments } = body

    if (!analysisId) {
      return NextResponse.json(
        { error: 'Missing analysisId' },
        { status: 400 }
      )
    }

    // 分析データを取得
    console.log('🔍 Execute API: Fetching analysis with ID:', analysisId)
    const { data: analysis, error: analysisError } = await supabase
      .from('financial_analyses')
      .select('*, companies(name)')
      .eq('id', analysisId)
      .single()

    if (analysisError) {
      console.error('❌ Execute API: Analysis fetch error:', analysisError)
      return NextResponse.json(
        { error: 'Analysis not found', details: analysisError.message },
        { status: 404 }
      )
    }

    if (!analysis) {
      console.error('❌ Execute API: Analysis is null')
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      )
    }

    console.log('✅ Execute API: Analysis found:', analysis.id)

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
      return NextResponse.json(
        { error: 'Failed to fetch periods' },
        { status: 500 }
      )
    }

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

    console.log('📊 DBから取得した期間データ:', JSON.stringify(periodsData, null, 2))

    const periods: PeriodFinancialData[] = periodsData.map((p: PeriodData) => {
      console.log(`\n🔍 年度 ${p.fiscal_year} のデータ変換:`)
      console.log('  balance_sheet_items:', JSON.stringify(p.balance_sheet_items))
      console.log('  profit_loss_items:', JSON.stringify(p.profit_loss_items))

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

      console.log('  変換後 balanceSheetData:', JSON.stringify(balanceSheetData))
      console.log('  変換後 profitLossData:', JSON.stringify(profitLossData))

      const fixedAssetDisposalValue = p.manual_inputs?.find((m) => m.input_type === 'fixed_asset_disposal_value')?.amount

      // account_detailsを変換
      const accountDetails = (p.account_details || []).map((detail) => ({
        accountType: (detail.account_category || 'other') as AccountType,
        itemName: detail.account_name,
        amount: detail.amount,
        note: detail.notes,
      }))

      console.log(`📊 期間 ${p.fiscal_year} のデータ:`, {
        account_details_count: accountDetails.length,
        fixedAssetDisposalValue
      })

      return {
        fiscalYear: p.fiscal_year,
        periodStartDate: p.period_start_date ? new Date(p.period_start_date) : undefined,
        periodEndDate: p.period_end_date ? new Date(p.period_end_date) : undefined,
        balanceSheet: balanceSheetData,
        profitLoss: profitLossData,
        manualInputs: {
          depreciation: 0, // 後で自動計算
          capex: 0,        // 後で自動計算
          fixedAssetDisposalValue,
        },
        accountDetails,
        metrics: undefined,
      }
    })

    // 減価償却費とCAPEXを自動計算
    console.log('💡 減価償却費とCAPEXの自動計算開始')
    for (let i = 0; i < periods.length; i++) {
      // 減価償却費をaccount_detailsから自動集計
      const autoDepreciation = calculateDepreciationFromAccountDetails(periods[i])
      periods[i].manualInputs.depreciation = autoDepreciation

      // CAPEXを自動計算（前期データが必要）
      const previousPeriod = i > 0 ? periods[i - 1] : null
      const autoCapex = calculateCapexAuto(periods[i], previousPeriod)
      periods[i].manualInputs.capex = autoCapex ?? 0

      console.log(`  期間 ${periods[i].fiscalYear}: 減価償却費=${autoDepreciation}, CAPEX=${autoCapex}`)
    }

    // 各期間の財務指標を計算
    console.log('📊 財務指標計算開始:', periods.length, '期間')
    for (let i = 0; i < periods.length; i++) {
      console.log(`\n期間 ${i + 1}/${periods.length} (${periods[i].fiscalYear}):`)
      console.log('  BS keys:', Object.keys(periods[i].balanceSheet || {}))
      console.log('  PL keys:', Object.keys(periods[i].profitLoss || {}))

      const previousPeriod = i > 0 ? periods[i - 1] : null

      // Net Cash計算に使用される値をログ出力
      const bs = periods[i].balanceSheet as Record<string, number | undefined>
      console.log('  Net Cash計算用データ:')
      console.log('    現金預金:', bs.cash_and_deposits)
      console.log('    短期借入金:', bs.short_term_borrowings)
      console.log('    長期借入金:', bs.long_term_borrowings)

      const metrics = calculateAllMetrics(periods[i], previousPeriod)

      console.log('  計算された指標:', {
        netCash: metrics.netCash,
        currentRatio: metrics.currentRatio,
        ebitda: metrics.ebitda,
        fcf: metrics.fcf,
      })

      periods[i].metrics = metrics

      // 計算した指標をDBに保存
      const periodRecord = periodsData[i]
      console.log('  period_id:', periodRecord.id)

      // キャメルケースからスネークケースに変換
      const metricsForDb = {
        analysis_id: analysisId,
        period_id: periodRecord.id,
        net_cash: metrics.netCash,
        current_ratio: metrics.currentRatio,
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

      // 既存の指標を削除してから挿入（シンプルで確実）
      const { error: deleteError } = await supabase
        .from('financial_metrics')
        .delete()
        .eq('analysis_id', analysisId)
        .eq('period_id', periodRecord.id)

      if (deleteError) {
        console.error('  ❌ 既存指標削除エラー:', deleteError)
      }

      // 新規レコードを挿入
      const { error: insertError } = await supabase
        .from('financial_metrics')
        .insert(metricsForDb)

      if (insertError) {
        console.error('  ❌ 指標挿入エラー:', insertError)
      } else {
        console.log('  ✅ 指標保存成功')
      }

      // 自動計算した減価償却費とCAPEXをmanual_inputsテーブルに保存
      const depreciation = periods[i].manualInputs.depreciation ?? 0
      const capex = periods[i].manualInputs.capex ?? 0

      // 減価償却費を保存（既存レコードを削除してから挿入）
      await supabase.from('manual_inputs')
        .delete()
        .eq('period_id', periodRecord.id)
        .eq('input_type', 'depreciation')

      await supabase.from('manual_inputs').insert({
        period_id: periodRecord.id,
        input_type: 'depreciation',
        amount: depreciation,
      })

      // CAPEXを保存（既存レコードを削除してから挿入）
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
    console.log('\n✅ 全期間の指標計算完了')

    // 分析オブジェクトを構築
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
      status: analysis.status,
      periods,
      comments: [],
      createdAt: new Date(analysis.created_at),
      updatedAt: new Date(analysis.updated_at),
    }

    // AIコメントを生成（skipCommentsがtrueの場合はスキップ）
    if (!skipComments) {
      try {
        console.log('🤖 AI分析コメント生成開始...')
        console.log('📊 AIコメント生成に渡すデータ:')
        console.log('  企業名:', financialAnalysis.companyName)
        console.log('  期間:', financialAnalysis.fiscalYearStart, '〜', financialAnalysis.fiscalYearEnd)
        console.log('  期間数:', financialAnalysis.periods.length)
        financialAnalysis.periods.forEach((p, i) => {
          console.log(`\n  期間 ${i + 1} (${p.fiscalYear}年度):`)
          console.log('    BS netSales:', p.profitLoss?.netSales)
          console.log('    PL operatingIncome:', p.profitLoss?.operatingIncome)
          console.log('    PL netIncome:', p.profitLoss?.netIncome)
          console.log('    metrics:', p.metrics ? Object.keys(p.metrics) : 'なし')
        })
        const comments = await generateAnalysisComments(financialAnalysis)
        console.log('✅ コメント生成完了:', comments.length, '件')

        // 既存のコメントを削除
        const { error: deleteError } = await supabase
          .from('analysis_comments')
          .delete()
          .eq('analysis_id', analysisId)

        if (deleteError) {
          console.error('❌ 既存コメント削除エラー:', deleteError)
        } else {
          console.log('✅ 既存コメント削除完了')
        }

        // コメントをDBに保存
        for (const comment of comments) {
          const { error: insertError } = await supabase.from('analysis_comments').insert({
            analysis_id: analysisId,
            comment_type: comment.commentType,
            ai_generated_text: comment.aiGeneratedText,
            is_edited: false,
            display_order: comment.displayOrder,
            created_by: userId,
          })

          if (insertError) {
            console.error('❌ コメント保存エラー:', insertError)
          } else {
            console.log('✅ コメント保存成功:', comment.commentType)
          }
        }

        financialAnalysis.comments = comments
      } catch (commentError) {
        console.error('❌ Comment generation error:', commentError)
        if (commentError instanceof Error) {
          console.error('  エラーメッセージ:', commentError.message)
          console.error('  スタックトレース:', commentError.stack)
        }
        // コメント生成失敗してもエラーにしない
      }
    } else {
      console.log('⏭️  AIコメント生成をスキップ（skipComments=true）')

      // 既存のコメントを取得
      const { data: existingComments } = await supabase
        .from('analysis_comments')
        .select('*')
        .eq('analysis_id', analysisId)
        .order('display_order', { ascending: true })

      // DBのコメントを型に変換
      financialAnalysis.comments = (existingComments || []).map((c: any) => ({
        id: c.id,
        commentType: c.comment_type,
        aiGeneratedText: c.ai_generated_text,
        editedText: c.edited_text,
        isEdited: c.is_edited,
        displayOrder: c.display_order,
      }))
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
