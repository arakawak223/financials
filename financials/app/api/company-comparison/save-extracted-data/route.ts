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

    // 財務指標を計算して保存
    if (extractedData.profitLoss && extractedData.balanceSheet) {
      console.log('💾 財務指標を計算して保存します')

      const pl = extractedData.profitLoss
      const bs = extractedData.balanceSheet

      // 営業利益率 = 営業利益 / 売上高 * 100
      const operating_margin = pl.netSales && pl.netSales > 0
        ? ((pl.operatingIncome || 0) / pl.netSales) * 100
        : null

      // ROE = 当期純利益 / 純資産 * 100
      const roe = bs.totalNetAssets && bs.totalNetAssets > 0
        ? ((pl.netIncome || 0) / bs.totalNetAssets) * 100
        : null

      // ROA = 当期純利益 / 総資産 * 100
      const roa = bs.totalAssets && bs.totalAssets > 0
        ? ((pl.netIncome || 0) / bs.totalAssets) * 100
        : null

      // 自己資本比率 = 純資産 / 総資産 * 100
      const equity_ratio = bs.totalAssets && bs.totalAssets > 0 && bs.totalNetAssets
        ? (bs.totalNetAssets / bs.totalAssets) * 100
        : null

      // EBITDA = 営業利益 + 減価償却費
      // 減価償却費は勘定科目明細から取得
      let depreciation = pl.depreciation || 0
      if (extractedData.accountDetails && Array.isArray(extractedData.accountDetails)) {
        const depreciationItem = extractedData.accountDetails.find(
          (item: any) => item.itemName === '減価償却費' || item.accountType === 'depreciation'
        )
        if (depreciationItem) {
          depreciation = depreciationItem.amount || 0
        }
      }
      const ebitda = (pl.operatingIncome || 0) + depreciation

      const metricsData = {
        analysis_id: analysisId,
        period_id: periodId,
        roe: roe,
        roa: roa,
        operating_profit_margin: operating_margin,  // DBのカラム名に合わせる
        equity_ratio: equity_ratio,
        ebitda: ebitda,
        // FCFと売上成長率は前年データが必要なため、ここでは計算しない
        fcf: null,
        sales_growth_rate: null,  // DBのカラム名に合わせる
      }

      console.log('  計算結果:', JSON.stringify(metricsData, null, 2))

      const { error: metricsError } = await supabase
        .from('financial_metrics')
        .upsert(metricsData, { onConflict: 'analysis_id,period_id' })

      if (metricsError) {
        console.error('❌ 財務指標保存エラー:', metricsError)
        // エラーでも続行
      } else {
        console.log('✅ 財務指標保存成功')
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
