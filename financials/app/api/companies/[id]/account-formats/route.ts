import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/companies/[id]/account-formats - 企業に割り当てられたフォーマット一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { id: companyId } = params
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active_only') === 'true'

    let query = supabase
      .from('company_account_formats')
      .select(`
        *,
        format:account_formats(
          *,
          industry:industries(id, name),
          items:account_format_items(*)
        )
      `)
      .eq('company_id', companyId)

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: assignments, error } = await query

    if (error) {
      console.error('Error fetching company formats:', error)
      return NextResponse.json(
        { error: '企業フォーマットの取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
