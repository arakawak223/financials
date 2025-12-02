// 事業計画財務三表計算ロジック

import type {
  PlanGeneralParameters,
  PlanSalesCategory,
  PlanSalesGrowthRate,
  PlanCostSetting,
  PlanPersonnelSetting,
  PlanExpenseItem,
  PlanExpenseGrowthRate,
  PlanNonOperatingItem,
  PlanNonOperatingGrowthRate,
  PlanExtraordinaryItem,
  PlanCapexSetting,
  PlanDepreciationSetting,
  PlanDebtSetting,
  PlanResultPL,
  PlanResultBS,
  PlanResultCF,
  HistoricalFinancialData,
} from '@/lib/types/business-plan'

export interface PlanCalculationInput {
  planId: string
  planStartYear: number
  planYears: number
  historicalData: HistoricalFinancialData[] // 過去3期分
  generalParameters: PlanGeneralParameters
  salesCategories: PlanSalesCategory[]
  salesGrowthRates: PlanSalesGrowthRate[]
  costSettings: PlanCostSetting[]
  personnelSettings: PlanPersonnelSetting[]
  expenseItems: PlanExpenseItem[]
  expenseGrowthRates: PlanExpenseGrowthRate[]
  nonOperatingItems: PlanNonOperatingItem[]
  nonOperatingGrowthRates: PlanNonOperatingGrowthRate[]
  extraordinaryItems: PlanExtraordinaryItem[]
  capexSettings: PlanCapexSetting[]
  depreciationSettings: PlanDepreciationSetting[]
  debtSettings: PlanDebtSetting[]
}

export interface PlanCalculationOutput {
  plResults: PlanResultPL[]
  bsResults: PlanResultBS[]
  cfResults: PlanResultCF[]
}

// 過去データから基準年度の値を取得
function getBaseYearValue(
  historicalData: HistoricalFinancialData[],
  field: keyof HistoricalFinancialData
): number {
  // 最新年度のデータを基準とする
  const sortedData = [...historicalData].sort((a, b) => b.fiscalYear - a.fiscalYear)
  return (sortedData[0]?.[field] as number) || 0
}

// 成長率を適用
function applyGrowthRate(baseValue: number, growthRate: number): number {
  return baseValue * (1 + growthRate / 100)
}

// 売上高を計算
function calculateSales(
  input: PlanCalculationInput,
  fiscalYear: number,
  prevYearSales: number
): number {
  // カテゴリー別成長率があれば使用、なければ全社設定を使用
  const yearGrowthRates = input.salesGrowthRates.filter(
    (r) => r.fiscalYear === fiscalYear
  )

  if (yearGrowthRates.length === 0) {
    // デフォルト成長率を適用（3%）
    return applyGrowthRate(prevYearSales, 3)
  }

  // 全社設定（category_id が null）を探す
  const overallRate = yearGrowthRates.find((r) => !r.categoryId)
  if (overallRate?.growthRate !== undefined) {
    return applyGrowthRate(prevYearSales, overallRate.growthRate)
  }

  // カテゴリー別に計算
  let totalSales = 0
  for (const category of input.salesCategories) {
    const categoryRate = yearGrowthRates.find((r) => r.categoryId === category.id)
    const baseAmount = category.baseYearAmount || 0
    const growthRate = categoryRate?.growthRate || 3 // デフォルト3%

    if (category.useUnitPriceQuantity && categoryRate) {
      // 単価×数量で計算
      const unitPriceGrowth = categoryRate.unitPriceGrowthRate || 0
      const quantityGrowth = categoryRate.quantityGrowthRate || 0
      const prevUnitPrice = category.baseYearUnitPrice || 0
      const prevQuantity = category.baseYearQuantity || 0
      const newUnitPrice = applyGrowthRate(prevUnitPrice, unitPriceGrowth)
      const newQuantity = applyGrowthRate(prevQuantity, quantityGrowth)
      totalSales += newUnitPrice * newQuantity
    } else {
      totalSales += applyGrowthRate(baseAmount, growthRate)
    }
  }

  return totalSales > 0 ? totalSales : applyGrowthRate(prevYearSales, 3)
}

// 売上原価を計算
function calculateCostOfSales(
  input: PlanCalculationInput,
  fiscalYear: number,
  netSales: number
): number {
  // 年度別原価率設定を探す
  const yearCostSettings = input.costSettings.filter(
    (c) => c.fiscalYear === fiscalYear
  )

  // 全社設定を探す
  const overallCost = yearCostSettings.find((c) => !c.categoryId)
  if (overallCost?.costRate !== undefined) {
    return netSales * (overallCost.costRate / 100)
  }

  // 過去データから原価率を推定
  const baseYearCost = getBaseYearValue(input.historicalData, 'costOfSales')
  const baseYearSales = getBaseYearValue(input.historicalData, 'netSales')
  const historicalCostRate = baseYearSales > 0 ? (baseYearCost / baseYearSales) * 100 : 70

  return netSales * (historicalCostRate / 100)
}

// 人件費を計算
function calculatePersonnelCost(
  input: PlanCalculationInput,
  fiscalYear: number,
  yearIndex: number
): number {
  const setting = input.personnelSettings.find((p) => p.fiscalYear === fiscalYear)

  if (!setting) {
    // 過去データから人件費を取得してデフォルト成長率を適用
    const basePersonnel = getBaseYearValue(input.historicalData, 'personnelExpenses')
    const baseExecutive = getBaseYearValue(input.historicalData, 'executiveCompensation')
    return (basePersonnel + baseExecutive) * Math.pow(1.02, yearIndex) // デフォルト2%増
  }

  // 従業員人件費
  const baseEmployeeCount = setting.baseYearEmployeeCount || 0
  const baseAvgSalary = setting.baseYearAvgSalary || 0
  const wageGrowthRate = setting.wageGrowthRate || 2
  const hiringRate = setting.hiringRate || 0
  const turnoverRate = setting.turnoverRate || 0
  const netHiringRate = hiringRate - turnoverRate

  // 人員数の推移（累積）
  const employeeCount = baseEmployeeCount * Math.pow(1 + netHiringRate / 100, yearIndex)
  // 平均賃金の推移（累積）
  const avgSalary = baseAvgSalary * Math.pow(1 + wageGrowthRate / 100, yearIndex)
  const employeeCost = employeeCount * avgSalary

  // 役員報酬
  const baseExecutiveComp = setting.baseYearExecutiveCompensation || 0
  const execGrowthRate = setting.executiveCompensationGrowthRate || 0
  const executiveCost = baseExecutiveComp * Math.pow(1 + execGrowthRate / 100, yearIndex)

  return employeeCost + executiveCost
}

// 販管費（人件費以外）を計算
function calculateOtherSgaExpenses(
  input: PlanCalculationInput,
  fiscalYear: number,
  yearIndex: number
): number {
  const nonPersonnelExpenses = input.expenseItems.filter((e) => !e.isPersonnelCost)

  let totalExpense = 0
  for (const expense of nonPersonnelExpenses) {
    const growthRate = input.expenseGrowthRates.find(
      (g) => g.expenseItemId === expense.id && g.fiscalYear === fiscalYear
    )
    const baseAmount = expense.baseYearAmount || 0
    const rate = growthRate?.growthRate || 2 // デフォルト2%増

    totalExpense += baseAmount * Math.pow(1 + rate / 100, yearIndex)
  }

  // 設定がない場合は過去データから推定
  if (totalExpense === 0) {
    const baseSga = getBaseYearValue(input.historicalData, 'sellingGeneralAdminExpenses')
    const basePersonnel = getBaseYearValue(input.historicalData, 'personnelExpenses')
    const baseExecutive = getBaseYearValue(input.historicalData, 'executiveCompensation')
    const baseOtherSga = baseSga - basePersonnel - baseExecutive
    totalExpense = baseOtherSga * Math.pow(1.02, yearIndex)
  }

  return Math.max(0, totalExpense)
}

// 減価償却費を計算
function calculateDepreciation(
  input: PlanCalculationInput,
  fiscalYear: number,
  yearIndex: number,
  accumulatedCapex: number[]
): number {
  let totalDepreciation = 0

  // 既存資産の償却
  for (const setting of input.depreciationSettings) {
    if (setting.existingBookValue && setting.existingRemainingYears) {
      const remainingYears = Math.max(0, setting.existingRemainingYears - yearIndex)
      if (remainingYears > 0) {
        totalDepreciation += setting.existingBookValue / setting.existingRemainingYears
      }
    }
  }

  // 新規投資の償却
  const tangibleSetting = input.depreciationSettings.find(
    (d) => d.assetCategory === 'tangible'
  )
  const usefulLife = tangibleSetting?.newAssetUsefulLife || 10

  for (let i = 0; i < yearIndex; i++) {
    const capex = accumulatedCapex[i] || 0
    const yearsDepreciated = yearIndex - i
    if (yearsDepreciated <= usefulLife) {
      totalDepreciation += capex / usefulLife
    }
  }

  // 設定がない場合は過去データから推定
  if (totalDepreciation === 0) {
    const baseDepreciation = getBaseYearValue(input.historicalData, 'depreciation')
    totalDepreciation = baseDepreciation
  }

  return totalDepreciation
}

// 営業外損益を計算
function calculateNonOperatingItems(
  input: PlanCalculationInput,
  fiscalYear: number,
  yearIndex: number
): { income: number; expense: number } {
  let income = 0
  let expense = 0

  for (const item of input.nonOperatingItems) {
    const growthRate = input.nonOperatingGrowthRates.find(
      (g) => g.itemId === item.id && g.fiscalYear === fiscalYear
    )
    const baseAmount = item.baseYearAmount || 0
    const rate = growthRate?.growthRate || 0
    const amount = baseAmount * Math.pow(1 + rate / 100, yearIndex)

    if (item.itemType === 'income') {
      income += amount
    } else {
      expense += amount
    }
  }

  // 設定がない場合は過去データから取得
  if (income === 0) {
    income = getBaseYearValue(input.historicalData, 'nonOperatingIncome')
  }
  if (expense === 0) {
    expense = getBaseYearValue(input.historicalData, 'nonOperatingExpenses')
  }

  return { income, expense }
}

// 支払利息を計算
function calculateInterestExpense(
  input: PlanCalculationInput,
  totalDebt: number
): number {
  // 加重平均金利を計算
  let totalBalance = 0
  let weightedInterest = 0

  for (const debt of input.debtSettings) {
    const balance = (debt.existingBalance || 0) + (debt.plannedBorrowing || 0)
    const rate = debt.existingInterestRate || debt.plannedInterestRate || 2
    totalBalance += balance
    weightedInterest += balance * (rate / 100)
  }

  if (totalBalance > 0) {
    return weightedInterest
  }

  // デフォルトは有利子負債の2%
  return totalDebt * 0.02
}

// 特別損益を計算
function calculateExtraordinaryItems(
  input: PlanCalculationInput,
  fiscalYear: number
): { income: number; loss: number } {
  let income = 0
  let loss = 0

  const yearItems = input.extraordinaryItems.filter(
    (e) => e.fiscalYear === fiscalYear
  )

  for (const item of yearItems) {
    if (item.itemType === 'income') {
      income += item.amount || 0
    } else {
      loss += item.amount || 0
    }
  }

  return { income, loss }
}

// 有利子負債の推移を計算
function calculateDebtBalance(
  input: PlanCalculationInput,
  yearIndex: number
): { shortTerm: number; longTerm: number; total: number } {
  let shortTerm = 0
  let longTerm = 0

  for (const debt of input.debtSettings) {
    const existingBalance = debt.existingBalance || 0
    const repaymentYears = debt.repaymentYears || 10
    const yearlyRepayment = existingBalance / repaymentYears
    const remainingBalance = Math.max(0, existingBalance - yearlyRepayment * yearIndex)

    // 新規借入
    const plannedBorrowing = debt.plannedBorrowing || 0
    const plannedYears = debt.plannedRepaymentYears || 10

    if (debt.debtType === 'short_term_loan') {
      shortTerm += remainingBalance + plannedBorrowing
    } else {
      longTerm += remainingBalance + plannedBorrowing
    }
  }

  // 設定がない場合は過去データから推定
  if (shortTerm === 0 && longTerm === 0) {
    shortTerm = getBaseYearValue(input.historicalData, 'shortTermBorrowings')
    longTerm = getBaseYearValue(input.historicalData, 'longTermBorrowings')
  }

  return { shortTerm, longTerm, total: shortTerm + longTerm }
}

// メイン計算関数
export function calculatePlanFinancials(
  input: PlanCalculationInput
): PlanCalculationOutput {
  const plResults: PlanResultPL[] = []
  const bsResults: PlanResultBS[] = []
  const cfResults: PlanResultCF[] = []

  // 基準年度のデータを取得
  const baseYearData = input.historicalData.sort(
    (a, b) => b.fiscalYear - a.fiscalYear
  )[0]

  let prevNetSales = baseYearData?.netSales || 0
  let prevCash = baseYearData?.cashAndDeposits || 0
  let prevRetainedEarnings = baseYearData?.retainedEarnings || 0
  let prevAccountsReceivable = baseYearData?.accountsReceivable || 0
  let prevInventory = baseYearData?.inventory || 0
  let prevAccountsPayable = baseYearData?.accountsPayable || 0
  let prevTangibleAssets = baseYearData?.tangibleFixedAssets || 0
  const accumulatedCapex: number[] = []

  for (let i = 0; i < input.planYears; i++) {
    const fiscalYear = input.planStartYear + i

    // === PL計算 ===
    const netSales = calculateSales(input, fiscalYear, prevNetSales)
    const costOfSales = calculateCostOfSales(input, fiscalYear, netSales)
    const grossProfit = netSales - costOfSales
    const personnelCost = calculatePersonnelCost(input, fiscalYear, i)
    const otherSgaExpenses = calculateOtherSgaExpenses(input, fiscalYear, i)

    // 設備投資と減価償却
    const capexSetting = input.capexSettings.find((c) => c.fiscalYear === fiscalYear)
    const capex = (capexSetting?.growthInvestment || 0) + (capexSetting?.maintenanceInvestment || 0)
    accumulatedCapex.push(capex)

    const depreciation = calculateDepreciation(input, fiscalYear, i, accumulatedCapex)
    const sellingGeneralAdminExpenses = personnelCost + otherSgaExpenses + depreciation
    const operatingIncome = grossProfit - sellingGeneralAdminExpenses

    // 営業外損益
    const nonOperating = calculateNonOperatingItems(input, fiscalYear, i)
    const debtBalance = calculateDebtBalance(input, i)
    const interestExpense = calculateInterestExpense(input, debtBalance.total)
    const ordinaryIncome = operatingIncome + nonOperating.income - nonOperating.expense - interestExpense

    // 特別損益
    const extraordinary = calculateExtraordinaryItems(input, fiscalYear)
    const incomeBeforeTax = ordinaryIncome + extraordinary.income - extraordinary.loss

    // 法人税等
    const taxRate = input.generalParameters.corporateTaxRate || 30
    const incomeTaxes = Math.max(0, incomeBeforeTax * (taxRate / 100))
    const netIncome = incomeBeforeTax - incomeTaxes

    const plResult: PlanResultPL = {
      id: `pl-${fiscalYear}`,
      planId: input.planId,
      fiscalYear,
      netSales,
      costOfSales,
      grossProfit,
      personnelCost,
      otherSgaExpenses,
      depreciationExpense: depreciation,
      sellingGeneralAdminExpenses,
      operatingIncome,
      nonOperatingIncome: nonOperating.income,
      nonOperatingExpenses: nonOperating.expense,
      interestExpense,
      ordinaryIncome,
      extraordinaryIncome: extraordinary.income,
      extraordinaryLosses: extraordinary.loss,
      incomeBeforeTax,
      incomeTaxes,
      netIncome,
    }
    plResults.push(plResult)

    // === BS計算 ===
    const arMonths = input.generalParameters.accountsReceivableMonths || 2
    const invMonths = input.generalParameters.inventoryMonths || 1.5
    const apMonths = input.generalParameters.accountsPayableMonths || 1.5

    const monthlySales = netSales / 12
    const monthlyCost = costOfSales / 12

    const accountsReceivable = monthlySales * arMonths
    const inventory = monthlyCost * invMonths
    const accountsPayable = monthlyCost * apMonths

    // 運転資本の変動
    const changeInReceivables = accountsReceivable - prevAccountsReceivable
    const changeInInventory = inventory - prevInventory
    const changeInPayables = accountsPayable - prevAccountsPayable

    // 固定資産
    const tangibleFixedAssets = prevTangibleAssets + capex - depreciation

    // キャッシュの計算（後でCF計算から調整）
    const operatingCashFlow = netIncome + depreciation - changeInReceivables - changeInInventory + changeInPayables
    const investingCashFlow = -capex
    const debtRepayment = debtBalance.total > 0 ? debtBalance.total / 10 : 0 // 10年で返済
    const financingCashFlow = -debtRepayment

    const netChangeInCash = operatingCashFlow + investingCashFlow + financingCashFlow
    const cashAndDeposits = prevCash + netChangeInCash

    const currentAssetsTotal = cashAndDeposits + accountsReceivable + inventory
    const fixedAssetsTotal = tangibleFixedAssets +
      (baseYearData?.intangibleFixedAssets || 0) +
      (baseYearData?.investmentsAndOtherAssets || 0)
    const totalAssets = currentAssetsTotal + fixedAssetsTotal

    const currentLiabilitiesTotal = accountsPayable + debtBalance.shortTerm
    const fixedLiabilitiesTotal = debtBalance.longTerm
    const totalLiabilities = currentLiabilitiesTotal + fixedLiabilitiesTotal

    const capitalStock = baseYearData?.capitalStock || 0
    const retainedEarnings = prevRetainedEarnings + netIncome
    const totalNetAssets = capitalStock + retainedEarnings

    const bsResult: PlanResultBS = {
      id: `bs-${fiscalYear}`,
      planId: input.planId,
      fiscalYear,
      cashAndDeposits,
      accountsReceivable,
      inventory,
      otherCurrentAssets: 0,
      currentAssetsTotal,
      tangibleFixedAssets,
      intangibleFixedAssets: baseYearData?.intangibleFixedAssets || 0,
      investmentsAndOtherAssets: baseYearData?.investmentsAndOtherAssets || 0,
      fixedAssetsTotal,
      totalAssets,
      accountsPayable,
      shortTermBorrowings: debtBalance.shortTerm,
      otherCurrentLiabilities: 0,
      currentLiabilitiesTotal,
      longTermBorrowings: debtBalance.longTerm,
      bondsPayable: 0,
      leaseObligations: 0,
      otherFixedLiabilities: 0,
      fixedLiabilitiesTotal,
      totalLiabilities,
      capitalStock,
      retainedEarnings,
      totalNetAssets,
    }
    bsResults.push(bsResult)

    // === CF計算 ===
    const cfResult: PlanResultCF = {
      id: `cf-${fiscalYear}`,
      planId: input.planId,
      fiscalYear,
      netIncomeCf: netIncome,
      depreciationCf: depreciation,
      changeInReceivables: -changeInReceivables,
      changeInInventory: -changeInInventory,
      changeInPayables: changeInPayables,
      otherOperatingCf: 0,
      operatingCashFlow,
      capex: -capex,
      otherInvestingCf: 0,
      investingCashFlow,
      debtRepayment: -debtRepayment,
      newBorrowings: 0,
      dividendsPaid: 0,
      otherFinancingCf: 0,
      financingCashFlow,
      netChangeInCash,
      beginningCash: prevCash,
      endingCash: cashAndDeposits,
      freeCashFlow: operatingCashFlow + investingCashFlow,
    }
    cfResults.push(cfResult)

    // 次年度への引継ぎ
    prevNetSales = netSales
    prevCash = cashAndDeposits
    prevRetainedEarnings = retainedEarnings
    prevAccountsReceivable = accountsReceivable
    prevInventory = inventory
    prevAccountsPayable = accountsPayable
    prevTangibleAssets = tangibleFixedAssets
  }

  return { plResults, bsResults, cfResults }
}
