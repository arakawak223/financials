export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PdfExtractResult } from '@/lib/types/financial'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const params = await context.params
    const analysisId = params.id

    const body = await request.json()
    const { fiscalYear, extractedData } = body as {
      fiscalYear: number
      extractedData: PdfExtractResult
    }

    if (!fiscalYear || !extractedData) {
      return NextResponse.json(
        { error: 'Invalid data' },
        { status: 400 }
      )
    }

    // 該当年度の期間データを取得または作成
    const { data: periodData, error: periodError } = await supabase
      .from('financial_periods')
      .select('id')
      .eq('analysis_id', analysisId)
      .eq('fiscal_year', fiscalYear)
      .single()

    if (periodError && periodError.code !== 'PGRST116') {
      console.error('Period fetch error:', periodError)
      return NextResponse.json(
        { error: 'Failed to fetch period' },
        { status: 500 }
      )
    }

    // 期間データが存在しない場合は作成
    let period = periodData
    if (!period) {
      const { data: newPeriod, error: createError } = await supabase
        .from('financial_periods')
        .insert({
          analysis_id: analysisId,
          fiscal_year: fiscalYear,
        })
        .select('id')
        .single()

      if (createError) {
        console.error('Period create error:', createError)
        return NextResponse.json(
          { error: 'Failed to create period' },
          { status: 500 }
        )
      }

      period = newPeriod
    }

    const periodId = period.id

    // BSデータを保存
    if (extractedData.balanceSheet && Object.keys(extractedData.balanceSheet).length > 0) {
      const { error: bsError } = await supabase
        .from('balance_sheet_items')
        .upsert(
          {
            period_id: periodId,
            ...extractedData.balanceSheet,
          },
          { onConflict: 'period_id' }
        )

      if (bsError) {
        console.error('BS save error:', bsError)
      }
    }

    // PLデータを保存
    if (extractedData.profitLoss && Object.keys(extractedData.profitLoss).length > 0) {
      const { error: plError } = await supabase
        .from('profit_loss_items')
        .upsert(
          {
            period_id: periodId,
            ...extractedData.profitLoss,
          },
          { onConflict: 'period_id' }
        )

      if (plError) {
        console.error('PL save error:', plError)
      }
    }

    // 勘定科目明細を保存
    if (extractedData.accountDetails && extractedData.accountDetails.length > 0) {
      console.log('💾 勘定科目明細を保存:', extractedData.accountDetails.length, '件')

      // 既存の明細を削除
      const { error: deleteError } = await supabase
        .from('account_details')
        .delete()
        .eq('period_id', periodId)

      if (deleteError) {
        console.error('Account details delete error:', deleteError)
      }

      // 新しい明細を挿入
      const accountDetailsData = extractedData.accountDetails.map((detail: any) => ({
        period_id: periodId,
        account_category: detail.account_category || detail.accountType || 'other',
        item_name: detail.account_name || detail.itemName,
        amount: detail.amount,
        note: detail.note || detail.notes,
      }))

      const { error: insertError } = await supabase
        .from('account_details')
        .insert(accountDetailsData)

      if (insertError) {
        console.error('Account details insert error:', insertError)
      } else {
        console.log('✅ 勘定科目明細保存完了')
      }
    }

    return NextResponse.json({
      success: true,
      periodId,
    })
  } catch (error) {
    console.error('Save error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
