// AI分析コメント生成ユーティリティ
import OpenAI from 'openai'
import type { FinancialAnalysis, AnalysisComment, CommentType } from '../types/financial'

// OpenAI クライアントを取得（遅延初期化）
// サーバーサイド専用（API routesから呼び出される）
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.warn('⚠️ OPENAI_API_KEY is not set in environment variables. AI comment generation will be skipped.')
    console.warn('Please set OPENAI_API_KEY in Vercel environment variables.')
    return null
  }

  console.log('✅ OpenAI API key found, length:', apiKey.length)

  return new OpenAI({
    apiKey,
    // サーバーサイド専用なので dangerouslyAllowBrowser は不要
  })
}

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
  const openai = getOpenAIClient()
  if (!openai) {
    return 'OpenAI APIキーが設定されていないため、コメントを生成できませんでした。'
  }

  const periods = analysis.periods
  const latestPeriod = periods[periods.length - 1]
  const metrics = latestPeriod.metrics || {}

  // 売上高推移を分析
  const salesTrend = periods.map((p) => ({
    year: p.fiscalYear,
    sales: p.profitLoss.netSales || 0,
  }))

  // 営業利益推移を分析
  const operatingIncomeTrend = periods.map((p) => ({
    year: p.fiscalYear,
    operatingIncome: p.profitLoss.operatingIncome || 0,
  }))

  // 当期純利益推移を分析
  const netIncomeTrend = periods.map((p) => ({
    year: p.fiscalYear,
    netIncome: p.profitLoss.netIncome || 0,
  }))

  const prompt = `
あなたは経験豊富な公認会計士・中小企業診断士です。以下の企業の財務データを分析し、総合的な評価コメントを作成してください。

【企業情報】
企業名: ${analysis.companyName}
業種: ${analysis.industryName || '不明'}
分析期間: ${analysis.fiscalYearStart}年度 - ${analysis.fiscalYearEnd}年度

【複数年の推移データ】
売上高推移:
${salesTrend.map((t) => `${t.year}年度: ${formatMetric(t.sales, '円')}`).join('\n')}

営業利益推移:
${operatingIncomeTrend.map((t) => `${t.year}年度: ${formatMetric(t.operatingIncome, '円')}`).join('\n')}

当期純利益推移:
${netIncomeTrend.map((t) => `${t.year}年度: ${formatMetric(t.netIncome, '円')}`).join('\n')}

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

【絶対厳守ルール】
**上記の推移データに記載されている数値を正確に使用してください。データを無視したり、0円と誤認したりしないでください。**
**必ず提供された実際の数値に基づいて分析を行ってください。**

【指示】
1. 3-5行程度で総合的な評価を記述してください
2. 強みと課題を明確に指摘してください
3. 専門的な視点から、上記に記載された具体的な数値を正確に引用して説明してください
4. 丁寧語を使用してください
5. 業種の特性を考慮した評価をしてください（サービス業の場合は在庫・仕入について言及しない）
6. **必ず複数年の推移を分析し、トレンドを正確に記述してください**
7. **直近期のみの変化なのか、複数年続いている傾向なのかを明確に区別してください**

【重要な注意事項】
- データに基づいた客観的な評価を行い、過度な断定表現は避けてください
- 「脆弱である」「危機的である」「深刻な」などの強い否定的表現は使用しないでください
- 「持続可能性に影響」などの重大な表現は避けてください。代わりに「注視が必要」「改善の余地」など穏当な表現を使用してください
- 単一の指標だけで企業の健全性全体を断定しないでください
- 高い利益率は「コスト管理」だけでなく「高付加価値サービス」「プレミアム価格戦略」などの可能性も考慮してください
- 「続いている」は複数年連続の場合のみ使用し、単年の変化は「直近期で」「最新年度で」と明記してください
- 利益の推移を見て、過去数年の成長傾向と直近期の変化を分けて評価してください
`

  // デバッグ: プロンプト全体をログ出力
  console.log('🔍 総合評価コメント生成プロンプト:')
  console.log('売上高推移:', salesTrend)
  console.log('営業利益推移:', operatingIncomeTrend)
  console.log('当期純利益推移:', netIncomeTrend)
  console.log('プロンプト全文:\n', prompt)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'あなたは経験豊富な公認会計士・中小企業診断士として、企業の財務分析を行います。提供されたデータを正確に使用し、データを無視したり改変したりしないでください。',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 500,
  })

  const generatedComment = response.choices[0]?.message?.content || 'コメントを生成できませんでした。'
  console.log('✅ 総合評価コメント生成結果:\n', generatedComment)

  return generatedComment
}

/**
 * 流動性コメント生成
 */
async function generateLiquidityComment(analysis: FinancialAnalysis): Promise<string> {
  const openai = getOpenAIClient()
  if (!openai) return '-'

  const latestPeriod = analysis.periods[analysis.periods.length - 1]
  const metrics = latestPeriod.metrics || {}

  const prompt = `
以下の流動性指標について、分析コメントを2-3行で作成してください：

- NetCash/NetDebt: ${formatMetric(metrics.netCash, '円')}
- 流動比率: ${formatMetric(metrics.currentRatio, '%')}

短期的な支払能力について評価し、具体的な改善策があれば提案してください。

【重要な注意事項】
- 「深刻な」「危機的な」「脆弱な」などの強い否定的表現は避けてください
- 「課題」「改善の余地」など穏当な表現を使用してください
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
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
  const openai = getOpenAIClient()
  if (!openai) return '-'

  const periods = analysis.periods
  const latestPeriod = periods[periods.length - 1]
  const metrics = latestPeriod.metrics || {}

  // 営業利益率の推移
  const operatingProfitMarginTrend = periods
    .filter((p) => p.metrics?.operatingProfitMargin !== undefined)
    .map((p) => ({
      year: p.fiscalYear,
      margin: p.metrics?.operatingProfitMargin || 0,
    }))

  // 売上総利益率の推移
  const grossProfitMarginTrend = periods
    .filter((p) => p.metrics?.grossProfitMargin !== undefined)
    .map((p) => ({
      year: p.fiscalYear,
      margin: p.metrics?.grossProfitMargin || 0,
    }))

  const prompt = `
以下の収益性指標について、分析コメントを2-3行で作成してください：

【複数年の推移データ】
売上総利益率推移:
${grossProfitMarginTrend.map((t) => `${t.year}年度: ${t.margin.toFixed(1)}%`).join('\n')}

営業利益率推移:
${operatingProfitMarginTrend.map((t) => `${t.year}年度: ${t.margin.toFixed(1)}%`).join('\n')}

【最新期の主要指標】
- 売上総利益率: ${formatMetric(metrics.grossProfitMargin, '%')}
- 営業利益率: ${formatMetric(metrics.operatingProfitMargin, '%')}
- EBITDA対売上高比率: ${formatMetric(metrics.ebitdaMargin, '%')}
- ROE: ${formatMetric(metrics.roe, '%')}
- ROA: ${formatMetric(metrics.roa, '%')}

収益性の良否を評価し、改善の余地があれば指摘してください。

【絶対厳守ルール】
**上記の推移データに記載されている数値を正確に使用してください。データを無視したり改変したりしないでください。**

【重要な注意事項】
- 高い利益率を評価する際は、「高付加価値サービスの提供」「専門性の高いサービス」「プレミアム価格戦略」など、ビジネスモデルの特性を優先的に考慮してください
- 「コスト管理」は二次的な要因として言及してください（主要因として断定しないこと）
- 業種や事業内容を踏まえた多角的な分析を行ってください
- **複数年の推移を見て、収益性が改善傾向なのか悪化傾向なのか、安定しているのかを評価してください**
- 「深刻な」「危機的な」「持続可能性に影響」などの強い表現は避けてください
- 直近期のみの変化なのか、複数年続く傾向なのかを明確に区別してください
`

  console.log('🔍 収益性コメント生成 - 利益率推移:', { grossProfitMarginTrend, operatingProfitMarginTrend })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: '提供されたデータを正確に使用し、データを無視したり改変したりしないでください。',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 300,
  })

  const generatedComment = response.choices[0]?.message?.content || '-'
  console.log('✅ 収益性コメント生成結果:\n', generatedComment)

  return generatedComment
}

/**
 * 効率性コメント生成
 */
async function generateEfficiencyComment(analysis: FinancialAnalysis): Promise<string> {
  const openai = getOpenAIClient()
  if (!openai) return '-'

  const latestPeriod = analysis.periods[analysis.periods.length - 1]
  const metrics = latestPeriod.metrics || {}
  const balanceSheet = latestPeriod.balanceSheet as Record<string, number | undefined>

  // 棚卸資産の有無をチェック
  const hasInventory = (balanceSheet.inventory || 0) > 0

  const prompt = `
以下の企業の効率性指標について、分析コメントを2-3行で作成してください：

【企業情報】
企業名: ${analysis.companyName}
業種: ${analysis.industryName || '不明'}

【効率性指標】
- 売掛金滞留月数: ${formatMetric(metrics.receivablesTurnoverMonths, 'ヶ月')}
${hasInventory ? `- 棚卸資産滞留月数: ${formatMetric(metrics.inventoryTurnoverMonths, 'ヶ月')}` : '- 棚卸資産: なし（サービス業）'}

【指示】
1. 運転資金の効率性を評価してください
2. 売掛金の回収状況について評価してください
3. ${hasInventory ? '棚卸資産の回転率について評価してください' : 'サービス業として適切な資金管理について評価してください'}
4. キャッシュフロー改善の具体的な提案があればしてください
5. 業種の特性を考慮したコメントにしてください
6. 在庫がない場合は、仕入や在庫について言及しないでください

【重要な注意事項】
- 「深刻な」「危機的な」などの強い否定的表現は避けてください
- 「改善の余地」「効率化の機会」など建設的な表現を使用してください
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: '企業の業種や事業内容に応じた適切な財務分析を行います。製造業や小売業でない場合は、在庫や仕入について言及しません。',
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 300,
  })

  return response.choices[0]?.message?.content || '-'
}

/**
 * 安全性コメント生成
 */
async function generateSafetyComment(analysis: FinancialAnalysis): Promise<string> {
  const openai = getOpenAIClient()
  if (!openai) return '-'

  const latestPeriod = analysis.periods[analysis.periods.length - 1]
  const metrics = latestPeriod.metrics || {}

  const prompt = `
以下の安全性指標について、分析コメントを2-3行で作成してください：

- NetCash/NetDebt: ${formatMetric(metrics.netCash, '円')}
- 流動比率: ${formatMetric(metrics.currentRatio, '%')}
- 自己資本比率: ${formatMetric(metrics.equityRatio, '%')}
- EBITDA対有利子負債比率: ${formatMetric(metrics.ebitdaToInterestBearingDebt, '倍')}

財務の健全性を評価し、リスクがあれば指摘してください。

【重要な注意事項】
- 「深刻な」「危機的な」「脆弱な」「持続可能性に影響」などの強い否定的表現は避けてください
- 「注視が必要」「改善の余地」など穏当な表現を使用してください
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
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
  const openai = getOpenAIClient()
  if (!openai) return '-'

  const periods = analysis.periods
  const salesTrend = periods.map((p) => ({
    year: p.fiscalYear,
    sales: p.profitLoss.netSales ?? 0,
  }))

  // 売上高の前年比変化を計算
  const salesChanges = salesTrend.slice(1).map((current, index) => {
    const previous = salesTrend[index]
    const prevSales = previous.sales ?? 0
    const currSales = current.sales ?? 0
    const changeRate = prevSales > 0 ? ((currSales - prevSales) / prevSales) * 100 : 0
    return {
      year: current.year,
      changeRate: changeRate,
      isIncrease: changeRate > 0,
      isDecrease: changeRate < 0,
    }
  })

  // トレンド分析
  const decreaseCount = salesChanges.filter(c => c.isDecrease).length
  const increaseCount = salesChanges.filter(c => c.isIncrease).length
  const latestChange = salesChanges[salesChanges.length - 1]

  let trendDescription = ''
  if (salesChanges.length >= 2) {
    if (decreaseCount === salesChanges.length) {
      trendDescription = '全期間で減少傾向'
    } else if (increaseCount === salesChanges.length) {
      trendDescription = '全期間で増加傾向'
    } else if (latestChange?.isDecrease && salesChanges[salesChanges.length - 2]?.isIncrease) {
      trendDescription = '直近年度で減少（それ以前は増加）'
    } else if (latestChange?.isIncrease && salesChanges[salesChanges.length - 2]?.isDecrease) {
      trendDescription = '直近年度で増加（それ以前は減少）'
    } else {
      trendDescription = '増減が混在'
    }
  } else if (latestChange) {
    trendDescription = latestChange.isDecrease ? '直近年度で減少' : '直近年度で増加'
  }

  const latestMetrics = periods[periods.length - 1]?.metrics || {}

  const prompt = `
以下の成長性指標について、分析コメントを2-3行で作成してください：

売上高推移:
${salesTrend.map((t) => `${t.year}年度: ${formatMetric(t.sales, '円')}`).join('\n')}

前年比変化率:
${salesChanges.map((c) => `${c.year}年度: ${c.changeRate > 0 ? '+' : ''}${c.changeRate.toFixed(1)}%`).join('\n')}

トレンド分析: ${trendDescription}
最新期の売上高成長率: ${formatMetric(latestMetrics.salesGrowthRate, '%')}

成長性を評価し、今後の見通しについてコメントしてください。

【絶対厳守ルール】
**上記の売上高推移とトレンド分析に記載されている数値・情報を正確に使用してください。**
**データを無視したり、0円と誤認したりしないでください。**

【重要な注意事項】
- トレンドを正確に記述してください。「減少が続いている」は複数年連続で減少している場合のみ使用してください
- 単年の変化は「直近年度で減少」「最新期で増加」など、単年であることを明示してください
- 提供されたトレンド分析の情報を必ず参考にしてください
- 「深刻な」「危機的な」「持続可能性に影響」などの過度な表現は避けてください
`

  console.log('🔍 成長性コメント生成 - 売上高推移:', salesTrend)
  console.log('🔍 成長性コメント生成 - トレンド:', trendDescription)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: '提供されたデータを正確に使用し、データを無視したり改変したりしないでください。',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 300,
  })

  const generatedComment = response.choices[0]?.message?.content || '-'
  console.log('✅ 成長性コメント生成結果:\n', generatedComment)

  return generatedComment
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
