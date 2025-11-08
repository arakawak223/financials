'use client'

import { useState, useEffect, Suspense } from 'react'
import { AccountFormatList } from '@/components/account-format-list'
import { AccountFormatEditor } from '@/components/account-format-editor'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

type ViewMode = 'list' | 'create' | 'edit'

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

function AccountFormatsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null)
  const [returnUrl, setReturnUrl] = useState<string | null>(null)

  // URLパラメータから編集モードとリターンURLを取得
  useEffect(() => {
    const editParam = searchParams.get('edit')
    const returnParam = searchParams.get('return')

    if (editParam) {
      setSelectedFormatId(editParam)
      setViewMode('edit')
    }

    if (returnParam) {
      setReturnUrl(decodeURIComponent(returnParam))
    }
  }, [searchParams])

  const handleCreate = () => {
    setSelectedFormatId(null)
    setViewMode('create')
  }

  const handleEdit = (format: AccountFormat) => {
    setSelectedFormatId(format.id)
    setViewMode('edit')
  }

  const handleSave = (formatId: string) => {
    // リターンURLが設定されている場合は、そこに戻る
    if (returnUrl) {
      // フォーマットIDをURLパラメータに追加して戻る
      const url = new URL(returnUrl, window.location.origin)
      url.searchParams.set('formatId', formatId)
      router.push(url.pathname + url.search)
    } else {
      setViewMode('list')
      setSelectedFormatId(null)
    }
  }

  const handleCancel = () => {
    // リターンURLが設定されている場合は、そこに戻る
    if (returnUrl) {
      router.push(returnUrl)
    } else {
      setViewMode('list')
      setSelectedFormatId(null)
    }
  }

  const handleDelete = () => {
    // リストは自動的に更新されるので、特に何もしない
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {viewMode === 'list' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">科目テンプレート管理</h1>
            <Button variant="outline" onClick={() => router.push('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              ホームに戻る
            </Button>
          </div>
          <AccountFormatList
            onCreate={handleCreate}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      )}

      {(viewMode === 'create' || viewMode === 'edit') && (
        <div className="space-y-4">
          <AccountFormatEditor
            formatId={selectedFormatId}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </div>
      )}
    </div>
  )
}

export default function AccountFormatsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto py-8 px-4 text-center">読み込み中...</div>}>
      <AccountFormatsPageContent />
    </Suspense>
  )
}
