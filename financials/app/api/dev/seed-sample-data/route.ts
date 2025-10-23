export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    // 開発環境のみ許可
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    // Service Roleキーを使用してRLSをバイパス
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 1. Industries
    const industries = [
      { id: '11111111-1111-1111-1111-111111111111', name: '製造業', code: 'MFG', description: '製造業全般' },
      { id: '22222222-2222-2222-2222-222222222222', name: '卸売業', code: 'WHOLESALE', description: '卸売業全般' },
      { id: '33333333-3333-3333-3333-333333333333', name: '小売業', code: 'RETAIL', description: '小売業全般' },
      { id: '44444444-4444-4444-4444-444444444444', name: '情報通信業', code: 'IT', description: 'IT・情報通信業' },
      { id: '55555555-5555-5555-5555-555555555555', name: 'サービス業', code: 'SERVICE', description: 'サービス業全般' },
    ]

    console.log('投入開始: 業種データ')
    for (const industry of industries) {
      const { error } = await supabase.from('industries').upsert(industry, { onConflict: 'id' })
      if (error) {
        console.error('業種投入エラー:', error)
        throw new Error(`Failed to insert industry: ${error.message}`)
      }
    }
    console.log('完了: 業種データ', industries.length, '件')

    // 2. Company Groups
    const companyGroups = [
      { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'サンプル製造グループ', industry_id: '11111111-1111-1111-1111-111111111111', description: '製造業の企業グループ' },
      { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'サンプル商社グループ', industry_id: '22222222-2222-2222-2222-222222222222', description: '商社系企業グループ' },
    ]

    console.log('投入開始: 企業グループデータ')
    for (const group of companyGroups) {
      const { error } = await supabase.from('company_groups').upsert(group, { onConflict: 'id' })
      if (error) {
        console.error('企業グループ投入エラー:', error)
        throw new Error(`Failed to insert company group: ${error.message}`)
      }
    }
    console.log('完了: 企業グループデータ', companyGroups.length, '件')

    // 3. Companies
    const companies = [
      { id: 'c1111111-1111-1111-1111-111111111111', name: '株式会社サンプル製造', group_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', industry_id: '11111111-1111-1111-1111-111111111111', company_code: 'SAMPLE001', description: '自動車部品製造会社' },
      { id: 'c2222222-2222-2222-2222-222222222222', name: '株式会社サンプル商事', group_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', industry_id: '22222222-2222-2222-2222-222222222222', company_code: 'SAMPLE002', description: '電子部品商社' },
      { id: 'c3333333-3333-3333-3333-333333333333', name: '株式会社テックイノベーション', industry_id: '44444444-4444-4444-4444-444444444444', company_code: 'SAMPLE003', description: 'ITサービス企業' },
    ]

    console.log('投入開始: 企業データ')
    for (const company of companies) {
      const { error } = await supabase.from('companies').upsert(company, { onConflict: 'id' })
      if (error) {
        console.error('企業投入エラー:', error)
        throw new Error(`Failed to insert company: ${error.message}`)
      }
    }
    console.log('完了: 企業データ', companies.length, '件')

    // 4. Financial Analyses
    const analyses = [
      { id: 'f1111111-1111-1111-1111-111111111111', company_id: 'c1111111-1111-1111-1111-111111111111', analysis_date: '2024-10-01', fiscal_year_start: 2021, fiscal_year_end: 2023, periods_count: 3, status: 'completed', notes: '直近3期の財務分析' },
      { id: 'f2222222-2222-2222-2222-222222222222', company_id: 'c2222222-2222-2222-2222-222222222222', analysis_date: '2024-09-15', fiscal_year_start: 2021, fiscal_year_end: 2023, periods_count: 3, status: 'completed', notes: '業績好調' },
      { id: 'f3333333-3333-3333-3333-333333333333', company_id: 'c3333333-3333-3333-3333-333333333333', analysis_date: '2024-10-10', fiscal_year_start: 2022, fiscal_year_end: 2023, periods_count: 2, status: 'draft', notes: '成長企業の財務分析' },
    ]

    for (const analysis of analyses) {
      await supabase.from('financial_analyses').upsert(analysis, { onConflict: 'id' })
    }

    // 5. Financial Periods
    const periods = [
      // サンプル製造
      { id: '01111111-1111-1111-1111-111111111111', analysis_id: 'f1111111-1111-1111-1111-111111111111', fiscal_year: 2021, period_start_date: '2021-04-01', period_end_date: '2022-03-31' },
      { id: '01111111-2222-2222-2222-222222222222', analysis_id: 'f1111111-1111-1111-1111-111111111111', fiscal_year: 2022, period_start_date: '2022-04-01', period_end_date: '2023-03-31' },
      { id: '01111111-3333-3333-3333-333333333333', analysis_id: 'f1111111-1111-1111-1111-111111111111', fiscal_year: 2023, period_start_date: '2023-04-01', period_end_date: '2024-03-31' },
      // サンプル商事
      { id: '02222222-1111-1111-1111-111111111111', analysis_id: 'f2222222-2222-2222-2222-222222222222', fiscal_year: 2021, period_start_date: '2021-04-01', period_end_date: '2022-03-31' },
      { id: '02222222-2222-2222-2222-222222222222', analysis_id: 'f2222222-2222-2222-2222-222222222222', fiscal_year: 2022, period_start_date: '2022-04-01', period_end_date: '2023-03-31' },
      { id: '02222222-3333-3333-3333-333333333333', analysis_id: 'f2222222-2222-2222-2222-222222222222', fiscal_year: 2023, period_start_date: '2023-04-01', period_end_date: '2024-03-31' },
      // テックイノベーション
      { id: '03333333-2222-2222-2222-222222222222', analysis_id: 'f3333333-3333-3333-3333-333333333333', fiscal_year: 2022, period_start_date: '2022-04-01', period_end_date: '2023-03-31' },
      { id: '03333333-3333-3333-3333-333333333333', analysis_id: 'f3333333-3333-3333-3333-333333333333', fiscal_year: 2023, period_start_date: '2023-04-01', period_end_date: '2024-03-31' },
    ]

    console.log('投入開始: 財務期間データ')
    for (const period of periods) {
      const { error } = await supabase.from('financial_periods').upsert(period)
      if (error) {
        console.error('財務期間投入エラー:', error)
        throw new Error(`Failed to insert period: ${error.message}`)
      }
    }
    console.log('完了: 財務期間データ', periods.length, '件')

    // 6. Balance Sheet Items - サンプル製造
    const balanceSheetItems = [
      {
        period_id: '01111111-1111-1111-1111-111111111111',
        cash_and_deposits: 150000000, accounts_receivable: 280000000, inventory: 180000000,
        current_assets_total: 650000000, tangible_fixed_assets: 320000000,
        fixed_assets_total: 420000000, total_assets: 1070000000,
        accounts_payable: 220000000, short_term_borrowings: 150000000,
        current_liabilities_total: 480000000, long_term_borrowings: 200000000,
        total_liabilities: 700000000, capital_stock: 100000000,
        retained_earnings: 270000000, total_net_assets: 370000000,
      },
      {
        period_id: '01111111-2222-2222-2222-222222222222',
        cash_and_deposits: 180000000, accounts_receivable: 320000000, inventory: 190000000,
        current_assets_total: 720000000, tangible_fixed_assets: 340000000,
        fixed_assets_total: 450000000, total_assets: 1170000000,
        accounts_payable: 240000000, short_term_borrowings: 140000000,
        current_liabilities_total: 510000000, long_term_borrowings: 180000000,
        total_liabilities: 710000000, capital_stock: 100000000,
        retained_earnings: 360000000, total_net_assets: 460000000,
      },
      {
        period_id: '01111111-3333-3333-3333-333333333333',
        cash_and_deposits: 220000000, accounts_receivable: 380000000, inventory: 200000000,
        current_assets_total: 830000000, tangible_fixed_assets: 360000000,
        fixed_assets_total: 480000000, total_assets: 1310000000,
        accounts_payable: 260000000, short_term_borrowings: 130000000,
        current_liabilities_total: 540000000, long_term_borrowings: 160000000,
        total_liabilities: 720000000, capital_stock: 100000000,
        retained_earnings: 490000000, total_net_assets: 590000000,
      },
    ]

    console.log('投入開始: BS項目データ')
    for (const item of balanceSheetItems) {
      const { error } = await supabase.from('balance_sheet_items').upsert(item)
      if (error) {
        console.error('BS項目投入エラー:', error)
        throw new Error(`Failed to insert BS item: ${error.message}`)
      }
    }
    console.log('完了: BS項目データ', balanceSheetItems.length, '件')

    // 7. Profit Loss Items - サンプル製造
    const profitLossItems = [
      {
        period_id: '01111111-1111-1111-1111-111111111111',
        net_sales: 1200000000, cost_of_sales: 840000000, gross_profit: 360000000,
        selling_general_admin_expenses: 250000000, operating_income: 110000000,
        non_operating_income: 5000000, non_operating_expenses: 12000000,
        ordinary_income: 103000000, income_before_tax: 100000000,
        income_taxes: 30000000, net_income: 70000000,
      },
      {
        period_id: '01111111-2222-2222-2222-222222222222',
        net_sales: 1350000000, cost_of_sales: 920000000, gross_profit: 430000000,
        selling_general_admin_expenses: 280000000, operating_income: 150000000,
        non_operating_income: 6000000, non_operating_expenses: 10000000,
        ordinary_income: 146000000, income_before_tax: 140000000,
        income_taxes: 42000000, net_income: 98000000,
      },
      {
        period_id: '01111111-3333-3333-3333-333333333333',
        net_sales: 1580000000, cost_of_sales: 1060000000, gross_profit: 520000000,
        selling_general_admin_expenses: 310000000, operating_income: 210000000,
        non_operating_income: 8000000, non_operating_expenses: 9000000,
        ordinary_income: 209000000, income_before_tax: 205000000,
        income_taxes: 61500000, net_income: 143500000,
      },
    ]

    console.log('投入開始: PL項目データ')
    for (const item of profitLossItems) {
      const { error } = await supabase.from('profit_loss_items').upsert(item)
      if (error) {
        console.error('PL項目投入エラー:', error)
        throw new Error(`Failed to insert PL item: ${error.message}`)
      }
    }
    console.log('完了: PL項目データ', profitLossItems.length, '件')

    // 8. Manual Inputs - サンプル製造
    const manualInputs = [
      { period_id: '01111111-1111-1111-1111-111111111111', input_type: 'depreciation', amount: 28000000, note: '2021年度減価償却費' },
      { period_id: '01111111-1111-1111-1111-111111111111', input_type: 'capex', amount: 35000000, note: '2021年度設備投資' },
      { period_id: '01111111-2222-2222-2222-222222222222', input_type: 'depreciation', amount: 32000000, note: '2022年度減価償却費' },
      { period_id: '01111111-2222-2222-2222-222222222222', input_type: 'capex', amount: 52000000, note: '2022年度設備投資' },
      { period_id: '01111111-3333-3333-3333-333333333333', input_type: 'depreciation', amount: 36000000, note: '2023年度減価償却費' },
      { period_id: '01111111-3333-3333-3333-333333333333', input_type: 'capex', amount: 58000000, note: '2023年度設備投資' },
    ]

    for (const input of manualInputs) {
      await supabase.from('manual_inputs').insert(input).select()
    }

    // 9. Analysis Comments
    const comments = [
      {
        analysis_id: 'f1111111-1111-1111-1111-111111111111',
        comment_type: 'overall',
        ai_generated_text: '【総合評価】\n株式会社サンプル製造の財務状況は良好です。3期連続で増収増益を達成しており、売上高は2021年度の12億円から2023年度には15.8億円まで31.7%増加しています。営業利益率も改善傾向にあり、収益性が向上しています。\n\n一方で、有利子負債も一定程度存在するため、今後の設備投資と財務バランスに注意が必要です。',
        is_edited: false,
        display_order: 1,
      },
      {
        analysis_id: 'f1111111-1111-1111-1111-111111111111',
        comment_type: 'profitability',
        ai_generated_text: '【収益性分析】\n売上総利益率は30-33%で安定しており、営業利益率は9.2%から13.3%へと大きく改善しています。ROEも18.9%から24.3%へ向上しており、資本効率も良好です。',
        is_edited: false,
        display_order: 2,
      },
    ]

    for (const comment of comments) {
      await supabase.from('analysis_comments').insert(comment).select()
    }

    return NextResponse.json({
      success: true,
      message: 'Sample data seeded successfully',
      data: {
        industries: industries.length,
        companies: companies.length,
        analyses: analyses.length,
        periods: periods.length,
      },
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: 'Failed to seed data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
