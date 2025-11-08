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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Check, Share2, Lock } from 'lucide-react'

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
  }>
}

interface AccountFormatSelectorProps {
  companyId: string
  onFormatAssigned?: (formatId: string) => void
}

export function AccountFormatSelector({
  companyId,
  onFormatAssigned,
}: AccountFormatSelectorProps) {
  const [formats, setFormats] = useState<AccountFormat[]>([])
  const [selectedFormatId, setSelectedFormatId] = useState<string>('')
  const [activeFormatId, setActiveFormatId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    fetchFormats()
    fetchActiveFormat()
  }, [companyId])

  const fetchFormats = async () => {
    try {
      const response = await fetch('/api/account-formats')
      const data = await response.json()

      if (response.ok) {
        setFormats(data.formats || [])
      }
    } catch (err) {
      console.error('フォーマットの取得に失敗しました:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchActiveFormat = async () => {
    try {
      const response = await fetch(
        `/api/companies/${companyId}/account-formats?active_only=true`
      )
      const data = await response.json()

      if (response.ok && data.assignments && data.assignments.length > 0) {
        const activeAssignment = data.assignments[0]
        setActiveFormatId(activeAssignment.format_id)
        setSelectedFormatId(activeAssignment.format_id)
      }
    } catch (err) {
      console.error('アクティブフォーマットの取得に失敗しました:', err)
    }
  }

  const handleAssignFormat = async () => {
    if (!selectedFormatId) {
      alert('フォーマットを選択してください')
      return
    }

    try {
      setAssigning(true)
      const response = await fetch(
        `/api/account-formats/${selectedFormatId}/assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id: companyId,
            is_active: true,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'フォーマットの割り当てに失敗しました')
      }

      setActiveFormatId(selectedFormatId)
      alert('フォーマットを適用しました')
      if (onFormatAssigned) onFormatAssigned(selectedFormatId)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setAssigning(false)
    }
  }

  const selectedFormat = formats.find((f) => f.id === selectedFormatId)

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">読み込み中...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>科目フォーマット選択</CardTitle>
        <CardDescription>
          売上高/売上原価/売上総利益/販売費・一般管理費/営業外損益/特別損益の内訳科目を抽出・表示する科目体系フォーマットを選択してください
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">フォーマット</label>
            <Select value={selectedFormatId} onValueChange={setSelectedFormatId}>
              <SelectTrigger>
                <SelectValue placeholder="フォーマットを選択" />
              </SelectTrigger>
              <SelectContent>
                {formats.map((format) => (
                  <SelectItem key={format.id} value={format.id}>
                    <div className="flex items-center gap-2">
                      <span>{format.name}</span>
                      {format.is_shared ? (
                        <Share2 className="h-3 w-3 text-blue-500" />
                      ) : (
                        <Lock className="h-3 w-3 text-gray-500" />
                      )}
                      {format.id === activeFormatId && (
                        <Check className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedFormat && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{selectedFormat.name}</h4>
                <div className="flex items-center gap-2">
                  {selectedFormat.is_shared ? (
                    <Badge variant="outline" className="text-blue-600">
                      <Share2 className="mr-1 h-3 w-3" />
                      共有
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <Lock className="mr-1 h-3 w-3" />
                      専用
                    </Badge>
                  )}
                  {selectedFormat.industry && (
                    <Badge variant="secondary">
                      {selectedFormat.industry.name}
                    </Badge>
                  )}
                </div>
              </div>

              {selectedFormat.description && (
                <p className="text-sm text-muted-foreground">
                  {selectedFormat.description}
                </p>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">設定科目:</p>
                <div className="grid grid-cols-3 gap-2">
                  {['売上高', '売上原価', '売上総利益', '販売費・一般管理費', '営業外損益', '特別損益'].map((category) => {
                    const categoryItems = selectedFormat.items.filter(
                      (item) => item.category === category
                    )
                    if (categoryItems.length === 0) return null
                    return (
                      <div
                        key={category}
                        className="rounded border p-2 bg-muted/50"
                      >
                        <p className="text-xs font-semibold mb-1">
                          {category}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {categoryItems.length}件の科目
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {selectedFormat.id === activeFormatId && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  <span>現在このフォーマットが適用されています</span>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleAssignFormat}
            disabled={!selectedFormatId || selectedFormatId === activeFormatId || assigning}
            className="w-full"
          >
            {assigning
              ? '適用中...'
              : selectedFormatId === activeFormatId
              ? '適用済み'
              : 'フォーマットを適用'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
