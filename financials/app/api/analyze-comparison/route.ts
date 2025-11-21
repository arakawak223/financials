import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { comparisonData, fiscalYear, viewMode } = body

    if (!comparisonData || !Array.isArray(comparisonData)) {
      return NextResponse.json(
        { error: '比較データが必要です' },
        { status: 400 }
      )
    }

    // Claude APIを使用して分析コメントを生成
    let prompt = ''

    if (viewMode === 'single') {
      prompt = `以下は${fiscalYear}年度の企業間比較分析データです。財務アナリストとして、専門的な分析コメントを日本語で作成してください。

【会社名について】
- タイトルや本文で会社名を使用する場合は、必ず以下のデータに記載されている会社名を正確に使用してください
- 絶対に他の会社名に置き換えたり、間違えたりしないでください
- 各社の会社名: ${comparisonData.map((d: any) => d.company_name).join('、')}

データ:
${comparisonData.map((d: any) => `
${d.company_name} (${d.industry || '業種不明'}):
- 売上高: ${d.net_sales?.toLocaleString()}円
- 営業利益: ${d.operating_income?.toLocaleString()}円
- 当期純利益: ${d.net_income?.toLocaleString()}円
- ROE: ${d.roe?.toFixed(2)}%
- ROA: ${d.roa?.toFixed(2)}%
- 営業利益率: ${d.operating_margin?.toFixed(2)}%
- EBITDA: ${d.ebitda?.toLocaleString()}円
- FCF: ${d.fcf?.toLocaleString()}円
- 売上成長率: ${d.sales_growth?.toFixed(2)}%
`).join('\n')}

【重要な注意事項】
- この分析は上記の企業のみの相対比較です
- 業界全体やトップ企業との比較は行わないでください（データがないため）
- 「業界をリード」「業界トップ」などの断定的表現は使用しないでください
- 提供されたデータのみに基づいた客観的な分析を行ってください
- 推測や誇張表現は避け、数値に基づいた事実のみを記述してください
- データにない情報（市場シェア、業界動向など）について推測しないでください

【表現スタイル】
- 金額の単位は統一してください（億円推奨）
- 「この3社の中で」という表現を明示的に使用してください
- 相対的な比較は「最も高い」「中位」「最も低い」など客観的な表現を使用してください
- ポイントや%の差異を具体的に記述してください
- 推測的な理由付けは避け、数値の事実のみを記述してください

以下の観点で分析してください：
1. 各企業の財務状況の特徴（提供データに基づく数値の事実）
2. この3社の中での収益性（ROE、ROA、利益率）の相対比較
3. この3社の中での成長性の相対比較
4. 各企業の業種特性による財務構造の違い（数値の違いのみ）
5. この3社の中で相対的に優れている指標（数値で示す）
6. この3社の中で改善の余地がある指標（数値で示す）

回答は簡潔に、4-6つの段落にまとめてください。各段落は2-3文程度にしてください。`
    } else {
      prompt = `以下は複数年度にわたる企業の財務推移データです。財務アナリストとして、専門的な分析コメントを日本語で作成してください。

【会社名について】
- タイトルや本文で会社名を使用する場合は、必ず以下のデータに記載されている会社名を正確に使用してください
- 絶対に他の会社名に置き換えたり、間違えたりしないでください

データ:
${JSON.stringify(comparisonData, null, 2)}

【重要な注意事項】
- この分析は上記の企業データのみに基づく時系列比較です
- 業界全体やトップ企業との比較は行わないでください（データがないため）
- 「業界をリード」「市場シェアトップ」などの断定的表現は使用しないでください
- 提供されたデータのみに基づいた客観的な分析を行ってください
- 推測や誇張表現は避け、数値に基づいた事実のみを記述してください
- データにない情報（市場動向、経営戦略など）について推測しないでください

【表現スタイル】
- 金額の単位は統一してください（億円推奨）
- 前年比の変化は具体的な数値や%で記述してください
- トレンドの説明は「増加傾向」「減少傾向」「横ばい」など客観的な表現を使用してください
- 推測的な理由付けは避け、数値の変化の事実のみを記述してください

以下の観点で分析してください：
1. 各企業の成長トレンド（数値の変化を具体的に）
2. 収益性の推移（ROE、ROA、利益率などの数値変化）
3. 財務健全性の変化（数値データに基づく）
4. 注目すべきポイント（データから読み取れる顕著な変化）
5. 今後の展望（過去のトレンドに基づく可能性の示唆のみ、断定は避ける）

回答は簡潔に、4-6つの段落にまとめてください。各段落は2-3文程度にしてください。`
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const analysis = message.content[0].type === 'text' ? message.content[0].text : ''

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('AI分析エラー:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI分析に失敗しました' },
      { status: 500 }
    )
  }
}
