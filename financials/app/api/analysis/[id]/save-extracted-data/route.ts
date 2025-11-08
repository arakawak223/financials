export const dynamic = 'force-dynamic';
export const maxDuration = 30; // データ保存・マッチング処理のため30秒に設定
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

    console.log('💾 save-extracted-data: 受信したデータ')
    console.log('  fiscalYear:', fiscalYear)
    console.log('  extractedData.success:', extractedData?.success)
    console.log('  extractedData.balanceSheet:', JSON.stringify(extractedData?.balanceSheet, null, 2))
    console.log('  extractedData.profitLoss:', JSON.stringify(extractedData?.profitLoss, null, 2))
    console.log('  extractedData.accountDetails:', extractedData?.accountDetails?.length, '件')
    console.log('  extractedData全体のキー:', Object.keys(extractedData || {}))

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
      const bsDataToSave = {
        period_id: periodId,
        ...extractedData.balanceSheet,
      }
      console.log('💾 BSデータをSupabaseに保存します:')
      console.log('  period_id:', periodId)
      console.log('  BSキー:', Object.keys(extractedData.balanceSheet))
      console.log('  保存するデータ:', JSON.stringify(bsDataToSave, null, 2))

      const { error: bsError } = await supabase
        .from('balance_sheet_items')
        .upsert(bsDataToSave, { onConflict: 'period_id' })

      if (bsError) {
        console.error('❌ BS save error:', bsError)
      } else {
        console.log('✅ BS保存成功')
      }
    }

    // PLデータを保存
    if (extractedData.profitLoss && Object.keys(extractedData.profitLoss).length > 0) {
      const plDataToSave = {
        period_id: periodId,
        ...extractedData.profitLoss,
      }
      console.log('💾 PLデータをSupabaseに保存します:')
      console.log('  period_id:', periodId)
      console.log('  PLキー:', Object.keys(extractedData.profitLoss))
      console.log('  保存するデータ:', JSON.stringify(plDataToSave, null, 2))

      const { error: plError } = await supabase
        .from('profit_loss_items')
        .upsert(plDataToSave, { onConflict: 'period_id' })

      if (plError) {
        console.error('❌ PL save error:', plError)
      } else {
        console.log('✅ PL保存成功')
      }
    }

    // 勘定科目明細を保存
    if (extractedData.accountDetails && extractedData.accountDetails.length > 0) {
      console.log('💾 勘定科目明細を保存:', extractedData.accountDetails.length, '件')

      // 分析のformat_idを取得
      const { data: analysisData } = await supabase
        .from('financial_analyses')
        .select('format_id')
        .eq('id', analysisId)
        .single()

      let formatItems: any[] = []
      if (analysisData?.format_id) {
        // 科目テンプレートの項目を取得
        const { data: formatItemsData } = await supabase
          .from('account_format_items')
          .select('id, account_name, category')
          .eq('format_id', analysisData.format_id)

        formatItems = formatItemsData || []
        console.log('📋 科目テンプレート項目を取得:', formatItems.length, '件')
      }

      // 既存の明細を削除
      const { error: deleteError } = await supabase
        .from('account_details')
        .delete()
        .eq('period_id', periodId)

      if (deleteError) {
        console.error('Account details delete error:', deleteError)
      }

      // 新しい明細を挿入（科目テンプレートとマッチング）
      const accountDetailsData = extractedData.accountDetails.map((detail: any) => {
        const accountName = detail.account_name || detail.itemName
        const accountCategory = detail.account_category || detail.accountType || 'other'

        // 科目テンプレートの項目と名前＋カテゴリーでマッチング
        const matchedFormatItem = formatItems.find(
          (item) => item.account_name === accountName && item.category === accountCategory
        )

        const data: any = {
          period_id: periodId,
          account_category: accountCategory,
          account_name: accountName,
          amount: detail.amount,
          notes: detail.notes || detail.note,
        }

        // マッチした場合、format_item_idを設定
        if (matchedFormatItem) {
          data.format_item_id = matchedFormatItem.id
          console.log(`  ✅ マッチング: [${accountCategory}] "${accountName}" → format_item_id: ${matchedFormatItem.id}`)
        } else {
          console.log(`  ⚠️  マッチなし: [${accountCategory}] "${accountName}"`)
        }

        return data
      })

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
