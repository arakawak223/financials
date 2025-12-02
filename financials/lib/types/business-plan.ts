// 事業計画策定ツール用の型定義

// ========================================
// 事業計画マスター
// ========================================
export interface BusinessPlan {
  id: string
  companyId: string
  planName: string
  description?: string
  baseAnalysisId?: string
  planStartYear: number
  planYears: number
  status: 'draft' | 'active' | 'archived'
  scenarioType: 'optimistic' | 'standard' | 'pessimistic'
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

// ========================================
// 基本パラメータ
// ========================================
export interface PlanGeneralParameters {
  id: string
  planId: string
  corporateTaxRate: number // 法人税等実効税率（%）
  accountsReceivableMonths?: number // 売掛金回転月数
  inventoryMonths?: number // 棚卸資産回転月数
  accountsPayableMonths?: number // 買掛金回転月数
}

// ========================================
// 売上カテゴリー設定
// ========================================
export interface PlanSalesCategory {
  id: string
  planId: string
  categoryName: string
  categoryType: 'product' | 'merchandise' | 'service'
  displayOrder: number
  baseYearAmount?: number
  baseYearUnitPrice?: number
  baseYearQuantity?: number
  useUnitPriceQuantity: boolean
}

// ========================================
// 売上成長率設定（年度別）
// ========================================
export interface PlanSalesGrowthRate {
  id: string
  planId: string
  categoryId?: string // NULLの場合は全社設定
  fiscalYear: number
  growthRate?: number // 成長率（%）
  unitPriceGrowthRate?: number // 単価成長率（%）
  quantityGrowthRate?: number // 数量成長率（%）
}

// ========================================
// 原価設定
// ========================================
export interface PlanCostSetting {
  id: string
  planId: string
  categoryId?: string // NULLの場合は全社設定
  fiscalYear: number
  costRate?: number // 原価率（%）
}

// ========================================
// 人件費設定
// ========================================
export interface PlanPersonnelSetting {
  id: string
  planId: string
  fiscalYear: number
  baseYearEmployeeCount?: number
  baseYearAvgSalary?: number
  wageGrowthRate?: number // 1人当たり賃金上昇率（%）
  hiringRate?: number // 採用による人員増加率（%）
  turnoverRate?: number // 退職率（%）
  baseYearExecutiveCompensation?: number
  executiveCompensationGrowthRate?: number // 役員報酬増減率（%）
}

// ========================================
// 販管費科目設定
// ========================================
export interface PlanExpenseItem {
  id: string
  planId: string
  expenseName: string
  expenseType: 'fixed' | 'variable' | 'semi_variable'
  isPersonnelCost: boolean
  baseYearAmount?: number
  displayOrder: number
}

// ========================================
// 販管費増減率設定（年度別）
// ========================================
export interface PlanExpenseGrowthRate {
  id: string
  planId: string
  expenseItemId: string
  fiscalYear: number
  growthRate?: number // 増減率（%）
}

// ========================================
// 営業外損益設定
// ========================================
export interface PlanNonOperatingItem {
  id: string
  planId: string
  itemName: string
  itemType: 'income' | 'expense'
  baseYearAmount?: number
  displayOrder: number
}

// ========================================
// 営業外損益増減率設定（年度別）
// ========================================
export interface PlanNonOperatingGrowthRate {
  id: string
  planId: string
  itemId: string
  fiscalYear: number
  growthRate?: number // 増減率（%）
}

// ========================================
// 特別損益設定（年度別の個別金額）
// ========================================
export interface PlanExtraordinaryItem {
  id: string
  planId: string
  fiscalYear: number
  itemName: string
  itemType: 'income' | 'loss'
  amount?: number
  description?: string
}

// ========================================
// 設備投資設定
// ========================================
export interface PlanCapexSetting {
  id: string
  planId: string
  fiscalYear: number
  growthInvestment: number // 成長投資額
  maintenanceInvestment: number // 維持投資額
}

// ========================================
// 償却設定（資産区分別）
// ========================================
export interface PlanDepreciationSetting {
  id: string
  planId: string
  assetCategory: 'tangible' | 'intangible' | 'deferred'
  assetSubcategory?: string
  existingRemainingYears?: number
  existingBookValue?: number
  newAssetUsefulLife?: number
  depreciationMethod: 'straight_line' | 'declining_balance'
}

// ========================================
// 有利子負債設定
// ========================================
export interface PlanDebtSetting {
  id: string
  planId: string
  debtType: 'short_term_loan' | 'long_term_loan' | 'bond' | 'lease'
  debtName?: string
  existingBalance?: number
  existingInterestRate?: number
  repaymentYears?: number
  plannedBorrowing: number
  plannedInterestRate?: number
  plannedRepaymentYears?: number
}

// ========================================
// 計画PL結果
// ========================================
export interface PlanResultPL {
  id: string
  planId: string
  fiscalYear: number
  netSales?: number
  costOfSales?: number
  grossProfit?: number
  personnelCost?: number
  otherSgaExpenses?: number
  depreciationExpense?: number
  sellingGeneralAdminExpenses?: number
  operatingIncome?: number
  nonOperatingIncome?: number
  nonOperatingExpenses?: number
  interestExpense?: number
  ordinaryIncome?: number
  extraordinaryIncome?: number
  extraordinaryLosses?: number
  incomeBeforeTax?: number
  incomeTaxes?: number
  netIncome?: number
}

// ========================================
// 計画BS結果
// ========================================
export interface PlanResultBS {
  id: string
  planId: string
  fiscalYear: number
  // 流動資産
  cashAndDeposits?: number
  accountsReceivable?: number
  inventory?: number
  otherCurrentAssets?: number
  currentAssetsTotal?: number
  // 固定資産
  tangibleFixedAssets?: number
  intangibleFixedAssets?: number
  investmentsAndOtherAssets?: number
  fixedAssetsTotal?: number
  // 総資産
  totalAssets?: number
  // 流動負債
  accountsPayable?: number
  shortTermBorrowings?: number
  otherCurrentLiabilities?: number
  currentLiabilitiesTotal?: number
  // 固定負債
  longTermBorrowings?: number
  bondsPayable?: number
  leaseObligations?: number
  otherFixedLiabilities?: number
  fixedLiabilitiesTotal?: number
  // 負債合計
  totalLiabilities?: number
  // 純資産
  capitalStock?: number
  retainedEarnings?: number
  totalNetAssets?: number
}

// ========================================
// 計画CF結果
// ========================================
export interface PlanResultCF {
  id: string
  planId: string
  fiscalYear: number
  // 営業活動によるCF
  netIncomeCf?: number
  depreciationCf?: number
  changeInReceivables?: number
  changeInInventory?: number
  changeInPayables?: number
  otherOperatingCf?: number
  operatingCashFlow?: number
  // 投資活動によるCF
  capex?: number
  otherInvestingCf?: number
  investingCashFlow?: number
  // 財務活動によるCF
  debtRepayment?: number
  newBorrowings?: number
  dividendsPaid?: number
  otherFinancingCf?: number
  financingCashFlow?: number
  // 現金増減
  netChangeInCash?: number
  beginningCash?: number
  endingCash?: number
  // FCF
  freeCashFlow?: number
}

// ========================================
// 過去実績データ（PDF読み込み用）
// ========================================
export interface HistoricalFinancialData {
  fiscalYear: number
  // PL
  netSales?: number
  costOfSales?: number
  grossProfit?: number
  personnelExpenses?: number
  executiveCompensation?: number
  depreciation?: number
  otherSgaExpenses?: number
  sellingGeneralAdminExpenses?: number
  operatingIncome?: number
  nonOperatingIncome?: number
  nonOperatingExpenses?: number
  interestExpense?: number
  ordinaryIncome?: number
  extraordinaryIncome?: number
  extraordinaryLosses?: number
  incomeBeforeTax?: number
  incomeTaxes?: number
  netIncome?: number
  // BS
  cashAndDeposits?: number
  accountsReceivable?: number
  inventory?: number
  otherCurrentAssets?: number
  currentAssetsTotal?: number
  tangibleFixedAssets?: number
  intangibleFixedAssets?: number
  investmentsAndOtherAssets?: number
  fixedAssetsTotal?: number
  totalAssets?: number
  accountsPayable?: number
  shortTermBorrowings?: number
  longTermBorrowings?: number
  otherLiabilities?: number
  totalLiabilities?: number
  capitalStock?: number
  retainedEarnings?: number
  totalNetAssets?: number
}

// ========================================
// 計画策定用フォームデータ
// ========================================
export interface BusinessPlanFormData {
  // 基本情報
  companyId: string
  planName: string
  description?: string
  planStartYear: number
  planYears: number
  scenarioType: 'optimistic' | 'standard' | 'pessimistic'

  // 基本パラメータ
  generalParameters: {
    corporateTaxRate: number
    accountsReceivableMonths: number
    inventoryMonths: number
    accountsPayableMonths: number
  }

  // 売上カテゴリー
  salesCategories: PlanSalesCategory[]

  // 売上成長率（年度×カテゴリー）
  salesGrowthRates: PlanSalesGrowthRate[]

  // 原価率設定
  costSettings: PlanCostSetting[]

  // 人件費設定
  personnelSettings: PlanPersonnelSetting[]

  // 販管費科目
  expenseItems: PlanExpenseItem[]

  // 販管費増減率
  expenseGrowthRates: PlanExpenseGrowthRate[]

  // 営業外損益
  nonOperatingItems: PlanNonOperatingItem[]
  nonOperatingGrowthRates: PlanNonOperatingGrowthRate[]

  // 特別損益
  extraordinaryItems: PlanExtraordinaryItem[]

  // 設備投資
  capexSettings: PlanCapexSetting[]

  // 償却設定
  depreciationSettings: PlanDepreciationSetting[]

  // 有利子負債
  debtSettings: PlanDebtSetting[]
}

// ========================================
// 計画計算結果
// ========================================
export interface PlanCalculationResult {
  planId: string
  planYears: number[]
  plResults: PlanResultPL[]
  bsResults: PlanResultBS[]
  cfResults: PlanResultCF[]
  // 財務指標
  metrics: {
    fiscalYear: number
    grossProfitMargin: number
    operatingProfitMargin: number
    netProfitMargin: number
    roe: number
    roa: number
    equityRatio: number
    ebitda: number
    freeCashFlow: number
  }[]
}

// ========================================
// API レスポンス型
// ========================================
export interface ExtractedHistoricalDataResponse {
  success: boolean
  fiscalYear: number
  data: HistoricalFinancialData
  confidence: number
  warnings?: string[]
  errors?: string[]
}
