'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface BudgetPdfUploadProps {
  companyId: string
  periodId: string
  fiscalYear: number
  dataType: 'budget' | 'actual'
  onSuccess: () => void
}

export function BudgetPdfUpload({
  companyId,
  periodId,
  fiscalYear,
  dataType,
  onSuccess,
}: BudgetPdfUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setError(null)
      setSuccess(false)
    }
  }

  const handleUploadAndProcess = async () => {
    if (!selectedFile) return

    setUploading(true)
    setProcessing(false)
    setError(null)
    setSuccess(false)

    try {
      // Step 1: PDFをアップロード
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('companyId', companyId)
      formData.append('periodId', periodId)
      formData.append('fiscalYear', fiscalYear.toString())
      formData.append('dataType', dataType)

      const uploadResponse = await fetch('/api/budget-vs-actual/upload-pdf', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('PDFのアップロードに失敗しました')
      }

      const { file: uploadedFile, fileUrl } = await uploadResponse.json()
      setUploading(false)
      setProcessing(true)

      // Step 2: OCR処理
      const fileBytes = await selectedFile.arrayBuffer()
      const ocrResponse = await fetch('/api/ocr/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: Array.from(new Uint8Array(fileBytes)),
          fileName: selectedFile.name,
        }),
      })

      if (!ocrResponse.ok) {
        throw new Error('OCR処理に失敗しました')
      }

      const ocrResult = await ocrResponse.json()

      // Step 3: AI財務データ抽出
      const extractResponse = await fetch('/api/extract-financial-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ocrText: ocrResult.text,
          fileName: selectedFile.name,
        }),
      })

      if (!extractResponse.ok) {
        throw new Error('データ抽出に失敗しました')
      }

      const extractedData = await extractResponse.json()

      // Step 4: データベースに保存
      const saveResponse = await fetch('/api/budget-vs-actual/save-extracted-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          periodId,
          fiscalYear,
          dataType,
          extractedData,
          fileId: uploadedFile.id,
        }),
      })

      if (!saveResponse.ok) {
        throw new Error('データの保存に失敗しました')
      }

      setSuccess(true)
      setProcessing(false)

      // 成功後、少し待ってから親コンポーネントに通知
      setTimeout(() => {
        onSuccess()
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      setUploading(false)
      setProcessing(false)
    }
  }

  const isProcessing = uploading || processing
  const label = dataType === 'budget' ? '予算書' : '実績（決算書）'

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">{label}PDFをアップロード</h3>

      <div className="space-y-4">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
            id={`pdf-upload-${dataType}`}
          />
          <label htmlFor={`pdf-upload-${dataType}`}>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-primary/50 cursor-pointer transition-colors">
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-gray-400" />
                <div className="text-center">
                  {selectedFile ? (
                    <>
                      <p className="font-medium text-sm">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-sm">クリックしてPDFを選択</p>
                      <p className="text-xs text-gray-500">
                        {label}のPDFファイルを選択してください
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </label>
        </div>

        <Button
          onClick={handleUploadAndProcess}
          disabled={!selectedFile || isProcessing}
          className="w-full"
        >
          {uploading && (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              アップロード中...
            </>
          )}
          {processing && (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              データ抽出中...
            </>
          )}
          {!isProcessing && (
            <>
              <Upload className="h-4 w-4 mr-2" />
              アップロードして処理
            </>
          )}
        </Button>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded">
            <CheckCircle className="h-4 w-4" />
            {label}データのインポートに成功しました
          </div>
        )}

        {isProcessing && (
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
            <p className="font-medium mb-1">処理中...</p>
            <ul className="text-xs space-y-1 ml-4">
              {uploading && <li>• PDFファイルをアップロード中</li>}
              {processing && (
                <>
                  <li>• OCRでテキストを抽出中</li>
                  <li>• AIで財務データを解析中</li>
                  <li>• データベースに保存中</li>
                </>
              )}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}
