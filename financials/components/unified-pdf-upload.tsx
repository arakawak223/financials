'use client'

import { useState, useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Edit,
  X,
  Save,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

export interface ExtractedFinancialData {
  // BS項目
  totalAssets?: number
  totalLiabilities?: number
  netAssets?: number
  currentAssets?: number
  fixedAssets?: number
  currentLiabilities?: number
  longTermLiabilities?: number

  // PL項目
  netSales?: number
  costOfSales?: number
  grossProfit?: number
  sellingGeneralAdminExpenses?: number
  operatingIncome?: number
  nonOperatingIncome?: number
  nonOperatingExpenses?: number
  ordinaryIncome?: number
  extraordinaryIncome?: number
  extraordinaryLosses?: number
  incomeBeforeTax?: number
  incomeTaxes?: number
  netIncome?: number

  // その他
  [key: string]: any
}

export interface UnifiedPdfUploadProps {
  // 基本設定
  title?: string
  description?: string

  // アップロード設定
  companyId?: string
  companyName?: string
  fiscalYear?: number
  dataType?: 'budget' | 'actual' | 'financial_statement' | 'comparison'

  // コールバック
  onSuccess?: (data: {
    extractedData: ExtractedFinancialData
    fileId?: string
    analysisId?: string
    periodId?: string
  }) => void
  onError?: (error: string) => void

  // カスタムAPI URL（オプション）
  uploadApiUrl?: string
  extractApiUrl?: string
  saveApiUrl?: string

  // 編集可否
  allowEdit?: boolean
}

export function UnifiedPdfUpload({
  title = 'PDFファイルをアップロード',
  description = '決算書PDFを選択してください',
  companyId,
  companyName,
  fiscalYear = new Date().getFullYear(),
  dataType = 'financial_statement',
  onSuccess,
  onError,
  uploadApiUrl,
  extractApiUrl = '/api/extract-financial-data',
  saveApiUrl,
  allowEdit = true,
}: UnifiedPdfUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [progress, setProgress] = useState<string>('')
  const [extractedData, setExtractedData] = useState<ExtractedFinancialData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<ExtractedFinancialData>({})
  const [showDetails, setShowDetails] = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0])
      setError(null)
      setSuccess(false)
      setProgress('')
      setExtractedData(null)
      setIsEditing(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: false,
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setError(null)
      setSuccess(false)
      setProgress('')
      setExtractedData(null)
      setIsEditing(false)
    }
  }

  const handleUploadAndExtract = async () => {
    if (!selectedFile) return

    setUploading(true)
    setProcessing(false)
    setExtracting(false)
    setError(null)
    setSuccess(false)

    try {
      // Step 1: PDFをアップロード（オプション）
      let uploadResult: any = {}
      if (uploadApiUrl) {
        setProgress('PDFファイルをアップロード中...')
        const formData = new FormData()
        formData.append('file', selectedFile)
        if (companyId) formData.append('companyId', companyId)
        if (fiscalYear) formData.append('fiscalYear', fiscalYear.toString())
        if (dataType) formData.append('dataType', dataType)

        const uploadResponse = await fetch(uploadApiUrl, {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({}))
          throw new Error(errorData.error || 'PDFのアップロードに失敗しました')
        }

        uploadResult = await uploadResponse.json()
      }

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

      setProcessing(false)
      setExtracting(true)

      // Step 3: AI財務データ抽出
      setProgress('AIで財務データを解析中...')
      const extractResponse = await fetch(extractApiUrl, {
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

      const extracted = await extractResponse.json()
      setExtractedData(extracted)
      setEditedData(extracted)

      setExtracting(false)

      // Step 4: データベースに保存（オプション）
      if (saveApiUrl) {
        setProgress('データベースに保存中...')
        const saveResponse = await fetch(saveApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId,
            fiscalYear,
            dataType,
            extractedData: extracted,
            fileId: uploadResult.file?.id,
            analysisId: uploadResult.analysisId,
            periodId: uploadResult.periodId,
          }),
        })

        if (!saveResponse.ok) {
          const saveError = await saveResponse.json().catch(() => ({}))
          throw new Error(saveError.error || 'データの保存に失敗しました')
        }
      }

      setSuccess(true)
      setProgress('完了しました！')

      // 成功を親コンポーネントに通知
      if (onSuccess) {
        onSuccess({
          extractedData: extracted,
          fileId: uploadResult.file?.id,
          analysisId: uploadResult.analysisId,
          periodId: uploadResult.periodId,
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'エラーが発生しました'
      setError(errorMessage)
      setUploading(false)
      setProcessing(false)
      setExtracting(false)
      setProgress('')
      if (onError) {
        onError(errorMessage)
      }
    }
  }

  const handleSaveEdit = () => {
    setExtractedData(editedData)
    setIsEditing(false)

    // 編集後のデータを通知
    if (onSuccess) {
      onSuccess({
        extractedData: editedData,
      })
    }
  }

  const handleEditChange = (field: string, value: string) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value === '' ? undefined : parseFloat(value) || 0,
    }))
  }

  const isProcessing = uploading || processing || extracting

  // 表示用のデータフィールド定義
  const dataFields = [
    { key: 'netSales', label: '売上高', category: 'PL' },
    { key: 'costOfSales', label: '売上原価', category: 'PL' },
    { key: 'grossProfit', label: '売上総利益', category: 'PL' },
    { key: 'sellingGeneralAdminExpenses', label: '販売費及び一般管理費', category: 'PL' },
    { key: 'operatingIncome', label: '営業利益', category: 'PL' },
    { key: 'ordinaryIncome', label: '経常利益', category: 'PL' },
    { key: 'netIncome', label: '当期純利益', category: 'PL' },
    { key: 'totalAssets', label: '総資産', category: 'BS' },
    { key: 'totalLiabilities', label: '負債合計', category: 'BS' },
    { key: 'netAssets', label: '純資産', category: 'BS' },
  ]

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>

      <div className="space-y-4">
        {/* ファイル選択エリア */}
        {!selectedFile && (
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'}
            `}
          >
            <input {...getInputProps()} />
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            {isDragActive ? (
              <p className="text-sm font-medium">ここにファイルをドロップ</p>
            ) : (
              <>
                <p className="text-sm font-medium mb-1">PDFファイルをドラッグ&ドロップ</p>
                <p className="text-xs text-gray-500">または、クリックしてファイルを選択</p>
              </>
            )}
          </div>
        )}

        {/* 選択済みファイル表示 */}
        {selectedFile && !extractedData && (
          <div className="border-2 border-gray-300 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-gray-400" />
                <div>
                  <p className="font-medium text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
                disabled={isProcessing}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* アップロード＆抽出ボタン */}
        {selectedFile && !extractedData && (
          <Button
            onClick={handleUploadAndExtract}
            disabled={isProcessing}
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
                OCR処理中...
              </>
            )}
            {extracting && (
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
        )}

        {/* 進捗表示 */}
        {progress && !error && (
          <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded">
            {progress}
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 成功表示 */}
        {success && !isEditing && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            <span>データの抽出に成功しました</span>
          </div>
        )}

        {/* 抽出データのプレビュー */}
        {extractedData && !isEditing && (
          <div className="border rounded-lg overflow-hidden">
            <div
              className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
              onClick={() => setShowDetails(!showDetails)}
            >
              <h4 className="font-semibold text-sm">抽出データ</h4>
              <div className="flex items-center gap-2">
                {allowEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsEditing(true)
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    編集
                  </Button>
                )}
                {showDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </div>

            {showDetails && (
              <div className="p-4 space-y-3">
                {dataFields.map(({ key, label, category }) => {
                  const value = extractedData[key]
                  if (value === undefined || value === null) return null
                  return (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        <span className="text-xs text-gray-400 mr-2">[{category}]</span>
                        {label}
                      </span>
                      <span className="font-medium">
                        {typeof value === 'number'
                          ? value.toLocaleString('ja-JP')
                          : value}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* 編集フォーム */}
        {extractedData && isEditing && (
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">データ編集</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false)
                    setEditedData(extractedData)
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                >
                  <Save className="h-4 w-4 mr-1" />
                  保存
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dataFields.map(({ key, label, category }) => (
                <div key={key}>
                  <Label htmlFor={`edit-${key}`} className="text-xs">
                    <span className="text-gray-400 mr-1">[{category}]</span>
                    {label}
                  </Label>
                  <Input
                    id={`edit-${key}`}
                    type="number"
                    value={editedData[key] ?? ''}
                    onChange={(e) => handleEditChange(key, e.target.value)}
                    placeholder="0"
                    className="text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
