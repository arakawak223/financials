'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, Save, ArrowLeft, ChevronRight } from 'lucide-react'

interface AccountFormatItem {
  id?: string
  category: string
  account_name: string
  display_order: number
  parent_id?: string | null
  level: number
  calculation_formula?: string | null
  is_total: boolean
}

interface AccountFormatEditorProps {
  formatId?: string | null
  onSave?: (formatId: string) => void
  onCancel?: () => void
}

export function AccountFormatEditor({
  formatId,
  onSave,
  onCancel,
}: AccountFormatEditorProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [industryId, setIndustryId] = useState<string>('')
  const [isShared, setIsShared] = useState(false)
  const [items, setItems] = useState<AccountFormatItem[]>([])
  const [loading, setLoading] = useState(false)
  const [industries, setIndustries] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    fetchIndustries()
    if (formatId) {
      fetchFormat()
    }
  }, [formatId])

  const fetchIndustries = async () => {
    try {
      const response = await fetch('/api/dev/seed-industries')
      const data = await response.json()
      setIndustries(data.industries || [])
    } catch (err) {
      console.error('業種の取得に失敗しました:', err)
    }
  }

  const fetchFormat = async () => {
    if (!formatId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/account-formats/${formatId}`)
      const data = await response.json()

      if (response.ok) {
        const format = data.format
        setName(format.name)
        setDescription(format.description || '')
        setIndustryId(format.industry_id || '')
        setIsShared(format.is_shared)
        setItems(format.items || [])
      }
    } catch (err) {
      console.error('フォーマットの取得に失敗しました:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = () => {
    const newItem: AccountFormatItem = {
      category: '売上高',
      account_name: '',
      display_order: items.length + 1,
      level: 0,
      is_total: false,
    }
    setItems([...items, newItem])
  }

  const handleUpdateItem = (index: number, field: keyof AccountFormatItem, value: any) => {
    const updatedItems = [...items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    setItems(updatedItems)
  }

  const handleDeleteItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!name.trim()) {
      alert('フォーマット名を入力してください')
      return
    }

    if (items.length === 0) {
      alert('少なくとも1つの科目を追加してください')
      return
    }

    try {
      setLoading(true)
      const payload = {
        name,
        description,
        industry_id: industryId || null,
        is_shared: isShared,
        items: items.map((item, index) => ({
          ...item,
          display_order: index + 1,
        })),
      }

      const url = formatId
        ? `/api/account-formats/${formatId}`
        : '/api/account-formats'
      const method = formatId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '保存に失敗しました')
      }

      alert('フォーマットを保存しました')
      if (onSave) onSave(data.format.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {formatId ? 'フォーマット編集' : '新規フォーマット作成'}
            </CardTitle>
            <CardDescription>
              売上高・売上原価・売上総利益の科目体系を設定します
            </CardDescription>
          </div>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              戻る
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 基本情報 */}
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">フォーマット名 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 製造業フォーマット"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">説明</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="フォーマットの説明を入力してください"
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="industry">業種</Label>
            <Select value={industryId} onValueChange={setIndustryId}>
              <SelectTrigger>
                <SelectValue placeholder="業種を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">未設定</SelectItem>
                {industries.map((industry) => (
                  <SelectItem key={industry.id} value={industry.id}>
                    {industry.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_shared"
              checked={isShared}
              onCheckedChange={setIsShared}
            />
            <Label htmlFor="is_shared" className="cursor-pointer">
              他のユーザーと共有する（共有フォーマットとして公開）
            </Label>
          </div>
        </div>

        {/* 科目一覧 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">科目設定</h3>
            <Button onClick={handleAddItem} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              科目を追加
            </Button>
          </div>

          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              科目が登録されていません。「科目を追加」ボタンから追加してください。
            </p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">カテゴリ</TableHead>
                    <TableHead>科目名</TableHead>
                    <TableHead className="w-[100px]">階層</TableHead>
                    <TableHead className="w-[100px]">合計行</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={item.category}
                          onValueChange={(value) =>
                            handleUpdateItem(index, 'category', value)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="売上高">売上高</SelectItem>
                            <SelectItem value="売上原価">売上原価</SelectItem>
                            <SelectItem value="売上総利益">
                              売上総利益
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.account_name}
                          onChange={(e) =>
                            handleUpdateItem(
                              index,
                              'account_name',
                              e.target.value
                            )
                          }
                          placeholder="科目名を入力"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.level.toString()}
                          onValueChange={(value) =>
                            handleUpdateItem(index, 'level', parseInt(value))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">レベル0</SelectItem>
                            <SelectItem value="1">レベル1</SelectItem>
                            <SelectItem value="2">レベル2</SelectItem>
                            <SelectItem value="3">レベル3</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={item.is_total}
                          onCheckedChange={(checked) =>
                            handleUpdateItem(index, 'is_total', checked)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* 保存ボタン */}
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              キャンセル
            </Button>
          )}
          <Button onClick={handleSave} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? '保存中...' : '保存'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
