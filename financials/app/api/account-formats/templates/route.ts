import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const templatesDir = path.join(process.cwd(), 'lib', 'templates')
    console.log('テンプレートディレクトリ:', templatesDir)

    // テンプレートディレクトリが存在しない場合は空配列を返す
    if (!fs.existsSync(templatesDir)) {
      console.log('テンプレートディレクトリが存在しません')
      return NextResponse.json({ templates: [] })
    }

    const files = fs.readdirSync(templatesDir).filter(file => file.endsWith('.json'))
    console.log('見つかったテンプレートファイル:', files)

    const templates = files.map(file => {
      try {
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
      } catch (fileError) {
        console.error(`ファイル ${file} の読み込みエラー:`, fileError)
        return null
      }
    }).filter(t => t !== null)

    // シンプルテンプレートを最初に、その後はアルファベット順
    const sortedTemplates = templates.sort((a, b) => {
      if (a.id === 'simple') return -1
      if (b.id === 'simple') return 1
      return a.id.localeCompare(b.id)
    })

    console.log('返却するテンプレート数:', sortedTemplates.length)
    return NextResponse.json({ templates: sortedTemplates })
  } catch (error) {
    console.error('Templates fetch error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Templates fetch error details:', errorMessage)
    return NextResponse.json(
      { error: 'テンプレートの取得に失敗しました', details: errorMessage },
      { status: 500 }
    )
  }
}
