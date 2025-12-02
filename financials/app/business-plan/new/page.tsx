'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Calculator,
  Upload,
  FileText,
  Settings,
  BarChart3,
  Loader2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'
import type { HistoricalFinancialData, PlanResultPL, PlanResultBS, PlanResultCF } from '@/lib/types/business-plan'
import { UnifiedPdfUpload, type ExtractedFinancialData } from '@/components/unified-pdf-upload'

type Company = Database['public']['Tables']['companies']['Row']

// ウィザードステップの定義
type WizardStep = 'basic' | 'historical' | 'parameters' | 'results'

interface PlanFormData {
  companyId: string
  planName: string
  description: string
  planStartYear: number
  planYears: number
  scenarioType: 'optimistic' | 'standard' | 'pessimistic'
}

// 売上カテゴリー設定
interface SalesCategory {
  id: string
  name: string
  baseYearAmount: number
}

// カテゴリー別売上成長率
interface CategoryGrowthRate {
  fiscalYear: number
  categoryId: string
  growthRate: number
}

interface ParameterSettings {
  // 基本パラメータ
  corporateTaxRate: number
  accountsReceivableMonths: number
  inventoryMonths: number
  accountsPayableMonths: number

  // 売上成長率（年度別）
  salesGrowthRates: { fiscalYear: number; growthRate: number }[]

  // カテゴリー別売上成長率
  useCategoryGrowth: boolean
  salesCategories: SalesCategory[]
  categoryGrowthRates: CategoryGrowthRate[]

  // 原価率
  costRate: number

  // 人件費設定
  wageGrowthRate: number
  hiringRate: number
  turnoverRate: number
  executiveCompensationGrowthRate: number

  // 販管費増減率
  sgaExpenseGrowthRate: number

  // 営業外損益増減率
  nonOperatingGrowthRate: number

  // 設備投資（年度別）
  capexSettings: { fiscalYear: number; growthInvestment: number; maintenanceInvestment: number }[]

  // 償却設定
  newAssetUsefulLife: number
  existingRemainingYears: number

  // 有利子負債
  repaymentYears: number
  interestRate: number
}

export default function NewBusinessPlanPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic')
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [planId, setPlanId] = useState<string | null>(null)

  // 基本情報
  const [formData, setFormData] = useState<PlanFormData>({
    companyId: '',
    planName: '',
    description: '',
    planStartYear: new Date().getFullYear() + 1,
    planYears: 5,
    scenarioType: 'standard',
  })

  // 過去データ（3期分）
  const [historicalData, setHistoricalData] = useState<HistoricalFinancialData[]>([])
  const [expandedPeriods, setExpandedPeriods] = useState<number[]>([0, 1, 2])

  // パラメータ設定
  const [parameters, setParameters] = useState<ParameterSettings>({
    corporateTaxRate: 30,
    accountsReceivableMonths: 2,
    inventoryMonths: 1.5,
    accountsPayableMonths: 1.5,
    salesGrowthRates: [],
    useCategoryGrowth: false,
    salesCategories: [],
    categoryGrowthRates: [],
    costRate: 70,
    wageGrowthRate: 2,
    hiringRate: 5,
    turnoverRate: 3,
    executiveCompensationGrowthRate: 0,
    sgaExpenseGrowthRate: 2,
    nonOperatingGrowthRate: 0,
    capexSettings: [],
    newAssetUsefulLife: 10,
    existingRemainingYears: 5,
    repaymentYears: 10,
    interestRate: 2,
  })

  // 3期間一括アップロード用のstate
  const [bulkUploadFiles, setBulkUploadFiles] = useState<File[]>([])
  const [bulkUploading, setBulkUploading] = useState(false)

  // 計算結果
  const [plResults, setPlResults] = useState<PlanResultPL[]>([])
  const [bsResults, setBsResults] = useState<PlanResultBS[]>([])
  const [cfResults, setCfResults] = useState<PlanResultCF[]>([])

  useEffect(() => {
    loadCompanies()
  }, [])

  // 計画年度が変更されたらパラメータを初期化
  useEffect(() => {
    const years = Array.from(
      { length: formData.planYears },
      (_, i) => formData.planStartYear + i
    )

    setParameters((prev) => ({
      ...prev,
      salesGrowthRates: years.map((year) => ({
        fiscalYear: year,
        growthRate: 3, // デフォルト3%
      })),
      capexSettings: years.map((year) => ({
        fiscalYear: year,
        growthInvestment: 0,
        maintenanceInvestment: 0,
      })),
    }))
  }, [formData.planStartYear, formData.planYears])

  const loadCompanies = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name')

      if (error) {
        console.error('Supabase error:', error.message, error.code, error.details)
        throw error
      }
      setCompanies(data || [])
    } catch (error: any) {
      console.error('企業データ読み込みエラー:', error?.message || error)
    }
  }

  const handleFormChange = (field: keyof PlanFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleParameterChange = (field: keyof ParameterSettings, value: any) => {
    setParameters((prev) => ({ ...prev, [field]: value }))
  }

  // カテゴリー追加
  const addSalesCategory = () => {
    const newCategory: SalesCategory = {
      id: `cat-${Date.now()}`,
      name: '',
      baseYearAmount: 0,
    }
    setParameters((prev) => ({
      ...prev,
      salesCategories: [...prev.salesCategories, newCategory],
    }))
  }

  // カテゴリー削除
  const removeSalesCategory = (categoryId: string) => {
    setParameters((prev) => ({
      ...prev,
      salesCategories: prev.salesCategories.filter((c) => c.id !== categoryId),
      categoryGrowthRates: prev.categoryGrowthRates.filter((r) => r.categoryId !== categoryId),
    }))
  }

  // カテゴリー更新
  const updateSalesCategory = (categoryId: string, field: keyof SalesCategory, value: any) => {
    setParameters((prev) => ({
      ...prev,
      salesCategories: prev.salesCategories.map((c) =>
        c.id === categoryId ? { ...c, [field]: value } : c
      ),
    }))
  }

  // カテゴリー別成長率の更新
  const updateCategoryGrowthRate = (fiscalYear: number, categoryId: string, growthRate: number) => {
    setParameters((prev) => {
      const existingIndex = prev.categoryGrowthRates.findIndex(
        (r) => r.fiscalYear === fiscalYear && r.categoryId === categoryId
      )
      if (existingIndex >= 0) {
        const newRates = [...prev.categoryGrowthRates]
        newRates[existingIndex].growthRate = growthRate
        return { ...prev, categoryGrowthRates: newRates }
      } else {
        return {
          ...prev,
          categoryGrowthRates: [...prev.categoryGrowthRates, { fiscalYear, categoryId, growthRate }],
        }
      }
    })
  }

  // 3期間一括アップロード処理
  const handleBulkUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files).slice(0, 3)
    setBulkUploadFiles(fileArray)
    setBulkUploading(true)

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]
        const fiscalYear = formData.planStartYear - 1 - i

        // OCR処理
        const fileBytes = await file.arrayBuffer()
        const ocrResponse = await fetch('/api/ocr/vision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: Array.from(new Uint8Array(fileBytes)),
            fileName: file.name,
          }),
        })

        if (!ocrResponse.ok) {
          throw new Error(`OCR処理に失敗しました: ${file.name}`)
        }

        const ocrResult = await ocrResponse.json()

        // AI財務データ抽出
        const extractResponse = await fetch('/api/extract-financial-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ocrText: ocrResult.text,
            fileName: file.name,
          }),
        })

        if (!extractResponse.ok) {
          throw new Error(`データ抽出に失敗しました: ${file.name}`)
        }

        const extracted = await extractResponse.json()
        handleHistoricalDataExtracted(i, extracted)
      }
    } catch (error) {
      console.error('Bulk upload error:', error)
      alert('一括アップロードに失敗しました')
    } finally {
      setBulkUploading(false)
    }
  }

  // PDFからデータ抽出時のコールバック
  const handleHistoricalDataExtracted = (periodIndex: number, data: ExtractedFinancialData) => {
    setHistoricalData((prev) => {
      const newData = [...prev]
      const fiscalYear = formData.planStartYear - 1 - periodIndex // 直近から順に

      newData[periodIndex] = {
        fiscalYear,
        netSales: data.netSales,
        costOfSales: data.costOfSales,
        grossProfit: data.grossProfit,
        personnelExpenses: data.personnelExpenses || 0,
        executiveCompensation: data.executiveCompensation || 0,
        depreciation: data.depreciation || 0,
        sellingGeneralAdminExpenses: data.sellingGeneralAdminExpenses,
        operatingIncome: data.operatingIncome,
        nonOperatingIncome: data.nonOperatingIncome,
        nonOperatingExpenses: data.nonOperatingExpenses,
        ordinaryIncome: data.ordinaryIncome,
        extraordinaryIncome: data.extraordinaryIncome,
        extraordinaryLosses: data.extraordinaryLosses,
        incomeBeforeTax: data.incomeBeforeTax,
        incomeTaxes: data.incomeTaxes,
        netIncome: data.netIncome,
        cashAndDeposits: data.cashAndDeposits || 0,
        accountsReceivable: data.accountsReceivable || 0,
        inventory: data.inventory || 0,
        currentAssetsTotal: data.currentAssets || 0,
        tangibleFixedAssets: data.tangibleFixedAssets || 0,
        intangibleFixedAssets: data.intangibleFixedAssets || 0,
        investmentsAndOtherAssets: data.investmentsAndOtherAssets || 0,
        fixedAssetsTotal: data.fixedAssets || 0,
        totalAssets: data.totalAssets || 0,
        accountsPayable: data.accountsPayable || 0,
        shortTermBorrowings: data.shortTermBorrowings || 0,
        longTermBorrowings: data.longTermBorrowings || 0,
        totalLiabilities: data.totalLiabilities || 0,
        capitalStock: data.capitalStock || 0,
        retainedEarnings: data.retainedEarnings || 0,
        totalNetAssets: data.netAssets || 0,
      }

      return newData
    })
  }

  // 事業計画を作成
  const createPlan = async () => {
    if (!formData.companyId || !formData.planName) {
      alert('企業と計画名を入力してください')
      return null
    }

    setLoading(true)
    try {
      const response = await fetch('/api/business-plan/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: formData.companyId,
          planName: formData.planName,
          description: formData.description,
          planStartYear: formData.planStartYear,
          planYears: formData.planYears,
          scenarioType: formData.scenarioType,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || '計画の作成に失敗しました')
      }

      setPlanId(result.plan.id)
      return result.plan.id
    } catch (error) {
      console.error('Plan creation error:', error)
      alert('計画の作成に失敗しました')
      return null
    } finally {
      setLoading(false)
    }
  }

  // パラメータを保存
  const saveParameters = async (currentPlanId: string) => {
    try {
      // 基本パラメータ
      await fetch('/api/business-plan/save-parameters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: currentPlanId,
          parameterType: 'general',
          data: {
            corporateTaxRate: parameters.corporateTaxRate,
            accountsReceivableMonths: parameters.accountsReceivableMonths,
            inventoryMonths: parameters.inventoryMonths,
            accountsPayableMonths: parameters.accountsPayableMonths,
          },
        }),
      })

      // 売上成長率
      await fetch('/api/business-plan/save-parameters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: currentPlanId,
          parameterType: 'salesGrowthRates',
          data: parameters.salesGrowthRates.map((r) => ({
            fiscalYear: r.fiscalYear,
            growthRate: r.growthRate,
          })),
        }),
      })

      // 原価率
      await fetch('/api/business-plan/save-parameters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: currentPlanId,
          parameterType: 'costSettings',
          data: parameters.salesGrowthRates.map((r) => ({
            fiscalYear: r.fiscalYear,
            costRate: parameters.costRate,
          })),
        }),
      })

      // 人件費設定
      await fetch('/api/business-plan/save-parameters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: currentPlanId,
          parameterType: 'personnelSettings',
          data: parameters.salesGrowthRates.map((r) => ({
            fiscalYear: r.fiscalYear,
            wageGrowthRate: parameters.wageGrowthRate,
            hiringRate: parameters.hiringRate,
            turnoverRate: parameters.turnoverRate,
            executiveCompensationGrowthRate: parameters.executiveCompensationGrowthRate,
          })),
        }),
      })

      // 設備投資
      await fetch('/api/business-plan/save-parameters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: currentPlanId,
          parameterType: 'capexSettings',
          data: parameters.capexSettings,
        }),
      })

      // 償却設定
      await fetch('/api/business-plan/save-parameters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: currentPlanId,
          parameterType: 'depreciationSettings',
          data: [
            {
              assetCategory: 'tangible',
              newAssetUsefulLife: parameters.newAssetUsefulLife,
              existingRemainingYears: parameters.existingRemainingYears,
            },
          ],
        }),
      })

      // 有利子負債設定
      await fetch('/api/business-plan/save-parameters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: currentPlanId,
          parameterType: 'debtSettings',
          data: [
            {
              debtType: 'long_term_loan',
              existingBalance: historicalData[0]?.longTermBorrowings || 0,
              existingInterestRate: parameters.interestRate,
              repaymentYears: parameters.repaymentYears,
            },
          ],
        }),
      })

      return true
    } catch (error) {
      console.error('Save parameters error:', error)
      return false
    }
  }

  // 計算を実行
  const calculatePlan = async () => {
    let currentPlanId = planId

    if (!currentPlanId) {
      currentPlanId = await createPlan()
      if (!currentPlanId) return
    }

    setCalculating(true)
    try {
      // パラメータを保存
      await saveParameters(currentPlanId)

      // 計算を実行
      const response = await fetch('/api/business-plan/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: currentPlanId,
          historicalData,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || '計算に失敗しました')
      }

      setPlResults(result.results.plResults)
      setBsResults(result.results.bsResults)
      setCfResults(result.results.cfResults)
      setCurrentStep('results')
    } catch (error) {
      console.error('Calculate error:', error)
      alert('計算に失敗しました')
    } finally {
      setCalculating(false)
    }
  }

  // ステップナビゲーション
  const goToNextStep = () => {
    const steps: WizardStep[] = ['basic', 'historical', 'parameters', 'results']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  const goToPrevStep = () => {
    const steps: WizardStep[] = ['basic', 'historical', 'parameters', 'results']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  // 金額フォーマット
  const formatAmount = (value: number | undefined) => {
    if (value === undefined || value === null) return '-'
    return value.toLocaleString('ja-JP')
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* ヘッダー */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto py-6 px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">事業計画策定</h1>
              <p className="text-sm text-gray-600 mt-1">
                過去の決算データを基に将来の財務計画を策定します
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ステップインジケーター */}
      <div className="bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto py-4 px-6">
          <div className="flex items-center justify-between">
            {[
              { key: 'basic', label: '基本情報', icon: FileText },
              { key: 'historical', label: '過去データ読込', icon: Upload },
              { key: 'parameters', label: 'パラメータ設定', icon: Settings },
              { key: 'results', label: '計画結果', icon: BarChart3 },
            ].map((step, index) => (
              <div
                key={step.key}
                className={`flex items-center ${index < 3 ? 'flex-1' : ''}`}
              >
                <button
                  onClick={() => setCurrentStep(step.key as WizardStep)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentStep === step.key
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <step.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{step.label}</span>
                </button>
                {index < 3 && (
                  <div className="flex-1 h-px bg-gray-300 mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto py-8 px-6">
          {/* Step 1: 基本情報 */}
          {currentStep === 'basic' && (
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">基本情報</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company">対象企業</Label>
                    <Select
                      value={formData.companyId}
                      onValueChange={(value) => handleFormChange('companyId', value)}
                    >
                      <SelectTrigger id="company">
                        <SelectValue placeholder="企業を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="planName">計画名</Label>
                    <Input
                      id="planName"
                      value={formData.planName}
                      onChange={(e) => handleFormChange('planName', e.target.value)}
                      placeholder="例：2025年度 中期経営計画"
                    />
                  </div>
                  <div>
                    <Label htmlFor="planStartYear">計画開始年度</Label>
                    <Input
                      id="planStartYear"
                      type="number"
                      value={formData.planStartYear}
                      onChange={(e) =>
                        handleFormChange('planStartYear', parseInt(e.target.value))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="planYears">計画期間（年）</Label>
                    <Select
                      value={formData.planYears.toString()}
                      onValueChange={(value) =>
                        handleFormChange('planYears', parseInt(value))
                      }
                    >
                      <SelectTrigger id="planYears">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3年</SelectItem>
                        <SelectItem value="5">5年</SelectItem>
                        <SelectItem value="7">7年</SelectItem>
                        <SelectItem value="10">10年</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="scenarioType">シナリオ</Label>
                    <Select
                      value={formData.scenarioType}
                      onValueChange={(value: any) =>
                        handleFormChange('scenarioType', value)
                      }
                    >
                      <SelectTrigger id="scenarioType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="optimistic">楽観シナリオ</SelectItem>
                        <SelectItem value="standard">標準シナリオ</SelectItem>
                        <SelectItem value="pessimistic">悲観シナリオ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="description">説明</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleFormChange('description', e.target.value)}
                      placeholder="計画の概要や前提条件など"
                      rows={3}
                    />
                  </div>
                </div>
              </Card>

              <div className="flex justify-end">
                <Button onClick={goToNextStep} disabled={!formData.companyId || !formData.planName}>
                  次へ: 過去データ読込
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: 過去データ読込 */}
          {currentStep === 'historical' && (
            <div className="space-y-6">
              {/* 一括アップロード機能 */}
              <Card className="p-6 border-2 border-primary/20 bg-primary/5">
                <h2 className="text-xl font-semibold mb-4">3期間分一括読込</h2>
                <p className="text-sm text-gray-600 mb-4">
                  過去3期間の決算書PDFを一括でアップロードできます。
                  ファイル名の順番で直近期、2期前、3期前として処理されます。
                </p>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={(e) => handleBulkUpload(e.target.files)}
                    className="hidden"
                    id="bulk-upload"
                    disabled={bulkUploading}
                  />
                  <label
                    htmlFor="bulk-upload"
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                      bulkUploading
                        ? 'bg-gray-300 text-gray-500'
                        : 'bg-primary text-white hover:bg-primary/90'
                    }`}
                  >
                    {bulkUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        処理中...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        3期分のPDFを選択
                      </>
                    )}
                  </label>
                  {bulkUploadFiles.length > 0 && (
                    <div className="text-sm text-gray-600">
                      {bulkUploadFiles.map((f, i) => (
                        <span key={i} className="mr-2">
                          {i + 1}. {f.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">過去3期間の決算データ</h2>
                <p className="text-sm text-gray-600 mb-6">
                  上記の一括読込、または下記から個別にアップロードしてください。
                  データはAIが自動で抽出します。
                </p>

                <div className="space-y-4">
                  {[0, 1, 2].map((periodIndex) => {
                    const fiscalYear = formData.planStartYear - 1 - periodIndex
                    const isExpanded = expandedPeriods.includes(periodIndex)
                    const hasData = historicalData[periodIndex]?.netSales !== undefined

                    return (
                      <div key={periodIndex} className="border rounded-lg">
                        <button
                          onClick={() => {
                            setExpandedPeriods((prev) =>
                              isExpanded
                                ? prev.filter((i) => i !== periodIndex)
                                : [...prev, periodIndex]
                            )
                          }}
                          className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">
                              {fiscalYear}年度（{periodIndex === 0 ? '直近期' : `${periodIndex + 1}期前`}）
                            </span>
                            {hasData && (
                              <span className="flex items-center gap-1 text-green-600 text-sm">
                                <CheckCircle className="h-4 w-4" />
                                データ取得済み
                              </span>
                            )}
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="p-4 border-t">
                            <UnifiedPdfUpload
                              title={`${fiscalYear}年度 決算書`}
                              description="PDFファイルをアップロードしてください"
                              companyId={formData.companyId}
                              fiscalYear={fiscalYear}
                              dataType="financial_statement"
                              uploadApiUrl="/api/business-plan/upload-pdf"
                              onSuccess={(data) => handleHistoricalDataExtracted(periodIndex, data.extractedData)}
                              allowEdit={true}
                            />

                            {hasData && (
                              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="p-3 bg-gray-50 rounded">
                                  <span className="text-gray-500">売上高</span>
                                  <p className="font-semibold">
                                    {formatAmount(historicalData[periodIndex]?.netSales)}
                                  </p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded">
                                  <span className="text-gray-500">営業利益</span>
                                  <p className="font-semibold">
                                    {formatAmount(historicalData[periodIndex]?.operatingIncome)}
                                  </p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded">
                                  <span className="text-gray-500">経常利益</span>
                                  <p className="font-semibold">
                                    {formatAmount(historicalData[periodIndex]?.ordinaryIncome)}
                                  </p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded">
                                  <span className="text-gray-500">当期純利益</span>
                                  <p className="font-semibold">
                                    {formatAmount(historicalData[periodIndex]?.netIncome)}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={goToPrevStep}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  戻る
                </Button>
                <Button onClick={goToNextStep}>
                  次へ: パラメータ設定
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: パラメータ設定 */}
          {currentStep === 'parameters' && (
            <div className="space-y-6">
              {/* 売上関連 */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">売上・原価設定</h2>
                <div className="space-y-6">
                  {/* カテゴリー別売上成長率の切り替え */}
                  <div className="flex items-center gap-4 pb-4 border-b">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={parameters.useCategoryGrowth}
                        onChange={(e) => handleParameterChange('useCategoryGrowth', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="font-medium">カテゴリー別に売上成長率を設定する</span>
                    </label>
                  </div>

                  {!parameters.useCategoryGrowth ? (
                    // 全体成長率設定
                    <div>
                      <h3 className="font-medium mb-3">年度別売上成長率（%）</h3>
                      <div className="grid grid-cols-5 gap-4">
                        {parameters.salesGrowthRates.map((rate, index) => (
                          <div key={rate.fiscalYear}>
                            <Label>{rate.fiscalYear}年度</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={rate.growthRate}
                              onChange={(e) => {
                                const newRates = [...parameters.salesGrowthRates]
                                newRates[index].growthRate = parseFloat(e.target.value) || 0
                                handleParameterChange('salesGrowthRates', newRates)
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    // カテゴリー別成長率設定
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">売上カテゴリー設定</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addSalesCategory}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          カテゴリー追加
                        </Button>
                      </div>

                      {parameters.salesCategories.length === 0 ? (
                        <p className="text-sm text-gray-500 py-4 text-center border rounded-lg">
                          カテゴリーを追加してください
                        </p>
                      ) : (
                        <>
                          {/* カテゴリー一覧 */}
                          <div className="space-y-2">
                            {parameters.salesCategories.map((category) => (
                              <div key={category.id} className="flex items-center gap-4 p-3 border rounded-lg">
                                <div className="flex-1">
                                  <Input
                                    placeholder="カテゴリー名"
                                    value={category.name}
                                    onChange={(e) => updateSalesCategory(category.id, 'name', e.target.value)}
                                  />
                                </div>
                                <div className="w-40">
                                  <Input
                                    type="number"
                                    placeholder="基準年売上"
                                    value={category.baseYearAmount}
                                    onChange={(e) => updateSalesCategory(category.id, 'baseYearAmount', parseFloat(e.target.value) || 0)}
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeSalesCategory(category.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            ))}
                          </div>

                          {/* カテゴリー別成長率テーブル */}
                          <div className="mt-4">
                            <h4 className="font-medium mb-2">カテゴリー別年度成長率（%）</h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm border">
                                <thead>
                                  <tr className="bg-gray-50">
                                    <th className="text-left py-2 px-3 border-b">カテゴリー</th>
                                    {parameters.salesGrowthRates.map((rate) => (
                                      <th key={rate.fiscalYear} className="text-center py-2 px-3 border-b">
                                        {rate.fiscalYear}年度
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {parameters.salesCategories.map((category) => (
                                    <tr key={category.id} className="border-b">
                                      <td className="py-2 px-3">{category.name || '(未設定)'}</td>
                                      {parameters.salesGrowthRates.map((rate) => {
                                        const categoryRate = parameters.categoryGrowthRates.find(
                                          (r) => r.fiscalYear === rate.fiscalYear && r.categoryId === category.id
                                        )
                                        return (
                                          <td key={rate.fiscalYear} className="py-2 px-3">
                                            <Input
                                              type="number"
                                              step="0.1"
                                              className="w-20 text-center"
                                              value={categoryRate?.growthRate ?? 3}
                                              onChange={(e) =>
                                                updateCategoryGrowthRate(
                                                  rate.fiscalYear,
                                                  category.id,
                                                  parseFloat(e.target.value) || 0
                                                )
                                              }
                                            />
                                          </td>
                                        )
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="costRate">売上原価率（%）</Label>
                      <Input
                        id="costRate"
                        type="number"
                        step="0.1"
                        value={parameters.costRate}
                        onChange={(e) =>
                          handleParameterChange('costRate', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* 人件費 */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">人件費設定</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="wageGrowthRate">賃金上昇率（%/年）</Label>
                    <Input
                      id="wageGrowthRate"
                      type="number"
                      step="0.1"
                      value={parameters.wageGrowthRate}
                      onChange={(e) =>
                        handleParameterChange('wageGrowthRate', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="hiringRate">採用増加率（%/年）</Label>
                    <Input
                      id="hiringRate"
                      type="number"
                      step="0.1"
                      value={parameters.hiringRate}
                      onChange={(e) =>
                        handleParameterChange('hiringRate', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="turnoverRate">退職率（%/年）</Label>
                    <Input
                      id="turnoverRate"
                      type="number"
                      step="0.1"
                      value={parameters.turnoverRate}
                      onChange={(e) =>
                        handleParameterChange('turnoverRate', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="executiveCompensationGrowthRate">役員報酬増減率（%/年）</Label>
                    <Input
                      id="executiveCompensationGrowthRate"
                      type="number"
                      step="0.1"
                      value={parameters.executiveCompensationGrowthRate}
                      onChange={(e) =>
                        handleParameterChange(
                          'executiveCompensationGrowthRate',
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                </div>
              </Card>

              {/* 運転資本 */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">運転資本設定</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="accountsReceivableMonths">売掛金回転月数</Label>
                    <Input
                      id="accountsReceivableMonths"
                      type="number"
                      step="0.1"
                      value={parameters.accountsReceivableMonths}
                      onChange={(e) =>
                        handleParameterChange(
                          'accountsReceivableMonths',
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="inventoryMonths">棚卸資産回転月数</Label>
                    <Input
                      id="inventoryMonths"
                      type="number"
                      step="0.1"
                      value={parameters.inventoryMonths}
                      onChange={(e) =>
                        handleParameterChange('inventoryMonths', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountsPayableMonths">買掛金回転月数</Label>
                    <Input
                      id="accountsPayableMonths"
                      type="number"
                      step="0.1"
                      value={parameters.accountsPayableMonths}
                      onChange={(e) =>
                        handleParameterChange('accountsPayableMonths', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>
              </Card>

              {/* 設備投資・償却 */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">設備投資・償却設定</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-3">年度別設備投資（千円）</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left py-2 px-3">年度</th>
                            <th className="text-left py-2 px-3">成長投資</th>
                            <th className="text-left py-2 px-3">維持投資</th>
                            <th className="text-right py-2 px-3">合計</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parameters.capexSettings.map((setting, index) => (
                            <tr key={setting.fiscalYear} className="border-b">
                              <td className="py-2 px-3">{setting.fiscalYear}年度</td>
                              <td className="py-2 px-3">
                                <Input
                                  type="number"
                                  value={setting.growthInvestment}
                                  onChange={(e) => {
                                    const newSettings = [...parameters.capexSettings]
                                    newSettings[index].growthInvestment =
                                      parseFloat(e.target.value) || 0
                                    handleParameterChange('capexSettings', newSettings)
                                  }}
                                  className="w-32"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <Input
                                  type="number"
                                  value={setting.maintenanceInvestment}
                                  onChange={(e) => {
                                    const newSettings = [...parameters.capexSettings]
                                    newSettings[index].maintenanceInvestment =
                                      parseFloat(e.target.value) || 0
                                    handleParameterChange('capexSettings', newSettings)
                                  }}
                                  className="w-32"
                                />
                              </td>
                              <td className="py-2 px-3 text-right font-medium">
                                {formatAmount(setting.growthInvestment + setting.maintenanceInvestment)}
                              </td>
                            </tr>
                          ))}
                          {/* 合計行 */}
                          <tr className="border-t-2 bg-gray-50 font-semibold">
                            <td className="py-2 px-3">合計</td>
                            <td className="py-2 px-3 text-right">
                              {formatAmount(parameters.capexSettings.reduce((sum, s) => sum + s.growthInvestment, 0))}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {formatAmount(parameters.capexSettings.reduce((sum, s) => sum + s.maintenanceInvestment, 0))}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {formatAmount(parameters.capexSettings.reduce((sum, s) => sum + s.growthInvestment + s.maintenanceInvestment, 0))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="newAssetUsefulLife">新規取得資産の耐用年数</Label>
                      <Input
                        id="newAssetUsefulLife"
                        type="number"
                        value={parameters.newAssetUsefulLife}
                        onChange={(e) =>
                          handleParameterChange('newAssetUsefulLife', parseInt(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="existingRemainingYears">既存資産の残存耐用年数</Label>
                      <Input
                        id="existingRemainingYears"
                        type="number"
                        value={parameters.existingRemainingYears}
                        onChange={(e) =>
                          handleParameterChange(
                            'existingRemainingYears',
                            parseInt(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* 有利子負債・税金 */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">財務・税金設定</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="repaymentYears">借入金償還年数</Label>
                    <Input
                      id="repaymentYears"
                      type="number"
                      value={parameters.repaymentYears}
                      onChange={(e) =>
                        handleParameterChange('repaymentYears', parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="interestRate">借入金利（%）</Label>
                    <Input
                      id="interestRate"
                      type="number"
                      step="0.1"
                      value={parameters.interestRate}
                      onChange={(e) =>
                        handleParameterChange('interestRate', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="corporateTaxRate">法人税等実効税率（%）</Label>
                    <Input
                      id="corporateTaxRate"
                      type="number"
                      step="0.1"
                      value={parameters.corporateTaxRate}
                      onChange={(e) =>
                        handleParameterChange('corporateTaxRate', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={goToPrevStep}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  戻る
                </Button>
                <Button onClick={calculatePlan} disabled={calculating}>
                  {calculating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      計算中...
                    </>
                  ) : (
                    <>
                      <Calculator className="h-4 w-4 mr-2" />
                      計画を計算
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: 計算結果 */}
          {currentStep === 'results' && (
            <div className="space-y-6">
              {/* PL */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">計画損益計算書（PL）</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4 font-semibold">項目</th>
                        {plResults.map((pl) => (
                          <th key={pl.fiscalYear} className="text-right py-3 px-4 font-semibold">
                            {pl.fiscalYear}年度
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* 売上高〜営業利益 */}
                      {[
                        { key: 'netSales', label: '売上高' },
                        { key: 'costOfSales', label: '売上原価' },
                        { key: 'grossProfit', label: '売上総利益', subtotal: true },
                        { key: 'sellingGeneralAdminExpenses', label: '販管費' },
                        { key: 'operatingIncome', label: '営業利益', highlight: true },
                      ].map((row) => (
                        <tr
                          key={row.key}
                          className={`border-b ${row.highlight ? 'bg-blue-100 font-bold' : row.subtotal ? 'bg-blue-50 font-semibold' : ''}`}
                        >
                          <td className="py-2 px-4">{row.label}</td>
                          {plResults.map((pl) => (
                            <td key={pl.fiscalYear} className="text-right py-2 px-4">
                              {formatAmount((pl as any)[row.key])}
                            </td>
                          ))}
                        </tr>
                      ))}

                      {/* 営業外損益の部 */}
                      <tr className="bg-gray-100">
                        <td colSpan={plResults.length + 1} className="py-2 px-4 font-bold text-sm">
                          【営業外損益】
                        </td>
                      </tr>
                      {[
                        { key: 'nonOperatingIncome', label: '　営業外収益', indent: true },
                        { key: 'interestExpense', label: '　　うち受取利息・配当金', subIndent: true },
                        { key: 'nonOperatingExpenses', label: '　営業外費用', indent: true },
                        { key: 'interestExpense', label: '　　うち支払利息', subIndent: true, isExpense: true },
                      ].map((row, idx) => (
                        <tr key={`nonop-${idx}`} className="border-b">
                          <td className="py-2 px-4 text-gray-700">{row.label}</td>
                          {plResults.map((pl) => (
                            <td key={pl.fiscalYear} className="text-right py-2 px-4">
                              {row.isExpense
                                ? formatAmount((pl as any)[row.key])
                                : formatAmount((pl as any)[row.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {/* 営業外損益純額 */}
                      <tr className="border-b bg-blue-50 font-semibold">
                        <td className="py-2 px-4">営業外損益純額</td>
                        {plResults.map((pl) => (
                          <td key={pl.fiscalYear} className="text-right py-2 px-4">
                            {formatAmount((pl.nonOperatingIncome || 0) - (pl.nonOperatingExpenses || 0))}
                          </td>
                        ))}
                      </tr>

                      {/* 経常利益 */}
                      <tr className="border-b bg-blue-100 font-bold">
                        <td className="py-2 px-4">経常利益</td>
                        {plResults.map((pl) => (
                          <td key={pl.fiscalYear} className="text-right py-2 px-4">
                            {formatAmount(pl.ordinaryIncome)}
                          </td>
                        ))}
                      </tr>

                      {/* 特別損益の部 */}
                      <tr className="bg-gray-100">
                        <td colSpan={plResults.length + 1} className="py-2 px-4 font-bold text-sm">
                          【特別損益】
                        </td>
                      </tr>
                      {[
                        { key: 'extraordinaryIncome', label: '　特別利益', indent: true },
                        { key: 'extraordinaryLosses', label: '　特別損失', indent: true },
                      ].map((row, idx) => (
                        <tr key={`extra-${idx}`} className="border-b">
                          <td className="py-2 px-4 text-gray-700">{row.label}</td>
                          {plResults.map((pl) => (
                            <td key={pl.fiscalYear} className="text-right py-2 px-4">
                              {formatAmount((pl as any)[row.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {/* 特別損益純額 */}
                      <tr className="border-b bg-blue-50 font-semibold">
                        <td className="py-2 px-4">特別損益純額</td>
                        {plResults.map((pl) => (
                          <td key={pl.fiscalYear} className="text-right py-2 px-4">
                            {formatAmount((pl.extraordinaryIncome || 0) - (pl.extraordinaryLosses || 0))}
                          </td>
                        ))}
                      </tr>

                      {/* 税引前〜当期純利益 */}
                      {[
                        { key: 'incomeBeforeTax', label: '税引前当期純利益', highlight: true },
                        { key: 'incomeTaxes', label: '法人税等' },
                        { key: 'netIncome', label: '当期純利益', highlight: true, bold: true },
                      ].map((row) => (
                        <tr
                          key={row.key}
                          className={`border-b ${row.bold ? 'bg-blue-200 font-bold border-t-2' : row.highlight ? 'bg-blue-100 font-bold' : ''}`}
                        >
                          <td className="py-2 px-4">{row.label}</td>
                          {plResults.map((pl) => (
                            <td key={pl.fiscalYear} className="text-right py-2 px-4">
                              {formatAmount((pl as any)[row.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* BS */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">計画貸借対照表（BS）</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4 font-semibold">項目</th>
                        {bsResults.map((bs) => (
                          <th key={bs.fiscalYear} className="text-right py-3 px-4 font-semibold">
                            {bs.fiscalYear}年度
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* 資産の部 */}
                      <tr className="bg-gray-100">
                        <td colSpan={bsResults.length + 1} className="py-2 px-4 font-bold">
                          【資産の部】
                        </td>
                      </tr>
                      {/* 流動資産 */}
                      {[
                        { key: 'cashAndDeposits', label: '　現金及び預金', indent: true },
                        { key: 'accountsReceivable', label: '　売掛金', indent: true },
                        { key: 'inventory', label: '　棚卸資産', indent: true },
                        { key: 'otherCurrentAssets', label: '　その他流動資産', indent: true },
                        { key: 'currentAssetsTotal', label: '流動資産合計', subtotal: true },
                      ].map((row) => (
                        <tr
                          key={row.key}
                          className={`border-b ${row.subtotal ? 'bg-blue-50 font-semibold' : ''}`}
                        >
                          <td className="py-2 px-4">{row.label}</td>
                          {bsResults.map((bs) => (
                            <td key={bs.fiscalYear} className="text-right py-2 px-4">
                              {formatAmount((bs as any)[row.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {/* 固定資産 */}
                      {[
                        { key: 'tangibleFixedAssets', label: '　有形固定資産', indent: true },
                        { key: 'intangibleFixedAssets', label: '　無形固定資産', indent: true },
                        { key: 'investmentsAndOtherAssets', label: '　投資その他の資産', indent: true },
                        { key: 'fixedAssetsTotal', label: '固定資産合計', subtotal: true },
                      ].map((row) => (
                        <tr
                          key={row.key}
                          className={`border-b ${row.subtotal ? 'bg-blue-50 font-semibold' : ''}`}
                        >
                          <td className="py-2 px-4">{row.label}</td>
                          {bsResults.map((bs) => (
                            <td key={bs.fiscalYear} className="text-right py-2 px-4">
                              {formatAmount((bs as any)[row.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {/* 資産合計 */}
                      <tr className="border-b border-t-2 bg-blue-100 font-bold">
                        <td className="py-2 px-4">資産合計</td>
                        {bsResults.map((bs) => (
                          <td key={bs.fiscalYear} className="text-right py-2 px-4">
                            {formatAmount(bs.totalAssets)}
                          </td>
                        ))}
                      </tr>

                      {/* 負債の部 */}
                      <tr className="bg-gray-100">
                        <td colSpan={bsResults.length + 1} className="py-2 px-4 font-bold">
                          【負債の部】
                        </td>
                      </tr>
                      {/* 流動負債 */}
                      {[
                        { key: 'shortTermBorrowings', label: '　短期借入金（1年内長期含む）', indent: true },
                        { key: 'accountsPayable', label: '　買掛金', indent: true },
                        { key: 'otherCurrentLiabilities', label: '　その他流動負債', indent: true },
                        { key: 'currentLiabilitiesTotal', label: '流動負債合計', subtotal: true },
                      ].map((row) => (
                        <tr
                          key={row.key}
                          className={`border-b ${row.subtotal ? 'bg-blue-50 font-semibold' : ''}`}
                        >
                          <td className="py-2 px-4">{row.label}</td>
                          {bsResults.map((bs) => (
                            <td key={bs.fiscalYear} className="text-right py-2 px-4">
                              {formatAmount((bs as any)[row.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {/* 固定負債 */}
                      {[
                        { key: 'longTermBorrowings', label: '　長期借入金', indent: true },
                        { key: 'bondsPayable', label: '　社債', indent: true },
                        { key: 'leaseObligations', label: '　リース債務', indent: true },
                        { key: 'otherFixedLiabilities', label: '　その他固定負債', indent: true },
                        { key: 'fixedLiabilitiesTotal', label: '固定負債合計', subtotal: true },
                      ].map((row) => (
                        <tr
                          key={row.key}
                          className={`border-b ${row.subtotal ? 'bg-blue-50 font-semibold' : ''}`}
                        >
                          <td className="py-2 px-4">{row.label}</td>
                          {bsResults.map((bs) => (
                            <td key={bs.fiscalYear} className="text-right py-2 px-4">
                              {formatAmount((bs as any)[row.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {/* 負債合計 */}
                      <tr className="border-b border-t-2 bg-blue-100 font-bold">
                        <td className="py-2 px-4">負債合計</td>
                        {bsResults.map((bs) => (
                          <td key={bs.fiscalYear} className="text-right py-2 px-4">
                            {formatAmount(bs.totalLiabilities)}
                          </td>
                        ))}
                      </tr>

                      {/* 純資産の部 */}
                      <tr className="bg-gray-100">
                        <td colSpan={bsResults.length + 1} className="py-2 px-4 font-bold">
                          【純資産の部】
                        </td>
                      </tr>
                      {[
                        { key: 'capitalStock', label: '　資本金', indent: true },
                        { key: 'retainedEarnings', label: '　繰越利益剰余金', indent: true },
                      ].map((row) => (
                        <tr key={row.key} className="border-b">
                          <td className="py-2 px-4">{row.label}</td>
                          {bsResults.map((bs) => (
                            <td key={bs.fiscalYear} className="text-right py-2 px-4">
                              {formatAmount((bs as any)[row.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {/* 純資産合計 */}
                      <tr className="border-b border-t-2 bg-blue-100 font-bold">
                        <td className="py-2 px-4">純資産合計</td>
                        {bsResults.map((bs) => (
                          <td key={bs.fiscalYear} className="text-right py-2 px-4">
                            {formatAmount(bs.totalNetAssets)}
                          </td>
                        ))}
                      </tr>

                      {/* 負債純資産合計 */}
                      <tr className="border-t-4 bg-gray-200 font-bold">
                        <td className="py-3 px-4">負債純資産合計</td>
                        {bsResults.map((bs) => (
                          <td key={bs.fiscalYear} className="text-right py-3 px-4">
                            {formatAmount((bs.totalLiabilities || 0) + (bs.totalNetAssets || 0))}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* CF */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">計画キャッシュフロー計算書（CF）</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4 font-semibold">項目</th>
                        {cfResults.map((cf) => (
                          <th key={cf.fiscalYear} className="text-right py-3 px-4 font-semibold">
                            {cf.fiscalYear}年度
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: 'operatingCashFlow', label: '営業活動によるCF', highlight: true },
                        { key: 'investingCashFlow', label: '投資活動によるCF' },
                        { key: 'financingCashFlow', label: '財務活動によるCF' },
                        { key: 'netChangeInCash', label: '現金増減' },
                        { key: 'endingCash', label: '期末現金残高', highlight: true },
                        { key: 'freeCashFlow', label: 'フリーキャッシュフロー', highlight: true },
                      ].map((row) => (
                        <tr
                          key={row.key}
                          className={`border-b ${row.highlight ? 'bg-blue-50 font-semibold' : ''}`}
                        >
                          <td className="py-2 px-4">{row.label}</td>
                          {cfResults.map((cf) => (
                            <td key={cf.fiscalYear} className="text-right py-2 px-4">
                              {formatAmount((cf as any)[row.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={goToPrevStep}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  パラメータを修正
                </Button>
                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => router.push('/')}>
                    完了
                  </Button>
                  <Button onClick={calculatePlan} disabled={calculating}>
                    {calculating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        再計算中...
                      </>
                    ) : (
                      <>
                        <Calculator className="h-4 w-4 mr-2" />
                        再計算
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
