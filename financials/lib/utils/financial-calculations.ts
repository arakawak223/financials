// 財務指標計算ユーティリティ
import type { PeriodFinancialData, FinancialMetricsData, PeriodComparison } from '../types/financial'

/**
 * NetCash / NetDebt を計算
 * = 現金預金 - 有利子負債（短期借入金 + 長期借入金 + 社債 + リース債務）
 */
export function calculateNetCash(data: PeriodFinancialData): number | null {
  const { balanceSheet } = data
  const cashAndDeposits = balanceSheet.cashAndDeposits ?? 0

  const interestBearingDebt = calculateInterestBearingDebt(data)
  if (interestBearingDebt === null) return null

  return cashAndDeposits - interestBearingDebt
}

/**
 * 有利子負債を計算
 */
export function calculateInterestBearingDebt(data: PeriodFinancialData): number | null {
  const { balanceSheet } = data

  const shortTerm = balanceSheet.shortTermBorrowings ?? 0
  const longTerm = balanceSheet.longTermBorrowings ?? 0
  const bonds = balanceSheet.bondsPayable ?? 0
  const lease = balanceSheet.leaseObligations ?? 0

  return shortTerm + longTerm + bonds + lease
}

/**
 * 流動比率を計算
 * = 流動資産 ÷ 流動負債 × 100
 */
export function calculateCurrentRatio(data: PeriodFinancialData): number | null {
  const { balanceSheet } = data
  const currentAssets = balanceSheet.totalCurrentAssets
  const currentLiabilities = balanceSheet.totalCurrentLiabilities

  if (!currentAssets || !currentLiabilities || currentLiabilities === 0) return null

  return (currentAssets / currentLiabilities) * 100
}

/**
 * 売掛金滞留月数を計算
 * = 売掛金 ÷ (売上高 ÷ 12)
 */
export function calculateReceivablesTurnoverMonths(data: PeriodFinancialData): number | null {
  const { balanceSheet, profitLoss } = data
  const receivables = balanceSheet.accountsReceivable
  const sales = profitLoss.netSales

  if (!receivables || !sales || sales === 0) return null

  return receivables / (sales / 12)
}

/**
 * 棚卸資産滞留月数を計算
 * = 棚卸資産 ÷ (売上原価 ÷ 12)
 */
export function calculateInventoryTurnoverMonths(data: PeriodFinancialData): number | null {
  const { balanceSheet, profitLoss } = data
  const inventory = balanceSheet.inventory
  const costOfSales = profitLoss.costOfSales

  if (!inventory || !costOfSales || costOfSales === 0) return null

  return inventory / (costOfSales / 12)
}

/**
 * EBITDAを計算
 * = 営業利益 + 減価償却費
 */
export function calculateEbitda(data: PeriodFinancialData): number | null {
  const { profitLoss, manualInputs } = data
  const operatingIncome = profitLoss.operatingIncome
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
  const currentSales = currentData.profitLoss.netSales
  const previousSales = previousData.profitLoss.netSales

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
 * 売上総利益率を計算
 * = 売上総利益 ÷ 売上高 × 100
 */
export function calculateGrossProfitMargin(data: PeriodFinancialData): number | null {
  const { profitLoss } = data
  const grossProfit = profitLoss.grossProfit
  const sales = profitLoss.netSales

  if (!grossProfit || !sales || sales === 0) return null

  return (grossProfit / sales) * 100
}

/**
 * 営業利益率を計算
 * = 営業利益 ÷ 売上高 × 100
 */
export function calculateOperatingProfitMargin(data: PeriodFinancialData): number | null {
  const { profitLoss } = data
  const operatingIncome = profitLoss.operatingIncome
  const sales = profitLoss.netSales

  if (!operatingIncome || !sales || sales === 0) return null

  return (operatingIncome / sales) * 100
}

/**
 * EBITDA対売上高比率を計算
 * = EBITDA ÷ 売上高 × 100
 */
export function calculateEbitdaMargin(data: PeriodFinancialData): number | null {
  const ebitda = calculateEbitda(data)
  const sales = data.profitLoss.netSales

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
  const netIncome = profitLoss.netIncome
  const netAssets = balanceSheet.totalNetAssets

  if (!netIncome || !netAssets || netAssets === 0) return null

  return (netIncome / netAssets) * 100
}

/**
 * ROA（総資産利益率）を計算
 * = 当期純利益 ÷ 総資産 × 100
 */
export function calculateRoa(data: PeriodFinancialData): number | null {
  const { profitLoss, balanceSheet } = data
  const netIncome = profitLoss.netIncome
  const totalAssets = balanceSheet.totalAssets

  if (!netIncome || !totalAssets || totalAssets === 0) return null

  return (netIncome / totalAssets) * 100
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

    // 効率性
    receivablesTurnoverMonths: calculateReceivablesTurnoverMonths(currentPeriod) ?? undefined,
    inventoryTurnoverMonths: calculateInventoryTurnoverMonths(currentPeriod) ?? undefined,

    // 収益性
    ebitda: calculateEbitda(currentPeriod) ?? undefined,
    fcf: calculateFcf(currentPeriod) ?? undefined,
    salesGrowthRate: previousPeriod
      ? calculateSalesGrowthRate(currentPeriod, previousPeriod) ?? undefined
      : undefined,
    grossProfitMargin: calculateGrossProfitMargin(currentPeriod) ?? undefined,
    operatingProfitMargin: calculateOperatingProfitMargin(currentPeriod) ?? undefined,
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
