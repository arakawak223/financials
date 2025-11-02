import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET /api/dev/seed-industries - 業種一覧取得
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: industries, error } = await supabase
      .from('industries')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching industries:', error)
      return NextResponse.json(
        { error: '業種の取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ industries })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
