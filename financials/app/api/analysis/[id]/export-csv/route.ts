export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { convertFinancialDataToCSV, generateCSVTemplate } from '@/lib/utils/csv-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: analysisId } = await params
    const supabase = await createClient()

    // URLパラメータからテンプレートモードをチェック
    const searchParams = request.nextUrl.searchParams
    const isTemplate = searchParams.get('template') === 'true'

    // テンプレートモードの場合
    if (isTemplate) {
      const csvContent = generateCSVTemplate()
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="financial_template.csv"',
        },
      })
    }

    // 財務分析データを取得
    const { data: analysis, error: analysisError } = await supabase
      .from('financial_analyses')
      .select('*, companies(name)')
      .eq('id', analysisId)
      .single()

    if (analysisError) throw analysisError
    if (!analysis) {
      return NextResponse.json({ error: '分析が見つかりません' }, { status: 404 })
    }

    // 財務期間とデータを取得
    const { data: periods, error: periodsError } = await supabase
      .from('financial_periods')
      .select(
        `
        *,
        balance_sheet_items(*),
        profit_loss_items(*),
        manual_inputs(*)
      `
      )
      .eq('analysis_id', analysisId)
      .order('fiscal_year', { ascending: true })

    if (periodsError) throw periodsError
    if (!periods || periods.length === 0) {
      return NextResponse.json(
        { error: '財務データが見つかりません' },
        { status: 404 }
      )
    }

    // データを変換
    const periodData = periods.map((period: any) => {
      const balanceSheet = period.balance_sheet_items?.[0] || {}
      const profitLoss = period.profit_loss_items?.[0] || {}
      const manualInputs: any = {}

      // manual_inputsを整形
      period.manual_inputs?.forEach((input: any) => {
        manualInputs[input.input_type] = input.amount
      })

      return {
        fiscal_year: period.fiscal_year,
        period_start_date: period.period_start_date,
        period_end_date: period.period_end_date,
        balanceSheet,
        profitLoss,
        manualInputs,
      }
    })

    // CSVに変換
    const csvContent = convertFinancialDataToCSV(periodData)

    // ファイル名を生成
    const companyName = (analysis.companies as any)?.name || 'company'
    const filename = `${companyName}_財務データ_${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    })
  } catch (error) {
    console.error('CSV export error:', error)
    return NextResponse.json(
      { error: 'CSVエクスポート中にエラーが発生しました', details: String(error) },
      { status: 500 }
    )
  }
}
