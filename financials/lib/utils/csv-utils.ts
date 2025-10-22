/**
 * CSV処理ユーティリティ
 * CSVのインポート・エクスポート機能を提供
 */

import {
  BalanceSheetData,
  ProfitLossData,
  ValidationError,
  validateFinancialData,
} from './financial-validation'

export interface CSVRow {
  [key: string]: string
}

export interface FinancialPeriodCSV {
  fiscal_year: string
  period_start_date?: string
  period_end_date?: string
  // 貸借対照表
  cash_and_deposits?: string
  accounts_receivable?: string
  inventory?: string
  current_assets_total?: string
  tangible_fixed_assets?: string
  intangible_fixed_assets?: string
  investments_and_other_assets?: string
  fixed_assets_total?: string
  total_assets?: string
  accounts_payable?: string
  short_term_borrowings?: string
  current_liabilities_total?: string
  long_term_borrowings?: string
  fixed_liabilities_total?: string
  total_liabilities?: string
  capital_stock?: string
  retained_earnings?: string
  total_net_assets?: string
  // 損益計算書
  net_sales?: string
  cost_of_sales?: string
  gross_profit?: string
  selling_general_admin_expenses?: string
  operating_income?: string
  non_operating_income?: string
  non_operating_expenses?: string
  ordinary_income?: string
  extraordinary_income?: string
  extraordinary_losses?: string
  income_before_tax?: string
  income_taxes?: string
  net_income?: string
  // 手入力項目
  depreciation?: string
  capex?: string
}

/**
 * CSVテンプレートのヘッダー定義
 */
export const CSV_HEADERS: { key: keyof FinancialPeriodCSV; label: string }[] = [
  { key: 'fiscal_year', label: '年度（必須）' },
  { key: 'period_start_date', label: '期首日（YYYY-MM-DD）' },
  { key: 'period_end_date', label: '期末日（YYYY-MM-DD）' },
  // 貸借対照表 - 資産の部
  { key: 'cash_and_deposits', label: '現金及び預金' },
  { key: 'accounts_receivable', label: '売上債権' },
  { key: 'inventory', label: '棚卸資産' },
  { key: 'current_assets_total', label: '流動資産合計' },
  { key: 'tangible_fixed_assets', label: '有形固定資産' },
  { key: 'intangible_fixed_assets', label: '無形固定資産' },
  { key: 'investments_and_other_assets', label: '投資その他の資産' },
  { key: 'fixed_assets_total', label: '固定資産合計' },
  { key: 'total_assets', label: '資産合計' },
  // 貸借対照表 - 負債の部
  { key: 'accounts_payable', label: '仕入債務' },
  { key: 'short_term_borrowings', label: '短期借入金' },
  { key: 'current_liabilities_total', label: '流動負債合計' },
  { key: 'long_term_borrowings', label: '長期借入金' },
  { key: 'fixed_liabilities_total', label: '固定負債合計' },
  { key: 'total_liabilities', label: '負債合計' },
  // 貸借対照表 - 純資産の部
  { key: 'capital_stock', label: '資本金' },
  { key: 'retained_earnings', label: '利益剰余金' },
  { key: 'total_net_assets', label: '純資産合計' },
  // 損益計算書
  { key: 'net_sales', label: '売上高' },
  { key: 'cost_of_sales', label: '売上原価' },
  { key: 'gross_profit', label: '売上総利益' },
  { key: 'selling_general_admin_expenses', label: '販売費及び一般管理費' },
  { key: 'operating_income', label: '営業利益' },
  { key: 'non_operating_income', label: '営業外収益' },
  { key: 'non_operating_expenses', label: '営業外費用' },
  { key: 'ordinary_income', label: '経常利益' },
  { key: 'extraordinary_income', label: '特別利益' },
  { key: 'extraordinary_losses', label: '特別損失' },
  { key: 'income_before_tax', label: '税引前当期純利益' },
  { key: 'income_taxes', label: '法人税等' },
  { key: 'net_income', label: '当期純利益' },
  // 手入力項目
  { key: 'depreciation', label: '減価償却費' },
  { key: 'capex', label: '設備投資額（CAPEX）' },
]

/**
 * CSVテンプレートを生成
 */
export function generateCSVTemplate(): string {
  const headers = CSV_HEADERS.map((h) => h.label).join(',')
  const example = [
    '2023',
    '2023-04-01',
    '2024-03-31',
    ...new Array(CSV_HEADERS.length - 3).fill(''),
  ].join(',')

  return `${headers}\n${example}`
}

/**
 * CSV文字列をパースしてオブジェクト配列に変換
 * RFC 4180準拠のCSVパーサー
 */
export function parseCSV(csvText: string): CSVRow[] {
  const lines: string[] = []
  let currentLine = ''
  let insideQuotes = false

  // 改行を考慮してCSVを行に分割
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i]
    const nextChar = csvText[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // エスケープされたダブルクォート
        currentLine += '"'
        i++
      } else {
        // クォートの開始/終了
        insideQuotes = !insideQuotes
      }
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      // 行の終わり
      if (currentLine.trim()) {
        lines.push(currentLine)
      }
      currentLine = ''
      // \r\nの場合は\nをスキップ
      if (char === '\r' && nextChar === '\n') {
        i++
      }
    } else {
      currentLine += char
    }
  }

  // 最後の行を追加
  if (currentLine.trim()) {
    lines.push(currentLine)
  }

  if (lines.length === 0) {
    return []
  }

  // ヘッダー行を解析
  const headers = parseCSVLine(lines[0])

  // データ行を解析
  const rows: CSVRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: CSVRow = {}

    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    rows.push(row)
  }

  return rows
}

/**
 * CSV行を解析してフィールド配列に変換
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let currentField = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // エスケープされたダブルクォート
        currentField += '"'
        i++
      } else {
        // クォートの開始/終了
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      // フィールドの区切り
      fields.push(currentField.trim())
      currentField = ''
    } else {
      currentField += char
    }
  }

  // 最後のフィールドを追加
  fields.push(currentField.trim())

  return fields
}

/**
 * CSV行データを財務データに変換
 */
export function convertCSVRowToFinancialData(row: CSVRow): {
  fiscal_year: number
  period_start_date: string | null
  period_end_date: string | null
  balanceSheet: BalanceSheetData
  profitLoss: ProfitLossData
  manualInputs: {
    depreciation: number | null
    capex: number | null
  }
  errors: string[]
} {
  const errors: string[] = []

  // 年度のパース（必須）
  const fiscal_year = parseInt(row['年度（必須）'] || row['fiscal_year'] || '')
  if (isNaN(fiscal_year)) {
    errors.push('年度は必須項目です')
  }

  // 日付のパース
  const period_start_date = row['期首日（YYYY-MM-DD）'] || row['period_start_date'] || null
  const period_end_date = row['期末日（YYYY-MM-DD）'] || row['period_end_date'] || null

  // 数値変換ヘルパー
  const parseNumber = (value: string | undefined): number | null => {
    if (!value || value.trim() === '') return null
    // カンマを削除
    const cleaned = value.replace(/,/g, '')
    const num = parseFloat(cleaned)
    return isNaN(num) ? null : num
  }

  // 貸借対照表データ
  const balanceSheet: BalanceSheetData = {
    cash_and_deposits: parseNumber(row['現金及び預金'] || row['cash_and_deposits']),
    accounts_receivable: parseNumber(row['売上債権'] || row['accounts_receivable']),
    inventory: parseNumber(row['棚卸資産'] || row['inventory']),
    current_assets_total: parseNumber(row['流動資産合計'] || row['current_assets_total']),
    tangible_fixed_assets: parseNumber(row['有形固定資産'] || row['tangible_fixed_assets']),
    intangible_fixed_assets: parseNumber(
      row['無形固定資産'] || row['intangible_fixed_assets']
    ),
    investments_and_other_assets: parseNumber(
      row['投資その他の資産'] || row['investments_and_other_assets']
    ),
    fixed_assets_total: parseNumber(row['固定資産合計'] || row['fixed_assets_total']),
    total_assets: parseNumber(row['資産合計'] || row['total_assets']),
    accounts_payable: parseNumber(row['仕入債務'] || row['accounts_payable']),
    short_term_borrowings: parseNumber(row['短期借入金'] || row['short_term_borrowings']),
    current_liabilities_total: parseNumber(
      row['流動負債合計'] || row['current_liabilities_total']
    ),
    long_term_borrowings: parseNumber(row['長期借入金'] || row['long_term_borrowings']),
    fixed_liabilities_total: parseNumber(
      row['固定負債合計'] || row['fixed_liabilities_total']
    ),
    total_liabilities: parseNumber(row['負債合計'] || row['total_liabilities']),
    capital_stock: parseNumber(row['資本金'] || row['capital_stock']),
    retained_earnings: parseNumber(row['利益剰余金'] || row['retained_earnings']),
    total_net_assets: parseNumber(row['純資産合計'] || row['total_net_assets']),
  }

  // 損益計算書データ
  const profitLoss: ProfitLossData = {
    net_sales: parseNumber(row['売上高'] || row['net_sales']),
    cost_of_sales: parseNumber(row['売上原価'] || row['cost_of_sales']),
    gross_profit: parseNumber(row['売上総利益'] || row['gross_profit']),
    selling_general_admin_expenses: parseNumber(
      row['販売費及び一般管理費'] || row['selling_general_admin_expenses']
    ),
    operating_income: parseNumber(row['営業利益'] || row['operating_income']),
    non_operating_income: parseNumber(row['営業外収益'] || row['non_operating_income']),
    non_operating_expenses: parseNumber(row['営業外費用'] || row['non_operating_expenses']),
    ordinary_income: parseNumber(row['経常利益'] || row['ordinary_income']),
    extraordinary_income: parseNumber(row['特別利益'] || row['extraordinary_income']),
    extraordinary_losses: parseNumber(row['特別損失'] || row['extraordinary_losses']),
    income_before_tax: parseNumber(row['税引前当期純利益'] || row['income_before_tax']),
    income_taxes: parseNumber(row['法人税等'] || row['income_taxes']),
    net_income: parseNumber(row['当期純利益'] || row['net_income']),
  }

  // 手入力データ
  const manualInputs = {
    depreciation: parseNumber(row['減価償却費'] || row['depreciation']),
    capex: parseNumber(row['設備投資額（CAPEX）'] || row['capex']),
  }

  // バリデーション
  const validationErrors = validateFinancialData(balanceSheet, profitLoss)
  validationErrors.forEach((err) => {
    errors.push(`${err.field}: ${err.message}`)
  })

  return {
    fiscal_year,
    period_start_date,
    period_end_date,
    balanceSheet,
    profitLoss,
    manualInputs,
    errors,
  }
}

/**
 * 財務データをCSV形式に変換
 */
export function convertFinancialDataToCSV(
  periods: Array<{
    fiscal_year: number
    period_start_date?: string
    period_end_date?: string
    balanceSheet: BalanceSheetData
    profitLoss: ProfitLossData
    manualInputs?: {
      depreciation?: number | null
      capex?: number | null
    }
  }>
): string {
  // ヘッダー行
  const headers = CSV_HEADERS.map((h) => h.label).join(',')

  // データ行
  const rows = periods.map((period) => {
    const row: string[] = []

    CSV_HEADERS.forEach((header) => {
      const key = header.key
      let value: any

      if (key === 'fiscal_year') {
        value = period.fiscal_year
      } else if (key === 'period_start_date') {
        value = period.period_start_date || ''
      } else if (key === 'period_end_date') {
        value = period.period_end_date || ''
      } else if (key === 'depreciation' || key === 'capex') {
        value = period.manualInputs?.[key] ?? ''
      } else if (key in period.balanceSheet) {
        value = period.balanceSheet[key as keyof BalanceSheetData] ?? ''
      } else if (key in period.profitLoss) {
        value = period.profitLoss[key as keyof ProfitLossData] ?? ''
      } else {
        value = ''
      }

      // 数値はそのまま、文字列はダブルクォートでエスケープ
      if (typeof value === 'number') {
        row.push(value.toString())
      } else {
        const str = String(value)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          row.push(`"${str.replace(/"/g, '""')}"`)
        } else {
          row.push(str)
        }
      }
    })

    return row.join(',')
  })

  return [headers, ...rows].join('\n')
}
