// PowerPoint出力ユーティリティ
import pptxgen from 'pptxgenjs'
import type { FinancialAnalysis, PeriodFinancialData } from '../types/financial'

/**
 * 財務分析データをPowerPointファイルとして出力
 */
export async function exportToPowerPoint(analysis: FinancialAnalysis): Promise<Blob> {
  const pptx = new pptxgen()

  // プレゼンテーション設定
  pptx.author = '財務分析アプリ'
  pptx.company = ''
  pptx.title = `${analysis.companyName} 財務分析レポート`
  pptx.subject = '財務分析'

  // スライド1: タイトル
  createTitleSlide(pptx, analysis)

  // スライド2: 財務指標サマリー
  createMetricsSummarySlide(pptx, analysis)

  // スライド3-4: グラフ（売上高・利益推移）
  createSalesAndProfitSlide(pptx, analysis)

  // スライド5: 収益性分析
  createProfitabilitySlide(pptx, analysis)

  // スライド6: 安全性分析
  createSafetySlide(pptx, analysis)

  // スライド7: 勘定科目別推移
  createAccountDetailsSlide(pptx, analysis)

  // スライド8: 総合評価コメント
  createCommentSlide(pptx, analysis)

  // Blob として返す
  const blob = await pptx.write({ outputType: 'blob' }) as Blob
  return blob
}

/**
 * タイトルスライド
 */
function createTitleSlide(pptx: pptxgen, analysis: FinancialAnalysis) {
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
}

/**
 * 財務指標サマリー
 */
function createMetricsSummarySlide(pptx: pptxgen, analysis: FinancialAnalysis) {
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
    ['NetCash/NetDebt', formatValue(metrics.netCash, '円')],
    ['流動比率', formatValue(metrics.currentRatio, '%')],
    ['EBITDA', formatValue(metrics.ebitda, '円')],
    ['FCF', formatValue(metrics.fcf, '円')],
    ['売上高成長率', formatValue(metrics.salesGrowthRate, '%')],
    ['売上総利益率', formatValue(metrics.grossProfitMargin, '%')],
    ['営業利益率', formatValue(metrics.operatingProfitMargin, '%')],
    ['ROE', formatValue(metrics.roe, '%')],
    ['ROA', formatValue(metrics.roa, '%')],
  ]

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
function createSalesAndProfitSlide(pptx: pptxgen, analysis: FinancialAnalysis) {
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
      values: analysis.periods.map((p) => (p.profitLoss.netSales || 0) / 1000000), // 百万円単位
    },
    {
      name: '営業利益',
      labels: analysis.periods.map((p) => `${p.fiscalYear}年度`),
      values: analysis.periods.map((p) => (p.profitLoss.operatingIncome || 0) / 1000000),
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
    valAxisTitle: '百万円',
  })
}

/**
 * 収益性分析
 */
function createProfitabilitySlide(pptx: pptxgen, analysis: FinancialAnalysis) {
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
function createSafetySlide(pptx: pptxgen, analysis: FinancialAnalysis) {
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
      'NetCash/NetDebt',
      formatValue(metrics.netCash, '円'),
      evaluateNetCash(metrics.netCash),
    ],
    [
      '流動比率',
      formatValue(metrics.currentRatio, '%'),
      evaluateCurrentRatio(metrics.currentRatio),
    ],
    [
      'EBITDA対有利子負債比率',
      formatValue(metrics.ebitdaToInterestBearingDebt, '倍'),
      evaluateDebtRatio(metrics.ebitdaToInterestBearingDebt),
    ],
  ]

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
function createAccountDetailsSlide(pptx: pptxgen, analysis: FinancialAnalysis) {
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
      '現金預金',
      ...analysis.periods.map((p) =>
        formatValue(p.balanceSheet.cashAndDeposits, '円')
      ),
    ],
    [
      '売掛金',
      ...analysis.periods.map((p) =>
        formatValue(p.balanceSheet.accountsReceivable, '円')
      ),
    ],
    [
      '棚卸資産',
      ...analysis.periods.map((p) =>
        formatValue(p.balanceSheet.inventory, '円')
      ),
    ],
    [
      '借入金',
      ...analysis.periods.map((p) =>
        formatValue(
          (p.balanceSheet.shortTermBorrowings || 0) +
            (p.balanceSheet.longTermBorrowings || 0),
          '円'
        )
      ),
    ],
  ]

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
function createCommentSlide(pptx: pptxgen, analysis: FinancialAnalysis) {
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
function formatValue(value: number | undefined, unit: string): string {
  if (value === undefined || value === null) return '-'

  if (unit === '円') {
    if (Math.abs(value) >= 100000000) {
      return `${(value / 100000000).toFixed(1)}億円`
    } else if (Math.abs(value) >= 10000) {
      return `${(value / 10000).toFixed(0)}万円`
    }
    return `${value.toLocaleString()}円`
  }

  if (unit === '%') {
    return `${value.toFixed(1)}%`
  }

  if (unit === '倍') {
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
