'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Plus,
  ArrowLeft,
  FileText,
  Calendar,
  Building2,
  Download,
  Eye,
  Trash2,
  Search,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'

type FinancialAnalysis =
  Database['public']['Tables']['financial_analyses']['Row']
type Company = Database['public']['Tables']['companies']['Row']

interface AnalysisWithCompany extends FinancialAnalysis {
  companies?: Company
}

export default function AnalysesPage() {
  const router = useRouter()
  const [analyses, setAnalyses] = useState<AnalysisWithCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  const supabase = createClient()

  useEffect(() => {
    loadAnalyses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadAnalyses = async () => {
    setLoading(true)
    try {
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

      // 分析データを企業情報と一緒に取得
      const { data, error } = await supabase
        .from('financial_analyses')
        .select('*, companies(*)')
        .order('created_at', { ascending: false })

      console.log('Supabase response:', { data, error })

      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }

      setAnalyses((data as AnalysisWithCompany[]) || [])
    } catch (error) {
      console.error('分析データ読み込みエラー:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAnalysis = async (id: string) => {
    if (!confirm('この分析を削除してもよろしいですか？')) return

    try {
      const { error } = await supabase
        .from('financial_analyses')
        .delete()
        .eq('id', id)

      if (error) throw error

      await loadAnalyses()
    } catch (error) {
      console.error('分析削除エラー:', error)
      alert('分析の削除に失敗しました')
    }
  }

  // フィルタリングされた分析リスト
  const filteredAnalyses = analyses.filter((analysis) => {
    const matchesSearch =
      analysis.companies?.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      analysis.notes?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = !statusFilter || analysis.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: '下書き',
      completed: '完了',
      archived: 'アーカイブ',
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      archived: 'bg-gray-100 text-gray-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

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
            <h1 className="text-3xl font-bold">分析一覧</h1>
            <p className="text-gray-600 mt-2">
              過去に実施した財務分析の確認・管理を行います
            </p>
          </div>
          <Button onClick={() => router.push('/analysis/new')}>
            <Plus className="h-4 w-4 mr-2" />
            新規分析作成
          </Button>
        </div>
      </div>

      {/* 検索・フィルタ */}
      <Card className="p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-10"
              placeholder="企業名またはメモで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="w-48">
            <select
              className="w-full border rounded-md px-3 py-2"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">すべてのステータス</option>
              <option value="draft">下書き</option>
              <option value="completed">完了</option>
              <option value="archived">アーカイブ</option>
            </select>
          </div>
        </div>
      </Card>

      {/* 分析リスト */}
      {loading ? (
        <Card className="p-8 text-center text-gray-500">
          <p>読み込み中...</p>
        </Card>
      ) : filteredAnalyses.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>分析がありません</p>
          <p className="text-sm mt-2">
            「新規分析作成」から最初の分析を作成しましょう
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAnalyses.map((analysis) => (
            <Card key={analysis.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Building2 className="h-5 w-5 text-primary" />
                    <h3 className="text-xl font-semibold">
                      {analysis.companies?.name || '企業名不明'}
                    </h3>
                    <span
                      className={`text-xs px-2 py-1 rounded ${getStatusColor(
                        analysis.status || 'draft'
                      )}`}
                    >
                      {getStatusLabel(analysis.status || 'draft')}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">分析日</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(analysis.analysis_date).toLocaleDateString(
                          'ja-JP'
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-600">対象期間</p>
                      <p className="font-medium">
                        {analysis.fiscal_year_start}年度 〜{' '}
                        {analysis.fiscal_year_end}年度
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-600">期数</p>
                      <p className="font-medium">{analysis.periods_count}期</p>
                    </div>

                    <div>
                      <p className="text-gray-600">作成日</p>
                      <p className="font-medium">
                        {new Date(analysis.created_at).toLocaleDateString(
                          'ja-JP'
                        )}
                      </p>
                    </div>
                  </div>

                  {analysis.notes && (
                    <div className="mt-3 text-sm">
                      <p className="text-gray-600">メモ</p>
                      <p className="text-gray-700">{analysis.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(`/analysis/${analysis.id}/view`)
                    }
                    title="詳細を表示"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(`/analysis/${analysis.id}/export`)
                    }
                    title="エクスポート"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteAnalysis(analysis.id)}
                    title="削除"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 統計情報 */}
      <Card className="p-6 mt-8">
        <h3 className="text-lg font-semibold mb-4">統計情報</h3>
        <div className="grid md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-primary">
              {analyses.length}
            </p>
            <p className="text-sm text-gray-600 mt-1">総分析数</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-yellow-600">
              {analyses.filter((a) => a.status === 'draft').length}
            </p>
            <p className="text-sm text-gray-600 mt-1">下書き</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-600">
              {analyses.filter((a) => a.status === 'completed').length}
            </p>
            <p className="text-sm text-gray-600 mt-1">完了</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-primary">
              {filteredAnalyses.length}
            </p>
            <p className="text-sm text-gray-600 mt-1">表示中の分析数</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
