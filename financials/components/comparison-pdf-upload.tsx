'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface ComparisonPdfUploadProps {
  companyId: string
  companyName: string
  fiscalYear: number
  onSuccess: (data: { analysisId: string; periodId: string }) => void
  onError?: (error: string) => void
}

export function ComparisonPdfUpload({
  companyId,
  companyName,
  fiscalYear,
  onSuccess,
  onError,
}: ComparisonPdfUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [progress, setProgress] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setError(null)
      setSuccess(false)
      setProgress('')
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
      setProgress('PDFファイルをアップロード中...')
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('companyId', companyId)
      formData.append('fiscalYear', fiscalYear.toString())

      const uploadResponse = await fetch('/api/company-comparison/quick-upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || 'PDFのアップロードに失敗しました')
      }

      const { file: uploadedFile, analysisId, periodId } = await uploadResponse.json()
      setUploading(false)
      setProcessing(true)

      // Step 2: OCR処理
      setProgress('OCRでテキストを抽出中...')
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
      setProgress('AIで財務データを解析中...')
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
      setProgress('データベースに保存中...')
      const saveResponse = await fetch('/api/company-comparison/save-extracted-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId,
          periodId,
          fiscalYear,
          extractedData,
          fileId: uploadedFile.id,
        }),
      })

      if (!saveResponse.ok) {
        const saveError = await saveResponse.json()
        throw new Error(saveError.error || 'データの保存に失敗しました')
      }

      setSuccess(true)
      setProcessing(false)
      setProgress('完了しました！')

      // 成功を親コンポーネントに通知
      onSuccess({ analysisId, periodId })

      // リセット
      setTimeout(() => {
        setSelectedFile(null)
        setProgress('')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 2000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'エラーが発生しました'
      setError(errorMessage)
      setUploading(false)
      setProcessing(false)
      setProgress('')
      if (onError) {
        onError(errorMessage)
      }
    }
  }

  const isProcessing = uploading || processing

  return (
    <div className="space-y-3">
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileSelect}
          className="hidden"
          id={`comparison-pdf-upload-${companyId}`}
        />
        <label htmlFor={`comparison-pdf-upload-${companyId}`}>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-primary/50 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                {selectedFile ? (
                  <>
                    <p className="font-medium text-sm truncate">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-sm">決算書PDFを選択</p>
                    <p className="text-xs text-gray-500">
                      {companyName} / {fiscalYear}年度
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
        size="sm"
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
            処理中...
          </>
        )}
        {!isProcessing && (
          <>
            <Upload className="h-4 w-4 mr-2" />
            アップロードして処理
          </>
        )}
      </Button>

      {progress && !error && !success && (
        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
          {progress}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 p-2 rounded">
          <CheckCircle className="h-3 w-3 flex-shrink-0" />
          <span>{companyName}のデータインポートに成功しました</span>
        </div>
      )}
    </div>
  )
}
