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
  Edit,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'

type Company = Database['public']['Tables']['companies']['Row']

export default function CompaniesPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewCompanyForm, setShowNewCompanyForm] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // 新規企業フォームの状態
  const [newCompany, setNewCompany] = useState({
    name: '',
    company_code: '',
    address: '',
    description: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const supabase = createClient()
    setLoading(true)
    try {
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })

      if (companiesError) throw companiesError

      setCompanies(companiesData || [])
    } catch (error) {
      console.error('データ読み込みエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCompany = async () => {
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('companies')
        .insert([
          {
            name: newCompany.name,
            company_code: newCompany.company_code || null,
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
        address: '',
        description: '',
      })
      setShowNewCompanyForm(false)
    } catch (error) {
      console.error('企業作成エラー:', error)
      alert('企業の作成に失敗しました')
    }
  }

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company)
    setShowNewCompanyForm(false)
  }

  const handleUpdateCompany = async () => {
    if (!editingCompany) return
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: editingCompany.name,
          company_code: editingCompany.company_code || null,
          address: editingCompany.address || null,
          description: editingCompany.description || null,
        })
        .eq('id', editingCompany.id)

      if (error) throw error

      await loadData()
      setEditingCompany(null)
    } catch (error) {
      console.error('企業更新エラー:', error)
      alert('企業の更新に失敗しました')
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

  // フィルタリング
  const filteredCompanies = companies.filter((company) => {
    const matchesSearch =
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.company_code?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      {/* ヘッダー */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => router.push('/')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          トップページ
        </Button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">企業管理</h1>
            <p className="text-gray-600 mt-2">
              企業情報の登録・管理を行います
            </p>
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="mb-6">
        <Button onClick={() => setShowNewCompanyForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新規企業登録
        </Button>
      </div>

      {/* 編集企業フォーム */}
      {editingCompany && (
        <Card className="p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-6">企業情報編集</h2>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_name">企業名 *</Label>
                <Input
                  id="edit_name"
                  value={editingCompany.name}
                  onChange={(e) =>
                    setEditingCompany({ ...editingCompany, name: e.target.value })
                  }
                  placeholder="例: 株式会社サンプル"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_company_code">企業コード</Label>
                <Input
                  id="edit_company_code"
                  value={editingCompany.company_code || ''}
                  onChange={(e) =>
                    setEditingCompany({
                      ...editingCompany,
                      company_code: e.target.value,
                    })
                  }
                  placeholder="例: SMPL001"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit_address">住所</Label>
              <Input
                id="edit_address"
                value={editingCompany.address || ''}
                onChange={(e) =>
                  setEditingCompany({ ...editingCompany, address: e.target.value })
                }
                placeholder="例: 東京都千代田区..."
              />
            </div>

            <div>
              <Label htmlFor="edit_description">備考</Label>
              <textarea
                id="edit_description"
                className="w-full border rounded-md px-3 py-2"
                rows={3}
                value={editingCompany.description || ''}
                onChange={(e) =>
                  setEditingCompany({
                    ...editingCompany,
                    description: e.target.value,
                  })
                }
                placeholder="メモや備考を入力"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setEditingCompany(null)}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleUpdateCompany}
                disabled={!editingCompany.name}
              >
                更新
              </Button>
            </div>
          </div>
        </Card>
      )}

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

      {/* 検索 */}
      <Card className="p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-10"
            placeholder="企業名または企業コードで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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

                  <div className="grid md:grid-cols-2 gap-4 mt-4 text-sm">
                    {company.address && (
                      <div>
                        <p className="text-gray-600">住所</p>
                        <p className="font-medium">{company.address}</p>
                      </div>
                    )}
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
                    onClick={() => handleEditCompany(company)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
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
  )
}
