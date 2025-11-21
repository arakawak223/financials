'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Plus,
  Search,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Company {
  id: string
  name: string
  industry_id: string | null
}

interface Industry {
  id: string
  name: string
}

export default function CompanyComparisonSetupPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewCompanyForm, setShowNewCompanyForm] = useState(false)
  const [loading, setLoading] = useState(false)

  // 新規企業フォームの状態
  const [newCompany, setNewCompany] = useState({
    name: '',
    industry_id: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // 企業データを取得
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, industry_id')
        .order('name')

      if (companiesError) throw companiesError

      // 業種データを取得
      const { data: industriesData, error: industriesError } = await supabase
        .from('industries')
        .select('id, name')
        .order('name')

      if (industriesError) throw industriesError

      setCompanies(companiesData || [])
      setIndustries(industriesData || [])
    } catch (error) {
      console.error('データ読み込みエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCompany = async () => {
    if (!newCompany.name) {
      alert('企業名を入力してください')
      return
    }

    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert([
          {
            name: newCompany.name,
            industry_id: newCompany.industry_id || null,
          },
        ])
        .select()

      if (error) throw error

      await loadData()
      setNewCompany({
        name: '',
        industry_id: '',
      })
      setShowNewCompanyForm(false)

      // 作成した企業を自動選択
      if (data && data.length > 0) {
        setSelectedCompanyIds([...selectedCompanyIds, data[0].id])
      }
    } catch (error) {
      console.error('企業作成エラー:', error)
      alert('企業の作成に失敗しました')
    }
  }

  const toggleCompanySelection = (companyId: string) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId]
    )
  }

  const handleProceedToComparison = () => {
    if (selectedCompanyIds.length < 2) {
      alert('比較するには最低2社を選択してください')
      return
    }
    // 選択した企業IDをクエリパラメータとして比較ページに渡す
    const params = new URLSearchParams()
    selectedCompanyIds.forEach(id => params.append('companies', id))
    router.push(`/company-comparison?${params.toString()}`)
  }

  // フィルタリング
  const filteredCompanies = companies.filter((company) => {
    const matchesSearch =
      company.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

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
                企業間比較分析 - 企業選択
              </h1>
              <p className="text-gray-600 mt-1">
                比較分析する企業を選択するか、新規登録してください（最低2社）
              </p>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex justify-between items-center">
          <Button
            onClick={() => setShowNewCompanyForm(!showNewCompanyForm)}
            variant={showNewCompanyForm ? "outline" : "default"}
          >
            <Plus className="h-4 w-4 mr-2" />
            {showNewCompanyForm ? '登録フォームを閉じる' : '新規企業登録'}
          </Button>
          <Button
            onClick={handleProceedToComparison}
            disabled={selectedCompanyIds.length < 2}
            size="lg"
          >
            比較分析を開始
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        {/* 新規企業フォーム */}
        {showNewCompanyForm && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">新規企業登録</h2>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">企業名 *</Label>
                  <Input
                    id="name"
                    value={newCompany.name}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, name: e.target.value })
                    }
                    placeholder="例: 株式会社サンプル"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="industry">業種</Label>
                  <Select
                    value={newCompany.industry_id}
                    onValueChange={(value) =>
                      setNewCompany({ ...newCompany, industry_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="業種を選択（任意）" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((industry) => (
                        <SelectItem key={industry.id} value={industry.id}>
                          {industry.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowNewCompanyForm(false)}
                >
                  キャンセル
                </Button>
                <Button onClick={handleCreateCompany} disabled={!newCompany.name}>
                  登録して選択リストに追加
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* 選択状況 */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                選択中: {selectedCompanyIds.length}社
              </span>
            </div>
            {selectedCompanyIds.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCompanyIds([])}
              >
                選択をクリア
              </Button>
            )}
          </div>
          {selectedCompanyIds.length < 2 && (
            <p className="text-sm text-blue-700 mt-2">
              比較分析を開始するには最低2社を選択してください
            </p>
          )}
        </Card>

        {/* 検索 */}
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-10"
              placeholder="企業名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </Card>

        {/* 企業リスト */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">企業一覧</h2>
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <p>読み込み中...</p>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>企業が登録されていません</p>
              <p className="text-sm mt-2">
                上の「新規企業登録」ボタンから企業を登録してください
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCompanies.map((company) => {
                const industry = industries.find(
                  (i) => i.id === company.industry_id
                )
                return (
                  <div
                    key={company.id}
                    className={`p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedCompanyIds.includes(company.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                    onClick={() => toggleCompanySelection(company.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedCompanyIds.includes(company.id)}
                        className="mt-1 pointer-events-none"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">
                          {company.name}
                        </h3>
                        {industry && (
                          <p className="text-xs text-blue-600 mt-1">
                            {industry.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
