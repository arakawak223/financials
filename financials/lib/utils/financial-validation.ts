/**
 * 財務データのバリデーション関数
 */

export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface BalanceSheetData {
  cash_and_deposits?: number | null
  accounts_receivable?: number | null
  inventory?: number | null
  current_assets_total?: number | null
  tangible_fixed_assets?: number | null
  intangible_fixed_assets?: number | null
  investments_and_other_assets?: number | null
  fixed_assets_total?: number | null
  total_assets?: number | null
  accounts_payable?: number | null
  short_term_borrowings?: number | null
  current_liabilities_total?: number | null
  long_term_borrowings?: number | null
  fixed_liabilities_total?: number | null
  total_liabilities?: number | null
  capital_stock?: number | null
  retained_earnings?: number | null
  total_net_assets?: number | null
}

export interface ProfitLossData {
  net_sales?: number | null
  cost_of_sales?: number | null
  gross_profit?: number | null
  selling_general_admin_expenses?: number | null
  operating_income?: number | null
  non_operating_income?: number | null
  non_operating_expenses?: number | null
  ordinary_income?: number | null
  extraordinary_income?: number | null
  extraordinary_losses?: number | null
  income_before_tax?: number | null
  income_taxes?: number | null
  net_income?: number | null
}

/**
 * 数値の妥当性チェック
 */
export function validateNumber(
  value: any,
  fieldName: string,
  options: {
    required?: boolean
    min?: number
    max?: number
    allowNegative?: boolean
  } = {}
): ValidationError | null {
  const { required = false, min, max, allowNegative = true } = options

  // 必須チェック
  if (required && (value === null || value === undefined || value === '')) {
    return {
      field: fieldName,
      message: `${fieldName}は必須項目です`,
      severity: 'error',
    }
  }

  // 空値は許容
  if (value === null || value === undefined || value === '') {
    return null
  }

  // 数値変換
  const numValue = typeof value === 'number' ? value : parseFloat(value)

  // 数値チェック
  if (isNaN(numValue) || !isFinite(numValue)) {
    return {
      field: fieldName,
      message: `${fieldName}は有効な数値である必要があります`,
      severity: 'error',
    }
  }

  // 負数チェック
  if (!allowNegative && numValue < 0) {
    return {
      field: fieldName,
      message: `${fieldName}は0以上である必要があります`,
      severity: 'error',
    }
  }

  // 最小値チェック
  if (min !== undefined && numValue < min) {
    return {
      field: fieldName,
      message: `${fieldName}は${min}以上である必要があります`,
      severity: 'error',
    }
  }

  // 最大値チェック
  if (max !== undefined && numValue > max) {
    return {
      field: fieldName,
      message: `${fieldName}は${max}以下である必要があります`,
      severity: 'error',
    }
  }

  return null
}

/**
 * 貸借対照表の整合性チェック
 */
export function validateBalanceSheet(data: BalanceSheetData): ValidationError[] {
  const errors: ValidationError[] = []
  const tolerance = 1 // 許容誤差（円）

  // 流動資産の整合性チェック
  if (
    data.cash_and_deposits !== null &&
    data.accounts_receivable !== null &&
    data.inventory !== null &&
    data.current_assets_total !== null &&
    data.current_assets_total !== undefined
  ) {
    const calculatedCurrentAssets =
      (data.cash_and_deposits || 0) +
      (data.accounts_receivable || 0) +
      (data.inventory || 0)

    const diff = Math.abs(calculatedCurrentAssets - data.current_assets_total)

    if (diff > tolerance) {
      errors.push({
        field: 'current_assets_total',
        message: `流動資産合計が不整合です（計算値: ${calculatedCurrentAssets.toLocaleString()}円、入力値: ${data.current_assets_total.toLocaleString()}円）`,
        severity: 'warning',
      })
    }
  }

  // 固定資産の整合性チェック
  if (
    data.tangible_fixed_assets !== null &&
    data.intangible_fixed_assets !== null &&
    data.investments_and_other_assets !== null &&
    data.fixed_assets_total !== null&& data.fixed_assets_total !== undefined
  ) {
    const calculatedFixedAssets =
      (data.tangible_fixed_assets || 0) +
      (data.intangible_fixed_assets || 0) +
      (data.investments_and_other_assets || 0)

    const diff = Math.abs(calculatedFixedAssets - data.fixed_assets_total)

    if (diff > tolerance) {
      errors.push({
        field: 'fixed_assets_total',
        message: `固定資産合計が不整合です（計算値: ${calculatedFixedAssets.toLocaleString()}円、入力値: ${data.fixed_assets_total.toLocaleString()}円）`,
        severity: 'warning',
      })
    }
  }

  // 総資産の整合性チェック
  if (
    data.current_assets_total !== null &&
    data.fixed_assets_total !== null &&
    data.total_assets !== null&& data.total_assets !== undefined
  ) {
    const calculatedTotalAssets =
      (data.current_assets_total || 0) + (data.fixed_assets_total || 0)

    const diff = Math.abs(calculatedTotalAssets - data.total_assets)

    if (diff > tolerance) {
      errors.push({
        field: 'total_assets',
        message: `総資産が不整合です（計算値: ${calculatedTotalAssets.toLocaleString()}円、入力値: ${data.total_assets.toLocaleString()}円）`,
        severity: 'error',
      })
    }
  }

  // 流動負債の整合性チェック
  if (
    data.accounts_payable !== null &&
    data.short_term_borrowings !== null &&
    data.current_liabilities_total !== null&& data.current_liabilities_total !== undefined
  ) {
    const calculatedCurrentLiabilities =
      (data.accounts_payable || 0) + (data.short_term_borrowings || 0)

    const diff = Math.abs(
      calculatedCurrentLiabilities - data.current_liabilities_total
    )

    if (diff > tolerance) {
      errors.push({
        field: 'current_liabilities_total',
        message: `流動負債合計が不整合です（計算値: ${calculatedCurrentLiabilities.toLocaleString()}円、入力値: ${data.current_liabilities_total.toLocaleString()}円）`,
        severity: 'warning',
      })
    }
  }

  // 固定負債の整合性チェック
  if (data.long_term_borrowings !== null && data.fixed_liabilities_total !== null && data.fixed_liabilities_total !== undefined) {
    const diff = Math.abs(
      (data.long_term_borrowings || 0) - (data.fixed_liabilities_total || 0)
    )

    if (diff > tolerance) {
      errors.push({
        field: 'fixed_liabilities_total',
        message: `固定負債合計が不整合です`,
        severity: 'warning',
      })
    }
  }

  // 総負債の整合性チェック
  if (
    data.current_liabilities_total !== null &&
    data.fixed_liabilities_total !== null &&
    data.total_liabilities !== null&& data.total_liabilities !== undefined
  ) {
    const calculatedTotalLiabilities =
      (data.current_liabilities_total || 0) + (data.fixed_liabilities_total || 0)

    const diff = Math.abs(calculatedTotalLiabilities - data.total_liabilities)

    if (diff > tolerance) {
      errors.push({
        field: 'total_liabilities',
        message: `総負債が不整合です（計算値: ${calculatedTotalLiabilities.toLocaleString()}円、入力値: ${data.total_liabilities.toLocaleString()}円）`,
        severity: 'error',
      })
    }
  }

  // 純資産の整合性チェック
  if (
    data.capital_stock !== null &&
    data.retained_earnings !== null &&
    data.total_net_assets !== null&& data.total_net_assets !== undefined
  ) {
    const calculatedNetAssets =
      (data.capital_stock || 0) + (data.retained_earnings || 0)

    const diff = Math.abs(calculatedNetAssets - data.total_net_assets)

    if (diff > tolerance) {
      errors.push({
        field: 'total_net_assets',
        message: `純資産合計が不整合です（計算値: ${calculatedNetAssets.toLocaleString()}円、入力値: ${data.total_net_assets.toLocaleString()}円）`,
        severity: 'warning',
      })
    }
  }

  // バランスシート等式チェック: 総資産 = 総負債 + 純資産
  if (
    data.total_assets !== null && data.total_assets !== undefined &&
    data.total_liabilities !== null && data.total_liabilities !== undefined &&
    data.total_net_assets !== null && data.total_net_assets !== undefined
  ) {
    const calculatedTotal =
      (data.total_liabilities || 0) + (data.total_net_assets || 0)

    const diff = Math.abs((data.total_assets || 0) - calculatedTotal)

    if (diff > tolerance) {
      errors.push({
        field: 'total_assets',
        message: `貸借対照表が不均衡です。総資産（${data.total_assets.toLocaleString()}円）≠ 総負債+純資産（${calculatedTotal.toLocaleString()}円）`,
        severity: 'error',
      })
    }
  }

  return errors
}

/**
 * 損益計算書の整合性チェック
 */
export function validateProfitLoss(data: ProfitLossData): ValidationError[] {
  const errors: ValidationError[] = []
  const tolerance = 1 // 許容誤差（円）

  // 売上総利益の整合性チェック
  if (
    data.net_sales !== null &&
    data.cost_of_sales !== null &&
    data.gross_profit !== null&& data.gross_profit !== undefined
  ) {
    const calculatedGrossProfit = (data.net_sales || 0) - (data.cost_of_sales || 0)
    const diff = Math.abs(calculatedGrossProfit - data.gross_profit)

    if (diff > tolerance) {
      errors.push({
        field: 'gross_profit',
        message: `売上総利益が不整合です（計算値: ${calculatedGrossProfit.toLocaleString()}円、入力値: ${data.gross_profit.toLocaleString()}円）`,
        severity: 'error',
      })
    }
  }

  // 営業利益の整合性チェック
  if (
    data.gross_profit !== null &&
    data.selling_general_admin_expenses !== null &&
    data.operating_income !== null&& data.operating_income !== undefined
  ) {
    const calculatedOperatingIncome =
      (data.gross_profit || 0) - (data.selling_general_admin_expenses || 0)
    const diff = Math.abs(calculatedOperatingIncome - data.operating_income)

    if (diff > tolerance) {
      errors.push({
        field: 'operating_income',
        message: `営業利益が不整合です（計算値: ${calculatedOperatingIncome.toLocaleString()}円、入力値: ${data.operating_income.toLocaleString()}円）`,
        severity: 'error',
      })
    }
  }

  // 経常利益の整合性チェック
  if (
    data.operating_income !== null &&
    data.non_operating_income !== null &&
    data.non_operating_expenses !== null &&
    data.ordinary_income !== null&& data.ordinary_income !== undefined
  ) {
    const calculatedOrdinaryIncome =
      (data.operating_income || 0) +
      (data.non_operating_income || 0) -
      (data.non_operating_expenses || 0)
    const diff = Math.abs(calculatedOrdinaryIncome - data.ordinary_income)

    if (diff > tolerance) {
      errors.push({
        field: 'ordinary_income',
        message: `経常利益が不整合です（計算値: ${calculatedOrdinaryIncome.toLocaleString()}円、入力値: ${data.ordinary_income.toLocaleString()}円）`,
        severity: 'error',
      })
    }
  }

  // 税引前当期純利益の整合性チェック
  if (
    data.ordinary_income !== null &&
    data.extraordinary_income !== null &&
    data.extraordinary_losses !== null &&
    data.income_before_tax !== null&& data.income_before_tax !== undefined
  ) {
    const calculatedIncomeBeforeTax =
      (data.ordinary_income || 0) +
      (data.extraordinary_income || 0) -
      (data.extraordinary_losses || 0)
    const diff = Math.abs(calculatedIncomeBeforeTax - data.income_before_tax)

    if (diff > tolerance) {
      errors.push({
        field: 'income_before_tax',
        message: `税引前当期純利益が不整合です（計算値: ${calculatedIncomeBeforeTax.toLocaleString()}円、入力値: ${data.income_before_tax.toLocaleString()}円）`,
        severity: 'error',
      })
    }
  }

  // 当期純利益の整合性チェック
  if (
    data.income_before_tax !== null &&
    data.income_taxes !== null &&
    data.net_income !== null&& data.net_income !== undefined
  ) {
    const calculatedNetIncome =
      (data.income_before_tax || 0) - (data.income_taxes || 0)
    const diff = Math.abs(calculatedNetIncome - data.net_income)

    if (diff > tolerance) {
      errors.push({
        field: 'net_income',
        message: `当期純利益が不整合です（計算値: ${calculatedNetIncome.toLocaleString()}円、入力値: ${data.net_income.toLocaleString()}円）`,
        severity: 'error',
      })
    }
  }

  // 原価率チェック（警告レベル）
  if (data.net_sales !== null && data.net_sales !== undefined &&
      data.cost_of_sales !== null && data.cost_of_sales !== undefined &&
      data.net_sales > 0) {
    const costRatio = ((data.cost_of_sales || 0) / (data.net_sales || 1)) * 100
    if (costRatio > 95) {
      errors.push({
        field: 'cost_of_sales',
        message: `原価率が${costRatio.toFixed(1)}%と異常に高い可能性があります`,
        severity: 'warning',
      })
    }
    if (costRatio < 0) {
      errors.push({
        field: 'cost_of_sales',
        message: `原価率がマイナスです。売上原価が負の値になっています`,
        severity: 'error',
      })
    }
  }

  return errors
}

/**
 * すべてのバリデーションエラーを取得
 */
export function validateFinancialData(
  balanceSheet: BalanceSheetData,
  profitLoss: ProfitLossData
): ValidationError[] {
  const errors: ValidationError[] = []

  // 貸借対照表のバリデーション
  errors.push(...validateBalanceSheet(balanceSheet))

  // 損益計算書のバリデーション
  errors.push(...validateProfitLoss(profitLoss))

  return errors
}

/**
 * エラーメッセージを整形して表示用に変換
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return ''

  const errorMessages = errors
    .filter((e) => e.severity === 'error')
    .map((e) => `❌ ${e.message}`)
  const warningMessages = errors
    .filter((e) => e.severity === 'warning')
    .map((e) => `⚠️ ${e.message}`)

  return [...errorMessages, ...warningMessages].join('\n')
}
