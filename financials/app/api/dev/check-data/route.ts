import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. 企業
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name, company_code')
      .order('name')

    // 2. 財務分析
    const { data: analyses } = await supabase
      .from('financial_analyses')
      .select(`
        id,
        status,
        fiscal_year_start,
        fiscal_year_end,
        periods_count,
        companies (name)
      `)
      .order('created_at', { ascending: false })

    // 3. 財務期間
    const { data: periods } = await supabase
      .from('financial_periods')
      .select('id, fiscal_year')

    // 4. BS・PL項目
    const { data: bsItems } = await supabase
      .from('balance_sheet_items')
      .select('id')

    const { data: plItems } = await supabase
      .from('profit_loss_items')
      .select('id')

    // 5. コメント
    const { data: comments } = await supabase
      .from('analysis_comments')
      .select('id, comment_type')

    return NextResponse.json({
      success: true,
      data: {
        companies: {
          count: companies?.length || 0,
          list: companies?.map(c => ({ name: c.name, code: c.company_code })) || []
        },
        analyses: {
          count: analyses?.length || 0,
          list: analyses?.map(a => {
            const companyName = a.companies && typeof a.companies === 'object' && 'name' in a.companies
              ? (a.companies as { name: string }).name
              : '不明'
            return {
              company: companyName,
              period: `${a.fiscal_year_start}-${a.fiscal_year_end}`,
              periods: a.periods_count,
              status: a.status
            }
          }) || []
        },
        periods: { count: periods?.length || 0 },
        financialData: {
          balanceSheets: bsItems?.length || 0,
          profitLoss: plItems?.length || 0
        },
        comments: { count: comments?.length || 0 }
      }
    })
  } catch (error) {
    console.error('Check data error:', error)
    return NextResponse.json(
      { error: 'Failed to check data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
