'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function TestPdfPage() {
  const [logs, setLogs] = useState<string[]>([])
  const [result, setResult] = useState<any>(null)

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, message])
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLogs([])
    setResult(null)

    addLog(`🔄 ファイル選択: ${file.name} (${file.size} bytes)`)

    try {
      addLog(`📦 pdf-processorモジュールを読み込み中...`)
      const { extractFinancialDataFromPdf } = await import('@/lib/utils/pdf-processor')
      addLog(`✅ pdf-processorモジュール読み込み成功`)

      addLog(`📖 PDF処理開始...`)
      const extractedData = await extractFinancialDataFromPdf(
        file,
        'financial_statement',
        2023
      )
      addLog(`✅ PDF処理完了`)

      setResult(extractedData)

      if (extractedData.success) {
        addLog(`✅ データ抽出成功`)
        addLog(`📊 BS項目: ${Object.keys(extractedData.balanceSheet || {}).length}個`)
        addLog(`📊 PL項目: ${Object.keys(extractedData.profitLoss || {}).length}個`)
      } else {
        addLog(`❌ データ抽出失敗`)
        addLog(`エラー: ${extractedData.errors?.join(', ')}`)
      }
    } catch (error) {
      addLog(`❌❌❌ エラー発生: ${error instanceof Error ? error.message : String(error)}`)
      console.error('詳細エラー:', error)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">PDF処理テスト</h1>

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">PDFファイルを選択</h2>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="block w-full text-sm border rounded-lg p-2"
        />
      </Card>

      {logs.length > 0 && (
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">処理ログ</h2>
          <div className="bg-gray-100 p-4 rounded font-mono text-sm space-y-1">
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </Card>
      )}

      {result && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">抽出結果</h2>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  )
}
