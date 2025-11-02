import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/types/database'

type AccountFormat = Database['public']['Tables']['account_formats']['Row']
type AccountFormatInsert = Database['public']['Tables']['account_formats']['Insert']

// GET /api/account-formats - フォーマット一覧取得
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)

    const industryId = searchParams.get('industry_id')
    const isShared = searchParams.get('is_shared')
    const createdBy = searchParams.get('created_by')

    let query = supabase
      .from('account_formats')
      .select(`
        *,
        industry:industries(id, name),
        items:account_format_items(*)
      `)
      .order('created_at', { ascending: false })

    // フィルター適用
    if (industryId) {
      query = query.eq('industry_id', industryId)
    }
    if (isShared !== null) {
      query = query.eq('is_shared', isShared === 'true')
    }
    if (createdBy) {
      query = query.eq('created_by', createdBy)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching account formats:', error)
      return NextResponse.json(
        { error: 'フォーマットの取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ formats: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

// POST /api/account-formats - フォーマット作成
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()

    const {
      name,
      description,
      industry_id,
      is_shared = false,
      items = [],
    } = body

    if (!name) {
      return NextResponse.json(
        { error: 'フォーマット名は必須です' },
        { status: 400 }
      )
    }

    // フォーマットを作成
    const { data: format, error: formatError } = await supabase
      .from('account_formats')
      .insert({
        name,
        description,
        industry_id,
        is_shared,
        created_by: null, // TODO: 認証実装後にauth.uid()を使用
      })
      .select()
      .single()

    if (formatError) {
      console.error('Error creating format:', formatError)
      return NextResponse.json(
        { error: 'フォーマットの作成に失敗しました' },
        { status: 500 }
      )
    }

    // 科目アイテムを作成
    if (items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        format_id: format.id,
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
        console.error('Error creating format items:', itemsError)
        // フォーマット作成は成功したので、エラーログのみ
      }
    }

    // 作成したフォーマットを再取得（アイテム含む）
    const { data: createdFormat, error: fetchError } = await supabase
      .from('account_formats')
      .select(`
        *,
        industry:industries(id, name),
        items:account_format_items(*)
      `)
      .eq('id', format.id)
      .single()

    if (fetchError) {
      console.error('Error fetching created format:', fetchError)
      return NextResponse.json({ format })
    }

    return NextResponse.json({ format: createdFormat }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
