import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

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

    const body = await request.json()
    const {
      companyName,
      industryId,
      formatId,
      fiscalYearStart,
      fiscalYearEnd,
    } = body

    if (!companyName || !fiscalYearStart || !fiscalYearEnd) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 企業を作成または取得
    let companyId: string

    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('name', companyName)
      .single()

    if (existingCompany) {
      companyId = existingCompany.id

      // 既存企業の業種が未設定で、新しい業種が提供された場合は更新
      if (industryId) {
        await supabase
          .from('companies')
          .update({ industry_id: industryId })
          .eq('id', companyId)
          .is('industry_id', null)
      }
    } else {
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          industry_id: industryId || null,
        })
        .select()
        .single()

      if (companyError) {
        console.error('Company creation error:', companyError)
        return NextResponse.json(
          { error: 'Failed to create company' },
          { status: 500 }
        )
      }

      companyId = newCompany.id
    }

    // 分析を作成
    const periodsCount = fiscalYearEnd - fiscalYearStart + 1

    const { data: analysis, error: analysisError } = await supabase
      .from('financial_analyses')
      .insert({
        company_id: companyId,
        analysis_date: new Date().toISOString(),
        fiscal_year_start: fiscalYearStart,
        fiscal_year_end: fiscalYearEnd,
        periods_count: periodsCount,
        format_id: formatId || null,
        status: 'draft',
        created_by: null, // 認証無効化中はnull
      })
      .select()
      .single()

    if (analysisError) {
      console.error('Analysis creation error:', analysisError)
      return NextResponse.json(
        { error: 'Failed to create analysis' },
        { status: 500 }
      )
    }

    // 各期間のレコードを作成
    const periods = []
    for (let year = fiscalYearStart; year <= fiscalYearEnd; year++) {
      const { data: period, error: periodError } = await supabase
        .from('financial_periods')
        .insert({
          analysis_id: analysis.id,
          fiscal_year: year,
        })
        .select()
        .single()

      if (periodError) {
        console.error('Period creation error:', periodError)
      } else {
        periods.push(period)
      }
    }

    return NextResponse.json({
      success: true,
      analysisId: analysis.id,
      companyId,
      periods,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
