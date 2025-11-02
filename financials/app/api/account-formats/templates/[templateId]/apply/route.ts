import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'

export async function POST(
  request: Request,
  context: { params: Promise<{ templateId: string }> }
) {
  try {
    const params = await context.params
    const { templateId } = params

    // テンプレートファイルを読み込む
    const templatePath = path.join(process.cwd(), 'lib', 'templates', `${templateId}.json`)

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: 'テンプレートが見つかりません' },
        { status: 404 }
      )
    }

    const templateContent = fs.readFileSync(templatePath, 'utf-8')
    const template = JSON.parse(templateContent)

    // リクエストボディから追加パラメータを取得（オプション）
    const body = await request.json().catch(() => ({}))
    const { name: customName } = body

    const supabase = await createClient()

    // 業種名から業種IDを取得
    let industryId = null
    if (template.industry_name) {
      const { data: industry } = await supabase
        .from('industries')
        .select('id')
        .eq('name', template.industry_name)
        .single()

      if (industry) {
        industryId = industry.id
      }
    }

    // フォーマットを作成
    const { data: format, error: formatError } = await supabase
      .from('account_formats')
      .insert({
        name: customName || template.name,
        description: template.description,
        industry_id: industryId,
        is_shared: template.is_shared || false,
        created_by: null, // 認証が有効になったら設定
      })
      .select()
      .single()

    if (formatError) {
      console.error('Format creation error:', formatError)
      return NextResponse.json(
        { error: 'フォーマットの作成に失敗しました' },
        { status: 500 }
      )
    }

    // 科目項目を作成
    if (template.items && template.items.length > 0) {
      const itemsToInsert = template.items.map((item: any) => ({
        format_id: format.id,
        category: item.category,
        account_name: item.account_name,
        display_order: item.display_order,
        parent_id: item.parent_id,
        level: item.level,
        calculation_formula: item.calculation_formula,
        is_total: item.is_total,
      }))

      const { error: itemsError } = await supabase
        .from('account_format_items')
        .insert(itemsToInsert)

      if (itemsError) {
        console.error('Items creation error:', itemsError)
        // フォーマットは作成されているので、エラーでもロールバックしない
        return NextResponse.json(
          { error: '一部の科目の作成に失敗しました' },
          { status: 500 }
        )
      }
    }

    // 作成されたフォーマットを取得（科目を含む）
    const { data: createdFormat } = await supabase
      .from('account_formats')
      .select(`
        *,
        industry:industries(id, name),
        items:account_format_items(*)
      `)
      .eq('id', format.id)
      .single()

    return NextResponse.json({ format: createdFormat }, { status: 201 })
  } catch (error) {
    console.error('Template apply error:', error)
    return NextResponse.json(
      { error: 'テンプレートの適用に失敗しました' },
      { status: 500 }
    )
  }
}
