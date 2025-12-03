// PowerPoint出力ユーティリティ
import pptxgen from 'pptxgenjs'
import type { FinancialAnalysis, AmountUnit } from '../types/financial'
import { convertAmount, getUnitLabel } from './financial-calculations'

/**
 * 財務分析データをPowerPointファイルとして出力
 */
export async function exportToPowerPoint(analysis: FinancialAnalysis, unit: AmountUnit = 'millions'): Promise<Blob> {
  const pptx = new pptxgen()

  // プレゼンテーション設定
  pptx.author = '財務分析アプリ'
  pptx.company = ''
  pptx.title = `${analysis.companyName} 財務分析レポート`
  pptx.subject = '財務分析'

  // スライド1: タイトル
  createTitleSlide(pptx, analysis, unit)

  // スライド2: 財務指標サマリー
  createMetricsSummarySlide(pptx, analysis, unit)

  // スライド3-4: グラフ（売上高・利益推移）
  createSalesAndProfitSlide(pptx, analysis, unit)

  // スライド5: 収益性分析
  createProfitabilitySlide(pptx, analysis, unit)

  // スライド6: 安全性分析
  createSafetySlide(pptx, analysis, unit)

  // スライド7: 勘定科目別推移
  createAccountDetailsSlide(pptx, analysis, unit)

  // スライド8: 総合評価コメント
  createCommentSlide(pptx, analysis, unit)

  // Blob として返す
  const blob = await pptx.write({ outputType: 'blob' }) as Blob
  return blob
}

/**
 * タイトルスライド
 */
function createTitleSlide(pptx: pptxgen, analysis: FinancialAnalysis, unit: AmountUnit) {
  const slide = pptx.addSlide()
  slide.background = { color: '0E4C92' }

  slide.addText(analysis.companyName, {
    x: 0.5,
    y: 2.0,
    w: 9,
    h: 1.0,
    fontSize: 44,
    bold: true,
    color: 'FFFFFF',
    align: 'center',
  })

  slide.addText('財務分析レポート', {
    x: 0.5,
    y: 3.2,
    w: 9,
    h: 0.8,
    fontSize: 32,
    color: 'FFFFFF',
    align: 'center',
  })

  slide.addText(
    `分析期間: ${analysis.fiscalYearStart}年度 - ${analysis.fiscalYearEnd}年度`,
    {
      x: 0.5,
      y: 4.5,
      w: 9,
      h: 0.5,
      fontSize: 18,
      color: 'FFFFFF',
      align: 'center',
    }
  )

  slide.addText(`作成日: ${analysis.analysisDate.toLocaleDateString('ja-JP')}`, {
    x: 0.5,
    y: 5.2,
    w: 9,
    h: 0.4,
    fontSize: 14,
    color: 'CCCCCC',
    align: 'center',
  })

  slide.addText(`※金額の単位: ${getUnitLabel(unit)}`, {
    x: 0.5,
    y: 5.6,
    w: 9,
    h: 0.3,
    fontSize: 12,
    color: 'CCCCCC',
    align: 'center',
  })
}

/**
 * 財務指標サマリー
 */
function createMetricsSummarySlide(pptx: pptxgen, analysis: FinancialAnalysis, unit: AmountUnit) {
  const slide = pptx.addSlide()
  slide.addText('財務指標サマリー', {
    x: 0.5,
    y: 0.3,
    w: 9,
    h: 0.6,
    fontSize: 32,
    bold: true,
    color: '0E4C92',
  })

  // 最新期のデータ
  const latestPeriod = analysis.periods[analysis.periods.length - 1]
  const metrics = latestPeriod.metrics || {}

  const tableData = [
    [
      { text: '指標', options: { bold: true, fill: 'E0E0E0' } },
      { text: `${latestPeriod.fiscalYear}年度`, options: { bold: true, fill: 'E0E0E0' } },
    ],
    [{ text: 'NetCash/NetDebt' }, { text: formatValue(metrics.netCash, '円', unit) }],
    [{ text: '流動比率' }, { text: formatValue(metrics.currentRatio, '%', unit) }],
    [{ text: '自己資本比率' }, { text: formatValue(metrics.equityRatio, '%', unit) }],
    [{ text: 'DEレシオ' }, { text: formatValue(metrics.debtEquityRatio, '倍', unit) }],
    [{ text: 'EBITDA' }, { text: formatValue(metrics.ebitda, '円', unit) }],
    [{ text: 'FCF' }, { text: formatValue(metrics.fcf, '円', unit) }],
    [{ text: '売上高成長率' }, { text: formatValue(metrics.salesGrowthRate, '%', unit) }],
    [{ text: '売上総利益率' }, { text: formatValue(metrics.grossProfitMargin, '%', unit) }],
    [{ text: '営業利益率' }, { text: formatValue(metrics.operatingProfitMargin, '%', unit) }],
    [{ text: 'ROE' }, { text: formatValue(metrics.roe, '%', unit) }],
    [{ text: 'ROA' }, { text: formatValue(metrics.roa, '%', unit) }],
  ]

  // @ts-expect-error - pptxgenのaddTable型定義が不完全
  slide.addTable(tableData, {
    x: 1.0,
    y: 1.2,
    w: 8.0,
    h: 4.5,
    fontSize: 14,
    border: { type: 'solid', pt: 1, color: 'CCCCCC' },
  })
}

/**
 * 売上高・利益推移
 */
function createSalesAndProfitSlide(pptx: pptxgen, analysis: FinancialAnalysis, unit: AmountUnit) {
  const slide = pptx.addSlide()
  slide.addText('売上高・営業利益推移', {
    x: 0.5,
    y: 0.3,
    w: 9,
    h: 0.6,
    fontSize: 32,
    bold: true,
    color: '0E4C92',
  })

  // グラフデータ準備
  const chartData = [
    {
      name: '売上高',
      labels: analysis.periods.map((p) => `${p.fiscalYear}年度`),
      values: analysis.periods.map((p) => convertAmount(p.profitLoss.netSales || 0, unit)),
    },
    {
      name: '営業利益',
      labels: analysis.periods.map((p) => `${p.fiscalYear}年度`),
      values: analysis.periods.map((p) => convertAmount(p.profitLoss.operatingIncome || 0, unit)),
    },
  ]

  slide.addChart(pptx.ChartType.bar, chartData, {
    x: 1.0,
    y: 1.2,
    w: 8.0,
    h: 4.5,
    showTitle: false,
    showLegend: true,
    legendPos: 'b',
    valAxisTitle: getUnitLabel(unit),
  })
}

/**
 * 収益性分析
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createProfitabilitySlide(pptx: pptxgen, analysis: FinancialAnalysis, _unit: AmountUnit) {
  const slide = pptx.addSlide()
  slide.addText('収益性分析', {
    x: 0.5,
    y: 0.3,
    w: 9,
    h: 0.6,
    fontSize: 32,
    bold: true,
    color: '0E4C92',
  })

  // 収益性指標のグラフ
  const chartData = [
    {
      name: '売上総利益率',
      labels: analysis.periods.map((p) => `${p.fiscalYear}年度`),
      values: analysis.periods.map((p) => p.metrics?.grossProfitMargin || 0),
    },
    {
      name: '営業利益率',
      labels: analysis.periods.map((p) => `${p.fiscalYear}年度`),
      values: analysis.periods.map((p) => p.metrics?.operatingProfitMargin || 0),
    },
  ]

  slide.addChart(pptx.ChartType.line, chartData, {
    x: 1.0,
    y: 1.2,
    w: 8.0,
    h: 4.5,
    showTitle: false,
    showLegend: true,
    legendPos: 'b',
    valAxisTitle: '%',
  })
}

/**
 * 安全性分析
 */
function createSafetySlide(pptx: pptxgen, analysis: FinancialAnalysis, unit: AmountUnit) {
  const slide = pptx.addSlide()
  slide.addText('安全性分析', {
    x: 0.5,
    y: 0.3,
    w: 9,
    h: 0.6,
    fontSize: 32,
    bold: true,
    color: '0E4C92',
  })

  const latestPeriod = analysis.periods[analysis.periods.length - 1]
  const metrics = latestPeriod.metrics || {}

  const tableData = [
    [
      { text: '指標', options: { bold: true, fill: 'E0E0E0' } },
      { text: '値', options: { bold: true, fill: 'E0E0E0' } },
      { text: '評価', options: { bold: true, fill: 'E0E0E0' } },
    ],
    [
      { text: 'NetCash/NetDebt' },
      { text: formatValue(metrics.netCash, '円', unit) },
      { text: evaluateNetCash(metrics.netCash) },
    ],
    [
      { text: '流動比率' },
      { text: formatValue(metrics.currentRatio, '%', unit) },
      { text: evaluateCurrentRatio(metrics.currentRatio) },
    ],
    [
      { text: '自己資本比率' },
      { text: formatValue(metrics.equityRatio, '%', unit) },
      { text: evaluateEquityRatio(metrics.equityRatio) },
    ],
    [
      { text: 'DEレシオ' },
      { text: formatValue(metrics.debtEquityRatio, '倍', unit) },
      { text: evaluateDebtEquityRatio(metrics.debtEquityRatio) },
    ],
    [
      { text: 'EBITDA対有利子負債比率' },
      { text: formatValue(metrics.ebitdaToInterestBearingDebt, '倍', unit) },
      { text: evaluateDebtRatio(metrics.ebitdaToInterestBearingDebt) },
    ],
  ]

  // @ts-expect-error - pptxgenのaddTable型定義が不完全
  slide.addTable(tableData, {
    x: 1.5,
    y: 1.5,
    w: 7.0,
    h: 3.0,
    fontSize: 16,
    border: { type: 'solid', pt: 1, color: 'CCCCCC' },
  })
}

/**
 * 勘定科目別推移
 */
function createAccountDetailsSlide(pptx: pptxgen, analysis: FinancialAnalysis, unit: AmountUnit) {
  const slide = pptx.addSlide()
  slide.addText('主要勘定科目推移', {
    x: 0.5,
    y: 0.3,
    w: 9,
    h: 0.6,
    fontSize: 32,
    bold: true,
    color: '0E4C92',
  })

  const tableData = [
    [
      { text: '勘定科目', options: { bold: true, fill: 'E0E0E0' } },
      ...analysis.periods.map((p) => ({
        text: `${p.fiscalYear}年度`,
        options: { bold: true, fill: 'E0E0E0' },
      })),
    ],
    [
      { text: '現金預金' },
      ...analysis.periods.map((p) => ({
        text: formatValue(p.balanceSheet.cashAndDeposits, '円', unit)
      })),
    ],
    [
      { text: '売掛金' },
      ...analysis.periods.map((p) => ({
        text: formatValue(p.balanceSheet.accountsReceivable, '円', unit)
      })),
    ],
    [
      { text: '棚卸資産' },
      ...analysis.periods.map((p) => ({
        text: formatValue(p.balanceSheet.inventory, '円', unit)
      })),
    ],
    [
      { text: '借入金' },
      ...analysis.periods.map((p) => ({
        text: formatValue(
          (p.balanceSheet.shortTermBorrowings || 0) +
            (p.balanceSheet.longTermBorrowings || 0),
          '円',
          unit
        )
      })),
    ],
  ]

  // @ts-expect-error - pptxgenのaddTable型定義が不完全
  slide.addTable(tableData, {
    x: 0.8,
    y: 1.2,
    w: 8.4,
    h: 4.0,
    fontSize: 14,
    border: { type: 'solid', pt: 1, color: 'CCCCCC' },
  })
}

/**
 * 総合評価コメント
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createCommentSlide(pptx: pptxgen, analysis: FinancialAnalysis, _unit: AmountUnit) {
  const slide = pptx.addSlide()
  slide.addText('総合評価', {
    x: 0.5,
    y: 0.3,
    w: 9,
    h: 0.6,
    fontSize: 32,
    bold: true,
    color: '0E4C92',
  })

  // AI生成コメントまたはデフォルトコメント
  const overallComment =
    analysis.comments.find((c) => c.commentType === 'overall')?.editedText ||
    analysis.comments.find((c) => c.commentType === 'overall')?.aiGeneratedText ||
    '総合的な分析コメントがここに表示されます。'

  slide.addText(overallComment, {
    x: 0.8,
    y: 1.2,
    w: 8.4,
    h: 4.0,
    fontSize: 16,
    color: '333333',
    valign: 'top',
  })

  slide.addText('※ このレポートは財務分析アプリにより自動生成されました', {
    x: 0.5,
    y: 5.8,
    w: 9,
    h: 0.3,
    fontSize: 10,
    color: '999999',
    align: 'center',
  })
}

/**
 * 値をフォーマット
 */
function formatValue(value: number | undefined, unitType: string, amountUnit?: AmountUnit): string {
  if (value === undefined || value === null) return '-'

  if (unitType === '円' && amountUnit) {
    const converted = convertAmount(value, amountUnit)
    return `${converted.toFixed(1)}${getUnitLabel(amountUnit)}`
  }

  if (unitType === '円') {
    // 企業規模に応じて百万円または千円単位を使用（万円は使わない）
    if (Math.abs(value) >= 1000000000) {
      // 10億以上は億円
      return `${(value / 100000000).toFixed(1)}億円`
    } else if (Math.abs(value) >= 1000000) {
      // 百万以上は百万円単位
      return `${(value / 1000000).toFixed(0)}百万円`
    } else if (Math.abs(value) >= 1000) {
      // 千以上は千円単位
      return `${(value / 1000).toFixed(0)}千円`
    }
    return `${value.toLocaleString()}円`
  }

  if (unitType === '%') {
    return `${value.toFixed(1)}%`
  }

  if (unitType === '倍') {
    return `${value.toFixed(2)}倍`
  }

  return value.toLocaleString()
}

/**
 * NetCashを評価
 */
function evaluateNetCash(value: number | undefined): string {
  if (value === undefined) return '-'
  if (value > 0) return '良好（現金余剰）'
  return '要注意（債務超過）'
}

/**
 * 流動比率を評価
 */
function evaluateCurrentRatio(value: number | undefined): string {
  if (value === undefined) return '-'
  if (value >= 200) return '優良'
  if (value >= 150) return '良好'
  if (value >= 100) return '標準'
  return '要改善'
}

/**
 * 負債比率を評価
 */
function evaluateDebtRatio(value: number | undefined): string {
  if (value === undefined) return '-'
  if (value <= 3) return '優良'
  if (value <= 5) return '良好'
  if (value <= 10) return '標準'
  return '要改善'
}

/**
 * 自己資本比率を評価
 */
function evaluateEquityRatio(value: number | undefined): string {
  if (value === undefined) return '-'
  if (value >= 50) return '優良'
  if (value >= 40) return '良好'
  if (value >= 30) return '標準'
  return '要改善'
}

/**
 * DEレシオを評価
 */
function evaluateDebtEquityRatio(value: number | undefined): string {
  if (value === undefined) return '-'
  if (value <= 0.5) return '優良'
  if (value <= 1.0) return '良好'
  if (value <= 2.0) return '標準'
  return '要改善'
}

/**
 * ファイルをダウンロード
 */
export function downloadPowerPoint(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}
