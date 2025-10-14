'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Plus,
  ArrowLeft,
  Building2,
  Trash2,
  Search,
  Users,
  Tag,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'

type Company = Database['public']['Tables']['companies']['Row']
type Industry = Database['public']['Tables']['industries']['Row']
type CompanyGroup = Database['public']['Tables']['company_groups']['Row']

type TabType = 'companies' | 'groups' | 'industries'

export default function CompaniesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('companies')
  const [companies, setCompanies] = useState<Company[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
  const [groups, setGroups] = useState<CompanyGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewCompanyForm, setShowNewCompanyForm] = useState(false)
  const [showNewGroupForm, setShowNewGroupForm] = useState(false)
  const [showNewIndustryForm, setShowNewIndustryForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState<string>('')

  // 新規企業フォームの状態
  const [newCompany, setNewCompany] = useState({
    name: '',
    company_code: '',
    industry_id: '',
    group_id: '',
    address: '',
    description: '',
  })

  // 新規グループフォームの状態
  const [newGroup, setNewGroup] = useState({
    name: '',
    industry_id: '',
    description: '',
  })

  // 新規業種フォームの状態
  const [newIndustry, setNewIndustry] = useState({
    name: '',
    code: '',
    description: '',
  })


  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = async () => {
    const supabase = createClient()
    setLoading(true)
    try {
      // 企業データを取得
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })

      if (companiesError) throw companiesError

      // 業種データを取得
      const { data: industriesData, error: industriesError } = await supabase
        .from('industries')
        .select('*')
        .order('name')

      if (industriesError) throw industriesError

      // 企業グループデータを取得
      const { data: groupsData, error: groupsError } = await supabase
        .from('company_groups')
        .select('*')
        .order('name')

      if (groupsError) throw groupsError

      setCompanies(companiesData || [])
      setIndustries(industriesData || [])
      setGroups(groupsData || [])
    } catch (error) {
      console.error('データ読み込みエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  // 企業関連の関数
  const handleCreateCompany = async () => {
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('companies')
        .insert([
          {
            name: newCompany.name,
            company_code: newCompany.company_code || null,
            industry_id: newCompany.industry_id || null,
            group_id: newCompany.group_id || null,
            address: newCompany.address || null,
            description: newCompany.description || null,
          },
        ])
        .select()

      if (error) throw error

      await loadData()
      setNewCompany({
        name: '',
        company_code: '',
        industry_id: '',
        group_id: '',
        address: '',
        description: '',
      })
      setShowNewCompanyForm(false)
    } catch (error) {
      console.error('企業作成エラー:', error)
      alert('企業の作成に失敗しました')
    }
  }

  const handleDeleteCompany = async (id: string) => {
    const supabase = createClient()
    if (!confirm('この企業を削除してもよろしいですか？')) return

    try {
      const { error } = await supabase.from('companies').delete().eq('id', id)
      if (error) throw error
      await loadData()
    } catch (error) {
      console.error('企業削除エラー:', error)
      alert('企業の削除に失敗しました')
    }
  }

  // グループ関連の関数
  const handleCreateGroup = async () => {
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('company_groups')
        .insert([
          {
            name: newGroup.name,
            industry_id: newGroup.industry_id || null,
            description: newGroup.description || null,
          },
        ])
        .select()

      if (error) throw error

      await loadData()
      setNewGroup({ name: '', industry_id: '', description: '' })
      setShowNewGroupForm(false)
    } catch (error) {
      console.error('グループ作成エラー:', error)
      alert('グループの作成に失敗しました')
    }
  }

  const handleDeleteGroup = async (id: string) => {
    const supabase = createClient()
    if (!confirm('このグループを削除してもよろしいですか？')) return

    try {
      const { error } = await supabase
        .from('company_groups')
        .delete()
        .eq('id', id)
      if (error) throw error
      await loadData()
    } catch (error) {
      console.error('グループ削除エラー:', error)
      alert('グループの削除に失敗しました')
    }
  }

  // 業種関連の関数
  const handleCreateIndustry = async () => {
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('industries')
        .insert([
          {
            name: newIndustry.name,
            code: newIndustry.code || null,
            description: newIndustry.description || null,
          },
        ])
        .select()

      if (error) throw error

      await loadData()
      setNewIndustry({ name: '', code: '', description: '' })
      setShowNewIndustryForm(false)
    } catch (error) {
      console.error('業種作成エラー:', error)
      alert('業種の作成に失敗しました')
    }
  }

  const handleDeleteIndustry = async (id: string) => {
    const supabase = createClient()
    if (!confirm('この業種を削除してもよろしいですか？')) return

    try {
      const { error } = await supabase.from('industries').delete().eq('id', id)
      if (error) throw error
      await loadData()
    } catch (error) {
      console.error('業種削除エラー:', error)
      alert('業種の削除に失敗しました')
    }
  }

  // ヘルパー関数
  const getIndustryName = (industryId: string | null) => {
    if (!industryId) return '-'
    const industry = industries.find((i) => i.id === industryId)
    return industry?.name || '-'
  }

  const getGroupName = (groupId: string | null) => {
    if (!groupId) return '-'
    const group = groups.find((g) => g.id === groupId)
    return group?.name || '-'
  }

  // フィルタリング
  const filteredCompanies = companies.filter((company) => {
    const matchesSearch =
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.company_code?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesIndustry =
      !selectedIndustry || company.industry_id === selectedIndustry
    return matchesSearch && matchesIndustry
  })

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredIndustries = industries.filter((industry) =>
    industry.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      {/* ヘッダー */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          戻る
        </Button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">企業管理</h1>
            <p className="text-gray-600 mt-2">
              企業・グループ・業種の登録・管理を行います
            </p>
          </div>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('companies')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'companies'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                企業 ({companies.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'groups'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                企業グループ ({groups.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('industries')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'industries'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                業種 ({industries.length})
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* 企業タブ */}
      {activeTab === 'companies' && (
        <div>
          {/* アクションボタン */}
          <div className="mb-6">
            <Button onClick={() => setShowNewCompanyForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新規企業登録
            </Button>
          </div>

          {/* 新規企業フォーム */}
          {showNewCompanyForm && (
            <Card className="p-6 mb-6">
              <h2 className="text-2xl font-semibold mb-6">新規企業登録</h2>
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
                    <Label htmlFor="company_code">企業コード</Label>
                    <Input
                      id="company_code"
                      value={newCompany.company_code}
                      onChange={(e) =>
                        setNewCompany({
                          ...newCompany,
                          company_code: e.target.value,
                        })
                      }
                      placeholder="例: SMPL001"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="industry_id">業種</Label>
                    <select
                      id="industry_id"
                      className="w-full border rounded-md px-3 py-2"
                      value={newCompany.industry_id}
                      onChange={(e) =>
                        setNewCompany({
                          ...newCompany,
                          industry_id: e.target.value,
                        })
                      }
                    >
                      <option value="">選択してください</option>
                      {industries.map((industry) => (
                        <option key={industry.id} value={industry.id}>
                          {industry.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="group_id">企業グループ</Label>
                    <select
                      id="group_id"
                      className="w-full border rounded-md px-3 py-2"
                      value={newCompany.group_id}
                      onChange={(e) =>
                        setNewCompany({
                          ...newCompany,
                          group_id: e.target.value,
                        })
                      }
                    >
                      <option value="">選択してください</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">住所</Label>
                  <Input
                    id="address"
                    value={newCompany.address}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, address: e.target.value })
                    }
                    placeholder="例: 東京都千代田区..."
                  />
                </div>

                <div>
                  <Label htmlFor="description">備考</Label>
                  <textarea
                    id="description"
                    className="w-full border rounded-md px-3 py-2"
                    rows={3}
                    value={newCompany.description}
                    onChange={(e) =>
                      setNewCompany({
                        ...newCompany,
                        description: e.target.value,
                      })
                    }
                    placeholder="メモや備考を入力"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowNewCompanyForm(false)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleCreateCompany}
                    disabled={!newCompany.name}
                  >
                    登録
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* 検索・フィルタ */}
          <Card className="p-4 mb-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-10"
                  placeholder="企業名または企業コードで検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-64">
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                >
                  <option value="">すべての業種</option>
                  {industries.map((industry) => (
                    <option key={industry.id} value={industry.id}>
                      {industry.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* 企業リスト */}
          {loading ? (
            <Card className="p-8 text-center text-gray-500">
              <p>読み込み中...</p>
            </Card>
          ) : filteredCompanies.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>企業が登録されていません</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredCompanies.map((company) => (
                <Card key={company.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <h3 className="text-xl font-semibold">
                          {company.name}
                        </h3>
                        {company.company_code && (
                          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {company.company_code}
                          </span>
                        )}
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 mt-4 text-sm">
                        <div>
                          <p className="text-gray-600">業種</p>
                          <p className="font-medium">
                            {getIndustryName(company.industry_id)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">企業グループ</p>
                          <p className="font-medium">
                            {getGroupName(company.group_id)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">登録日</p>
                          <p className="font-medium">
                            {new Date(company.created_at).toLocaleDateString(
                              'ja-JP'
                            )}
                          </p>
                        </div>
                      </div>

                      {company.description && (
                        <div className="mt-3 text-sm">
                          <p className="text-gray-600">備考</p>
                          <p>{company.description}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCompany(company.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(`/analysis/new?companyId=${company.id}`)
                      }
                    >
                      この企業の財務分析を開始
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* グループタブ */}
      {activeTab === 'groups' && (
        <div>
          <div className="mb-6">
            <Button onClick={() => setShowNewGroupForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新規グループ登録
            </Button>
          </div>

          {showNewGroupForm && (
            <Card className="p-6 mb-6">
              <h2 className="text-2xl font-semibold mb-6">
                新規グループ登録
              </h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="group_name">グループ名 *</Label>
                  <Input
                    id="group_name"
                    value={newGroup.name}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, name: e.target.value })
                    }
                    placeholder="例: ○○グループ"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="group_industry">業種</Label>
                  <select
                    id="group_industry"
                    className="w-full border rounded-md px-3 py-2"
                    value={newGroup.industry_id}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, industry_id: e.target.value })
                    }
                  >
                    <option value="">選択してください</option>
                    {industries.map((industry) => (
                      <option key={industry.id} value={industry.id}>
                        {industry.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="group_description">備考</Label>
                  <textarea
                    id="group_description"
                    className="w-full border rounded-md px-3 py-2"
                    rows={3}
                    value={newGroup.description}
                    onChange={(e) =>
                      setNewGroup({ ...newGroup, description: e.target.value })
                    }
                    placeholder="メモや備考を入力"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowNewGroupForm(false)}
                  >
                    キャンセル
                  </Button>
                  <Button onClick={handleCreateGroup} disabled={!newGroup.name}>
                    登録
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* 検索 */}
          <Card className="p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-10"
                placeholder="グループ名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </Card>

          {/* グループリスト */}
          {loading ? (
            <Card className="p-8 text-center text-gray-500">
              <p>読み込み中...</p>
            </Card>
          ) : filteredGroups.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>グループが登録されていません</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredGroups.map((group) => (
                <Card key={group.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Users className="h-5 w-5 text-primary" />
                        <h3 className="text-xl font-semibold">{group.name}</h3>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mt-4 text-sm">
                        <div>
                          <p className="text-gray-600">業種</p>
                          <p className="font-medium">
                            {getIndustryName(group.industry_id)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">登録日</p>
                          <p className="font-medium">
                            {new Date(group.created_at).toLocaleDateString(
                              'ja-JP'
                            )}
                          </p>
                        </div>
                      </div>

                      {group.description && (
                        <div className="mt-3 text-sm">
                          <p className="text-gray-600">備考</p>
                          <p>{group.description}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteGroup(group.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 業種タブ */}
      {activeTab === 'industries' && (
        <div>
          <div className="mb-6">
            <Button onClick={() => setShowNewIndustryForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新規業種登録
            </Button>
          </div>

          {showNewIndustryForm && (
            <Card className="p-6 mb-6">
              <h2 className="text-2xl font-semibold mb-6">新規業種登録</h2>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="industry_name">業種名 *</Label>
                    <Input
                      id="industry_name"
                      value={newIndustry.name}
                      onChange={(e) =>
                        setNewIndustry({ ...newIndustry, name: e.target.value })
                      }
                      placeholder="例: 製造業"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="industry_code">業種コード</Label>
                    <Input
                      id="industry_code"
                      value={newIndustry.code}
                      onChange={(e) =>
                        setNewIndustry({ ...newIndustry, code: e.target.value })
                      }
                      placeholder="例: MFG"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="industry_description">説明</Label>
                  <textarea
                    id="industry_description"
                    className="w-full border rounded-md px-3 py-2"
                    rows={3}
                    value={newIndustry.description}
                    onChange={(e) =>
                      setNewIndustry({
                        ...newIndustry,
                        description: e.target.value,
                      })
                    }
                    placeholder="業種の説明を入力"
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowNewIndustryForm(false)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleCreateIndustry}
                    disabled={!newIndustry.name}
                  >
                    登録
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* 検索 */}
          <Card className="p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-10"
                placeholder="業種名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </Card>

          {/* 業種リスト */}
          {loading ? (
            <Card className="p-8 text-center text-gray-500">
              <p>読み込み中...</p>
            </Card>
          ) : filteredIndustries.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              <Tag className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>業種が登録されていません</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredIndustries.map((industry) => (
                <Card key={industry.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Tag className="h-5 w-5 text-primary" />
                        <h3 className="text-xl font-semibold">
                          {industry.name}
                        </h3>
                        {industry.code && (
                          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {industry.code}
                          </span>
                        )}
                      </div>

                      {industry.description && (
                        <div className="mt-3 text-sm">
                          <p className="text-gray-600">説明</p>
                          <p>{industry.description}</p>
                        </div>
                      )}

                      <div className="mt-3 text-sm">
                        <p className="text-gray-600">登録日</p>
                        <p className="font-medium">
                          {new Date(industry.created_at).toLocaleDateString(
                            'ja-JP'
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteIndustry(industry.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
