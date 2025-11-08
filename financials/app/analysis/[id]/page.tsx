'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, FileText, Loader2, TrendingUp, RefreshCw } from 'lucide-react'
import { FinancialDataTable } from '@/components/financial-data-table'
import { FinancialCharts, generateChartsFromMetrics } from '@/components/financial-charts'
import { FinancialMetricsTable } from '@/components/financial-metrics-table'
import { TrendAnalysisCharts } from '@/components/trend-analysis-charts'
import { AnalysisComments } from '@/components/analysis-comments'
import {
  calculateSalesCAGR,
  calculateOperatingIncomeCAGR,
  calculateEbitdaCAGR,
  formatPercent
} from '@/lib/utils/financial-calculations'
import type { FinancialAnalysis, AmountUnit } from '@/lib/types/financial'

export default function AnalysisDetailPage() {
  const router = useRouter()
  const params = useParams()
  const analysisId = params.id as string

  const [analysis, setAnalysis] = useState<FinancialAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [amountUnit, setAmountUnit] = useState<AmountUnit>('millions')

  // 初回マウント時にLocalStorageから単位設定を読み込む
  useEffect(() => {
    const savedUnit = localStorage.getItem('preferredAmountUnit') as AmountUnit | null
    if (savedUnit && ['ones', 'thousands', 'millions', 'billions'].includes(savedUnit)) {
      setAmountUnit(savedUnit)
    }
  }, [])

  useEffect(() => {
    loadAnalysis()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId])

  // 単位変更時にLocalStorageに保存
  const handleUnitChange = (newUnit: AmountUnit) => {
    setAmountUnit(newUnit)
    localStorage.setItem('preferredAmountUnit', newUnit)
  }

  const loadAnalysis = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analysis/${analysisId}`)

      if (!response.ok) {
        throw new Error('分析データの取得に失敗しました')
      }

      const data = await response.json()
      setAnalysis(data.analysis)

      // デフォルト単位は百万円（ユーザーが変更可能）
    } catch (err) {
      console.error('Load analysis error:', err)
      setError(err instanceof Error ? err.message : '不明なエラー')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format: 'excel' | 'powerpoint') => {
    try {
      const response = await fetch(`/api/analysis/${analysisId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format }),
      })

      if (!response.ok) {
        throw new Error('エクスポートに失敗しました')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `analysis_${analysisId}.${format === 'excel' ? 'xlsx' : 'pptx'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
      alert(err instanceof Error ? err.message : 'エクスポートに失敗しました')
    }
  }

  const handleRecalculate = async () => {
    if (!confirm('財務指標を再計算しますか？\n（既存の指標データは上書きされます）')) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/analysis/${analysisId}/recalculate`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '再計算に失敗しました')
      }

      const result = await response.json()
      alert(`財務指標を再計算しました\n\n処理期間: ${result.periodsProcessed}期\n成功: ${result.successCount}期\n失敗: ${result.errorCount}期`)

      // データを再読み込み
      await loadAnalysis()
    } catch (err) {
      console.error('Recalculate error:', err)
      alert(err instanceof Error ? err.message : '再計算に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-7xl">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">読み込み中...</span>
        </div>
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <div className="container mx-auto py-8 max-w-7xl">
        <Card className="p-8 text-center">
          <p className="text-red-600">{error || 'データが見つかりません'}</p>
          <Button onClick={() => router.push('/analysis')} className="mt-4">
            分析一覧に戻る
          </Button>
        </Card>
      </div>
    )
  }

  const charts = generateChartsFromMetrics(analysis.periods)

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex gap-2 mb-4">
          <Button variant="ghost" onClick={() => router.push('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            トップページ
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push('/analysis')}
          >
            分析一覧
          </Button>
        </div>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{analysis.companyName}</h1>
            <p className="text-gray-600 mt-2">
              {analysis.fiscalYearStart}年度 ～ {analysis.fiscalYearEnd}年度（
              {analysis.periodsCount}期分）
            </p>
            <p className="text-sm text-gray-500 mt-1">
              分析日: {new Date(analysis.analysisDate).toLocaleDateString('ja-JP')}
            </p>
          </div>

          <div className="flex gap-2 items-center">
            {/* 単位切り替え */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">単位:</label>
              <select
                value={amountUnit}
                onChange={(e) => handleUnitChange(e.target.value as AmountUnit)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="thousands">千円</option>
                <option value="millions">百万円（デフォルト）</option>
                <option value="billions">十億円</option>
              </select>
            </div>

            <Button
              variant="outline"
              onClick={() => handleExport('excel')}
            >
              <FileText className="h-4 w-4 mr-2" />
              Excel出力
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('powerpoint')}
            >
              <Download className="h-4 w-4 mr-2" />
              PowerPoint出力
            </Button>
            <Button
              variant="outline"
              onClick={handleRecalculate}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              指標を再計算
            </Button>
          </div>
        </div>
      </div>

      {/* ステータス表示 */}
      {analysis.status === 'draft' && (
        <Card className="p-4 mb-6 bg-yellow-50 border-yellow-200">
          <p className="text-yellow-800">
            この分析はまだ下書きです。データを入力して完成させてください。
          </p>
        </Card>
      )}

      {/* AIコメント */}
      <AnalysisComments
        analysisId={analysisId}
        comments={analysis.comments}
        onUpdate={loadAnalysis}
      />

      {/* CAGR（年平均成長率） */}
      {analysis.periods.length >= 2 && (
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            CAGR（年平均成長率）
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <div className="text-sm text-gray-600 mb-2">売上高CAGR</div>
              <div className="text-3xl font-bold text-blue-600">
                {formatPercent(calculateSalesCAGR(analysis.periods))}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {analysis.periods[0].fiscalYear}年度 → {analysis.periods[analysis.periods.length - 1].fiscalYear}年度
              </div>
            </Card>
            <Card className="p-6">
              <div className="text-sm text-gray-600 mb-2">営業利益CAGR</div>
              <div className="text-3xl font-bold text-green-600">
                {formatPercent(calculateOperatingIncomeCAGR(analysis.periods))}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {analysis.periods[0].fiscalYear}年度 → {analysis.periods[analysis.periods.length - 1].fiscalYear}年度
              </div>
            </Card>
            <Card className="p-6">
              <div className="text-sm text-gray-600 mb-2">EBITDA CAGR</div>
              <div className="text-3xl font-bold text-purple-600">
                {formatPercent(calculateEbitdaCAGR(analysis.periods))}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {analysis.periods[0].fiscalYear}年度 → {analysis.periods[analysis.periods.length - 1].fiscalYear}年度
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* グラフ */}
      {charts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">財務指標の推移</h2>
          <FinancialCharts charts={charts} />
        </div>
      )}

      {/* トレンド分析（複数年度の詳細グラフ） */}
      {analysis.periods.length >= 2 && (
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            トレンド分析（複数年度比較）
          </h2>
          <TrendAnalysisCharts periods={analysis.periods} unit={amountUnit} />
        </div>
      )}

      {/* 財務指標テーブル */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-4">財務指標</h2>
        <FinancialMetricsTable periods={analysis.periods} unit={amountUnit} />
      </div>

      {/* データテーブル */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-4">財務データ</h2>
        <FinancialDataTable
          periods={analysis.periods}
          unit={amountUnit}
          formatId={analysis.formatId}
          onUpdate={async (updatedPeriods) => {
            // データ更新API呼び出し
            try {
              setLoading(true)

              // 1. データを保存
              const response = await fetch(`/api/analysis/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  analysisId,
                  periods: updatedPeriods,
                }),
              })

              if (!response.ok) {
                throw new Error('保存に失敗しました')
              }

              // 2. 財務指標を再計算
              try {
                const executeResponse = await fetch(`/api/analysis/execute`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    analysisId,
                    skipComments: true // 保存時はコメント生成をスキップ
                  }),
                })

                if (!executeResponse.ok) {
                  const errorData = await executeResponse.json()
                  console.error('財務指標の再計算エラー:', errorData)
                  throw new Error('財務指標の再計算に失敗しました')
                }

                console.log('財務指標の再計算が完了しました')
              } catch (executeError) {
                console.error('Execute error:', executeError)
                // 財務指標の再計算に失敗しても続行
              }

              // 3. 分析データを再読み込み
              await loadAnalysis()
              alert('保存しました。財務指標とグラフを更新しました。')
            } catch (err) {
              console.error('Save error:', err)
              alert(err instanceof Error ? err.message : '保存に失敗しました')
            } finally {
              setLoading(false)
            }
          }}
        />
      </div>
    </div>
  )
}
