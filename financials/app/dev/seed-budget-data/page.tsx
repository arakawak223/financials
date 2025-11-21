'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Check, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SeedBudgetDataPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [details, setDetails] = useState<string[]>([])

  const seedBudgetData = async () => {
    setLoading(true)
    setMessage(null)
    setDetails([])

    try {
      const supabase = createClient()
      const logs: string[] = []

      // 1. 企業と分析データを取得
      logs.push('企業データを取得中...')
      setDetails([...logs])

      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .limit(3)

      if (companiesError) throw companiesError
      if (!companies || companies.length === 0) {
        throw new Error('企業データが見つかりません')
      }

      logs.push(`${companies.length}社の企業を発見`)
      setDetails([...logs])

      // 各企業に対して予算データを作成
      for (const company of companies) {
        logs.push(`\n${company.name}の予算データを作成中...`)
        setDetails([...logs])

        // 分析データを取得
        const { data: analyses, error: analysesError } = await supabase
          .from('financial_analyses')
          .select('id')
          .eq('company_id', company.id)
          .limit(1)

        if (analysesError) throw analysesError

        let analysisId: string

        if (!analyses || analyses.length === 0) {
          // 分析データがない場合は作成
          logs.push('  - 分析データを作成中...')
          setDetails([...logs])

          const { data: newAnalysis, error: newAnalysisError } = await supabase
            .from('financial_analyses')
            .insert({
              company_id: company.id,
              fiscal_year_start: 2023,
              fiscal_year_end: 2023,
              periods_count: 1,
              status: 'completed',
            })
            .select()
            .single()

          if (newAnalysisError) throw newAnalysisError
          analysisId = newAnalysis.id

          // 会計期間を作成
          const { data: newPeriod, error: newPeriodError } = await supabase
            .from('financial_periods')
            .insert({
              analysis_id: analysisId,
              fiscal_year: 2023,
              period_start_date: '2023-01-01',
              period_end_date: '2023-12-31',
            })
            .select()
            .single()

          if (newPeriodError) throw newPeriodError

          // 実績データ（profit_loss_items）を作成
          const actualData = {
            period_id: newPeriod.id,
            net_sales: 1050000000,
            cost_of_sales: 620000000,
            gross_profit: 430000000,
            personnel_expenses: 180000000,
            depreciation: 30000000,
            other_operating_expenses: 60000000,
            operating_income: 160000000,
            non_operating_income: 5000000,
            non_operating_expenses: 10000000,
            ordinary_income: 155000000,
            extraordinary_income: 2000000,
            extraordinary_loss: 5000000,
            income_before_taxes: 152000000,
            corporate_tax: 52000000,
            net_income: 100000000,
          }

          const { error: actualError } = await supabase
            .from('profit_loss_items')
            .insert(actualData)

          if (actualError) throw actualError

          logs.push('  - 実績データを作成しました')
          setDetails([...logs])
        } else {
          analysisId = analyses[0].id
        }

        // 会計期間を取得
        const { data: periods, error: periodsError } = await supabase
          .from('financial_periods')
          .select('id')
          .eq('analysis_id', analysisId)
          .limit(1)

        if (periodsError) throw periodsError
        if (!periods || periods.length === 0) {
          logs.push('  - 会計期間が見つかりません。スキップします。')
          setDetails([...logs])
          continue
        }

        const periodId = periods[0].id

        // budget_dataテーブルにデータを挿入（テーブルが存在しない場合は作成される）
        const budgetData = {
          period_id: periodId,
          company_id: company.id,
          fiscal_year: 2023,
          // 予算値（実績より少し低めに設定）
          budget_net_sales: 1000000000,
          budget_cost_of_sales: 600000000,
          budget_gross_profit: 400000000,
          budget_personnel_expenses: 170000000,
          budget_depreciation: 30000000,
          budget_other_operating_expenses: 50000000,
          budget_operating_income: 150000000,
          budget_non_operating_income: 5000000,
          budget_non_operating_expenses: 15000000,
          budget_ordinary_income: 140000000,
          budget_extraordinary_income: 0,
          budget_extraordinary_loss: 5000000,
          budget_income_before_taxes: 135000000,
          budget_corporate_tax: 45000000,
          budget_net_income: 90000000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        // テーブルが存在するか確認
        const { error: checkError } = await supabase
          .from('budget_data')
          .select('id')
          .eq('period_id', periodId)
          .limit(1)

        if (checkError && checkError.message.includes('does not exist')) {
          logs.push('  - budget_dataテーブルが存在しません')
          logs.push('  - Supabaseダッシュボードで以下のSQLを実行してください：')
          logs.push('')
          logs.push('CREATE TABLE IF NOT EXISTS budget_data (')
          logs.push('  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,')
          logs.push('  period_id UUID NOT NULL REFERENCES financial_periods(id) ON DELETE CASCADE,')
          logs.push('  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,')
          logs.push('  fiscal_year INTEGER NOT NULL,')
          logs.push('  budget_net_sales NUMERIC,')
          logs.push('  budget_cost_of_sales NUMERIC,')
          logs.push('  budget_gross_profit NUMERIC,')
          logs.push('  budget_personnel_expenses NUMERIC,')
          logs.push('  budget_depreciation NUMERIC,')
          logs.push('  budget_other_operating_expenses NUMERIC,')
          logs.push('  budget_operating_income NUMERIC,')
          logs.push('  budget_non_operating_income NUMERIC,')
          logs.push('  budget_non_operating_expenses NUMERIC,')
          logs.push('  budget_ordinary_income NUMERIC,')
          logs.push('  budget_extraordinary_income NUMERIC,')
          logs.push('  budget_extraordinary_loss NUMERIC,')
          logs.push('  budget_income_before_taxes NUMERIC,')
          logs.push('  budget_corporate_tax NUMERIC,')
          logs.push('  budget_net_income NUMERIC,')
          logs.push('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),')
          logs.push('  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()')
          logs.push(');')
          logs.push('')
          setDetails([...logs])
          setMessage({ type: 'error', text: 'budget_dataテーブルが存在しません。上記のSQLを実行してください。' })
          setLoading(false)
          return
        }

        // 既存データを削除
        const { error: deleteError } = await supabase
          .from('budget_data')
          .delete()
          .eq('period_id', periodId)

        if (deleteError && !deleteError.message.includes('does not exist')) {
          throw deleteError
        }

        // 新しいデータを挿入
        const { error: insertError } = await supabase
          .from('budget_data')
          .insert(budgetData)

        if (insertError) throw insertError

        logs.push(`  - ${company.name}の予算データを作成しました`)
        setDetails([...logs])
      }

      logs.push('\n✅ 予算データの作成が完了しました')
      setDetails([...logs])
      setMessage({ type: 'success', text: '予算データの作成が完了しました' })
    } catch (error) {
      console.error('予算データ作成エラー:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '予算データの作成に失敗しました'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <Button variant="ghost" onClick={() => router.push('/')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          トップページ
        </Button>
        <h1 className="text-3xl font-bold">予算データ作成ツール</h1>
        <p className="text-gray-600 mt-2">
          テスト用の予算データを作成します
        </p>
      </div>

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">予算データ作成</h2>
        <p className="text-sm text-gray-600 mb-4">
          このツールは、既存の企業データに対して2023年度の予算データを作成します。
          実績データも自動的に作成されます。
        </p>
        <Button
          onClick={seedBudgetData}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>処理中...</>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              予算データを作成
            </>
          )}
        </Button>
      </Card>

      {message && (
        <Card className={`p-4 mb-6 ${message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <p className={message.type === 'success' ? 'text-green-900' : 'text-red-900'}>
              {message.text}
            </p>
          </div>
        </Card>
      )}

      {details.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-3">実行ログ</h3>
          <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-sm overflow-auto max-h-96">
            {details.map((detail, index) => (
              <div key={index}>{detail}</div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
