export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// コメント編集
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const supabase = await createClient()
    const params = await context.params
    const analysisId = params.id
    const commentId = params.commentId

    const body = await request.json()
    const { editedText } = body

    if (!editedText && editedText !== '') {
      return NextResponse.json(
        { error: '編集テキストが必要です' },
        { status: 400 }
      )
    }

    // コメントが存在するか確認
    const { data: existingComment, error: fetchError } = await supabase
      .from('analysis_comments')
      .select('id')
      .eq('id', commentId)
      .eq('analysis_id', analysisId)
      .single()

    if (fetchError || !existingComment) {
      return NextResponse.json(
        { error: 'コメントが見つかりません' },
        { status: 404 }
      )
    }

    // コメントを更新
    const { error: updateError } = await supabase
      .from('analysis_comments')
      .update({
        user_edited_text: editedText,
        is_edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)

    if (updateError) {
      console.error('コメント更新エラー:', updateError)
      return NextResponse.json(
        { error: 'コメントの更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Edit comment error:', error)
    return NextResponse.json(
      { error: 'コメントの編集に失敗しました' },
      { status: 500 }
    )
  }
}
