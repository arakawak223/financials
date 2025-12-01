export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import fs from 'fs'
import path from 'path'

/**
 * Migration実行エンドポイント
 * 開発用：指定されたmigrationファイルを実行
 */
export async function POST(request: NextRequest) {
  try {
    const { migrationFile } = await request.json()

    if (!migrationFile) {
      return NextResponse.json(
        { error: 'migrationFileパラメータが必要です' },
        { status: 400 }
      )
    }

    console.log('🔧 Migration実行:', migrationFile)

    // migrationファイルを読み込み
    const migrationPath = path.join(
      process.cwd(),
      'supabase',
      'migrations',
      migrationFile
    )

    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json(
        { error: `Migrationファイルが見つかりません: ${migrationFile}` },
        { status: 404 }
      )
    }

    const sql = fs.readFileSync(migrationPath, 'utf-8')
    console.log('📄 SQL長:', sql.length, '文字')

    // Supabaseクライアントを使用してSQLを実行
    const supabase = await createClient()

    // SQLを実行（複数のステートメントに分割して実行）
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log('📊 実行するステートメント数:', statements.length)

    const results = []
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`  ${i + 1}/${statements.length}: ${statement.substring(0, 100)}...`)

      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement + ';'
        })

        if (error) {
          console.error(`  ❌ エラー:`, error)
          // ビューやファンクションの再作成の場合は既存のものを削除するエラーは無視
          if (!error.message?.includes('does not exist')) {
            throw error
          }
        } else {
          console.log(`  ✅ 成功`)
        }

        results.push({
          statement: statement.substring(0, 100) + '...',
          success: !error,
          error: error?.message
        })
      } catch (err) {
        console.error(`  ❌ 実行エラー:`, err)
        results.push({
          statement: statement.substring(0, 100) + '...',
          success: false,
          error: err instanceof Error ? err.message : String(err)
        })
      }
    }

    console.log('✅ Migration完了')

    return NextResponse.json({
      success: true,
      migrationFile,
      statementsExecuted: statements.length,
      results
    })
  } catch (error) {
    console.error('❌ Migration実行エラー:', error)
    return NextResponse.json(
      {
        error: 'Migration実行に失敗しました',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
