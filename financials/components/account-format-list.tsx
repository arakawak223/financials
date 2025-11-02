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
import { Plus, Edit, Trash2, Share2, Lock } from 'lucide-react'

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
  const [formats, setFormats] = useState<AccountFormat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchFormats()
  }, [])

  const fetchFormats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/account-formats')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'フォーマットの取得に失敗しました')
      }

      setFormats(data.formats || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (formatId: string) => {
    if (!confirm('このフォーマットを削除してもよろしいですか？')) {
      return
    }

    try {
      const response = await fetch(`/api/account-formats/${formatId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'フォーマットの削除に失敗しました')
      }

      // リストから削除
      setFormats(formats.filter((f) => f.id !== formatId))
      if (onDelete) onDelete(formatId)
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>科目フォーマット管理</CardTitle>
          <CardDescription>
            売上高・売上原価・売上総利益の科目体系を管理します
          </CardDescription>
        </div>
        {onCreate && (
          <Button onClick={onCreate}>
            <Plus className="mr-2 h-4 w-4" />
            新規フォーマット作成
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {formats.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            フォーマットが登録されていません
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>フォーマット名</TableHead>
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
                      {onEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(format)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(format.id)}
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
  )
}
