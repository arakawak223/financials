#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../lib/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient<Database>(supabaseUrl, supabaseKey)

async function checkData() {
  console.log('🔍 データベース内容を確認中...\n')

  // 1. 企業
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name, company_code')
    .order('name')

  if (companiesError) {
    console.error('❌ 企業データ取得エラー:', companiesError)
  } else {
    console.log('✅ 企業データ:')
    companies?.forEach(c => console.log(`   - ${c.name} (${c.company_code || 'N/A'})`))
    console.log(`   合計: ${companies?.length || 0}件\n`)
  }

  // 2. 財務分析
  const { data: analyses, error: analysesError } = await supabase
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

  if (analysesError) {
    console.error('❌ 分析データ取得エラー:', analysesError)
  } else {
    console.log('✅ 財務分析データ:')
    analyses?.forEach(a => {
      const companyName = a.companies && typeof a.companies === 'object' && 'name' in a.companies
        ? (a.companies as { name: string }).name
        : '不明'
      console.log(`   - ${companyName}: ${a.fiscal_year_start}-${a.fiscal_year_end}年度 (${a.periods_count}期) - ${a.status}`)
    })
    console.log(`   合計: ${analyses?.length || 0}件\n`)
  }

  // 3. 財務期間
  const { data: periods, error: periodsError } = await supabase
    .from('financial_periods')
    .select('id, fiscal_year, analysis_id')
    .order('fiscal_year')

  if (periodsError) {
    console.error('❌ 期間データ取得エラー:', periodsError)
  } else {
    console.log('✅ 財務期間データ:')
    console.log(`   合計: ${periods?.length || 0}件\n`)
  }

  // 4. BS・PL項目
  const { data: bsItems } = await supabase
    .from('balance_sheet_items')
    .select('id')

  const { data: plItems } = await supabase
    .from('profit_loss_items')
    .select('id')

  console.log('✅ 財務諸表データ:')
  console.log(`   BS項目: ${bsItems?.length || 0}件`)
  console.log(`   PL項目: ${plItems?.length || 0}件\n`)

  // 5. コメント
  const { data: comments } = await supabase
    .from('analysis_comments')
    .select('id, comment_type')

  console.log('✅ 分析コメント:')
  console.log(`   合計: ${comments?.length || 0}件\n`)

  console.log('✨ データ確認完了！')
}

checkData().catch(console.error)
