'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, FileText, Loader2 } from 'lucide-react'
import { FinancialDataTable } from '@/components/financial-data-table'
import { FinancialCharts, generateChartsFromMetrics } from '@/components/financial-charts'
import type { FinancialAnalysis } from '@/lib/types/financial'

export default function AnalysisDetailPage() {
  const router = useRouter()
  const params = useParams()
  const analysisId = params.id as string

  const [analysis, setAnalysis] = useState<FinancialAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAnalysis()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId])

  const loadAnalysis = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analysis/${analysisId}`)

      if (!response.ok) {
        throw new Error('分析データの取得に失敗しました')
      }

      const data = await response.json()
      setAnalysis(data.analysis)
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
        <Button
          variant="ghost"
          onClick={() => router.push('/analysis')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          分析一覧に戻る
        </Button>

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

          <div className="flex gap-2">
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
      {analysis.comments && analysis.comments.length > 0 && (
        <div className="mb-6 space-y-4">
          <h2 className="text-2xl font-semibold">AI分析コメント</h2>
          {analysis.comments.map((comment) => (
            <Card key={comment.id} className="p-6">
              <div className="whitespace-pre-wrap">
                {comment.editedText || comment.aiGeneratedText}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* グラフ */}
      {charts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">財務指標の推移</h2>
          <FinancialCharts charts={charts} />
        </div>
      )}

      {/* データテーブル */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-4">財務データ</h2>
        <FinancialDataTable
          periods={analysis.periods}
          onUpdate={async (updatedPeriods) => {
            // データ更新API呼び出し
            try {
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

              await loadAnalysis()
              alert('保存しました')
            } catch (err) {
              console.error('Save error:', err)
              alert(err instanceof Error ? err.message : '保存に失敗しました')
            }
          }}
        />
      </div>
    </div>
  )
}
