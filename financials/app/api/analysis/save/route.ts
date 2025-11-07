export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PeriodFinancialData } from '@/lib/types/financial'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック（開発中は一時的に無効化）
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    // 開発中はユーザーIDがnullでも許可
    const userId = user?.id || null

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
      // 既存の期間レコードを検索
      const { data: existingPeriod } = await supabase
        .from('financial_periods')
        .select('id')
        .eq('analysis_id', analysisId)
        .eq('fiscal_year', period.fiscalYear)
        .single()

      let periodId: string

      if (existingPeriod) {
        // 既存レコードを更新
        periodId = existingPeriod.id
        const { error: updateError } = await supabase
          .from('financial_periods')
          .update({
            period_start_date: period.periodStartDate?.toISOString(),
            period_end_date: period.periodEndDate?.toISOString(),
          })
          .eq('id', periodId)

        if (updateError) {
          console.error('Period update error:', updateError)
          continue
        }
      } else {
        // 新規レコードを作成
        const { data: newPeriod, error: insertError } = await supabase
          .from('financial_periods')
          .insert({
            analysis_id: analysisId,
            fiscal_year: period.fiscalYear,
            period_start_date: period.periodStartDate?.toISOString(),
            period_end_date: period.periodEndDate?.toISOString(),
          })
          .select()
          .single()

        if (insertError || !newPeriod) {
          console.error('Period insert error:', insertError)
          continue
        }

        periodId = newPeriod.id
      }

      // 貸借対照表データを保存
      if (period.balanceSheet) {
        // 既存レコードを確認
        const { data: existingBS } = await supabase
          .from('balance_sheet_items')
          .select('id')
          .eq('period_id', periodId)
          .single()

        if (existingBS) {
          // 更新
          const { error: bsError } = await supabase
            .from('balance_sheet_items')
            .update(period.balanceSheet)
            .eq('id', existingBS.id)

          if (bsError) {
            console.error('BS update error:', bsError)
          }
        } else {
          // 新規作成
          const { error: bsError } = await supabase
            .from('balance_sheet_items')
            .insert({
              period_id: periodId,
              ...period.balanceSheet,
            })

          if (bsError) {
            console.error('BS insert error:', bsError)
          }
        }
      }

      // 損益計算書データを保存
      if (period.profitLoss) {
        // 既存レコードを確認
        const { data: existingPL } = await supabase
          .from('profit_loss_items')
          .select('id')
          .eq('period_id', periodId)
          .single()

        if (existingPL) {
          // 更新
          const { error: plError } = await supabase
            .from('profit_loss_items')
            .update(period.profitLoss)
            .eq('id', existingPL.id)

          if (plError) {
            console.error('PL update error:', plError)
          }
        } else {
          // 新規作成
          const { error: plError } = await supabase
            .from('profit_loss_items')
            .insert({
              period_id: periodId,
              ...period.profitLoss,
            })

          if (plError) {
            console.error('PL insert error:', plError)
          }
        }
      }

      // 手入力データを保存
      if (period.manualInputs) {
        const { depreciation, capex, fixedAssetDisposalValue } = period.manualInputs

        if (depreciation !== undefined) {
          const { data: existing, error: selectError } = await supabase
            .from('manual_inputs')
            .select('id')
            .eq('period_id', periodId)
            .eq('input_type', 'depreciation')
            .single()

          if (selectError && selectError.code !== 'PGRST116') {
            console.error('Depreciation select error:', selectError)
          }

          if (existing) {
            const { error: updateError } = await supabase
              .from('manual_inputs')
              .update({ amount: depreciation })
              .eq('id', existing.id)

            if (updateError) {
              console.error('Depreciation update error:', updateError)
              throw new Error('減価償却費の更新に失敗しました')
            }
          } else {
            const { error: insertError } = await supabase.from('manual_inputs').insert({
              period_id: periodId,
              input_type: 'depreciation',
              amount: depreciation,
            })

            if (insertError) {
              console.error('Depreciation insert error:', insertError)
              throw new Error('減価償却費の挿入に失敗しました')
            }
          }
        }

        if (capex !== undefined) {
          const { data: existing, error: selectError } = await supabase
            .from('manual_inputs')
            .select('id')
            .eq('period_id', periodId)
            .eq('input_type', 'capex')
            .single()

          if (selectError && selectError.code !== 'PGRST116') {
            console.error('Capex select error:', selectError)
          }

          if (existing) {
            const { error: updateError } = await supabase
              .from('manual_inputs')
              .update({ amount: capex })
              .eq('id', existing.id)

            if (updateError) {
              console.error('Capex update error:', updateError)
              throw new Error('設備投資額の更新に失敗しました')
            }
          } else {
            const { error: insertError } = await supabase.from('manual_inputs').insert({
              period_id: periodId,
              input_type: 'capex',
              amount: capex,
            })

            if (insertError) {
              console.error('Capex insert error:', insertError)
              throw new Error('設備投資額の挿入に失敗しました')
            }
          }
        }

        if (fixedAssetDisposalValue !== undefined) {
          const { data: existing, error: selectError } = await supabase
            .from('manual_inputs')
            .select('id')
            .eq('period_id', periodId)
            .eq('input_type', 'fixed_asset_disposal_value')
            .single()

          if (selectError && selectError.code !== 'PGRST116') {
            console.error('Fixed asset disposal value select error:', selectError)
          }

          if (existing) {
            const { error: updateError } = await supabase
              .from('manual_inputs')
              .update({ amount: fixedAssetDisposalValue })
              .eq('id', existing.id)

            if (updateError) {
              console.error('Fixed asset disposal value update error:', updateError)
              throw new Error('固定資産売却簿価の更新に失敗しました')
            }
          } else {
            const { error: insertError } = await supabase.from('manual_inputs').insert({
              period_id: periodId,
              input_type: 'fixed_asset_disposal_value',
              amount: fixedAssetDisposalValue,
            })

            if (insertError) {
              console.error('Fixed asset disposal value insert error:', insertError)
              throw new Error('固定資産売却簿価の挿入に失敗しました')
            }
          }
        }
      }

      // 勘定科目内訳を保存
      if (period.accountDetails && period.accountDetails.length > 0) {
        // 既存のaccount_detailsを削除
        await supabase
          .from('account_details')
          .delete()
          .eq('period_id', periodId)

        // 新しいデータを挿入
        const accountDetailsData = period.accountDetails.map((detail) => ({
          period_id: periodId,
          account_category: detail.accountType,
          account_name: detail.itemName,
          amount: detail.amount,
          notes: detail.note,
          format_item_id: detail.formatItemId || null,  // format_item_idを追加
        }))

        const { error: detailsError } = await supabase
          .from('account_details')
          .insert(accountDetailsData)

        if (detailsError) {
          console.error('Account details insert error:', detailsError)
        }
      }

      // 財務指標を保存
      if (period.metrics) {
        const { data: existingMetrics } = await supabase
          .from('financial_metrics')
          .select('id')
          .eq('period_id', periodId)
          .single()

        if (existingMetrics) {
          const { error: metricsError } = await supabase
            .from('financial_metrics')
            .update({
              ...period.metrics,
            })
            .eq('id', existingMetrics.id)

          if (metricsError) {
            console.error('Metrics update error:', metricsError)
          }
        } else {
          const { error: metricsError } = await supabase
            .from('financial_metrics')
            .insert({
              analysis_id: analysisId,
              period_id: periodId,
              ...period.metrics,
            })

          if (metricsError) {
            console.error('Metrics insert error:', metricsError)
          }
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
