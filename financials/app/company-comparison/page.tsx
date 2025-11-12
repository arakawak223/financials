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
import { Checkbox } from '@/components/ui/checkbox'
import {
  ArrowLeft,
  Download,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Building2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Company {
  id: string
  name: string
  industry: string | null
}

interface ComparisonData {
  company_id: string
  company_name: string
  industry: string | null
  fiscal_year: number
  net_sales: number | null
  operating_income: number | null
  net_income: number | null
  roe: number | null
  roa: number | null
  operating_margin: number | null
  ebitda: number | null
  fcf: number | null
  sales_growth: number | null
  operating_growth: number | null
  ebitda_growth: number | null
}

interface IndustryBenchmark {
  industry: string
  company_count: number
  avg_net_sales: number | null
  avg_operating_income: number | null
  avg_net_income: number | null
  avg_roe: number | null
  avg_roa: number | null
  avg_operating_margin: number | null
  avg_ebitda: number | null
  avg_fcf: number | null
  avg_sales_growth: number | null
  median_net_sales: number | null
  median_roe: number | null
  median_roa: number | null
  median_operating_margin: number | null
}

interface CompanyRanking {
  company_id: string
  metric: string
  rank: number
  percentile: number
  total_companies: number
}

export default function CompanyComparisonPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([])
  const [fiscalYears, setFiscalYears] = useState<number[]>([])
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([])
  const [industryBenchmarks, setIndustryBenchmarks] = useState<Map<string, IndustryBenchmark>>(new Map())
  const [companyRankings, setCompanyRankings] = useState<Map<string, CompanyRanking[]>>(new Map())
  const [showBenchmark, setShowBenchmark] = useState(true)

  useEffect(() => {
    loadCompanies()
    loadFiscalYears()
  }, [])

  useEffect(() => {
    if (selectedCompanyIds.length > 0 && selectedFiscalYear) {
      loadComparisonData()
    }
  }, [selectedCompanyIds, selectedFiscalYear])

  const loadCompanies = async () => {
    try {
      const supabase = createClient()
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .order('name')

      if (companiesError) throw companiesError

      // Load industries data
      const { data: industriesData, error: industriesError } = await supabase
        .from('industries')
        .select('id, name')

      if (industriesError) throw industriesError

      // Map companies with industry names
      const companiesWithIndustry = await Promise.all(
        (companiesData || []).map(async (company) => {
          const { data: companyWithIndustry } = await supabase
            .from('companies')
            .select('industry_id')
            .eq('id', company.id)
            .single()

          const industry = industriesData?.find(
            (i) => i.id === companyWithIndustry?.industry_id
          )

          return {
            ...company,
            industry: industry?.name || null,
          }
        })
      )

      setCompanies(companiesWithIndustry)
    } catch (error) {
      console.error('企業データ読み込みエラー:', error)
    }
  }

  const loadFiscalYears = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('financial_periods')
        .select('fiscal_year')
        .order('fiscal_year', { ascending: false })

      if (error) throw error

      // Get unique fiscal years
      const uniqueYears = Array.from(
        new Set(data?.map((d) => d.fiscal_year) || [])
      ).sort((a, b) => b - a)

      setFiscalYears(uniqueYears)
      if (uniqueYears.length > 0) {
        setSelectedFiscalYear(uniqueYears[0])
      }
    } catch (error) {
      console.error('会計年度データ読み込みエラー:', error)
    }
  }

  const loadComparisonData = async () => {
    if (!selectedFiscalYear || selectedCompanyIds.length === 0) return

    setLoading(true)
    try {
      const supabase = createClient()

      // Use the company_financial_summary view to get data
      const { data, error } = await supabase
        .from('company_financial_summary')
        .select('*')
        .in('company_id', selectedCompanyIds)
        .eq('fiscal_year', selectedFiscalYear)

      if (error) throw error

      setComparisonData(data || [])

      // Load industry benchmarks and rankings for selected companies
      if (data && data.length > 0) {
        await loadIndustryBenchmarks(data)
        await loadCompanyRankings(data)
      }
    } catch (error) {
      console.error('比較データ読み込みエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadIndustryBenchmarks = async (companyData: ComparisonData[]) => {
    if (!selectedFiscalYear) return

    try {
      const supabase = createClient()
      const industries = Array.from(new Set(companyData.map(d => d.industry).filter(Boolean)))
      const benchmarkMap = new Map<string, IndustryBenchmark>()

      for (const industry of industries) {
        if (!industry) continue

        // Get all companies in the same industry
        const { data: industryData, error } = await supabase
          .from('company_financial_summary')
          .select('*')
          .eq('industry', industry)
          .eq('fiscal_year', selectedFiscalYear)

        if (error) throw error
        if (!industryData || industryData.length === 0) continue

        // Calculate averages and medians
        const benchmark: IndustryBenchmark = {
          industry,
          company_count: industryData.length,
          avg_net_sales: calculateAverage(industryData.map(d => d.net_sales)),
          avg_operating_income: calculateAverage(industryData.map(d => d.operating_income)),
          avg_net_income: calculateAverage(industryData.map(d => d.net_income)),
          avg_roe: calculateAverage(industryData.map(d => d.roe)),
          avg_roa: calculateAverage(industryData.map(d => d.roa)),
          avg_operating_margin: calculateAverage(industryData.map(d => d.operating_margin)),
          avg_ebitda: calculateAverage(industryData.map(d => d.ebitda)),
          avg_fcf: calculateAverage(industryData.map(d => d.fcf)),
          avg_sales_growth: calculateAverage(industryData.map(d => d.sales_growth)),
          median_net_sales: calculateMedian(industryData.map(d => d.net_sales)),
          median_roe: calculateMedian(industryData.map(d => d.roe)),
          median_roa: calculateMedian(industryData.map(d => d.roa)),
          median_operating_margin: calculateMedian(industryData.map(d => d.operating_margin)),
        }

        benchmarkMap.set(industry, benchmark)
      }

      setIndustryBenchmarks(benchmarkMap)
    } catch (error) {
      console.error('業種ベンチマーク読み込みエラー:', error)
    }
  }

  const loadCompanyRankings = async (companyData: ComparisonData[]) => {
    if (!selectedFiscalYear) return

    try {
      const supabase = createClient()
      const rankingMap = new Map<string, CompanyRanking[]>()

      for (const company of companyData) {
        if (!company.industry) continue

        // Get all companies in the same industry
        const { data: industryData, error } = await supabase
          .from('company_financial_summary')
          .select('*')
          .eq('industry', company.industry)
          .eq('fiscal_year', selectedFiscalYear)

        if (error) throw error
        if (!industryData || industryData.length === 0) continue

        const rankings: CompanyRanking[] = []
        const metrics = [
          { key: 'net_sales', name: '売上高' },
          { key: 'operating_income', name: '営業利益' },
          { key: 'roe', name: 'ROE' },
          { key: 'roa', name: 'ROA' },
          { key: 'operating_margin', name: '営業利益率' },
        ]

        for (const metric of metrics) {
          const sortedData = industryData
            .filter(d => d[metric.key as keyof ComparisonData] !== null)
            .sort((a, b) => {
              const aVal = a[metric.key as keyof ComparisonData] as number
              const bVal = b[metric.key as keyof ComparisonData] as number
              return bVal - aVal // Descending order
            })

          const rank = sortedData.findIndex(d => d.company_id === company.company_id) + 1
          if (rank > 0) {
            const percentile = ((sortedData.length - rank + 1) / sortedData.length) * 100
            rankings.push({
              company_id: company.company_id,
              metric: metric.name,
              rank,
              percentile: Math.round(percentile),
              total_companies: sortedData.length,
            })
          }
        }

        rankingMap.set(company.company_id, rankings)
      }

      setCompanyRankings(rankingMap)
    } catch (error) {
      console.error('企業ランキング読み込みエラー:', error)
    }
  }

  const calculateAverage = (values: (number | null)[]): number | null => {
    const validValues = values.filter((v): v is number => v !== null && !isNaN(v))
    if (validValues.length === 0) return null
    return validValues.reduce((sum, v) => sum + v, 0) / validValues.length
  }

  const calculateMedian = (values: (number | null)[]): number | null => {
    const validValues = values.filter((v): v is number => v !== null && !isNaN(v)).sort((a, b) => a - b)
    if (validValues.length === 0) return null
    const mid = Math.floor(validValues.length / 2)
    return validValues.length % 2 === 0
      ? (validValues[mid - 1] + validValues[mid]) / 2
      : validValues[mid]
  }

  const toggleCompanySelection = (companyId: string) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId]
    )
  }

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-'
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercent = (value: number | null) => {
    if (value === null || value === undefined) return '-'
    return `${value.toFixed(2)}%`
  }

  const formatGrowth = (value: number | null) => {
    if (value === null || value === undefined) return '-'
    const icon = value >= 0 ? (
      <TrendingUp className="w-4 h-4 inline text-green-600" />
    ) : (
      <TrendingDown className="w-4 h-4 inline text-red-600" />
    )
    return (
      <span className={value >= 0 ? 'text-green-600' : 'text-red-600'}>
        {icon} {formatPercent(value)}
      </span>
    )
  }

  const exportToCSV = () => {
    if (comparisonData.length === 0) return

    const headers = [
      '企業名',
      '業種',
      '会計年度',
      '売上高',
      '営業利益',
      '当期純利益',
      'ROE',
      'ROA',
      '営業利益率',
      'EBITDA',
      'FCF',
      '売上成長率',
      '営業利益成長率',
      'EBITDA成長率',
    ]

    const rows = comparisonData.map((d) => [
      d.company_name,
      d.industry || '',
      d.fiscal_year.toString(),
      d.net_sales?.toString() || '',
      d.operating_income?.toString() || '',
      d.net_income?.toString() || '',
      d.roe?.toString() || '',
      d.roa?.toString() || '',
      d.operating_margin?.toString() || '',
      d.ebitda?.toString() || '',
      d.fcf?.toString() || '',
      d.sales_growth?.toString() || '',
      d.operating_growth?.toString() || '',
      d.ebitda_growth?.toString() || '',
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `company_comparison_${selectedFiscalYear}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-8 h-8" />
                企業間比較分析
              </h1>
              <p className="text-gray-600 mt-1">
                複数の企業の財務データを比較・分析します
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fiscal Year Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">会計年度</label>
              <Select
                value={selectedFiscalYear?.toString() || ''}
                onValueChange={(value) => setSelectedFiscalYear(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="会計年度を選択" />
                </SelectTrigger>
                <SelectContent>
                  {fiscalYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}年度
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-end gap-2">
              <Button
                onClick={loadComparisonData}
                disabled={loading || selectedCompanyIds.length === 0}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    読み込み中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    データ更新
                  </>
                )}
              </Button>
              <Button
                onClick={exportToCSV}
                disabled={comparisonData.length === 0}
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                CSVエクスポート
              </Button>
            </div>
          </div>

          {/* Benchmark Toggle */}
          {comparisonData.length > 0 && (
            <div className="flex items-center space-x-2 pt-2 border-t">
              <Checkbox
                id="showBenchmark"
                checked={showBenchmark}
                onCheckedChange={(checked) => setShowBenchmark(checked as boolean)}
              />
              <label
                htmlFor="showBenchmark"
                className="text-sm font-medium cursor-pointer"
              >
                業種平均とベンチマークを表示
              </label>
            </div>
          )}

          {/* Company Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              企業選択（複数選択可）
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto border rounded-lg p-4 bg-white">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded"
                >
                  <Checkbox
                    id={company.id}
                    checked={selectedCompanyIds.includes(company.id)}
                    onCheckedChange={() => toggleCompanySelection(company.id)}
                  />
                  <label
                    htmlFor={company.id}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {company.name}
                    {company.industry && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({company.industry})
                      </span>
                    )}
                  </label>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              選択中: {selectedCompanyIds.length}社
            </p>
          </div>
        </Card>

        {/* Comparison Table */}
        {comparisonData.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">比較結果</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">企業名</th>
                    <th className="text-left p-2 font-medium">業種</th>
                    <th className="text-right p-2 font-medium">売上高</th>
                    <th className="text-right p-2 font-medium">営業利益</th>
                    <th className="text-right p-2 font-medium">当期純利益</th>
                    <th className="text-right p-2 font-medium">ROE</th>
                    <th className="text-right p-2 font-medium">ROA</th>
                    <th className="text-right p-2 font-medium">営業利益率</th>
                    <th className="text-right p-2 font-medium">EBITDA</th>
                    <th className="text-right p-2 font-medium">FCF</th>
                    <th className="text-right p-2 font-medium">売上成長率</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((data) => {
                    const rankings = companyRankings.get(data.company_id)
                    const benchmark = data.industry ? industryBenchmarks.get(data.industry) : null

                    return (
                      <>
                        <tr key={data.company_id} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">{data.company_name}</td>
                          <td className="p-2 text-gray-600">{data.industry || '-'}</td>
                          <td className="p-2 text-right">
                            {formatCurrency(data.net_sales)}
                            {showBenchmark && rankings && (
                              <div className="text-xs text-blue-600 mt-1">
                                {rankings.find(r => r.metric === '売上高')?.rank || '-'}位
                                (上位{rankings.find(r => r.metric === '売上高')?.percentile || '-'}%)
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            {formatCurrency(data.operating_income)}
                            {showBenchmark && rankings && (
                              <div className="text-xs text-blue-600 mt-1">
                                {rankings.find(r => r.metric === '営業利益')?.rank || '-'}位
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            {formatCurrency(data.net_income)}
                          </td>
                          <td className="p-2 text-right">
                            {formatPercent(data.roe)}
                            {showBenchmark && rankings && (
                              <div className="text-xs text-blue-600 mt-1">
                                {rankings.find(r => r.metric === 'ROE')?.rank || '-'}位
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            {formatPercent(data.roa)}
                            {showBenchmark && rankings && (
                              <div className="text-xs text-blue-600 mt-1">
                                {rankings.find(r => r.metric === 'ROA')?.rank || '-'}位
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            {formatPercent(data.operating_margin)}
                            {showBenchmark && rankings && (
                              <div className="text-xs text-blue-600 mt-1">
                                {rankings.find(r => r.metric === '営業利益率')?.rank || '-'}位
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            {formatCurrency(data.ebitda)}
                          </td>
                          <td className="p-2 text-right">
                            {formatCurrency(data.fcf)}
                          </td>
                          <td className="p-2 text-right">
                            {formatGrowth(data.sales_growth)}
                          </td>
                        </tr>
                        {showBenchmark && benchmark && (
                          <tr key={`${data.company_id}-benchmark`} className="bg-blue-50 border-b text-xs">
                            <td className="p-2 pl-6 text-blue-700" colSpan={2}>
                              └ {data.industry} 平均 (n={benchmark.company_count})
                            </td>
                            <td className="p-2 text-right text-blue-700">
                              {formatCurrency(benchmark.avg_net_sales)}
                              <div className="text-xs text-gray-500 mt-1">
                                中央値: {formatCurrency(benchmark.median_net_sales)}
                              </div>
                            </td>
                            <td className="p-2 text-right text-blue-700">
                              {formatCurrency(benchmark.avg_operating_income)}
                            </td>
                            <td className="p-2 text-right text-blue-700">
                              {formatCurrency(benchmark.avg_net_income)}
                            </td>
                            <td className="p-2 text-right text-blue-700">
                              {formatPercent(benchmark.avg_roe)}
                              <div className="text-xs text-gray-500 mt-1">
                                中央値: {formatPercent(benchmark.median_roe)}
                              </div>
                            </td>
                            <td className="p-2 text-right text-blue-700">
                              {formatPercent(benchmark.avg_roa)}
                              <div className="text-xs text-gray-500 mt-1">
                                中央値: {formatPercent(benchmark.median_roa)}
                              </div>
                            </td>
                            <td className="p-2 text-right text-blue-700">
                              {formatPercent(benchmark.avg_operating_margin)}
                              <div className="text-xs text-gray-500 mt-1">
                                中央値: {formatPercent(benchmark.median_operating_margin)}
                              </div>
                            </td>
                            <td className="p-2 text-right text-blue-700">
                              {formatCurrency(benchmark.avg_ebitda)}
                            </td>
                            <td className="p-2 text-right text-blue-700">
                              {formatCurrency(benchmark.avg_fcf)}
                            </td>
                            <td className="p-2 text-right text-blue-700">
                              {formatPercent(benchmark.avg_sales_growth)}
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {selectedCompanyIds.length === 0 && (
          <Card className="p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              企業を選択してください
            </h3>
            <p className="text-gray-600">
              比較したい企業を選択して、財務データを比較・分析できます。
            </p>
          </Card>
        )}

        {selectedCompanyIds.length > 0 && comparisonData.length === 0 && !loading && (
          <Card className="p-12 text-center">
            <RefreshCw className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              データがありません
            </h3>
            <p className="text-gray-600">
              選択した企業の{selectedFiscalYear}年度のデータが見つかりませんでした。
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
