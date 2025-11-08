export const dynamic = 'force-dynamic';
export const maxDuration = 10;

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const params = await context.params
    const analysisId = params.id

    // 既存のコメントIDを取得
    const { data: existingComments, error } = await supabase
      .from('analysis_comments')
      .select('id, comment_type')
      .eq('analysis_id', analysisId)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('コメント取得エラー:', error)
      return NextResponse.json(
        { error: 'コメントの取得に失敗しました' },
        { status: 500 }
      )
    }

    const commentIds = (existingComments || []).map(c => ({
      id: c.id,
      type: c.comment_type
    }))

    // コメントIDリストを返す（フロントエンドで順次再生成）
    return NextResponse.json({
      success: true,
      commentIds,
    })
  } catch (error) {
    console.error('Regenerate all comments error:', error)
    return NextResponse.json(
      { error: '全コメントの再生成に失敗しました' },
      { status: 500 }
    )
  }
}
