import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PeriodFinancialData } from '@/lib/types/financial'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { analysisId, periods } = body as {
      analysisId: string
      periods: PeriodFinancialData[]
    }

    if (!analysisId || !periods || !Array.isArray(periods)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 各期間のデータを保存
    for (const period of periods) {
      // 期間レコードを作成または取得
      const { data: periodRecord, error: periodError } = await supabase
        .from('financial_periods')
        .upsert({
          analysis_id: analysisId,
          fiscal_year: period.fiscalYear,
          period_start_date: period.periodStartDate?.toISOString(),
          period_end_date: period.periodEndDate?.toISOString(),
        })
        .select()
        .single()

      if (periodError) {
        console.error('Period error:', periodError)
        continue
      }

      // 貸借対照表データを保存
      if (period.balanceSheet) {
        const { error: bsError } = await supabase
          .from('balance_sheet_items')
          .upsert({
            period_id: periodRecord.id,
            ...period.balanceSheet,
          })

        if (bsError) {
          console.error('BS error:', bsError)
        }
      }

      // 損益計算書データを保存
      if (period.profitLoss) {
        const { error: plError } = await supabase
          .from('profit_loss_items')
          .upsert({
            period_id: periodRecord.id,
            ...period.profitLoss,
          })

        if (plError) {
          console.error('PL error:', plError)
        }
      }

      // 手入力データを保存
      if (period.manualInputs) {
        const { depreciation, capex } = period.manualInputs

        if (depreciation !== undefined) {
          await supabase.from('manual_inputs').upsert({
            period_id: periodRecord.id,
            input_type: 'depreciation',
            amount: depreciation,
            created_by: user.id,
          })
        }

        if (capex !== undefined) {
          await supabase.from('manual_inputs').upsert({
            period_id: periodRecord.id,
            input_type: 'capex',
            amount: capex,
            created_by: user.id,
          })
        }
      }

      // 勘定科目内訳を保存
      if (period.accountDetails && period.accountDetails.length > 0) {
        const accountDetailsData = period.accountDetails.map((detail) => ({
          period_id: periodRecord.id,
          account_type: detail.accountType,
          item_name: detail.itemName,
          amount: detail.amount,
          note: detail.note,
        }))

        const { error: detailsError } = await supabase
          .from('account_details')
          .upsert(accountDetailsData)

        if (detailsError) {
          console.error('Account details error:', detailsError)
        }
      }

      // 財務指標を保存
      if (period.metrics) {
        const { error: metricsError } = await supabase
          .from('financial_metrics')
          .upsert({
            analysis_id: analysisId,
            period_id: periodRecord.id,
            ...period.metrics,
          })

        if (metricsError) {
          console.error('Metrics error:', metricsError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Financial data saved successfully',
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 分析データを取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const analysisId = searchParams.get('analysisId')

    if (!analysisId) {
      return NextResponse.json(
        { error: 'Missing analysisId' },
        { status: 400 }
      )
    }

    // 分析データを取得
    const { data: analysis, error: analysisError } = await supabase
      .from('financial_analyses')
      .select('*')
      .eq('id', analysisId)
      .single()

    if (analysisError) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      )
    }

    // 期間データを取得
    const { data: periods, error: periodsError } = await supabase
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

    if (periodsError) {
      return NextResponse.json(
        { error: 'Failed to fetch periods' },
        { status: 500 }
      )
    }

    // コメントを取得
    const { data: comments, error: commentsError } = await supabase
      .from('analysis_comments')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('display_order', { ascending: true })

    if (commentsError) {
      console.error('Comments error:', commentsError)
    }

    return NextResponse.json({
      analysis,
      periods,
      comments: comments || [],
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
