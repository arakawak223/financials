// Excel出力ユーティリティ
import ExcelJS from 'exceljs'
import type { FinancialAnalysis, PeriodFinancialData, AmountUnit } from '../types/financial'
import { convertAmount, getUnitLabel } from './financial-calculations'

/**
 * 財務分析データをExcelファイルとして出力
 */
export async function exportToExcel(analysis: FinancialAnalysis, unit: AmountUnit = 'millions'): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()

  // メタデータ設定
  workbook.creator = '財務分析アプリ'
  workbook.created = new Date()
  workbook.modified = new Date()

  // シート1: 勘定科目別推移表
  createAccountSummarySheet(workbook, analysis, unit)

  // シート2: 財務指標一覧
  createMetricsSheet(workbook, analysis, unit)

  // シート3: 生データ（BS・PL）
  createRawDataSheet(workbook, analysis, unit)

  // シート4: グラフデータ
  createChartDataSheet(workbook, analysis, unit)

  // Blobとして返す
  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * シート1: 勘定科目別推移表
 */
function createAccountSummarySheet(workbook: ExcelJS.Workbook, analysis: FinancialAnalysis, unit: AmountUnit) {
  const sheet = workbook.addWorksheet('勘定科目別推移表')

  // 単位表示行を追加
  sheet.addRow([`※金額の単位: ${getUnitLabel(unit)}`])

  // ヘッダー行
  const headerRow = ['勘定科目', ...analysis.periods.map((p) => `${p.fiscalYear}年度`)]
  if (analysis.periods.length >= 2) {
    headerRow.push('増減額')
  }
  sheet.addRow(headerRow)

  // スタイル設定
  const headerRowObj = sheet.getRow(1)
  headerRowObj.font = { bold: true }
  headerRowObj.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  }

  // BS項目
  sheet.addRow(['【貸借対照表】'])
  addAccountRow(sheet, '現金預金', analysis.periods, 'balanceSheet', 'cashAndDeposits', unit)
  addAccountRow(sheet, '有価証券', analysis.periods, 'balanceSheet', 'securities', unit)
  addAccountRow(sheet, '受取手形', analysis.periods, 'balanceSheet', 'notesReceivable', unit)
  addAccountRow(sheet, '売掛金', analysis.periods, 'balanceSheet', 'accountsReceivable', unit)
  addAccountRow(sheet, '棚卸資産', analysis.periods, 'balanceSheet', 'inventory', unit)
  addAccountRow(sheet, '流動資産合計', analysis.periods, 'balanceSheet', 'totalCurrentAssets', unit)
  addAccountRow(sheet, '土地', analysis.periods, 'balanceSheet', 'land', unit)
  addAccountRow(sheet, '固定資産合計', analysis.periods, 'balanceSheet', 'totalFixedAssets', unit)
  addAccountRow(sheet, '資産合計', analysis.periods, 'balanceSheet', 'totalAssets', unit)
  sheet.addRow([])

  addAccountRow(sheet, '支払手形', analysis.periods, 'balanceSheet', 'notesPayable', unit)
  addAccountRow(sheet, '買掛金', analysis.periods, 'balanceSheet', 'accountsPayable', unit)
  addAccountRow(sheet, '短期借入金', analysis.periods, 'balanceSheet', 'shortTermBorrowings', unit)
  addAccountRow(sheet, '流動負債合計', analysis.periods, 'balanceSheet', 'totalCurrentLiabilities', unit)
  addAccountRow(sheet, '長期借入金', analysis.periods, 'balanceSheet', 'longTermBorrowings', unit)
  addAccountRow(sheet, '社債', analysis.periods, 'balanceSheet', 'bondsPayable', unit)
  addAccountRow(sheet, 'リース債務', analysis.periods, 'balanceSheet', 'leaseObligations', unit)
  addAccountRow(sheet, '負債合計', analysis.periods, 'balanceSheet', 'totalLiabilities', unit)
  sheet.addRow([])

  addAccountRow(sheet, '純資産合計', analysis.periods, 'balanceSheet', 'totalNetAssets', unit)
  sheet.addRow([])

  // PL項目
  sheet.addRow(['【損益計算書】'])
  addAccountRow(sheet, '売上高', analysis.periods, 'profitLoss', 'netSales', unit)
  addAccountRow(sheet, '売上原価', analysis.periods, 'profitLoss', 'costOfSales', unit)
  addAccountRow(sheet, '売上総利益', analysis.periods, 'profitLoss', 'grossProfit', unit)
  addAccountRow(sheet, '販管費合計', analysis.periods, 'profitLoss', 'totalSellingGeneralAdmin', unit)
  addAccountRow(sheet, '営業利益', analysis.periods, 'profitLoss', 'operatingIncome', unit)
  addAccountRow(sheet, '経常利益', analysis.periods, 'profitLoss', 'ordinaryIncome', unit)
  addAccountRow(sheet, '当期純利益', analysis.periods, 'profitLoss', 'netIncome', unit)

  // 列幅を調整
  sheet.getColumn(1).width = 20
  analysis.periods.forEach((_, index) => {
    sheet.getColumn(index + 2).width = 15
  })
}

/**
 * シート2: 財務指標一覧
 */
function createMetricsSheet(workbook: ExcelJS.Workbook, analysis: FinancialAnalysis, unit: AmountUnit) {
  const sheet = workbook.addWorksheet('財務指標一覧')

  // 単位表示行を追加
  sheet.addRow([`※金額の単位: ${getUnitLabel(unit)}`])

  // ヘッダー行
  sheet.addRow(['指標', ...analysis.periods.map((p) => `${p.fiscalYear}年度`)])
  const headerRowObj = sheet.getRow(2)
  headerRowObj.font = { bold: true }
  headerRowObj.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  }

  // 流動性・安全性
  sheet.addRow(['【流動性・安全性】'])
  addMetricRow(sheet, 'NetCash/NetDebt', analysis.periods, 'netCash', '円', unit)
  addMetricRow(sheet, '流動比率', analysis.periods, 'currentRatio', '%', unit)
  sheet.addRow([])

  // 効率性
  sheet.addRow(['【効率性】'])
  addMetricRow(sheet, '売掛金滞留月数', analysis.periods, 'receivablesTurnoverMonths', 'ヶ月', unit)
  addMetricRow(sheet, '棚卸資産滞留月数', analysis.periods, 'inventoryTurnoverMonths', 'ヶ月', unit)
  sheet.addRow([])

  // 収益性
  sheet.addRow(['【収益性】'])
  addMetricRow(sheet, 'EBITDA', analysis.periods, 'ebitda', '円', unit)
  addMetricRow(sheet, 'FCF', analysis.periods, 'fcf', '円', unit)
  addMetricRow(sheet, '売上高成長率', analysis.periods, 'salesGrowthRate', '%', unit)
  addMetricRow(sheet, '売上総利益率', analysis.periods, 'grossProfitMargin', '%', unit)
  addMetricRow(sheet, '営業利益率', analysis.periods, 'operatingProfitMargin', '%', unit)
  addMetricRow(sheet, 'EBITDA対売上高比率', analysis.periods, 'ebitdaMargin', '%', unit)
  sheet.addRow([])

  // 資本効率
  sheet.addRow(['【資本効率】'])
  addMetricRow(sheet, 'ROE', analysis.periods, 'roe', '%', unit)
  addMetricRow(sheet, 'ROA', analysis.periods, 'roa', '%', unit)

  // 列幅を調整
  sheet.getColumn(1).width = 25
  analysis.periods.forEach((_, index) => {
    sheet.getColumn(index + 2).width = 15
  })
}

/**
 * シート3: 生データ
 */
function createRawDataSheet(workbook: ExcelJS.Workbook, analysis: FinancialAnalysis, unit: AmountUnit) {
  const sheet = workbook.addWorksheet('生データ')

  sheet.addRow(['企業名', analysis.companyName])
  sheet.addRow(['分析日', analysis.analysisDate.toLocaleDateString('ja-JP')])
  sheet.addRow(['対象期間', `${analysis.fiscalYearStart}年度 - ${analysis.fiscalYearEnd}年度`])
  sheet.addRow([`※金額の単位: ${getUnitLabel(unit)}`])
  sheet.addRow([])

  // BS生データ
  sheet.addRow(['【貸借対照表 生データ】'])
  const bsHeaderRow = ['項目', ...analysis.periods.map((p) => `${p.fiscalYear}年度`)]
  sheet.addRow(bsHeaderRow)

  const bsFields = [
    'cashAndDeposits',
    'securities',
    'notesReceivable',
    'accountsReceivable',
    'inventory',
    'totalCurrentAssets',
    'land',
    'totalFixedAssets',
    'totalAssets',
    'notesPayable',
    'accountsPayable',
    'shortTermBorrowings',
    'totalCurrentLiabilities',
    'longTermBorrowings',
    'totalLiabilities',
    'totalNetAssets',
  ]

  bsFields.forEach((field) => {
    const row = [field, ...analysis.periods.map((p) => {
      const value = (p.balanceSheet as Record<string, number | undefined>)[field] || 0
      return convertAmount(value, unit)
    })]
    sheet.addRow(row)
  })

  sheet.addRow([])

  // PL生データ
  sheet.addRow(['【損益計算書 生データ】'])
  const plHeaderRow = ['項目', ...analysis.periods.map((p) => `${p.fiscalYear}年度`)]
  sheet.addRow(plHeaderRow)

  const plFields = [
    'netSales',
    'costOfSales',
    'grossProfit',
    'operatingIncome',
    'ordinaryIncome',
    'netIncome',
  ]

  plFields.forEach((field) => {
    const row = [field, ...analysis.periods.map((p) => {
      const value = (p.profitLoss as Record<string, number | undefined>)[field] || 0
      return convertAmount(value, unit)
    })]
    sheet.addRow(row)
  })
}

/**
 * シート4: グラフデータ
 */
function createChartDataSheet(workbook: ExcelJS.Workbook, analysis: FinancialAnalysis, unit: AmountUnit) {
  const sheet = workbook.addWorksheet('グラフデータ')

  sheet.addRow(['各指標の推移データ'])
  sheet.addRow([`※金額の単位: ${getUnitLabel(unit)}`])
  sheet.addRow([])

  // 各指標ごとにデータを出力
  const metrics = [
    { key: 'netCash', label: 'NetCash', isAmount: true },
    { key: 'ebitda', label: 'EBITDA', isAmount: true },
    { key: 'fcf', label: 'FCF', isAmount: true },
    { key: 'grossProfitMargin', label: '売上総利益率', isAmount: false },
    { key: 'operatingProfitMargin', label: '営業利益率', isAmount: false },
    { key: 'roe', label: 'ROE', isAmount: false },
    { key: 'roa', label: 'ROA', isAmount: false },
  ]

  metrics.forEach((metric) => {
    sheet.addRow([metric.label])
    sheet.addRow(['年度', ...analysis.periods.map((p) => p.fiscalYear)])
    sheet.addRow(['値', ...analysis.periods.map((p) => {
      const value = (p.metrics as Record<string, number | undefined>)?.[metric.key] || 0
      return metric.isAmount ? convertAmount(value, unit) : value
    })])
    sheet.addRow([])
  })
}

/**
 * 勘定科目行を追加
 */
function addAccountRow(
  sheet: ExcelJS.Worksheet,
  label: string,
  periods: PeriodFinancialData[],
  section: 'balanceSheet' | 'profitLoss',
  field: string,
  amountUnit: AmountUnit
) {
  const values = periods.map((p) => {
    const value = (p[section] as Record<string, number | undefined>)[field] || 0
    return convertAmount(value, amountUnit)
  })
  const row = [label, ...values]

  // 最新期と前期の増減額を追加
  if (values.length >= 2) {
    const change = values[values.length - 1] - values[values.length - 2]
    row.push(change)
  }

  sheet.addRow(row)
}

/**
 * 指標行を追加
 */
function addMetricRow(
  sheet: ExcelJS.Worksheet,
  label: string,
  periods: PeriodFinancialData[],
  field: string,
  metricUnit: string,
  amountUnit: AmountUnit
) {
  const values = periods.map((p) => {
    const value = (p.metrics as Record<string, number | undefined>)?.[field]
    if (value === undefined) return '-'
    // 金額の場合は単位変換を適用
    if (metricUnit === '円') {
      return convertAmount(value, amountUnit)
    }
    return value
  })
  sheet.addRow([`${label} (${metricUnit})`, ...values])
}

/**
 * ファイルをダウンロード
 */
export function downloadExcel(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}
