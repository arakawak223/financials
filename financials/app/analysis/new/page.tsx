'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PdfUpload } from '@/components/pdf-upload'
import { ArrowLeft, ArrowRight } from 'lucide-react'

type Step = 'company' | 'period' | 'upload' | 'review'

export default function NewAnalysisPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>('company')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')

  // フォームデータ
  const [companyName, setCompanyName] = useState('')
  const [industryId, setIndustryId] = useState('')
  const [fiscalYearStart, setFiscalYearStart] = useState(new Date().getFullYear() - 2)
  const [fiscalYearEnd, setFiscalYearEnd] = useState(new Date().getFullYear())
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{
      file: File
      fileType: 'financial_statement' | 'account_details'
      fiscalYear: number
      status: 'pending' | 'processing' | 'success' | 'error'
      error?: string
    }>
  >([])

  // 期待されるファイルリスト
  const expectedFiles = []
  for (let year = fiscalYearStart; year <= fiscalYearEnd; year++) {
    expectedFiles.push({
      fileType: 'financial_statement' as const,
      fiscalYear: year,
      label: `${year}年度 決算書（BS・PL）`,
    })
    expectedFiles.push({
      fileType: 'account_details' as const,
      fiscalYear: year,
      label: `${year}年度 勘定科目内訳書`,
    })
  }

  const handleNext = () => {
    const steps: Step[] = ['company', 'period', 'upload', 'review']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  const handleBack = () => {
    const steps: Step[] = ['company', 'period', 'upload', 'review']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  const handleSubmit = async () => {
    setIsProcessing(true)

    try {
      // 分析を作成
      setProcessingStatus('分析を作成中...')
      const createResponse = await fetch('/api/analysis/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          industryId: industryId || null,
          fiscalYearStart,
          fiscalYearEnd,
        }),
      })

      if (!createResponse.ok) {
        throw new Error('分析の作成に失敗しました')
      }

      const { analysisId } = await createResponse.json()

      // PDFファイルをアップロードして処理
      for (let i = 0; i < uploadedFiles.length; i++) {
        const fileInfo = uploadedFiles[i]
        console.log(`🔄 [${i + 1}/${uploadedFiles.length}] 処理開始: ${fileInfo.file.name}`)
        setProcessingStatus(`PDFを処理中... (${i + 1}/${uploadedFiles.length}): ${fileInfo.file.name}`)

        try {
          // 1. PDFをStorageにアップロード
          console.log(`📤 [${i + 1}/${uploadedFiles.length}] アップロード開始: ${fileInfo.file.name}`)
          const formData = new FormData()
          formData.append('file', fileInfo.file)
          formData.append('fileType', fileInfo.fileType)
          formData.append('fiscalYear', fileInfo.fiscalYear.toString())

          const uploadResponse = await fetch(`/api/analysis/${analysisId}/upload-pdf`, {
            method: 'POST',
            body: formData,
          })

          if (!uploadResponse.ok) {
            console.error(`❌ アップロード失敗: ${fileInfo.file.name}`, await uploadResponse.text())
            continue
          }
          console.log(`✅ アップロード成功: ${fileInfo.file.name}`)

          // 2. クライアントサイドでPDFからデータを抽出
          setProcessingStatus(`データを抽出中... (${i + 1}/${uploadedFiles.length}): ${fileInfo.file.name}`)
          console.log(`📖 [${i + 1}/${uploadedFiles.length}] PDF抽出開始: ${fileInfo.file.name}`)

          const { extractFinancialDataFromPdf } = await import('@/lib/utils/pdf-processor')
          console.log(`✅ pdf-processorモジュール読み込み成功`)

          const extractedData = await extractFinancialDataFromPdf(
            fileInfo.file,
            fileInfo.fileType,
            fileInfo.fiscalYear
          )
          console.log(`✅ extractFinancialDataFromPdf 実行完了:`, extractedData)

          if (extractedData.success) {
            console.log(`✅ データ抽出成功: ${fileInfo.file.name}`)
            console.log(`📊 BS項目数: ${Object.keys(extractedData.balanceSheet || {}).length}`)
            console.log(`📊 PL項目数: ${Object.keys(extractedData.profitLoss || {}).length}`)

            // 3. 抽出したデータをサーバーに送信して保存
            setProcessingStatus(`データを保存中... (${i + 1}/${uploadedFiles.length}): ${fileInfo.file.name}`)
            console.log(`💾 [${i + 1}/${uploadedFiles.length}] データ保存開始: ${fileInfo.file.name}`)

            const saveResponse = await fetch(`/api/analysis/${analysisId}/save-extracted-data`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fiscalYear: fileInfo.fiscalYear,
                extractedData,
              }),
            })

            if (!saveResponse.ok) {
              console.error(`❌ データ保存失敗: ${fileInfo.file.name}`, await saveResponse.text())
            } else {
              console.log(`✅ データ保存成功: ${fileInfo.file.name}`)
            }
          } else {
            console.error(`❌ データ抽出失敗: ${fileInfo.file.name}`)
            console.error(`エラー内容:`, extractedData.errors)
            console.error(`警告内容:`, extractedData.warnings)
            alert(`${fileInfo.file.name}からデータを抽出できませんでした。手動で入力してください。`)
          }
        } catch (extractError) {
          console.error(`❌❌❌ 致命的エラー発生: ${fileInfo.file.name}`)
          console.error(`エラータイプ:`, extractError instanceof Error ? extractError.name : typeof extractError)
          console.error(`エラーメッセージ:`, extractError instanceof Error ? extractError.message : String(extractError))
          console.error(`スタックトレース:`, extractError instanceof Error ? extractError.stack : 'N/A')
          console.error(`エラーオブジェクト全体:`, extractError)
          alert(`${fileInfo.file.name}の処理中にエラーが発生しました。手動で入力してください。\n\nエラー: ${extractError instanceof Error ? extractError.message : String(extractError)}`)
        }
      }

      // 分析を実行（財務指標を計算）
      setProcessingStatus('財務指標を計算中...')
      const executeResponse = await fetch('/api/analysis/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId }),
      })

      if (!executeResponse.ok) {
        throw new Error('分析の実行に失敗しました')
      }

      // 分析詳細ページに遷移（ハードリロードで最新データを取得）
      setProcessingStatus('完了！')
      window.location.href = `/analysis/${analysisId}`
    } catch (error) {
      console.error('Error creating analysis:', error)
      alert(error instanceof Error ? error.message : '分析の作成に失敗しました')
      setIsProcessing(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* ヘッダー */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          戻る
        </Button>
        <h1 className="text-3xl font-bold">新規財務分析</h1>
        <p className="text-gray-600 mt-2">
          企業の財務データを分析するための情報を入力してください
        </p>
      </div>

      {/* プログレスインジケーター */}
      <div className="mb-8">
        <div className="flex justify-between">
          {[
            { key: 'company', label: '企業情報' },
            { key: 'period', label: '対象期間' },
            { key: 'upload', label: 'ファイル' },
            { key: 'review', label: '確認' },
          ].map((step, index) => (
            <div key={step.key} className="flex-1 flex items-center">
              <div className="flex flex-col items-center w-full">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold
                    ${
                      currentStep === step.key
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 text-gray-600'
                    }
                  `}
                >
                  {index + 1}
                </div>
                <span className="text-sm mt-2">{step.label}</span>
              </div>
              {index < 3 && (
                <div className="flex-1 h-0.5 bg-gray-200 mx-2 mt-[-20px]" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ステップコンテンツ */}
      <Card className="p-6 mb-6">
        {/* ステップ1: 企業情報 */}
        {currentStep === 'company' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">企業情報</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="companyName">企業名 *</Label>
                <input
                  id="companyName"
                  type="text"
                  className="w-full border rounded-md px-3 py-2 mt-1"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="例: 株式会社サンプル"
                  required
                />
              </div>

              <div>
                <Label htmlFor="industry">業種</Label>
                <select
                  id="industry"
                  className="w-full border rounded-md px-3 py-2 mt-1"
                  value={industryId}
                  onChange={(e) => setIndustryId(e.target.value)}
                >
                  <option value="">選択してください</option>
                  <option value="mfg">製造業</option>
                  <option value="const">建設業</option>
                  <option value="whole">卸売業</option>
                  <option value="retail">小売業</option>
                  <option value="it">情報通信業</option>
                  <option value="trans">運輸業</option>
                  <option value="re">不動産業</option>
                  <option value="svc">サービス業</option>
                  <option value="other">その他</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ステップ2: 対象期間 */}
        {currentStep === 'period' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">対象期間</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="fiscalYearStart">開始年度 *</Label>
                <select
                  id="fiscalYearStart"
                  className="w-full border rounded-md px-3 py-2 mt-1"
                  value={fiscalYearStart}
                  onChange={(e) => setFiscalYearStart(parseInt(e.target.value))}
                >
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() - i
                    return (
                      <option key={year} value={year}>
                        {year}年度
                      </option>
                    )
                  })}
                </select>
              </div>

              <div>
                <Label htmlFor="fiscalYearEnd">終了年度 *</Label>
                <select
                  id="fiscalYearEnd"
                  className="w-full border rounded-md px-3 py-2 mt-1"
                  value={fiscalYearEnd}
                  onChange={(e) => setFiscalYearEnd(parseInt(e.target.value))}
                >
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() - i
                    return (
                      <option key={year} value={year}>
                        {year}年度
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-sm text-blue-800">
                  <strong>分析期間:</strong> {fiscalYearStart}年度 〜{' '}
                  {fiscalYearEnd}年度（
                  {fiscalYearEnd - fiscalYearStart + 1}期分）
                </p>
                <p className="text-sm text-blue-700 mt-2">
                  通常は直近3期分を選択します
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ステップ3: ファイルアップロード */}
        {currentStep === 'upload' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">PDFファイルアップロード</h2>

            <PdfUpload
              onFilesUploaded={setUploadedFiles}
              expectedFiles={expectedFiles}
            />
          </div>
        )}

        {/* ステップ4: 確認 */}
        {currentStep === 'review' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">内容確認</h2>

            <div className="space-y-4">
              <div className="border-b pb-3">
                <p className="text-sm text-gray-600">企業名</p>
                <p className="text-lg font-medium">{companyName || '未入力'}</p>
              </div>

              <div className="border-b pb-3">
                <p className="text-sm text-gray-600">業種</p>
                <p className="text-lg font-medium">
                  {industryId
                    ? {
                        mfg: '製造業',
                        const: '建設業',
                        whole: '卸売業',
                        retail: '小売業',
                        it: '情報通信業',
                        trans: '運輸業',
                        re: '不動産業',
                        svc: 'サービス業',
                        other: 'その他',
                      }[industryId]
                    : '未選択'}
                </p>
              </div>

              <div className="border-b pb-3">
                <p className="text-sm text-gray-600">対象期間</p>
                <p className="text-lg font-medium">
                  {fiscalYearStart}年度 〜 {fiscalYearEnd}年度
                </p>
              </div>

              <div className="border-b pb-3">
                <p className="text-sm text-gray-600">アップロードファイル</p>
                <p className="text-lg font-medium">
                  {uploadedFiles.length}ファイル / {expectedFiles.length}ファイル
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-sm text-yellow-800">
                「分析開始」をクリックすると、PDFの読み込みと分析が開始されます。
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* ナビゲーションボタン */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 'company'}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          戻る
        </Button>

        {currentStep !== 'review' ? (
          <Button
            onClick={handleNext}
            disabled={
              (currentStep === 'company' && !companyName) ||
              (currentStep === 'upload' && uploadedFiles.length === 0)
            }
          >
            次へ
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isProcessing}>
            {isProcessing ? '処理中...' : '分析開始'}
          </Button>
        )}
      </div>

      {/* 処理中モーダル */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-8 max-w-md w-full">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
              <h3 className="text-lg font-semibold">PDFを処理中...</h3>
              <p className="text-sm text-gray-600 text-center">{processingStatus}</p>
              <p className="text-xs text-gray-500 text-center">
                この処理には数分かかる場合があります。
                <br />
                ブラウザを閉じないでください。
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
