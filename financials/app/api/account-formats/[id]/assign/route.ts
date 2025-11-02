import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/account-formats/[id]/assign - 企業にフォーマットを割り当て
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: formatId } = await params
    const body = await request.json()

    const { company_id, is_active = true } = body

    if (!company_id) {
      return NextResponse.json(
        { error: '企業IDは必須です' },
        { status: 400 }
      )
    }

    // アクティブなフォーマットを設定する場合、他のフォーマットを非アクティブにする
    if (is_active) {
      await supabase
        .from('company_account_formats')
        .update({ is_active: false })
        .eq('company_id', company_id)
        .eq('is_active', true)
    }

    // フォーマットを割り当て（既存の場合は更新）
    const { data: assignment, error } = await supabase
      .from('company_account_formats')
      .upsert(
        {
          company_id,
          format_id: formatId,
          is_active,
        },
        {
          onConflict: 'company_id,format_id',
        }
      )
      .select(`
        *,
        format:account_formats(
          *,
          industry:industries(id, name),
          items:account_format_items(*)
        )
      `)
      .single()

    if (error) {
      console.error('Error assigning format:', error)
      return NextResponse.json(
        { error: 'フォーマットの割り当てに失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ assignment }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
