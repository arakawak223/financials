import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/account-formats/[id] - フォーマット詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { id } = params

    const { data: format, error } = await supabase
      .from('account_formats')
      .select(`
        *,
        industry:industries(id, name),
        items:account_format_items(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching format:', error)
      return NextResponse.json(
        { error: 'フォーマットの取得に失敗しました' },
        { status: 500 }
      )
    }

    if (!format) {
      return NextResponse.json(
        { error: 'フォーマットが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({ format })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

// PUT /api/account-formats/[id] - フォーマット更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { id } = params
    const body = await request.json()

    const { name, description, industry_id, is_shared, items } = body

    // フォーマット情報を更新
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (industry_id !== undefined) updateData.industry_id = industry_id
    if (is_shared !== undefined) updateData.is_shared = is_shared

    const { data: format, error: formatError } = await supabase
      .from('account_formats')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (formatError) {
      console.error('Error updating format:', formatError)
      return NextResponse.json(
        { error: 'フォーマットの更新に失敗しました' },
        { status: 500 }
      )
    }

    // アイテムが提供されている場合は更新
    if (items) {
      // 既存のアイテムを削除
      await supabase.from('account_format_items').delete().eq('format_id', id)

      // 新しいアイテムを挿入
      if (items.length > 0) {
        const itemsToInsert = items.map((item: any) => ({
          format_id: id,
          category: item.category,
          account_name: item.account_name,
          display_order: item.display_order || 0,
          parent_id: item.parent_id || null,
          level: item.level || 0,
          calculation_formula: item.calculation_formula || null,
          is_total: item.is_total || false,
        }))

        const { error: itemsError } = await supabase
          .from('account_format_items')
          .insert(itemsToInsert)

        if (itemsError) {
          console.error('Error updating format items:', itemsError)
        }
      }
    }

    // 更新されたフォーマットを再取得
    const { data: updatedFormat, error: fetchError } = await supabase
      .from('account_formats')
      .select(`
        *,
        industry:industries(id, name),
        items:account_format_items(*)
      `)
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Error fetching updated format:', fetchError)
      return NextResponse.json({ format })
    }

    return NextResponse.json({ format: updatedFormat })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

// DELETE /api/account-formats/[id] - フォーマット削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { id } = params

    // フォーマットを削除（CASCADE設定により、関連アイテムも自動削除される）
    const { error } = await supabase
      .from('account_formats')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting format:', error)
      return NextResponse.json(
        { error: 'フォーマットの削除に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
