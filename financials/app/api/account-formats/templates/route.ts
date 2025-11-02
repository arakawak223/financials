import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const templatesDir = path.join(process.cwd(), 'lib', 'templates')

    // テンプレートディレクトリが存在しない場合は空配列を返す
    if (!fs.existsSync(templatesDir)) {
      return NextResponse.json({ templates: [] })
    }

    const files = fs.readdirSync(templatesDir).filter(file => file.endsWith('.json'))

    const templates = files.map(file => {
      const filePath = path.join(templatesDir, file)
      const content = fs.readFileSync(filePath, 'utf-8')
      const template = JSON.parse(content)

      return {
        id: file.replace('.json', ''),
        name: template.name,
        description: template.description,
        industry_name: template.industry_name,
        items_count: template.items?.length || 0
      }
    })

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Templates fetch error:', error)
    return NextResponse.json(
      { error: 'テンプレートの取得に失敗しました' },
      { status: 500 }
    )
  }
}
