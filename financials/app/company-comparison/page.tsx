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

export default function CompanyComparisonPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([])
  const [fiscalYears, setFiscalYears] = useState<number[]>([])
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([])

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
    } catch (error) {
      console.error('比較データ読み込みエラー:', error)
    } finally {
      setLoading(false)
    }
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
                  {comparisonData.map((data) => (
                    <tr key={data.company_id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{data.company_name}</td>
                      <td className="p-2 text-gray-600">{data.industry || '-'}</td>
                      <td className="p-2 text-right">
                        {formatCurrency(data.net_sales)}
                      </td>
                      <td className="p-2 text-right">
                        {formatCurrency(data.operating_income)}
                      </td>
                      <td className="p-2 text-right">
                        {formatCurrency(data.net_income)}
                      </td>
                      <td className="p-2 text-right">
                        {formatPercent(data.roe)}
                      </td>
                      <td className="p-2 text-right">
                        {formatPercent(data.roa)}
                      </td>
                      <td className="p-2 text-right">
                        {formatPercent(data.operating_margin)}
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
                  ))}
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
