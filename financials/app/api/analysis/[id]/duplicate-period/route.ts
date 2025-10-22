import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: analysisId } = await params
    const supabase = await createClient()

    // リクエストボディから複製元の期間IDと新しい年度を取得
    const body = await request.json()
    const { sourcePeriodId, newFiscalYear } = body

    if (!sourcePeriodId || !newFiscalYear) {
      return NextResponse.json(
        { error: '複製元の期間IDと新しい年度が必要です' },
        { status: 400 }
      )
    }

    // 複製元の期間データを取得
    const { data: sourcePeriod, error: periodError } = await supabase
      .from('financial_periods')
      .select(
        `
        *,
        balance_sheet_items(*),
        profit_loss_items(*),
        manual_inputs(*)
      `
      )
      .eq('id', sourcePeriodId)
      .single()

    if (periodError || !sourcePeriod) {
      return NextResponse.json({ error: '複製元の期間が見つかりません' }, { status: 404 })
    }

    // 同じ年度が既に存在するかチェック
    const { data: existingPeriod } = await supabase
      .from('financial_periods')
      .select('id')
      .eq('analysis_id', analysisId)
      .eq('fiscal_year', newFiscalYear)
      .single()

    if (existingPeriod) {
      return NextResponse.json(
        { error: `${newFiscalYear}年度は既に存在します` },
        { status: 400 }
      )
    }

    // 新しい期間を作成
    const { data: newPeriod, error: createError } = await supabase
      .from('financial_periods')
      .insert({
        analysis_id: analysisId,
        fiscal_year: newFiscalYear,
        period_start_date: sourcePeriod.period_start_date
          ? new Date(new Date(sourcePeriod.period_start_date).setFullYear(newFiscalYear))
              .toISOString()
              .split('T')[0]
          : null,
        period_end_date: sourcePeriod.period_end_date
          ? new Date(new Date(sourcePeriod.period_end_date).setFullYear(newFiscalYear + 1))
              .toISOString()
              .split('T')[0]
          : null,
      })
      .select('id')
      .single()

    if (createError || !newPeriod) {
      throw new Error('新しい期間の作成に失敗しました')
    }

    const newPeriodId = newPeriod.id

    // 貸借対照表データを複製
    if (sourcePeriod.balance_sheet_items && sourcePeriod.balance_sheet_items.length > 0) {
      const bs = sourcePeriod.balance_sheet_items[0]
      const { error: bsError } = await supabase.from('balance_sheet_items').insert({
        period_id: newPeriodId,
        cash_and_deposits: bs.cash_and_deposits,
        accounts_receivable: bs.accounts_receivable,
        inventory: bs.inventory,
        current_assets_total: bs.current_assets_total,
        tangible_fixed_assets: bs.tangible_fixed_assets,
        intangible_fixed_assets: bs.intangible_fixed_assets,
        investments_and_other_assets: bs.investments_and_other_assets,
        fixed_assets_total: bs.fixed_assets_total,
        total_assets: bs.total_assets,
        accounts_payable: bs.accounts_payable,
        short_term_borrowings: bs.short_term_borrowings,
        current_liabilities_total: bs.current_liabilities_total,
        long_term_borrowings: bs.long_term_borrowings,
        fixed_liabilities_total: bs.fixed_liabilities_total,
        total_liabilities: bs.total_liabilities,
        capital_stock: bs.capital_stock,
        retained_earnings: bs.retained_earnings,
        total_net_assets: bs.total_net_assets,
      })

      if (bsError) throw bsError
    }

    // 損益計算書データを複製（通常は0クリア）
    if (sourcePeriod.profit_loss_items && sourcePeriod.profit_loss_items.length > 0) {
      const { error: plError } = await supabase.from('profit_loss_items').insert({
        period_id: newPeriodId,
        // 損益は新年度なので0にリセット
        net_sales: null,
        cost_of_sales: null,
        gross_profit: null,
        selling_general_admin_expenses: null,
        operating_income: null,
        non_operating_income: null,
        non_operating_expenses: null,
        ordinary_income: null,
        extraordinary_income: null,
        extraordinary_losses: null,
        income_before_tax: null,
        income_taxes: null,
        net_income: null,
      })

      if (plError) throw plError
    }

    // 手入力データを複製
    if (sourcePeriod.manual_inputs && sourcePeriod.manual_inputs.length > 0) {
      const manualInputsToInsert = sourcePeriod.manual_inputs.map((input: any) => ({
        period_id: newPeriodId,
        input_type: input.input_type,
        amount: null, // 新年度なので金額はnullにリセット
        note: `${newFiscalYear}年度（${sourcePeriod.fiscal_year}年度からコピー）`,
      }))

      const { error: manualError } = await supabase
        .from('manual_inputs')
        .insert(manualInputsToInsert)

      if (manualError) throw manualError
    }

    return NextResponse.json({
      success: true,
      message: `${sourcePeriod.fiscal_year}年度のデータを${newFiscalYear}年度として複製しました`,
      newPeriodId,
    })
  } catch (error) {
    console.error('Period duplication error:', error)
    return NextResponse.json(
      { error: '期間データの複製中にエラーが発生しました', details: String(error) },
      { status: 500 }
    )
  }
}
