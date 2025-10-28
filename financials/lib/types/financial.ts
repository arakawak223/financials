// 財務分析アプリケーション用の型定義

// ========================================
// 会計ソフトの種類
// ========================================
export type AccountingSoftware = 'yayoi' | 'kanjoubugyo' | 'jdl' | 'freee' | 'moneyforward' | 'other'

// ========================================
// ファイルタイプ
// ========================================
export type FileType = 'financial_statement' | 'account_details'

// ========================================
// OCRステータス
// ========================================
export type OcrStatus = 'pending' | 'processing' | 'completed' | 'failed'

// ========================================
// 分析ステータス
// ========================================
export type AnalysisStatus = 'draft' | 'in_progress' | 'completed'

// ========================================
// 勘定科目タイプ
// ========================================
export type AccountType =
  | 'cash_deposits'          // 現金預金
  | 'securities'             // 有価証券
  | 'receivables'            // 売掛金・受取手形
  | 'inventory'              // 棚卸資産
  | 'loans_receivable'       // 貸付金
  | 'other_receivables'      // 未収入金
  | 'temporary_payments'     // 仮払金
  | 'land'                   // 土地
  | 'borrowings'             // 借入金
  | 'payables'               // 買掛金・支払手形
  | 'other_payables'         // 未払金
  | 'accrued_expenses'       // 未払費用
  | 'executive_compensation' // 役員報酬
  | 'rent_expenses'          // 地代家賃

// ========================================
// 手入力タイプ
// ========================================
export type ManualInputType = 'depreciation' | 'capex'

// ========================================
// コメントタイプ
// ========================================
export type CommentType =
  | 'overall'        // 総合評価
  | 'liquidity'      // 流動性
  | 'profitability'  // 収益性
  | 'efficiency'     // 効率性
  | 'safety'         // 安全性
  | 'growth'         // 成長性

// ========================================
// 財務指標データ
// ========================================
export interface FinancialMetricsData {
  // 流動性・安全性
  netCash?: number                          // NetCash/NetDebt
  currentRatio?: number                     // 流動比率（%）
  equityRatio?: number                      // 自己資本比率（%）
  debtEquityRatio?: number                  // DEレシオ（倍）

  // 効率性
  receivablesTurnoverMonths?: number        // 売掛金滞留月数
  inventoryTurnoverMonths?: number          // 棚卸資産滞留月数
  totalAssetTurnover?: number               // 総資本回転率（回）
  fixedAssetTurnover?: number               // 固定資産回転率（回）
  inventoryTurnover?: number                // 棚卸資産回転率（回）

  // 収益性
  ebitda?: number                           // EBITDA
  fcf?: number                              // フリーキャッシュフロー
  salesGrowthRate?: number                  // 売上高成長率（%）
  operatingIncomeGrowthRate?: number        // 営業利益成長率（%）
  ebitdaGrowthRate?: number                 // EBITDA成長率（%）
  grossProfitMargin?: number                // 売上総利益率（%）
  operatingProfitMargin?: number            // 営業利益率（%）
  ebitdaMargin?: number                     // EBITDA対売上高比率（%）

  // 財務健全性
  ebitdaToInterestBearingDebt?: number      // EBITDA対有利子負債比率

  // 資本効率
  roe?: number                              // ROE（%）
  roa?: number                              // ROA（%）
}

// ========================================
// 期間別財務データ
// ========================================
export interface PeriodFinancialData {
  fiscalYear: number
  periodStartDate?: Date
  periodEndDate?: Date

  // BS項目
  balanceSheet: {
    // 資産
    cashAndDeposits?: number
    securities?: number
    notesReceivable?: number
    accountsReceivable?: number
    inventory?: number
    otherCurrentAssets?: number
    totalCurrentAssets?: number
    tangibleFixedAssets?: number
    land?: number
    buildings?: number
    machinery?: number
    intangibleAssets?: number
    investments?: number
    loansReceivable?: number
    otherFixedAssets?: number
    totalFixedAssets?: number
    deferredAssets?: number
    totalAssets?: number

    // 負債
    notesPayable?: number
    accountsPayable?: number
    shortTermBorrowings?: number
    currentPortionLongTermDebt?: number
    accruedExpenses?: number
    accruedIncomeTaxes?: number
    advancesReceived?: number
    depositsReceived?: number
    otherCurrentLiabilities?: number
    totalCurrentLiabilities?: number
    longTermBorrowings?: number
    bondsPayable?: number
    leaseObligations?: number
    otherLongTermLiabilities?: number
    totalLongTermLiabilities?: number
    totalLiabilities?: number

    // 純資産
    capitalStock?: number
    capitalSurplus?: number
    retainedEarnings?: number
    treasuryStock?: number
    totalNetAssets?: number
    totalLiabilitiesAndNetAssets?: number
  }

  // PL項目
  profitLoss: {
    netSales?: number
    costOfSales?: number
    grossProfit?: number
    personnelExpenses?: number
    executiveCompensation?: number
    rentExpenses?: number
    depreciation?: number
    otherSellingExpenses?: number
    totalSellingGeneralAdmin?: number
    operatingIncome?: number
    interestIncome?: number
    dividendIncome?: number
    otherNonOperatingIncome?: number
    totalNonOperatingIncome?: number
    interestExpense?: number
    otherNonOperatingExpenses?: number
    totalNonOperatingExpenses?: number
    ordinaryIncome?: number
    extraordinaryIncome?: number
    extraordinaryLosses?: number
    incomeBeforeTaxes?: number
    corporateTax?: number
    netIncome?: number
  }

  // 手入力データ
  manualInputs: {
    depreciation?: number  // 減価償却費
    capex?: number        // 設備投資額
  }

  // 勘定科目内訳
  accountDetails: AccountDetail[]

  // この期の財務指標
  metrics?: FinancialMetricsData
}

// ========================================
// 勘定科目内訳
// ========================================
export interface AccountDetail {
  accountType: AccountType
  itemName?: string
  amount?: number
  note?: string
}

// ========================================
// 3期分の財務分析データ
// ========================================
export interface FinancialAnalysis {
  id: string
  companyId: string
  companyName: string
  industryName?: string
  analysisDate: Date
  fiscalYearStart: number
  fiscalYearEnd: number
  periodsCount: number
  status: AnalysisStatus

  // 3期分のデータ
  periods: PeriodFinancialData[]

  // 全体の財務指標（3期平均など）
  overallMetrics?: {
    averageSalesGrowthRate?: number  // 3年間平均成長率
  }

  // AI分析コメント
  comments: AnalysisComment[]

  createdAt: Date
  updatedAt: Date
}

// ========================================
// 分析コメント
// ========================================
export interface AnalysisComment {
  id: string
  commentType: CommentType
  aiGeneratedText?: string
  editedText?: string
  isEdited: boolean
  displayOrder?: number
}

// ========================================
// アップロードファイル情報
// ========================================
export interface UploadedFile {
  id: string
  analysisId: string
  fileType: FileType
  fiscalYear: number
  fileName: string
  filePath: string
  fileSize?: number
  mimeType?: string
  ocrStatus: OcrStatus
  ocrResult?: unknown
  createdAt: Date
}

// ========================================
// PDF読み取り結果
// ========================================
export interface PdfExtractResult {
  success: boolean
  fiscalYear?: number
  balanceSheet?: Partial<PeriodFinancialData['balanceSheet']>
  profitLoss?: Partial<PeriodFinancialData['profitLoss']>
  accountDetails?: AccountDetail[]
  errors?: string[]
  warnings?: string[]
  confidence?: number  // 信頼度 (0-1)
  summary?: string     // AI生成の財務状況要約
}

// ========================================
// グラフデータ型
// ========================================
export interface ChartDataPoint {
  fiscalYear: number
  value: number
  label?: string
}

export interface ChartData {
  title: string
  data: ChartDataPoint[]
  unit?: string  // 単位（円、%など）
  type?: 'line' | 'bar' | 'area'
}

// ========================================
// Excel/PowerPoint出力オプション
// ========================================
export interface ExportOptions {
  includeCharts: boolean
  includeComments: boolean
  includeRawData: boolean
  format: 'xlsx' | 'pptx'
}

// ========================================
// 企業情報
// ========================================
export interface Company {
  id: string
  name: string
  code?: string
  industryId?: string
  industryName?: string
  companyGroupId?: string
  companyGroupName?: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

// ========================================
// 業種情報
// ========================================
export interface Industry {
  id: string
  name: string
  code?: string
  description?: string
}

// ========================================
// 企業グループ情報
// ========================================
export interface CompanyGroup {
  id: string
  name: string
  industryId?: string
  industryName?: string
  description?: string
  companiesCount?: number
}

// ========================================
// ユーティリティ型
// ========================================

// 金額の表示単位
export type AmountUnit = 'ones' | 'thousands' | 'millions' | 'billions'

// 期間比較データ
export interface PeriodComparison {
  currentPeriod: number
  previousPeriod: number
  change: number
  changePercent: number
}

// トレンドデータ
export interface TrendData {
  metric: string
  periods: {
    fiscalYear: number
    value: number
  }[]
  trend: 'increasing' | 'decreasing' | 'stable'
  trendPercent: number
}
