'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  FileUp,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'
import { BudgetPdfUpload } from '@/components/budget-pdf-upload'

type Company = Database['public']['Tables']['companies']['Row']
type FinancialPeriod = Database['public']['Tables']['financial_periods']['Row']

interface VarianceMetric {
  label: string
  budget: number | null
  actual: number | null
  variance: number | null
  achievement: number | null
}

export default function BudgetVsActualPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [periods, setPeriods] = useState<FinancialPeriod[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [variances, setVariances] = useState<VarianceMetric[]>([])
  const [aiAnalysis, setAiAnalysis] = useState<string>('')
  const [analyzingAI, setAnalyzingAI] = useState(false)

  useEffect(() => {
    loadCompanies()
  }, [])

  useEffect(() => {
    if (selectedCompanyId) {
      // Reset periods and selected period when company changes
      setPeriods([])
      setSelectedPeriodId('')
      setVariances([])
      loadPeriods(selectedCompanyId)
    } else {
      setPeriods([])
      setSelectedPeriodId('')
      setVariances([])
    }
  }, [selectedCompanyId])

  useEffect(() => {
    if (selectedPeriodId) {
      loadVarianceData()
    }
  }, [selectedPeriodId])

  const loadCompanies = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name')

      if (error) throw error
      setCompanies(data || [])
    } catch (error) {
      console.error('企業データ読み込みエラー:', error)
    }
  }

  const loadPeriods = async (companyId: string) => {
    try {
      const supabase = createClient()

      // First get financial_analyses for this company
      const { data: analyses, error: analysesError } = await supabase
        .from('financial_analyses')
        .select('id')
        .eq('company_id', companyId)

      if (analysesError) {
        console.error('分析データ読み込みエラー:', analysesError)
        throw analysesError
      }

      if (!analyses || analyses.length === 0) {
        console.log('この企業の分析データが見つかりません')
        setPeriods([])
        return
      }

      // Get all periods for these analyses
      const analysisIds = analyses.map(a => a.id)
      const { data, error } = await supabase
        .from('financial_periods')
        .select('*')
        .in('analysis_id', analysisIds)
        .order('fiscal_year', { ascending: false })

      if (error) {
        console.error('期間データ読み込みエラー:', error)
        throw error
      }

      console.log(`会計期間データ読み込み完了: ${data?.length || 0}件`)
      setPeriods(data || [])

      // 期間が1つ以上ある場合、最初の期間を自動選択
      if (data && data.length > 0) {
        setSelectedPeriodId(data[0].id)
      }
    } catch (error) {
      console.error('期間データ読み込みエラー:', error)
      setPeriods([])
    }
  }

  const loadVarianceData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // TODO: 予算データと実績データを取得し、差異を計算
      // 現在はダミーデータを表示
      setVariances([
        {
          label: '売上高',
          budget: 1000000000,
          actual: 1050000000,
          variance: 50000000,
          achievement: 105.0,
        },
        {
          label: '売上原価',
          budget: 600000000,
          actual: 620000000,
          variance: 20000000,
          achievement: 103.3,
        },
        {
          label: '売上総利益',
          budget: 400000000,
          actual: 430000000,
          variance: 30000000,
          achievement: 107.5,
        },
        {
          label: '営業利益',
          budget: 150000000,
          actual: 160000000,
          variance: 10000000,
          achievement: 106.7,
        },
        {
          label: '経常利益',
          budget: 140000000,
          actual: 155000000,
          variance: 15000000,
          achievement: 110.7,
        },
        {
          label: '当期純利益',
          budget: 90000000,
          actual: 100000000,
          variance: 10000000,
          achievement: 111.1,
        },
      ])
    } catch (error) {
      console.error('差異データ読み込みエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-'
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      notation: value >= 100000000 ? 'compact' : 'standard',
    }).format(value)
  }

  const formatPercent = (value: number | null) => {
    if (value === null) return '-'
    return `${value.toFixed(1)}%`
  }

  const getVarianceIcon = (variance: number | null, isRevenue: boolean = true) => {
    if (variance === null) return null
    const isPositive = isRevenue ? variance > 0 : variance < 0
    return isPositive ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    )
  }

  const getVarianceColor = (achievement: number | null) => {
    if (achievement === null) return 'text-gray-600'
    if (achievement >= 100) return 'text-green-600'
    if (achievement >= 90) return 'text-yellow-600'
    return 'text-red-600'
  }

  const generateAIAnalysis = async () => {
    if (variances.length === 0) return

    setAnalyzingAI(true)
    setAiAnalysis('')

    try {
      const selectedCompany = companies.find(c => c.id === selectedCompanyId)
      const selectedPeriod = periods.find(p => p.id === selectedPeriodId)

      const response = await fetch('/api/analyze-budget', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          variances,
          companyName: selectedCompany?.name || '企業',
          fiscalYear: selectedPeriod?.fiscal_year || new Date().getFullYear(),
        }),
      })

      if (!response.ok) {
        throw new Error('AI分析の生成に失敗しました')
      }

      const data = await response.json()
      setAiAnalysis(data.analysis)
    } catch (error) {
      console.error('AI分析エラー:', error)
      setAiAnalysis('AI分析の生成中にエラーが発生しました。もう一度お試しください。')
    } finally {
      setAnalyzingAI(false)
    }
  }

  const exportToExcel = () => {
    if (variances.length === 0) return

    // Create CSV content with BOM for proper encoding in Excel
    const BOM = '\uFEFF'
    const headers = ['項目', '予算', '実績', '差異', '達成率']

    const rows = variances.map((metric) => [
      metric.label,
      metric.budget?.toString() || '',
      metric.actual?.toString() || '',
      metric.variance?.toString() || '',
      metric.achievement ? `${metric.achievement.toFixed(1)}%` : '',
    ])

    // Properly escape and quote CSV fields
    const escapeCsvField = (field: string) => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`
      }
      return field
    }

    const csvContent =
      BOM +
      [
        headers.map(escapeCsvField).join(','),
        ...rows.map((row) => row.map(escapeCsvField).join(',')),
      ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `budget_variance_${selectedPeriodId}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* ヘッダー */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto py-6 px-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">予算実績分析</h1>
                <p className="text-sm text-gray-600 mt-1">
                  予算と実績の差異を分析し、達成状況をモニタリング
                </p>
              </div>
            </div>
            <Button
              onClick={() => router.push('/budget-vs-actual/new')}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              予算を登録
            </Button>
          </div>

          {/* フィルター */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Select
                value={selectedCompanyId}
                onValueChange={setSelectedCompanyId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="企業を選択" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select
                value={selectedPeriodId}
                onValueChange={setSelectedPeriodId}
                disabled={!selectedCompanyId || periods.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="会計期間を選択" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      {period.fiscal_year}年度
                      {period.period_start_date && period.period_end_date && (
                        <>
                          {' '}(
                          {new Date(period.period_start_date).toLocaleDateString('ja-JP')}{' '}
                          ~ {new Date(period.period_end_date).toLocaleDateString('ja-JP')}
                          )
                        </>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={loadVarianceData}
              disabled={!selectedPeriodId || loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              更新
            </Button>
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto py-8 px-6">
          {!selectedPeriodId ? (
            <Card className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                企業と会計期間を選択してください
              </h3>
              <p className="text-sm text-gray-600">
                予算と実績の差異分析を表示するには、企業と会計期間を選択してください
              </p>
            </Card>
          ) : loading ? (
            <Card className="p-12 text-center">
              <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-sm text-gray-600">データを読み込んでいます...</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* PDFアップロードセクション（データがない場合） */}
              {variances.length === 0 && (
                <Card className="p-6 bg-blue-50 border-blue-200">
                  <div className="flex items-start gap-4 mb-6">
                    <FileUp className="h-8 w-8 text-blue-600 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold text-blue-900 mb-2">
                        PDFから予算・実績データをインポート
                      </h3>
                      <p className="text-sm text-blue-700 mb-4">
                        予算書または決算書のPDFファイルをアップロードすると、自動的にデータを抽出して登録できます
                      </p>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <BudgetPdfUpload
                      companyId={selectedCompanyId}
                      periodId={selectedPeriodId}
                      fiscalYear={
                        periods.find((p) => p.id === selectedPeriodId)
                          ?.fiscal_year || new Date().getFullYear()
                      }
                      dataType="budget"
                      onSuccess={loadVarianceData}
                    />
                    <BudgetPdfUpload
                      companyId={selectedCompanyId}
                      periodId={selectedPeriodId}
                      fiscalYear={
                        periods.find((p) => p.id === selectedPeriodId)
                          ?.fiscal_year || new Date().getFullYear()
                      }
                      dataType="actual"
                      onSuccess={loadVarianceData}
                    />
                  </div>
                </Card>
              )}

              {/* サマリーカード */}
              {variances.length > 0 && (
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="p-6">
                  <div className="text-sm text-gray-600 mb-1">予算達成率</div>
                  <div className="text-3xl font-bold text-green-600">105.0%</div>
                  <div className="text-xs text-gray-500 mt-1">
                    売上高ベース
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="text-sm text-gray-600 mb-1">利益達成率</div>
                  <div className="text-3xl font-bold text-green-600">111.1%</div>
                  <div className="text-xs text-gray-500 mt-1">
                    当期純利益ベース
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="text-sm text-gray-600 mb-1">総合評価</div>
                  <div className="text-3xl font-bold text-green-600">優良</div>
                  <div className="text-xs text-gray-500 mt-1">
                    全指標で目標達成
                  </div>
                </Card>
              </div>
              )}

              {/* 差異分析テーブル */}
              {variances.length > 0 && (
              <Card>
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-4">損益計算書 差異分析</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">項目</th>
                          <th className="text-right py-3 px-4">予算</th>
                          <th className="text-right py-3 px-4">実績</th>
                          <th className="text-right py-3 px-4">差異</th>
                          <th className="text-right py-3 px-4">達成率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variances.map((metric, index) => (
                          <tr
                            key={index}
                            className="border-b hover:bg-gray-50 transition-colors"
                          >
                            <td className="py-3 px-4 font-medium">
                              {metric.label}
                            </td>
                            <td className="py-3 px-4 text-right text-gray-600">
                              {formatCurrency(metric.budget)}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold">
                              {formatCurrency(metric.actual)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {getVarianceIcon(metric.variance)}
                                <span
                                  className={
                                    metric.variance && metric.variance > 0
                                      ? 'text-green-600'
                                      : 'text-red-600'
                                  }
                                >
                                  {formatCurrency(metric.variance)}
                                </span>
                              </div>
                            </td>
                            <td
                              className={`py-3 px-4 text-right font-semibold ${getVarianceColor(
                                metric.achievement
                              )}`}
                            >
                              {formatPercent(metric.achievement)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>
              )}

              {/* AI分析コメント */}
              {variances.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">AI分析コメント</h2>
                  <Button
                    onClick={generateAIAnalysis}
                    disabled={analyzingAI || variances.length === 0}
                    variant="outline"
                  >
                    {analyzingAI ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        分析中...
                      </>
                    ) : (
                      <>AI分析を生成</>
                    )}
                  </Button>
                </div>
                {aiAnalysis ? (
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                      {aiAnalysis}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="mb-2">AI分析コメントはまだ生成されていません</p>
                    <p className="text-sm">上のボタンをクリックして、AI分析を生成してください</p>
                  </div>
                )}
              </Card>
              )}

              {/* アクションエリア */}
              {variances.length > 0 && (
              <div className="flex justify-end gap-4">
                <Button variant="outline" disabled>PDFエクスポート</Button>
                <Button variant="outline" onClick={exportToExcel}>
                  Excelエクスポート
                </Button>
              </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
