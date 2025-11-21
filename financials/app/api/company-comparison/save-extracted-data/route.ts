export const dynamic = 'force-dynamic';
export const maxDuration = 30; // データ保存処理のため30秒に設定

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PdfExtractResult } from '@/lib/types/financial'

/**
 * 企業間比較分析用のデータ保存
 * PL項目のみを保存（比較に必要な最小限）
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const {
      analysisId,
      periodId,
      fiscalYear,
      extractedData,
      fileId,
    } = body as {
      analysisId: string
      periodId: string
      fiscalYear: number
      extractedData: PdfExtractResult
      fileId?: string
    }

    console.log('💾 save-extracted-data (企業間比較): 受信したデータ')
    console.log('  analysisId:', analysisId)
    console.log('  periodId:', periodId)
    console.log('  fiscalYear:', fiscalYear)
    console.log('  fileId:', fileId)
    console.log('  extractedData.success:', extractedData?.success)
    console.log('  extractedData.profitLoss:', JSON.stringify(extractedData?.profitLoss, null, 2))

    if (!analysisId || !periodId || !fiscalYear || !extractedData) {
      return NextResponse.json(
        { error: '必須パラメータが不足しています' },
        { status: 400 }
      )
    }

    // 期間データが存在するか確認
    const { data: periodData, error: periodError } = await supabase
      .from('financial_periods')
      .select('id')
      .eq('id', periodId)
      .single()

    if (periodError) {
      console.error('Period fetch error:', periodError)
      return NextResponse.json(
        { error: '会計期間が見つかりません' },
        { status: 404 }
      )
    }

    // PLデータを保存（profit_loss_itemsテーブル）
    if (extractedData.profitLoss && Object.keys(extractedData.profitLoss).length > 0) {
      const plDataToSave = {
        period_id: periodId,
        ...extractedData.profitLoss,
      }
      console.log('💾 PLデータをprofit_loss_itemsテーブルに保存します:')
      console.log('  period_id:', periodId)
      console.log('  保存するデータ:', JSON.stringify(plDataToSave, null, 2))

      const { error: plError } = await supabase
        .from('profit_loss_items')
        .upsert(plDataToSave, { onConflict: 'period_id' })

      if (plError) {
        console.error('❌ PLデータ保存エラー:', plError)
        return NextResponse.json(
          { error: 'PLデータの保存に失敗しました', details: plError.message },
          { status: 500 }
        )
      } else {
        console.log('✅ PLデータ保存成功')
      }
    }

    // BSデータも保存（オプション - 企業間比較で使う場合）
    if (extractedData.balanceSheet && Object.keys(extractedData.balanceSheet).length > 0) {
      const bsDataToSave = {
        period_id: periodId,
        ...extractedData.balanceSheet,
      }
      console.log('💾 BSデータをbalance_sheet_itemsテーブルに保存します:')
      console.log('  period_id:', periodId)

      const { error: bsError } = await supabase
        .from('balance_sheet_items')
        .upsert(bsDataToSave, { onConflict: 'period_id' })

      if (bsError) {
        console.error('❌ BSデータ保存エラー:', bsError)
        // BSは必須ではないのでエラーでも続行
      } else {
        console.log('✅ BSデータ保存成功')
      }
    }

    return NextResponse.json({
      success: true,
      periodId,
      analysisId,
    })
  } catch (error) {
    console.error('Save error:', error)
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    )
  }
}
