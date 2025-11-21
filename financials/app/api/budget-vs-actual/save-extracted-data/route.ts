export const dynamic = 'force-dynamic';
export const maxDuration = 30; // データ保存処理のため30秒に設定

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { PdfExtractResult } from '@/lib/types/financial'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const {
      companyId,
      periodId,
      fiscalYear,
      dataType, // 'budget' | 'actual'
      extractedData,
      fileId, // uploaded_filesテーブルのID
    } = body as {
      companyId: string
      periodId: string
      fiscalYear: number
      dataType: 'budget' | 'actual'
      extractedData: PdfExtractResult
      fileId?: string
    }

    console.log('💾 save-extracted-data (予算実績分析): 受信したデータ')
    console.log('  companyId:', companyId)
    console.log('  periodId:', periodId)
    console.log('  fiscalYear:', fiscalYear)
    console.log('  dataType:', dataType)
    console.log('  fileId:', fileId)
    console.log('  extractedData.success:', extractedData?.success)
    console.log('  extractedData.profitLoss:', JSON.stringify(extractedData?.profitLoss, null, 2))

    if (!companyId || !periodId || !fiscalYear || !dataType || !extractedData) {
      return NextResponse.json(
        { error: '必須パラメータが不足しています' },
        { status: 400 }
      )
    }

    if (!['budget', 'actual'].includes(dataType)) {
      return NextResponse.json(
        { error: 'dataTypeは"budget"または"actual"である必要があります' },
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

    if (dataType === 'budget') {
      // 予算データを保存
      if (extractedData.profitLoss && Object.keys(extractedData.profitLoss).length > 0) {
        // budget_dataテーブル用にプレフィックスを追加
        const budgetData: any = {
          period_id: periodId,
          company_id: companyId,
          fiscal_year: fiscalYear,
          source_file_id: fileId || null,
        }

        // PL項目を budget_ プレフィックス付きでマッピング
        const plMapping: Record<string, string> = {
          net_sales: 'budget_net_sales',
          cost_of_sales: 'budget_cost_of_sales',
          gross_profit: 'budget_gross_profit',
          personnel_expenses: 'budget_personnel_expenses',
          depreciation: 'budget_depreciation',
          other_operating_expenses: 'budget_other_operating_expenses',
          operating_income: 'budget_operating_income',
          non_operating_income: 'budget_non_operating_income',
          non_operating_expenses: 'budget_non_operating_expenses',
          ordinary_income: 'budget_ordinary_income',
          extraordinary_income: 'budget_extraordinary_income',
          extraordinary_loss: 'budget_extraordinary_loss',
          income_before_taxes: 'budget_income_before_taxes',
          corporate_tax: 'budget_corporate_tax',
          net_income: 'budget_net_income',
        }

        Object.entries(plMapping).forEach(([plKey, budgetKey]) => {
          const value = (extractedData.profitLoss as any)?.[plKey]
          if (value !== undefined) {
            budgetData[budgetKey] = value
          }
        })

        console.log('💾 予算データをbudget_dataテーブルに保存します:')
        console.log('  period_id:', periodId)
        console.log('  保存するデータ:', JSON.stringify(budgetData, null, 2))

        const { error: budgetError } = await supabase
          .from('budget_data')
          .upsert(budgetData, { onConflict: 'period_id' })

        if (budgetError) {
          console.error('❌ 予算データ保存エラー:', budgetError)
          return NextResponse.json(
            { error: '予算データの保存に失敗しました', details: budgetError.message },
            { status: 500 }
          )
        } else {
          console.log('✅ 予算データ保存成功')
        }
      }
    } else if (dataType === 'actual') {
      // 実績データを保存（profit_loss_itemsテーブル）
      if (extractedData.profitLoss && Object.keys(extractedData.profitLoss).length > 0) {
        const plDataToSave = {
          period_id: periodId,
          ...extractedData.profitLoss,
        }
        console.log('💾 実績データをprofit_loss_itemsテーブルに保存します:')
        console.log('  period_id:', periodId)
        console.log('  保存するデータ:', JSON.stringify(plDataToSave, null, 2))

        const { error: plError } = await supabase
          .from('profit_loss_items')
          .upsert(plDataToSave, { onConflict: 'period_id' })

        if (plError) {
          console.error('❌ 実績データ保存エラー:', plError)
          return NextResponse.json(
            { error: '実績データの保存に失敗しました', details: plError.message },
            { status: 500 }
          )
        } else {
          console.log('✅ 実績データ保存成功')
        }
      }
    }

    return NextResponse.json({
      success: true,
      periodId,
      dataType,
    })
  } catch (error) {
    console.error('Save error:', error)
    return NextResponse.json(
      { error: 'サーバーエラー' },
      { status: 500 }
    )
  }
}
