// Excel出力ユーティリティ
import ExcelJS from 'exceljs'
import type { FinancialAnalysis, PeriodFinancialData } from '../types/financial'

/**
 * 財務分析データをExcelファイルとして出力
 */
export async function exportToExcel(analysis: FinancialAnalysis): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()

  // メタデータ設定
  workbook.creator = '財務分析アプリ'
  workbook.created = new Date()
  workbook.modified = new Date()

  // シート1: 勘定科目別推移表
  createAccountSummarySheet(workbook, analysis)

  // シート2: 財務指標一覧
  createMetricsSheet(workbook, analysis)

  // シート3: 生データ（BS・PL）
  createRawDataSheet(workbook, analysis)

  // シート4: グラフデータ
  createChartDataSheet(workbook, analysis)

  // Blobとして返す
  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * シート1: 勘定科目別推移表
 */
function createAccountSummarySheet(workbook: ExcelJS.Workbook, analysis: FinancialAnalysis) {
  const sheet = workbook.addWorksheet('勘定科目別推移表')

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
  addAccountRow(sheet, '現金預金', analysis.periods, 'balanceSheet', 'cashAndDeposits')
  addAccountRow(sheet, '有価証券', analysis.periods, 'balanceSheet', 'securities')
  addAccountRow(sheet, '受取手形', analysis.periods, 'balanceSheet', 'notesReceivable')
  addAccountRow(sheet, '売掛金', analysis.periods, 'balanceSheet', 'accountsReceivable')
  addAccountRow(sheet, '棚卸資産', analysis.periods, 'balanceSheet', 'inventory')
  addAccountRow(sheet, '流動資産合計', analysis.periods, 'balanceSheet', 'totalCurrentAssets')
  addAccountRow(sheet, '土地', analysis.periods, 'balanceSheet', 'land')
  addAccountRow(sheet, '固定資産合計', analysis.periods, 'balanceSheet', 'totalFixedAssets')
  addAccountRow(sheet, '資産合計', analysis.periods, 'balanceSheet', 'totalAssets')
  sheet.addRow([])

  addAccountRow(sheet, '支払手形', analysis.periods, 'balanceSheet', 'notesPayable')
  addAccountRow(sheet, '買掛金', analysis.periods, 'balanceSheet', 'accountsPayable')
  addAccountRow(sheet, '短期借入金', analysis.periods, 'balanceSheet', 'shortTermBorrowings')
  addAccountRow(sheet, '流動負債合計', analysis.periods, 'balanceSheet', 'totalCurrentLiabilities')
  addAccountRow(sheet, '長期借入金', analysis.periods, 'balanceSheet', 'longTermBorrowings')
  addAccountRow(sheet, '社債', analysis.periods, 'balanceSheet', 'bondsPayable')
  addAccountRow(sheet, 'リース債務', analysis.periods, 'balanceSheet', 'leaseObligations')
  addAccountRow(sheet, '負債合計', analysis.periods, 'balanceSheet', 'totalLiabilities')
  sheet.addRow([])

  addAccountRow(sheet, '純資産合計', analysis.periods, 'balanceSheet', 'totalNetAssets')
  sheet.addRow([])

  // PL項目
  sheet.addRow(['【損益計算書】'])
  addAccountRow(sheet, '売上高', analysis.periods, 'profitLoss', 'netSales')
  addAccountRow(sheet, '売上原価', analysis.periods, 'profitLoss', 'costOfSales')
  addAccountRow(sheet, '売上総利益', analysis.periods, 'profitLoss', 'grossProfit')
  addAccountRow(sheet, '販管費合計', analysis.periods, 'profitLoss', 'totalSellingGeneralAdmin')
  addAccountRow(sheet, '営業利益', analysis.periods, 'profitLoss', 'operatingIncome')
  addAccountRow(sheet, '経常利益', analysis.periods, 'profitLoss', 'ordinaryIncome')
  addAccountRow(sheet, '当期純利益', analysis.periods, 'profitLoss', 'netIncome')

  // 列幅を調整
  sheet.getColumn(1).width = 20
  analysis.periods.forEach((_, index) => {
    sheet.getColumn(index + 2).width = 15
  })
}

/**
 * シート2: 財務指標一覧
 */
function createMetricsSheet(workbook: ExcelJS.Workbook, analysis: FinancialAnalysis) {
  const sheet = workbook.addWorksheet('財務指標一覧')

  // ヘッダー行
  sheet.addRow(['指標', ...analysis.periods.map((p) => `${p.fiscalYear}年度`)])
  const headerRowObj = sheet.getRow(1)
  headerRowObj.font = { bold: true }
  headerRowObj.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  }

  // 流動性・安全性
  sheet.addRow(['【流動性・安全性】'])
  addMetricRow(sheet, 'NetCash/NetDebt', analysis.periods, 'netCash', '円')
  addMetricRow(sheet, '流動比率', analysis.periods, 'currentRatio', '%')
  sheet.addRow([])

  // 効率性
  sheet.addRow(['【効率性】'])
  addMetricRow(sheet, '売掛金滞留月数', analysis.periods, 'receivablesTurnoverMonths', 'ヶ月')
  addMetricRow(sheet, '棚卸資産滞留月数', analysis.periods, 'inventoryTurnoverMonths', 'ヶ月')
  sheet.addRow([])

  // 収益性
  sheet.addRow(['【収益性】'])
  addMetricRow(sheet, 'EBITDA', analysis.periods, 'ebitda', '円')
  addMetricRow(sheet, 'FCF', analysis.periods, 'fcf', '円')
  addMetricRow(sheet, '売上高成長率', analysis.periods, 'salesGrowthRate', '%')
  addMetricRow(sheet, '売上総利益率', analysis.periods, 'grossProfitMargin', '%')
  addMetricRow(sheet, '営業利益率', analysis.periods, 'operatingProfitMargin', '%')
  addMetricRow(sheet, 'EBITDA対売上高比率', analysis.periods, 'ebitdaMargin', '%')
  sheet.addRow([])

  // 資本効率
  sheet.addRow(['【資本効率】'])
  addMetricRow(sheet, 'ROE', analysis.periods, 'roe', '%')
  addMetricRow(sheet, 'ROA', analysis.periods, 'roa', '%')

  // 列幅を調整
  sheet.getColumn(1).width = 25
  analysis.periods.forEach((_, index) => {
    sheet.getColumn(index + 2).width = 15
  })
}

/**
 * シート3: 生データ
 */
function createRawDataSheet(workbook: ExcelJS.Workbook, analysis: FinancialAnalysis) {
  const sheet = workbook.addWorksheet('生データ')

  sheet.addRow(['企業名', analysis.companyName])
  sheet.addRow(['分析日', analysis.analysisDate.toLocaleDateString('ja-JP')])
  sheet.addRow(['対象期間', `${analysis.fiscalYearStart}年度 - ${analysis.fiscalYearEnd}年度`])
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
    const row = [field, ...analysis.periods.map((p) => (p.balanceSheet as Record<string, number | undefined>)[field] || 0)]
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
    const row = [field, ...analysis.periods.map((p) => (p.profitLoss as Record<string, number | undefined>)[field] || 0)]
    sheet.addRow(row)
  })
}

/**
 * シート4: グラフデータ
 */
function createChartDataSheet(workbook: ExcelJS.Workbook, analysis: FinancialAnalysis) {
  const sheet = workbook.addWorksheet('グラフデータ')

  sheet.addRow(['各指標の推移データ'])
  sheet.addRow([])

  // 各指標ごとにデータを出力
  const metrics = [
    { key: 'netCash', label: 'NetCash' },
    { key: 'ebitda', label: 'EBITDA' },
    { key: 'fcf', label: 'FCF' },
    { key: 'grossProfitMargin', label: '売上総利益率' },
    { key: 'operatingProfitMargin', label: '営業利益率' },
    { key: 'roe', label: 'ROE' },
    { key: 'roa', label: 'ROA' },
  ]

  metrics.forEach((metric) => {
    sheet.addRow([metric.label])
    sheet.addRow(['年度', ...analysis.periods.map((p) => p.fiscalYear)])
    sheet.addRow(['値', ...analysis.periods.map((p) => (p.metrics as Record<string, number | undefined>)?.[metric.key] || 0)])
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
  field: string
) {
  const values = periods.map((p) => (p[section] as Record<string, number | undefined>)[field] || 0)
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
  unit: string
) {
  const values = periods.map((p) => {
    const value = (p.metrics as Record<string, number | undefined>)?.[field]
    return value !== undefined ? value : '-'
  })
  sheet.addRow([`${label} (${unit})`, ...values])
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
