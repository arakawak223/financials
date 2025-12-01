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
import { ArrowLeft, Save, Calculator, Upload, Edit } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'
import { UnifiedPdfUpload } from '@/components/unified-pdf-upload'
import type { ExtractedFinancialData } from '@/components/unified-pdf-upload'

type Company = Database['public']['Tables']['companies']['Row']
type FinancialPeriod = Database['public']['Tables']['financial_periods']['Row']

interface BudgetFormData {
  companyId: string
  fiscalYear: number
  budgetType: 'annual' | 'quarterly'
  quarter: number | null
  version: number
  approvalStatus: 'draft' | 'approved'
  notes: string

  // 損益項目
  netSales: string
  costOfSales: string
  grossProfit: string
  sellingGeneralAdminExpenses: string
  operatingIncome: string
  nonOperatingIncome: string
  nonOperatingExpenses: string
  ordinaryIncome: string
  extraordinaryIncome: string
  extraordinaryLosses: string
  incomeBeforeTax: string
  incomeTaxes: string
  netIncome: string

  // CF項目
  depreciation: string
  capex: string
  workingCapitalChange: string
  loanRepayment: string
  ebitdaBudget: string
  fcfBudget: string
}

export default function NewBudgetPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [saving, setSaving] = useState(false)
  const [inputMode, setInputMode] = useState<'pdf' | 'manual'>('pdf')
  const [budgetPdfData, setBudgetPdfData] = useState<ExtractedFinancialData | null>(null)
  const [actualPdfData, setActualPdfData] = useState<ExtractedFinancialData | null>(null)
  const [formData, setFormData] = useState<BudgetFormData>({
    companyId: '',
    fiscalYear: new Date().getFullYear(),
    budgetType: 'annual',
    quarter: null,
    version: 1,
    approvalStatus: 'draft',
    notes: '',
    netSales: '',
    costOfSales: '',
    grossProfit: '',
    sellingGeneralAdminExpenses: '',
    operatingIncome: '',
    nonOperatingIncome: '',
    nonOperatingExpenses: '',
    ordinaryIncome: '',
    extraordinaryIncome: '',
    extraordinaryLosses: '',
    incomeBeforeTax: '',
    incomeTaxes: '',
    netIncome: '',
    depreciation: '',
    capex: '',
    workingCapitalChange: '',
    loanRepayment: '',
    ebitdaBudget: '',
    fcfBudget: '',
  })

  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name')

      if (error) throw error
      setCompanies(data || [])
    } catch (error) {
      console.error('企業データ読み込みエラー:', error)
    }
  }

  const handleInputChange = (
    field: keyof BudgetFormData,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const autoCalculate = () => {
    // 自動計算ロジック
    const netSales = parseFloat(formData.netSales) || 0
    const costOfSales = parseFloat(formData.costOfSales) || 0
    const sellingGeneralAdminExpenses =
      parseFloat(formData.sellingGeneralAdminExpenses) || 0
    const nonOperatingIncome = parseFloat(formData.nonOperatingIncome) || 0
    const nonOperatingExpenses = parseFloat(formData.nonOperatingExpenses) || 0
    const extraordinaryIncome = parseFloat(formData.extraordinaryIncome) || 0
    const extraordinaryLosses = parseFloat(formData.extraordinaryLosses) || 0

    const grossProfit = netSales - costOfSales
    const operatingIncome = grossProfit - sellingGeneralAdminExpenses
    const ordinaryIncome =
      operatingIncome + nonOperatingIncome - nonOperatingExpenses
    const incomeBeforeTax =
      ordinaryIncome + extraordinaryIncome - extraordinaryLosses
    const incomeTaxes = incomeBeforeTax * 0.3 // 仮の税率30%
    const netIncome = incomeBeforeTax - incomeTaxes

    // EBITDAとFCFの計算
    const depreciation = parseFloat(formData.depreciation) || 0
    const capex = parseFloat(formData.capex) || 0
    const ebitda = operatingIncome + depreciation
    const fcf = ebitda - capex

    setFormData((prev) => ({
      ...prev,
      grossProfit: grossProfit.toString(),
      operatingIncome: operatingIncome.toString(),
      ordinaryIncome: ordinaryIncome.toString(),
      incomeBeforeTax: incomeBeforeTax.toString(),
      incomeTaxes: incomeTaxes.toString(),
      netIncome: netIncome.toString(),
      ebitdaBudget: ebitda.toString(),
      fcfBudget: fcf.toString(),
    }))
  }

  const handleSave = async () => {
    if (!formData.companyId) {
      alert('企業を選択してください')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()

      // 予算マスターを作成
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .insert({
          company_id: formData.companyId,
          fiscal_year: formData.fiscalYear,
          budget_type: formData.budgetType,
          quarter: formData.quarter,
          version: formData.version,
          approval_status: formData.approvalStatus,
          notes: formData.notes,
        })
        .select()
        .single()

      if (budgetError) throw budgetError

      // 損益項目を作成
      const { error: plError } = await supabase
        .from('budget_profit_loss_items')
        .insert({
          budget_id: budgetData.id,
          net_sales: parseFloat(formData.netSales) || null,
          cost_of_sales: parseFloat(formData.costOfSales) || null,
          gross_profit: parseFloat(formData.grossProfit) || null,
          selling_general_admin_expenses:
            parseFloat(formData.sellingGeneralAdminExpenses) || null,
          operating_income: parseFloat(formData.operatingIncome) || null,
          non_operating_income: parseFloat(formData.nonOperatingIncome) || null,
          non_operating_expenses:
            parseFloat(formData.nonOperatingExpenses) || null,
          ordinary_income: parseFloat(formData.ordinaryIncome) || null,
          extraordinary_income: parseFloat(formData.extraordinaryIncome) || null,
          extraordinary_losses: parseFloat(formData.extraordinaryLosses) || null,
          income_before_tax: parseFloat(formData.incomeBeforeTax) || null,
          income_taxes: parseFloat(formData.incomeTaxes) || null,
          net_income: parseFloat(formData.netIncome) || null,
        })

      if (plError) throw plError

      // CF項目を作成
      const { error: cfError } = await supabase
        .from('budget_cash_flow_items')
        .insert({
          budget_id: budgetData.id,
          depreciation: parseFloat(formData.depreciation) || null,
          capex: parseFloat(formData.capex) || null,
          working_capital_change:
            parseFloat(formData.workingCapitalChange) || null,
          loan_repayment: parseFloat(formData.loanRepayment) || null,
          ebitda_budget: parseFloat(formData.ebitdaBudget) || null,
          fcf_budget: parseFloat(formData.fcfBudget) || null,
        })

      if (cfError) throw cfError

      alert('予算を登録しました')
      router.push('/budget-vs-actual')
    } catch (error) {
      console.error('予算登録エラー:', error)
      alert('予算の登録に失敗しました')
    } finally {
      setSaving(false)
    }
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
              onClick={() => router.push('/budget-vs-actual')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">新規予算登録</h1>
              <p className="text-sm text-gray-600 mt-1">
                会計期間の予算データを登録します
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto py-8 px-6">
          <div className="space-y-6">
            {/* 入力モード選択 */}
            <Card className="p-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">データ入力方法:</span>
                <div className="flex gap-2">
                  <Button
                    variant={inputMode === 'pdf' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setInputMode('pdf')}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    PDF読込
                  </Button>
                  <Button
                    variant={inputMode === 'manual' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setInputMode('manual')}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    手動入力
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {inputMode === 'pdf'
                  ? 'PDFファイルから自動的に財務データを抽出します。抽出後、編集ボタンで修正できます。'
                  : '手動でデータを入力します。'}
              </p>
            </Card>

            {/* 基本情報 */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">基本情報</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company">企業</Label>
                  <Select
                    value={formData.companyId}
                    onValueChange={(value) =>
                      handleInputChange('companyId', value)
                    }
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
                  <Label htmlFor="fiscalYear">会計年度</Label>
                  <Input
                    id="fiscalYear"
                    type="number"
                    value={formData.fiscalYear}
                    onChange={(e) =>
                      handleInputChange(
                        'fiscalYear',
                        parseInt(e.target.value) || new Date().getFullYear()
                      )
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="budgetType">予算種別</Label>
                  <Select
                    value={formData.budgetType}
                    onValueChange={(value: 'annual' | 'quarterly') =>
                      handleInputChange('budgetType', value)
                    }
                  >
                    <SelectTrigger id="budgetType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">年間予算</SelectItem>
                      <SelectItem value="quarterly">四半期予算</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.budgetType === 'quarterly' && (
                  <div>
                    <Label htmlFor="quarter">四半期</Label>
                    <Select
                      value={formData.quarter?.toString() || ''}
                      onValueChange={(value) =>
                        handleInputChange('quarter', parseInt(value))
                      }
                    >
                      <SelectTrigger id="quarter">
                        <SelectValue placeholder="選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Q1</SelectItem>
                        <SelectItem value="2">Q2</SelectItem>
                        <SelectItem value="3">Q3</SelectItem>
                        <SelectItem value="4">Q4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label htmlFor="approvalStatus">承認ステータス</Label>
                  <Select
                    value={formData.approvalStatus}
                    onValueChange={(value: 'draft' | 'approved') =>
                      handleInputChange('approvalStatus', value)
                    }
                  >
                    <SelectTrigger id="approvalStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">下書き</SelectItem>
                      <SelectItem value="approved">承認済み</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="notes">備考</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </Card>

            {/* PDF読込モード */}
            {inputMode === 'pdf' && (
              <>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* 予算PDFアップロード */}
                  <UnifiedPdfUpload
                    title="予算書PDFをアップロード"
                    description={`${formData.fiscalYear}年度の予算書PDFを選択してください`}
                    companyId={formData.companyId}
                    fiscalYear={formData.fiscalYear}
                    dataType="budget"
                    uploadApiUrl="/api/budget-vs-actual/upload-pdf"
                    saveApiUrl="/api/budget-vs-actual/save-extracted-data"
                    onSuccess={(data) => {
                      setBudgetPdfData(data.extractedData)
                      // フォームデータに反映
                      setFormData(prev => ({
                        ...prev,
                        netSales: data.extractedData.netSales?.toString() || '',
                        costOfSales: data.extractedData.costOfSales?.toString() || '',
                        grossProfit: data.extractedData.grossProfit?.toString() || '',
                        sellingGeneralAdminExpenses: data.extractedData.sellingGeneralAdminExpenses?.toString() || '',
                        operatingIncome: data.extractedData.operatingIncome?.toString() || '',
                        ordinaryIncome: data.extractedData.ordinaryIncome?.toString() || '',
                        netIncome: data.extractedData.netIncome?.toString() || '',
                      }))
                    }}
                    allowEdit={true}
                  />

                  {/* 実績PDFアップロード */}
                  <UnifiedPdfUpload
                    title="実績（決算書）PDFをアップロード"
                    description={`${formData.fiscalYear}年度の実績（決算書）PDFを選択してください`}
                    companyId={formData.companyId}
                    fiscalYear={formData.fiscalYear}
                    dataType="actual"
                    uploadApiUrl="/api/budget-vs-actual/upload-pdf"
                    saveApiUrl="/api/budget-vs-actual/save-extracted-data"
                    onSuccess={(data) => {
                      setActualPdfData(data.extractedData)
                    }}
                    allowEdit={true}
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="font-medium text-blue-900 mb-2">PDF読込後の流れ</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal ml-4">
                    <li>予算書と実績（決算書）のPDFをそれぞれアップロード</li>
                    <li>自動的に財務データが抽出されます</li>
                    <li>抽出データを確認し、必要に応じて「編集」ボタンで修正</li>
                    <li>ページ下部の「保存」ボタンで登録完了</li>
                  </ol>
                </div>
              </>
            )}

            {/* 手動入力モード - 損益計算書 */}
            {inputMode === 'manual' && (
              <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">損益計算書</h2>
                <Button variant="outline" size="sm" onClick={autoCalculate}>
                  <Calculator className="h-4 w-4 mr-2" />
                  自動計算
                </Button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="netSales">売上高</Label>
                  <Input
                    id="netSales"
                    type="number"
                    value={formData.netSales}
                    onChange={(e) => handleInputChange('netSales', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="costOfSales">売上原価</Label>
                  <Input
                    id="costOfSales"
                    type="number"
                    value={formData.costOfSales}
                    onChange={(e) =>
                      handleInputChange('costOfSales', e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="grossProfit">売上総利益</Label>
                  <Input
                    id="grossProfit"
                    type="number"
                    value={formData.grossProfit}
                    onChange={(e) =>
                      handleInputChange('grossProfit', e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="sellingGeneralAdminExpenses">
                    販売費及び一般管理費
                  </Label>
                  <Input
                    id="sellingGeneralAdminExpenses"
                    type="number"
                    value={formData.sellingGeneralAdminExpenses}
                    onChange={(e) =>
                      handleInputChange(
                        'sellingGeneralAdminExpenses',
                        e.target.value
                      )
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="operatingIncome">営業利益</Label>
                  <Input
                    id="operatingIncome"
                    type="number"
                    value={formData.operatingIncome}
                    onChange={(e) =>
                      handleInputChange('operatingIncome', e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="nonOperatingIncome">営業外収益</Label>
                  <Input
                    id="nonOperatingIncome"
                    type="number"
                    value={formData.nonOperatingIncome}
                    onChange={(e) =>
                      handleInputChange('nonOperatingIncome', e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="nonOperatingExpenses">営業外費用</Label>
                  <Input
                    id="nonOperatingExpenses"
                    type="number"
                    value={formData.nonOperatingExpenses}
                    onChange={(e) =>
                      handleInputChange('nonOperatingExpenses', e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="ordinaryIncome">経常利益</Label>
                  <Input
                    id="ordinaryIncome"
                    type="number"
                    value={formData.ordinaryIncome}
                    onChange={(e) =>
                      handleInputChange('ordinaryIncome', e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="extraordinaryIncome">特別利益</Label>
                  <Input
                    id="extraordinaryIncome"
                    type="number"
                    value={formData.extraordinaryIncome}
                    onChange={(e) =>
                      handleInputChange('extraordinaryIncome', e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="extraordinaryLosses">特別損失</Label>
                  <Input
                    id="extraordinaryLosses"
                    type="number"
                    value={formData.extraordinaryLosses}
                    onChange={(e) =>
                      handleInputChange('extraordinaryLosses', e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="incomeBeforeTax">税引前当期純利益</Label>
                  <Input
                    id="incomeBeforeTax"
                    type="number"
                    value={formData.incomeBeforeTax}
                    onChange={(e) =>
                      handleInputChange('incomeBeforeTax', e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="incomeTaxes">法人税等</Label>
                  <Input
                    id="incomeTaxes"
                    type="number"
                    value={formData.incomeTaxes}
                    onChange={(e) =>
                      handleInputChange('incomeTaxes', e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="netIncome">当期純利益</Label>
                  <Input
                    id="netIncome"
                    type="number"
                    value={formData.netIncome}
                    onChange={(e) =>
                      handleInputChange('netIncome', e.target.value)
                    }
                    placeholder="0"
                    className="font-bold text-lg"
                  />
                </div>
              </div>
            </Card>
            )}

            {/* 手動入力モード - キャッシュフロー */}
            {inputMode === 'manual' && (
              <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">キャッシュフロー</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="depreciation">減価償却費</Label>
                  <Input
                    id="depreciation"
                    type="number"
                    value={formData.depreciation}
                    onChange={(e) =>
                      handleInputChange('depreciation', e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="capex">設備投資額</Label>
                  <Input
                    id="capex"
                    type="number"
                    value={formData.capex}
                    onChange={(e) => handleInputChange('capex', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="workingCapitalChange">運転資本増減</Label>
                  <Input
                    id="workingCapitalChange"
                    type="number"
                    value={formData.workingCapitalChange}
                    onChange={(e) =>
                      handleInputChange('workingCapitalChange', e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="loanRepayment">借入金返済額</Label>
                  <Input
                    id="loanRepayment"
                    type="number"
                    value={formData.loanRepayment}
                    onChange={(e) =>
                      handleInputChange('loanRepayment', e.target.value)
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="ebitdaBudget">EBITDA（予算）</Label>
                  <Input
                    id="ebitdaBudget"
                    type="number"
                    value={formData.ebitdaBudget}
                    onChange={(e) =>
                      handleInputChange('ebitdaBudget', e.target.value)
                    }
                    placeholder="0"
                    className="font-bold"
                  />
                </div>
                <div>
                  <Label htmlFor="fcfBudget">FCF（予算）</Label>
                  <Input
                    id="fcfBudget"
                    type="number"
                    value={formData.fcfBudget}
                    onChange={(e) =>
                      handleInputChange('fcfBudget', e.target.value)
                    }
                    placeholder="0"
                    className="font-bold"
                  />
                </div>
              </div>
            </Card>
            )}

            {/* アクション */}
            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => router.push('/budget-vs-actual')}
              >
                キャンセル
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
