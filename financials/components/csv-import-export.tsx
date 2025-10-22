'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react'

interface CSVImportExportProps {
  analysisId: string
  onImportSuccess?: () => void
}

export default function CSVImportExport({ analysisId, onImportSuccess }: CSVImportExportProps) {
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    success: boolean
    message: string
    details?: string[]
  } | null>(null)

  // CSVテンプレートをダウンロード
  const handleDownloadTemplate = async () => {
    try {
      setExporting(true)
      const response = await fetch(`/api/analysis/${analysisId}/export-csv?template=true`)

      if (!response.ok) {
        throw new Error('テンプレートのダウンロードに失敗しました')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = '財務データテンプレート.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Template download error:', error)
      alert('テンプレートのダウンロードに失敗しました')
    } finally {
      setExporting(false)
    }
  }

  // 現在のデータをエクスポート
  const handleExportData = async () => {
    try {
      setExporting(true)
      const response = await fetch(`/api/analysis/${analysisId}/export-csv`)

      if (!response.ok) {
        throw new Error('データのエクスポートに失敗しました')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      // ファイル名をContent-Dispositionヘッダーから取得
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = '財務データ.csv'
      if (contentDisposition) {
        const matches = /filename\*?=['"]?([^'";\n]+)['"]?/i.exec(contentDisposition)
        if (matches && matches[1]) {
          filename = decodeURIComponent(matches[1])
        }
      }

      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert('データのエクスポートに失敗しました')
    } finally {
      setExporting(false)
    }
  }

  // CSVファイルをインポート
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportResult(null)

    try {
      // ファイルを読み込む
      const text = await file.text()

      // APIに送信
      const response = await fetch(`/api/analysis/${analysisId}/import-csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csvText: text }),
      })

      const result = await response.json()

      if (response.ok) {
        setImportResult({
          success: true,
          message: result.message || 'インポートが完了しました',
        })
        if (onImportSuccess) {
          onImportSuccess()
        }
      } else {
        setImportResult({
          success: false,
          message: result.error || 'インポートに失敗しました',
          details: result.details,
        })
      }
    } catch (error) {
      console.error('Import error:', error)
      setImportResult({
        success: false,
        message: 'ファイルの読み込みに失敗しました',
      })
    } finally {
      setImporting(false)
      // ファイル入力をリセット
      event.target.value = ''
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            CSV インポート・エクスポート
          </h3>
          <p className="text-sm text-gray-600">
            複数年度の財務データをCSVファイルで一括登録・ダウンロードできます
          </p>
        </div>

        {/* エクスポートセクション */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">エクスポート</Label>
          <div className="flex gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              disabled={exporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'ダウンロード中...' : 'テンプレートをダウンロード'}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportData}
              disabled={exporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'エクスポート中...' : '現在のデータをエクスポート'}
            </Button>
          </div>
          <p className="text-sm text-gray-500">
            テンプレート: 空のCSVファイルをダウンロード<br />
            エクスポート: 現在登録されているデータをCSV形式でダウンロード
          </p>
        </div>

        {/* インポートセクション */}
        <div className="space-y-3">
          <Label htmlFor="csv-file" className="text-base font-semibold">
            インポート
          </Label>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={importing}
                className="hidden"
              />
              <Button
                variant="default"
                onClick={() => document.getElementById('csv-file')?.click()}
                disabled={importing}
              >
                <Upload className="h-4 w-4 mr-2" />
                {importing ? 'インポート中...' : 'CSVファイルを選択'}
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              CSVファイルを選択してアップロードします。既存のデータは上書きされます。
            </p>
          </div>
        </div>

        {/* インポート結果 */}
        {importResult && (
          <div
            className={`p-4 rounded-md ${
              importResult.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {importResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <p
                  className={`font-semibold ${
                    importResult.success ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {importResult.message}
                </p>
                {importResult.details && importResult.details.length > 0 && (
                  <ul className="mt-2 text-sm space-y-1">
                    {importResult.details.map((detail, index) => (
                      <li key={index} className="text-red-700">
                        • {detail}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 使い方ガイド */}
        <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">💡 使い方</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>「テンプレートをダウンロード」でCSVファイルを取得</li>
            <li>Excelなどで開いて財務データを入力</li>
            <li>CSV形式で保存</li>
            <li>「CSVファイルを選択」でアップロード</li>
          </ol>
          <p className="text-sm text-blue-700 mt-3">
            <strong>注意:</strong> 年度（必須）列は必ず入力してください。
            数値にカンマが含まれていても自動で処理されます。
          </p>
        </div>
      </div>
    </Card>
  )
}
