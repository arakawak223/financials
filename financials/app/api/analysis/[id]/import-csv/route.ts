export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseCSV, convertCSVRowToFinancialData } from '@/lib/utils/csv-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: analysisId } = await params
    const supabase = await createClient()

    // リクエストボディからCSVテキストを取得
    const body = await request.json()
    const { csvText } = body

    if (!csvText) {
      return NextResponse.json({ error: 'CSVデータが必要です' }, { status: 400 })
    }

    // CSVをパース
    const rows = parseCSV(csvText)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'CSVデータが空です' }, { status: 400 })
    }

    // 各行をパースしてバリデーション
    const parsedData = rows.map((row, index) => {
      const data = convertCSVRowToFinancialData(row)
      return {
        ...data,
        rowNumber: index + 2, // ヘッダー行を考慮
      }
    })

    // エラーチェック
    const errors = parsedData.filter((d) => d.errors.length > 0)
    if (errors.length > 0) {
      const errorMessages = errors.map(
        (e) => `行${e.rowNumber}: ${e.errors.join(', ')}`
      )
      return NextResponse.json(
        {
          error: 'CSVデータにエラーがあります',
          details: errorMessages,
        },
        { status: 400 }
      )
    }

    // トランザクション開始
    const insertedPeriods: string[] = []

    for (const data of parsedData) {
      // 財務期間を作成または取得
      const { data: existingPeriod } = await supabase
        .from('financial_periods')
        .select('id')
        .eq('analysis_id', analysisId)
        .eq('fiscal_year', data.fiscal_year)
        .single()

      let periodId: string

      if (existingPeriod) {
        // 既存の期間を更新
        periodId = existingPeriod.id

        const { error: updateError } = await supabase
          .from('financial_periods')
          .update({
            period_start_date: data.period_start_date,
            period_end_date: data.period_end_date,
            updated_at: new Date().toISOString(),
          })
          .eq('id', periodId)

        if (updateError) throw updateError
      } else {
        // 新しい期間を作成
        const { data: newPeriod, error: periodError } = await supabase
          .from('financial_periods')
          .insert({
            analysis_id: analysisId,
            fiscal_year: data.fiscal_year,
            period_start_date: data.period_start_date,
            period_end_date: data.period_end_date,
          })
          .select('id')
          .single()

        if (periodError) throw periodError
        if (!newPeriod) throw new Error('期間の作成に失敗しました')

        periodId = newPeriod.id
      }

      insertedPeriods.push(periodId)

      // 貸借対照表データを保存
      const { error: bsError } = await supabase
        .from('balance_sheet_items')
        .upsert(
          {
            period_id: periodId,
            ...data.balanceSheet,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'period_id' }
        )

      if (bsError) throw bsError

      // 損益計算書データを保存
      const { error: plError } = await supabase
        .from('profit_loss_items')
        .upsert(
          {
            period_id: periodId,
            ...data.profitLoss,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'period_id' }
        )

      if (plError) throw plError

      // 手入力データを保存
      if (data.manualInputs.depreciation !== null) {
        const { error: depError } = await supabase.from('manual_inputs').upsert({
          period_id: periodId,
          input_type: 'depreciation',
          amount: data.manualInputs.depreciation,
          note: `CSV imported at ${new Date().toISOString()}`,
          updated_at: new Date().toISOString(),
        })

        if (depError) throw depError
      }

      if (data.manualInputs.capex !== null) {
        const { error: capexError } = await supabase.from('manual_inputs').upsert({
          period_id: periodId,
          input_type: 'capex',
          amount: data.manualInputs.capex,
          note: `CSV imported at ${new Date().toISOString()}`,
          updated_at: new Date().toISOString(),
        })

        if (capexError) throw capexError
      }
    }

    return NextResponse.json({
      success: true,
      message: `${parsedData.length}件の期間データをインポートしました`,
      periods: insertedPeriods,
    })
  } catch (error) {
    console.error('CSV import error:', error)
    return NextResponse.json(
      { error: 'CSVインポート中にエラーが発生しました', details: String(error) },
      { status: 500 }
    )
  }
}
