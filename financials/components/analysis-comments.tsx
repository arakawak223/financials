'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Edit, RefreshCw, Save, X, Loader2 } from 'lucide-react'
import type { AnalysisComment } from '@/lib/types/financial'

interface AnalysisCommentsProps {
  analysisId: string
  comments: AnalysisComment[]
  onUpdate: () => void
}

export function AnalysisComments({ analysisId, comments, onUpdate }: AnalysisCommentsProps) {
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editedText, setEditedText] = useState('')
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [regeneratingAll, setRegeneratingAll] = useState(false)

  const commentTitles: Record<string, string> = {
    overall: '📊 総合評価',
    liquidity: '💧 流動性分析',
    profitability: '💰 収益性分析',
    efficiency: '⚡効率性分析',
    safety: '🛡️ 安全性分析',
    growth: '📈 成長性分析',
  }

  const handleEditStart = (comment: AnalysisComment) => {
    setEditingCommentId(comment.id)
    setEditedText(comment.editedText || comment.aiGeneratedText || '')
  }

  const handleEditCancel = () => {
    setEditingCommentId(null)
    setEditedText('')
  }

  const handleEditSave = async (commentId: string) => {
    try {
      const response = await fetch(`/api/analysis/${analysisId}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editedText }),
      })

      if (!response.ok) {
        throw new Error('保存に失敗しました')
      }

      setEditingCommentId(null)
      setEditedText('')
      onUpdate()
    } catch (error) {
      console.error('Edit save error:', error)
      alert(error instanceof Error ? error.message : '保存に失敗しました')
    }
  }

  const handleRegenerate = async (commentId: string) => {
    if (!confirm('このコメントを再生成しますか？\n（AI生成テキストが上書きされます）')) {
      return
    }

    try {
      setRegeneratingId(commentId)
      const response = await fetch(
        `/api/analysis/${analysisId}/comments/${commentId}/regenerate`,
        { method: 'POST' }
      )

      if (!response.ok) {
        throw new Error('再生成に失敗しました')
      }

      onUpdate()
    } catch (error) {
      console.error('Regenerate error:', error)
      alert(error instanceof Error ? error.message : '再生成に失敗しました')
    } finally {
      setRegeneratingId(null)
    }
  }

  const handleRegenerateAll = async () => {
    if (!confirm('全てのコメントを再生成しますか？\n（全てのAI生成テキストが上書きされます）\n\n※6つのコメントを順次生成するため、数分かかる場合があります。')) {
      return
    }

    try {
      setRegeneratingAll(true)

      // 既存のコメントIDを取得
      const response = await fetch(
        `/api/analysis/${analysisId}/comments/regenerate-all`,
        { method: 'POST' }
      )

      if (!response.ok) {
        throw new Error('全再生成の準備に失敗しました')
      }

      const result = await response.json()
      const commentIds = result.commentIds || []

      // 各コメントを順次再生成
      let successCount = 0
      let failCount = 0

      for (const comment of commentIds) {
        try {
          const regenerateResponse = await fetch(
            `/api/analysis/${analysisId}/comments/${comment.id}/regenerate`,
            { method: 'POST' }
          )

          if (regenerateResponse.ok) {
            successCount++
            console.log(`✅ ${comment.type} 再生成完了 (${successCount}/${commentIds.length})`)
          } else {
            failCount++
            console.error(`❌ ${comment.type} 再生成失敗`)
          }
        } catch (error) {
          failCount++
          console.error(`❌ ${comment.type} 再生成エラー:`, error)
        }
      }

      // 結果を表示
      if (failCount === 0) {
        alert(`全コメントを再生成しました（${successCount}件）`)
      } else {
        alert(`コメント再生成が完了しました\n成功: ${successCount}件\n失敗: ${failCount}件`)
      }

      onUpdate()
    } catch (error) {
      console.error('Regenerate all error:', error)
      alert(error instanceof Error ? error.message : '全再生成に失敗しました')
    } finally {
      setRegeneratingAll(false)
    }
  }

  if (!comments || comments.length === 0) {
    return null
  }

  return (
    <div className="mb-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">AI分析コメント</h2>
        <Button
          variant="outline"
          onClick={handleRegenerateAll}
          disabled={regeneratingAll}
        >
          {regeneratingAll ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              再生成中...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              全て再生成
            </>
          )}
        </Button>
      </div>

      {comments.map((comment) => {
        const title = commentTitles[comment.commentType] || 'コメント'
        const isEditing = editingCommentId === comment.id
        const isRegenerating = regeneratingId === comment.id
        const displayText = comment.editedText || comment.aiGeneratedText || ''

        return (
          <Card key={comment.id} className="p-6">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-semibold text-blue-700">{title}</h3>
              <div className="flex gap-2">
                {!isEditing && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditStart(comment)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      編集
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRegenerate(comment.id)}
                      disabled={isRegenerating}
                    >
                      {isRegenerating ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-1" />
                      )}
                      再生成
                    </Button>
                  </>
                )}
                {isEditing && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditSave(comment.id)}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      保存
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEditCancel}
                    >
                      <X className="h-4 w-4 mr-1" />
                      キャンセル
                    </Button>
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <textarea
                className="w-full min-h-[120px] p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
              />
            ) : (
              <div className="whitespace-pre-wrap text-gray-700">
                {displayText}
                {comment.isEdited && (
                  <span className="text-xs text-gray-500 ml-2">(編集済み)</span>
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
