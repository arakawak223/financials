'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Share2, Lock, Copy, Download, Upload, Play } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AccountFormat {
  id: string
  name: string
  description: string | null
  is_shared: boolean
  industry: {
    id: string
    name: string
  } | null
  items: Array<{
    id: string
    category: string
    account_name: string
    display_order: number
    level: number
  }>
  created_at: string
  updated_at: string
}

interface Template {
  id: string
  name: string
  description: string
  industry_name: string
  items_count: number
}

interface AccountFormatListProps {
  onEdit?: (format: AccountFormat) => void
  onDelete?: (formatId: string) => void
  onCreate?: () => void
}

export function AccountFormatList({
  onEdit,
  onDelete,
  onCreate,
}: AccountFormatListProps) {
  const router = useRouter()
  const [formats, setFormats] = useState<AccountFormat[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchFormats()
    fetchTemplates()
  }, [])

  const fetchFormats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/account-formats')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'テンプレートの取得に失敗しました')
      }

      setFormats(data.formats || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/account-formats/templates')
      const data = await response.json()

      if (response.ok) {
        setTemplates(data.templates || [])
      }
    } catch (err) {
      console.error('テンプレートの取得に失敗しました:', err)
    }
  }

  const handleDelete = async (formatId: string) => {
    if (!confirm('このテンプレートを削除してもよろしいですか？')) {
      return
    }

    try {
      const response = await fetch(`/api/account-formats/${formatId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'テンプレートの削除に失敗しました')
      }

      // リストから削除
      setFormats(formats.filter((f) => f.id !== formatId))
      if (onDelete) onDelete(formatId)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました')
    }
  }

  const handleCopy = async (format: AccountFormat) => {
    const newName = prompt(`コピー先のテンプレート名を入力してください`, `${format.name}のコピー`)
    if (!newName) return

    try {
      // テンプレートを取得してコピー
      const response = await fetch(`/api/account-formats/${format.id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'テンプレートの取得に失敗しました')
      }

      // 新しいテンプレートとして作成
      const createResponse = await fetch('/api/account-formats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          description: data.format.description ? `${data.format.description}（コピー）` : null,
          industry_id: data.format.industry_id,
          is_shared: false, // コピーは専用テンプレートとして作成
          items: data.format.items || [],
        }),
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json()
        throw new Error(errorData.error || 'テンプレートのコピーに失敗しました')
      }

      alert('テンプレートをコピーしました')
      fetchFormats() // リストを再読み込み
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました')
    }
  }

  const handleExport = async (format: AccountFormat) => {
    try {
      // テンプレート詳細を取得
      const response = await fetch(`/api/account-formats/${format.id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'テンプレートの取得に失敗しました')
      }

      // エクスポート用のデータを作成（ID以外をエクスポート）
      const exportData = {
        name: data.format.name,
        description: data.format.description,
        industry_id: data.format.industry_id,
        is_shared: data.format.is_shared,
        items: data.format.items.map((item: any) => ({
          category: item.category,
          account_name: item.account_name,
          display_order: item.display_order,
          parent_id: item.parent_id,
          level: item.level,
          calculation_formula: item.calculation_formula,
          is_total: item.is_total,
        })),
      }

      // JSONファイルとしてダウンロード
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `template_${format.name}_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました')
    }
  }

  const handleImport = async () => {
    // ファイル選択ダイアログを表示
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const importData = JSON.parse(text)

        // バリデーション
        if (!importData.name || !Array.isArray(importData.items)) {
          throw new Error('無効なテンプレートファイルです')
        }

        // テンプレートを作成
        const createResponse = await fetch('/api/account-formats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(importData),
        })

        if (!createResponse.ok) {
          const errorData = await createResponse.json()
          throw new Error(errorData.error || 'テンプレートのインポートに失敗しました')
        }

        alert('テンプレートをインポートしました')
        fetchFormats() // リストを再読み込み
      } catch (err) {
        alert(err instanceof Error ? err.message : 'エラーが発生しました')
      }
    }
    input.click()
  }

  const handleCreateFromTemplate = async (templateId: string) => {
    try {
      // テンプレート適用APIを呼び出す
      const response = await fetch(`/api/account-formats/templates/${templateId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'テンプレートの適用に失敗しました')
      }

      alert('テンプレートから科目テンプレートを作成しました')
      fetchFormats() // リストを再読み込み
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">読み込み中...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-red-500">{error}</p>
          <div className="mt-4 text-center">
            <Button onClick={fetchFormats}>再試行</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* テンプレートセクション */}
      {templates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>テンプレート</CardTitle>
            <CardDescription>
              業種別の科目体系テンプレートを選択できます
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="border-2 hover:border-primary cursor-pointer transition-colors">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Badge variant="secondary" className="text-xs">
                        {template.industry_name}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {template.items_count}件の科目
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleCreateFromTemplate(template.id)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      このテンプレートを使用
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* テンプレート管理セクション */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>科目テンプレート管理</CardTitle>
            <CardDescription>
              売上高・売上原価・売上総利益の科目体系を管理します
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleImport} variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              インポート
            </Button>
            {onCreate && (
              <Button onClick={onCreate}>
                <Plus className="mr-2 h-4 w-4" />
                新規作成
              </Button>
            )}
          </div>
        </CardHeader>
      <CardContent>
        {formats.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            テンプレートが登録されていません
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>テンプレート名</TableHead>
                <TableHead>業種</TableHead>
                <TableHead>科目数</TableHead>
                <TableHead>公開設定</TableHead>
                <TableHead>更新日</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formats.map((format) => (
                <TableRow key={format.id}>
                  <TableCell className="font-medium">{format.name}</TableCell>
                  <TableCell>
                    {format.industry ? (
                      <Badge variant="outline">{format.industry.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        未設定
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{format.items?.length || 0}件</TableCell>
                  <TableCell>
                    {format.is_shared ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Share2 className="h-4 w-4 text-blue-500" />
                        <span>共有</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-sm">
                        <Lock className="h-4 w-4 text-gray-500" />
                        <span>専用</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(format.updated_at).toLocaleDateString('ja-JP')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => router.push(`/analysis/new?formatId=${format.id}`)}
                        title="このテンプレートで分析を開始"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        分析で使用
                      </Button>
                      {onEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(format)}
                          title="編集"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(format)}
                        title="コピー"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport(format)}
                        title="エクスポート"
                      >
                        <Download className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(format.id)}
                        title="削除"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
    </div>
  )
}
