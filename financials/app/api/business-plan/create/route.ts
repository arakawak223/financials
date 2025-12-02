export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      companyId,
      planName,
      description,
      planStartYear,
      planYears,
      scenarioType,
      baseAnalysisId,
    } = body

    if (!companyId || !planName || !planStartYear) {
      return NextResponse.json(
        { error: '必須パラメータが不足しています' },
        { status: 400 }
      )
    }

    // 事業計画を作成
    const { data: plan, error: planError } = await supabase
      .from('business_plans')
      .insert({
        company_id: companyId,
        plan_name: planName,
        description,
        plan_start_year: planStartYear,
        plan_years: planYears || 5,
        scenario_type: scenarioType || 'standard',
        base_analysis_id: baseAnalysisId,
        status: 'draft',
      })
      .select()
      .single()

    if (planError) {
      console.error('Plan creation error:', planError)
      return NextResponse.json(
        { error: '事業計画の作成に失敗しました', details: planError.message },
        { status: 500 }
      )
    }

    // 基本パラメータを初期化
    const { error: paramError } = await supabase
      .from('plan_general_parameters')
      .insert({
        plan_id: plan.id,
        corporate_tax_rate: 30.00,
        accounts_receivable_months: 2.0,
        inventory_months: 1.5,
        accounts_payable_months: 1.5,
      })

    if (paramError) {
      console.error('Parameter creation error:', paramError)
    }

    return NextResponse.json({
      success: true,
      plan,
    })
  } catch (error) {
    console.error('Create plan error:', error)
    return NextResponse.json(
      { error: '事業計画の作成に失敗しました' },
      { status: 500 }
    )
  }
}
