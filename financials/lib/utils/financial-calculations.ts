// 財務指標計算ユーティリティ
import type { PeriodFinancialData, FinancialMetricsData, PeriodComparison, AmountUnit } from '../types/financial'

// データベースのスネークケースフィールドを含む型
type DbBalanceSheet = Record<string, number | undefined>
type DbProfitLoss = Record<string, number | undefined>

/**
 * NetCash / NetDebt を計算
 * = 現金預金 - 有利子負債（短期借入金 + 長期借入金 + 社債 + リース債務）
 */
export function calculateNetCash(data: PeriodFinancialData): number | null {
  const { balanceSheet } = data
  const cashAndDeposits = (balanceSheet as DbBalanceSheet).cash_and_deposits ?? balanceSheet.cashAndDeposits ?? 0

  const interestBearingDebt = calculateInterestBearingDebt(data)
  if (interestBearingDebt === null) return null

  return cashAndDeposits - interestBearingDebt
}

/**
 * 有利子負債を計算
 */
export function calculateInterestBearingDebt(data: PeriodFinancialData): number | null {
  const { balanceSheet } = data

  const shortTerm = (balanceSheet as DbBalanceSheet).short_term_borrowings ?? balanceSheet.shortTermBorrowings ?? 0
  const longTerm = (balanceSheet as DbBalanceSheet).long_term_borrowings ?? balanceSheet.longTermBorrowings ?? 0
  const bonds = (balanceSheet as DbBalanceSheet).bonds_payable ?? balanceSheet.bondsPayable ?? 0
  const lease = (balanceSheet as DbBalanceSheet).lease_obligations ?? balanceSheet.leaseObligations ?? 0

  return shortTerm + longTerm + bonds + lease
}

/**
 * 流動比率を計算
 * = 流動資産 ÷ 流動負債 × 100
 */
export function calculateCurrentRatio(data: PeriodFinancialData): number | null {
  const { balanceSheet } = data
  const currentAssets = (balanceSheet as DbBalanceSheet).current_assets_total ?? balanceSheet.totalCurrentAssets
  const currentLiabilities = (balanceSheet as DbBalanceSheet).current_liabilities_total ?? balanceSheet.totalCurrentLiabilities

  if (!currentAssets || !currentLiabilities || currentLiabilities === 0) return null

  return (currentAssets / currentLiabilities) * 100
}

/**
 * 売掛金滞留月数を計算
 * = 売掛金 ÷ (売上高 ÷ 12)
 */
export function calculateReceivablesTurnoverMonths(data: PeriodFinancialData): number | null {
  const { balanceSheet, profitLoss } = data
  const receivables = (balanceSheet as DbBalanceSheet).accounts_receivable ?? balanceSheet.accountsReceivable
  const sales = (profitLoss as DbProfitLoss).net_sales ?? profitLoss.netSales

  if (!receivables || !sales || sales === 0) return null

  return receivables / (sales / 12)
}

/**
 * 棚卸資産滞留月数を計算
 * = 棚卸資産 ÷ (売上原価 ÷ 12)
 */
export function calculateInventoryTurnoverMonths(data: PeriodFinancialData): number | null {
  const { balanceSheet, profitLoss } = data
  const inventory = (balanceSheet as DbBalanceSheet).inventory ?? balanceSheet.inventory
  const costOfSales = (profitLoss as DbProfitLoss).cost_of_sales ?? profitLoss.costOfSales

  if (!inventory || !costOfSales || costOfSales === 0) return null

  return inventory / (costOfSales / 12)
}

/**
 * EBITDAを計算
 * = 営業利益 + 減価償却費
 */
export function calculateEbitda(data: PeriodFinancialData): number | null {
  const { profitLoss, manualInputs } = data
  const operatingIncome = (profitLoss as DbProfitLoss).operating_income ?? profitLoss.operatingIncome
  const depreciation = manualInputs.depreciation

  if (operatingIncome === undefined || operatingIncome === null) return null
  if (!depreciation) return operatingIncome // 減価償却費がない場合は営業利益のみ

  return operatingIncome + depreciation
}

/**
 * FCF（フリーキャッシュフロー）を計算
 * = EBITDA - 設備投資額
 */
export function calculateFcf(data: PeriodFinancialData): number | null {
  const ebitda = calculateEbitda(data)
  const capex = data.manualInputs.capex ?? 0

  if (ebitda === null) return null

  return ebitda - capex
}

/**
 * 売上高成長率を計算（前期比）
 * = (当期売上高 - 前期売上高) ÷ 前期売上高 × 100
 */
export function calculateSalesGrowthRate(
  currentData: PeriodFinancialData,
  previousData: PeriodFinancialData
): number | null {
  const currentSales = (currentData.profitLoss as DbProfitLoss).net_sales ?? currentData.profitLoss.netSales
  const previousSales = (previousData.profitLoss as DbProfitLoss).net_sales ?? previousData.profitLoss.netSales

  if (!currentSales || !previousSales || previousSales === 0) return null

  return ((currentSales - previousSales) / previousSales) * 100
}

/**
 * 平均成長率を計算（複数年）
 */
export function calculateAverageSalesGrowthRate(periods: PeriodFinancialData[]): number | null {
  if (periods.length < 2) return null

  const growthRates: number[] = []

  for (let i = 1; i < periods.length; i++) {
    const rate = calculateSalesGrowthRate(periods[i], periods[i - 1])
    if (rate !== null) {
      growthRates.push(rate)
    }
  }

  if (growthRates.length === 0) return null

  return growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length
}

/**
 * 営業利益成長率を計算（前期比）
 * = (当期営業利益 - 前期営業利益) ÷ 前期営業利益 × 100
 */
export function calculateOperatingIncomeGrowthRate(
  currentData: PeriodFinancialData,
  previousData: PeriodFinancialData
): number | null {
  const currentOI = (currentData.profitLoss as DbProfitLoss).operating_income ?? currentData.profitLoss.operatingIncome
  const previousOI = (previousData.profitLoss as DbProfitLoss).operating_income ?? previousData.profitLoss.operatingIncome

  if (!currentOI || !previousOI || previousOI === 0) return null

  return ((currentOI - previousOI) / previousOI) * 100
}

/**
 * 営業利益平均成長率を計算
 */
export function calculateAverageOperatingIncomeGrowthRate(periods: PeriodFinancialData[]): number | null {
  if (periods.length < 2) return null

  const growthRates: number[] = []

  for (let i = 1; i < periods.length; i++) {
    const rate = calculateOperatingIncomeGrowthRate(periods[i], periods[i - 1])
    if (rate !== null) {
      growthRates.push(rate)
    }
  }

  if (growthRates.length === 0) return null

  return growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length
}

/**
 * EBITDA成長率を計算（前期比）
 * = (当期EBITDA - 前期EBITDA) ÷ 前期EBITDA × 100
 */
export function calculateEbitdaGrowthRate(
  currentData: PeriodFinancialData,
  previousData: PeriodFinancialData
): number | null {
  const currentEbitda = calculateEbitda(currentData)
  const previousEbitda = calculateEbitda(previousData)

  if (!currentEbitda || !previousEbitda || previousEbitda === 0) return null

  return ((currentEbitda - previousEbitda) / previousEbitda) * 100
}

/**
 * EBITDA平均成長率を計算
 */
export function calculateAverageEbitdaGrowthRate(periods: PeriodFinancialData[]): number | null {
  if (periods.length < 2) return null

  const growthRates: number[] = []

  for (let i = 1; i < periods.length; i++) {
    const rate = calculateEbitdaGrowthRate(periods[i], periods[i - 1])
    if (rate !== null) {
      growthRates.push(rate)
    }
  }

  if (growthRates.length === 0) return null

  return growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length
}

/**
 * 売上総利益率を計算
 * = 売上総利益 ÷ 売上高 × 100
 */
export function calculateGrossProfitMargin(data: PeriodFinancialData): number | null {
  const { profitLoss } = data
  const grossProfit = (profitLoss as DbProfitLoss).gross_profit ?? profitLoss.grossProfit
  const sales = (profitLoss as DbProfitLoss).net_sales ?? profitLoss.netSales

  if (!grossProfit || !sales || sales === 0) return null

  return (grossProfit / sales) * 100
}

/**
 * 営業利益率を計算
 * = 営業利益 ÷ 売上高 × 100
 */
export function calculateOperatingProfitMargin(data: PeriodFinancialData): number | null {
  const { profitLoss } = data
  const operatingIncome = (profitLoss as DbProfitLoss).operating_income ?? profitLoss.operatingIncome
  const sales = (profitLoss as DbProfitLoss).net_sales ?? profitLoss.netSales

  if (!operatingIncome || !sales || sales === 0) return null

  return (operatingIncome / sales) * 100
}

/**
 * 経常利益率を計算
 * = 経常利益 ÷ 売上高 × 100
 */
export function calculateOrdinaryProfitMargin(data: PeriodFinancialData): number | null {
  const { profitLoss } = data
  const ordinaryIncome = (profitLoss as DbProfitLoss).ordinary_income ?? profitLoss.ordinaryIncome
  const sales = (profitLoss as DbProfitLoss).net_sales ?? profitLoss.netSales

  if (!ordinaryIncome || !sales || sales === 0) return null

  return (ordinaryIncome / sales) * 100
}

/**
 * 当期純利益率を計算
 * = 当期純利益 ÷ 売上高 × 100
 */
export function calculateNetProfitMargin(data: PeriodFinancialData): number | null {
  const { profitLoss } = data
  const netIncome = (profitLoss as DbProfitLoss).net_income ?? profitLoss.netIncome
  const sales = (profitLoss as DbProfitLoss).net_sales ?? profitLoss.netSales

  if (!netIncome || !sales || sales === 0) return null

  return (netIncome / sales) * 100
}

/**
 * EBITDA対売上高比率を計算
 * = EBITDA ÷ 売上高 × 100
 */
export function calculateEbitdaMargin(data: PeriodFinancialData): number | null {
  const ebitda = calculateEbitda(data)
  const sales = (data.profitLoss as DbProfitLoss).net_sales ?? data.profitLoss.netSales

  if (!ebitda || !sales || sales === 0) return null

  return (ebitda / sales) * 100
}

/**
 * EBITDA対有利子負債比率を計算
 * = (期首有利子負債 + 期末有利子負債) ÷ 2 ÷ EBITDA
 */
export function calculateEbitdaToInterestBearingDebt(
  currentData: PeriodFinancialData,
  previousData: PeriodFinancialData | null
): number | null {
  const ebitda = calculateEbitda(currentData)
  const endDebt = calculateInterestBearingDebt(currentData)

  if (!ebitda || ebitda === 0 || !endDebt) return null

  let avgDebt = endDebt

  if (previousData) {
    const startDebt = calculateInterestBearingDebt(previousData)
    if (startDebt !== null) {
      avgDebt = (startDebt + endDebt) / 2
    }
  }

  return avgDebt / ebitda
}

/**
 * ROE（自己資本利益率）を計算
 * = 当期純利益 ÷ 純資産 × 100
 */
export function calculateRoe(data: PeriodFinancialData): number | null {
  const { profitLoss, balanceSheet } = data
  const netIncome = (profitLoss as DbProfitLoss).net_income ?? profitLoss.netIncome
  const netAssets = (balanceSheet as DbBalanceSheet).total_net_assets ?? balanceSheet.totalNetAssets

  if (!netIncome || !netAssets || netAssets === 0) return null

  return (netIncome / netAssets) * 100
}

/**
 * ROA（総資産利益率）を計算
 * = 当期純利益 ÷ 総資産 × 100
 */
export function calculateRoa(data: PeriodFinancialData): number | null {
  const { profitLoss, balanceSheet } = data
  const netIncome = (profitLoss as DbProfitLoss).net_income ?? profitLoss.netIncome
  const totalAssets = (balanceSheet as DbBalanceSheet).total_assets ?? balanceSheet.totalAssets

  if (!netIncome || !totalAssets || totalAssets === 0) return null

  return (netIncome / totalAssets) * 100
}

/**
 * 自己資本比率を計算
 * = 純資産 ÷ 総資産 × 100
 */
export function calculateEquityRatio(data: PeriodFinancialData): number | null {
  const { balanceSheet } = data
  const netAssets = (balanceSheet as DbBalanceSheet).total_net_assets ?? balanceSheet.totalNetAssets
  const totalAssets = (balanceSheet as DbBalanceSheet).total_assets ?? balanceSheet.totalAssets

  if (!netAssets || !totalAssets || totalAssets === 0) return null

  return (netAssets / totalAssets) * 100
}

/**
 * 負債比率を計算
 * = 総負債 ÷ 純資産 × 100
 */
export function calculateDebtRatio(data: PeriodFinancialData): number | null {
  const { balanceSheet } = data
  const totalLiabilities = (balanceSheet as DbBalanceSheet).total_liabilities ?? balanceSheet.totalLiabilities
  const netAssets = (balanceSheet as DbBalanceSheet).total_net_assets ?? balanceSheet.totalNetAssets

  if (!totalLiabilities || !netAssets || netAssets === 0) return null

  return (totalLiabilities / netAssets) * 100
}

/**
 * DEレシオ（負債資本倍率）を計算
 * = 有利子負債 ÷ 純資産
 */
export function calculateDebtEquityRatio(data: PeriodFinancialData): number | null {
  const { balanceSheet } = data
  const interestBearingDebt = calculateInterestBearingDebt(data)
  const netAssets = (balanceSheet as DbBalanceSheet).total_net_assets ?? balanceSheet.totalNetAssets

  if (!interestBearingDebt || !netAssets || netAssets === 0) return null

  return interestBearingDebt / netAssets
}

/**
 * 総資本回転率を計算
 * = 売上高 ÷ 総資産（回）
 */
export function calculateTotalAssetTurnover(data: PeriodFinancialData): number | null {
  const { profitLoss, balanceSheet } = data
  const sales = (profitLoss as DbProfitLoss).net_sales ?? profitLoss.netSales
  const totalAssets = (balanceSheet as DbBalanceSheet).total_assets ?? balanceSheet.totalAssets

  if (!sales || !totalAssets || totalAssets === 0) return null

  return sales / totalAssets
}

/**
 * 固定資産回転率を計算
 * = 売上高 ÷ 固定資産（回）
 */
export function calculateFixedAssetTurnover(data: PeriodFinancialData): number | null {
  const { profitLoss, balanceSheet } = data
  const sales = (profitLoss as DbProfitLoss).net_sales ?? profitLoss.netSales
  const fixedAssets = (balanceSheet as DbBalanceSheet).fixed_assets_total ?? balanceSheet.totalFixedAssets

  if (!sales || !fixedAssets || fixedAssets === 0) return null

  return sales / fixedAssets
}

/**
 * 棚卸資産回転率を計算
 * = 売上原価 ÷ 棚卸資産（回）
 */
export function calculateInventoryTurnover(data: PeriodFinancialData): number | null {
  const { profitLoss, balanceSheet } = data
  const costOfSales = (profitLoss as DbProfitLoss).cost_of_sales ?? profitLoss.costOfSales
  const inventory = (balanceSheet as DbBalanceSheet).inventory ?? balanceSheet.inventory

  if (!costOfSales || !inventory || inventory === 0) return null

  return costOfSales / inventory
}

/**
 * すべての財務指標を一括計算
 */
export function calculateAllMetrics(
  currentPeriod: PeriodFinancialData,
  previousPeriod: PeriodFinancialData | null
): FinancialMetricsData {
  return {
    // 流動性・安全性
    netCash: calculateNetCash(currentPeriod) ?? undefined,
    currentRatio: calculateCurrentRatio(currentPeriod) ?? undefined,
    equityRatio: calculateEquityRatio(currentPeriod) ?? undefined,
    debtRatio: calculateDebtRatio(currentPeriod) ?? undefined,
    debtEquityRatio: calculateDebtEquityRatio(currentPeriod) ?? undefined,

    // 効率性
    receivablesTurnoverMonths: calculateReceivablesTurnoverMonths(currentPeriod) ?? undefined,
    inventoryTurnoverMonths: calculateInventoryTurnoverMonths(currentPeriod) ?? undefined,
    totalAssetTurnover: calculateTotalAssetTurnover(currentPeriod) ?? undefined,
    fixedAssetTurnover: calculateFixedAssetTurnover(currentPeriod) ?? undefined,
    inventoryTurnover: calculateInventoryTurnover(currentPeriod) ?? undefined,

    // 収益性
    ebitda: calculateEbitda(currentPeriod) ?? undefined,
    fcf: calculateFcf(currentPeriod) ?? undefined,
    salesGrowthRate: previousPeriod
      ? calculateSalesGrowthRate(currentPeriod, previousPeriod) ?? undefined
      : undefined,
    grossProfitMargin: calculateGrossProfitMargin(currentPeriod) ?? undefined,
    operatingProfitMargin: calculateOperatingProfitMargin(currentPeriod) ?? undefined,
    ordinaryProfitMargin: calculateOrdinaryProfitMargin(currentPeriod) ?? undefined,
    netProfitMargin: calculateNetProfitMargin(currentPeriod) ?? undefined,
    ebitdaMargin: calculateEbitdaMargin(currentPeriod) ?? undefined,

    // 財務健全性
    ebitdaToInterestBearingDebt: previousPeriod
      ? calculateEbitdaToInterestBearingDebt(currentPeriod, previousPeriod) ?? undefined
      : undefined,

    // 資本効率
    roe: calculateRoe(currentPeriod) ?? undefined,
    roa: calculateRoa(currentPeriod) ?? undefined,
  }
}

/**
 * 期間比較データを生成
 */
export function createPeriodComparison(
  current: number,
  previous: number
): PeriodComparison {
  const change = current - previous
  const changePercent = previous !== 0 ? (change / previous) * 100 : 0

  return {
    currentPeriod: current,
    previousPeriod: previous,
    change,
    changePercent,
  }
}

/**
 * 数値のフォーマット
 */
export function formatNumber(value: number | null | undefined, decimals: number = 0): string {
  if (value === null || value === undefined) return '-'
  return value.toLocaleString('ja-JP', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * パーセンテージのフォーマット
 */
export function formatPercent(value: number | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined) return '-'
  return `${value.toFixed(decimals)}%`
}

/**
 * 金額のフォーマット（円）
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return `¥${formatNumber(value)}`
}

/**
 * 金額の桁数から適切な単位を自動判定
 * 売上や総資産が6桁程度に収まるように選択
 */
export function determineAmountUnit(periods: PeriodFinancialData[]): AmountUnit {
  // 全期間の中から最大の金額を見つける
  let maxAmount = 0

  for (const period of periods) {
    const sales = (period.profitLoss as DbProfitLoss).net_sales ?? period.profitLoss.netSales ?? 0
    const totalAssets = (period.balanceSheet as DbBalanceSheet).total_assets ?? period.balanceSheet.totalAssets ?? 0

    maxAmount = Math.max(maxAmount, sales, totalAssets)
  }

  // 10億円以上: 十億円単位
  if (maxAmount >= 1_000_000_000) {
    return 'billions'
  }
  // 1000万円以上: 百万円単位
  if (maxAmount >= 10_000_000) {
    return 'millions'
  }
  // 1万円以上: 千円単位
  if (maxAmount >= 10_000) {
    return 'thousands'
  }
  // それ以下: 円単位
  return 'ones'
}

/**
 * 金額を指定された単位に変換
 */
export function convertAmount(value: number, unit: AmountUnit): number {
  switch (unit) {
    case 'billions':
      return value / 1_000_000_000
    case 'millions':
      return value / 1_000_000
    case 'thousands':
      return value / 1_000
    case 'ones':
    default:
      return value
  }
}

/**
 * 単位のラベルを取得
 */
export function getUnitLabel(unit: AmountUnit): string {
  switch (unit) {
    case 'billions':
      return '十億円'
    case 'millions':
      return '百万円'
    case 'thousands':
      return '千円'
    case 'ones':
    default:
      return '円'
  }
}

/**
 * 金額を単位付きでフォーマット
 */
export function formatAmountWithUnit(
  value: number | null | undefined,
  unit: AmountUnit,
  decimals: number = 0
): string {
  if (value === null || value === undefined) return '-'

  const converted = convertAmount(value, unit)
  return formatNumber(converted, decimals)
}

/**
 * CAGR（年平均成長率）を計算
 * = ((最終値 / 初期値) ^ (1 / 年数) - 1) × 100
 */
export function calculateCAGR(
  startValue: number,
  endValue: number,
  years: number
): number | null {
  if (!startValue || !endValue || startValue <= 0 || years <= 0) return null

  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100
}

/**
 * 売上高CAGR（年平均成長率）を計算
 */
export function calculateSalesCAGR(periods: PeriodFinancialData[]): number | null {
  if (periods.length < 2) return null

  const firstPeriod = periods[0]
  const lastPeriod = periods[periods.length - 1]

  const startSales = (firstPeriod.profitLoss as DbProfitLoss).net_sales ?? firstPeriod.profitLoss.netSales
  const endSales = (lastPeriod.profitLoss as DbProfitLoss).net_sales ?? lastPeriod.profitLoss.netSales

  if (!startSales || !endSales) return null

  const years = periods.length - 1
  return calculateCAGR(startSales, endSales, years)
}

/**
 * 営業利益CAGR（年平均成長率）を計算
 */
export function calculateOperatingIncomeCAGR(periods: PeriodFinancialData[]): number | null {
  if (periods.length < 2) return null

  const firstPeriod = periods[0]
  const lastPeriod = periods[periods.length - 1]

  const startOI = (firstPeriod.profitLoss as DbProfitLoss).operating_income ?? firstPeriod.profitLoss.operatingIncome
  const endOI = (lastPeriod.profitLoss as DbProfitLoss).operating_income ?? lastPeriod.profitLoss.operatingIncome

  if (!startOI || !endOI) return null

  const years = periods.length - 1
  return calculateCAGR(startOI, endOI, years)
}

/**
 * EBITDA CAGR（年平均成長率）を計算
 */
export function calculateEbitdaCAGR(periods: PeriodFinancialData[]): number | null {
  if (periods.length < 2) return null

  const firstPeriod = periods[0]
  const lastPeriod = periods[periods.length - 1]

  const startEbitda = calculateEbitda(firstPeriod)
  const endEbitda = calculateEbitda(lastPeriod)

  if (!startEbitda || !endEbitda) return null

  const years = periods.length - 1
  return calculateCAGR(startEbitda, endEbitda, years)
}
