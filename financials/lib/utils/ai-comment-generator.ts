// AI分析コメント生成ユーティリティ
import OpenAI from 'openai'
import type { FinancialAnalysis, AnalysisComment, CommentType } from '../types/financial'

// OpenAI クライアント（環境変数から取得）
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // クライアントサイドで使用する場合
})

/**
 * 財務分析データからAIコメントを生成
 */
export async function generateAnalysisComments(
  analysis: FinancialAnalysis
): Promise<AnalysisComment[]> {
  const comments: AnalysisComment[] = []

  try {
    // 総合評価コメント
    const overallComment = await generateOverallComment(analysis)
    comments.push({
      id: crypto.randomUUID(),
      commentType: 'overall',
      aiGeneratedText: overallComment,
      isEdited: false,
      displayOrder: 1,
    })

    // 流動性コメント
    const liquidityComment = await generateLiquidityComment(analysis)
    comments.push({
      id: crypto.randomUUID(),
      commentType: 'liquidity',
      aiGeneratedText: liquidityComment,
      isEdited: false,
      displayOrder: 2,
    })

    // 収益性コメント
    const profitabilityComment = await generateProfitabilityComment(analysis)
    comments.push({
      id: crypto.randomUUID(),
      commentType: 'profitability',
      aiGeneratedText: profitabilityComment,
      isEdited: false,
      displayOrder: 3,
    })

    // 効率性コメント
    const efficiencyComment = await generateEfficiencyComment(analysis)
    comments.push({
      id: crypto.randomUUID(),
      commentType: 'efficiency',
      aiGeneratedText: efficiencyComment,
      isEdited: false,
      displayOrder: 4,
    })

    // 安全性コメント
    const safetyComment = await generateSafetyComment(analysis)
    comments.push({
      id: crypto.randomUUID(),
      commentType: 'safety',
      aiGeneratedText: safetyComment,
      isEdited: false,
      displayOrder: 5,
    })

    // 成長性コメント
    const growthComment = await generateGrowthComment(analysis)
    comments.push({
      id: crypto.randomUUID(),
      commentType: 'growth',
      aiGeneratedText: growthComment,
      isEdited: false,
      displayOrder: 6,
    })
  } catch (error) {
    console.error('AI comment generation error:', error)
  }

  return comments
}

/**
 * 総合評価コメント生成
 */
async function generateOverallComment(analysis: FinancialAnalysis): Promise<string> {
  const latestPeriod = analysis.periods[analysis.periods.length - 1]
  const metrics = latestPeriod.metrics || {}

  const prompt = `
あなたは経験豊富な公認会計士・中小企業診断士です。以下の企業の財務データを分析し、総合的な評価コメントを作成してください。

【企業情報】
企業名: ${analysis.companyName}
業種: ${analysis.industryName || '不明'}
分析期間: ${analysis.fiscalYearStart}年度 - ${analysis.fiscalYearEnd}年度

【最新期（${latestPeriod.fiscalYear}年度）の主要指標】
- NetCash/NetDebt: ${formatMetric(metrics.netCash, '円')}
- 流動比率: ${formatMetric(metrics.currentRatio, '%')}
- EBITDA: ${formatMetric(metrics.ebitda, '円')}
- FCF: ${formatMetric(metrics.fcf, '円')}
- 売上高成長率: ${formatMetric(metrics.salesGrowthRate, '%')}
- 売上総利益率: ${formatMetric(metrics.grossProfitMargin, '%')}
- 営業利益率: ${formatMetric(metrics.operatingProfitMargin, '%')}
- ROE: ${formatMetric(metrics.roe, '%')}
- ROA: ${formatMetric(metrics.roa, '%')}

【指示】
1. 3-5行程度で総合的な評価を記述してください
2. 強みと課題を明確に指摘してください
3. 専門的な視点から、具体的な数値を引用して説明してください
4. 丁寧語を使用してください
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'あなたは経験豊富な公認会計士・中小企業診断士として、企業の財務分析を行います。',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 500,
  })

  return response.choices[0]?.message?.content || 'コメントを生成できませんでした。'
}

/**
 * 流動性コメント生成
 */
async function generateLiquidityComment(analysis: FinancialAnalysis): Promise<string> {
  const latestPeriod = analysis.periods[analysis.periods.length - 1]
  const metrics = latestPeriod.metrics || {}

  const prompt = `
以下の流動性指標について、分析コメントを2-3行で作成してください：

- NetCash/NetDebt: ${formatMetric(metrics.netCash, '円')}
- 流動比率: ${formatMetric(metrics.currentRatio, '%')}

短期的な支払能力について評価し、具体的な改善策があれば提案してください。
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 300,
  })

  return response.choices[0]?.message?.content || '-'
}

/**
 * 収益性コメント生成
 */
async function generateProfitabilityComment(analysis: FinancialAnalysis): Promise<string> {
  const latestPeriod = analysis.periods[analysis.periods.length - 1]
  const metrics = latestPeriod.metrics || {}

  const prompt = `
以下の収益性指標について、分析コメントを2-3行で作成してください：

- 売上総利益率: ${formatMetric(metrics.grossProfitMargin, '%')}
- 営業利益率: ${formatMetric(metrics.operatingProfitMargin, '%')}
- EBITDA対売上高比率: ${formatMetric(metrics.ebitdaMargin, '%')}
- ROE: ${formatMetric(metrics.roe, '%')}
- ROA: ${formatMetric(metrics.roa, '%')}

収益性の良否を評価し、改善の余地があれば指摘してください。
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 300,
  })

  return response.choices[0]?.message?.content || '-'
}

/**
 * 効率性コメント生成
 */
async function generateEfficiencyComment(analysis: FinancialAnalysis): Promise<string> {
  const latestPeriod = analysis.periods[analysis.periods.length - 1]
  const metrics = latestPeriod.metrics || {}

  const prompt = `
以下の効率性指標について、分析コメントを2-3行で作成してください：

- 売掛金滞留月数: ${formatMetric(metrics.receivablesTurnoverMonths, 'ヶ月')}
- 棚卸資産滞留月数: ${formatMetric(metrics.inventoryTurnoverMonths, 'ヶ月')}

運転資金の効率性を評価し、キャッシュフロー改善の提案があればしてください。
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 300,
  })

  return response.choices[0]?.message?.content || '-'
}

/**
 * 安全性コメント生成
 */
async function generateSafetyComment(analysis: FinancialAnalysis): Promise<string> {
  const latestPeriod = analysis.periods[analysis.periods.length - 1]
  const metrics = latestPeriod.metrics || {}

  const prompt = `
以下の安全性指標について、分析コメントを2-3行で作成してください：

- NetCash/NetDebt: ${formatMetric(metrics.netCash, '円')}
- 流動比率: ${formatMetric(metrics.currentRatio, '%')}
- EBITDA対有利子負債比率: ${formatMetric(metrics.ebitdaToInterestBearingDebt, '倍')}

財務の健全性を評価し、リスクがあれば指摘してください。
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 300,
  })

  return response.choices[0]?.message?.content || '-'
}

/**
 * 成長性コメント生成
 */
async function generateGrowthComment(analysis: FinancialAnalysis): Promise<string> {
  const periods = analysis.periods
  const salesTrend = periods.map((p) => ({
    year: p.fiscalYear,
    sales: p.profitLoss.netSales,
  }))

  const latestMetrics = periods[periods.length - 1]?.metrics || {}

  const prompt = `
以下の成長性指標について、分析コメントを2-3行で作成してください：

売上高推移:
${salesTrend.map((t) => `${t.year}年度: ${formatMetric(t.sales, '円')}`).join('\n')}

売上高成長率: ${formatMetric(latestMetrics.salesGrowthRate, '%')}

成長性を評価し、今後の見通しについてコメントしてください。
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 300,
  })

  return response.choices[0]?.message?.content || '-'
}

/**
 * 指標をフォーマット
 */
function formatMetric(value: number | undefined, unit: string): string {
  if (value === undefined || value === null) return '不明'

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

  if (unit === 'ヶ月') {
    return `${value.toFixed(1)}ヶ月`
  }

  if (unit === '倍') {
    return `${value.toFixed(2)}倍`
  }

  return value.toLocaleString()
}

/**
 * 単一のコメントを再生成
 */
export async function regenerateComment(
  analysis: FinancialAnalysis,
  commentType: CommentType
): Promise<string> {
  switch (commentType) {
    case 'overall':
      return generateOverallComment(analysis)
    case 'liquidity':
      return generateLiquidityComment(analysis)
    case 'profitability':
      return generateProfitabilityComment(analysis)
    case 'efficiency':
      return generateEfficiencyComment(analysis)
    case 'safety':
      return generateSafetyComment(analysis)
    case 'growth':
      return generateGrowthComment(analysis)
    default:
      return ''
  }
}
