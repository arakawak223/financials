export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    const { ocrText } = await request.json()

    if (!ocrText) {
      return NextResponse.json(
        { error: 'OCRテキストが必要です' },
        { status: 400 }
      )
    }

    console.log('🤖 Claude API による財務データ抽出開始（サーバーサイド）...')
    console.log('📄 入力テキスト長:', ocrText.length, '文字')

    // サーバーサイドなので、APIキーは環境変数から安全に取得
    const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('❌ ANTHROPIC_API_KEY が設定されていません')
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY が環境変数に設定されていません' },
        { status: 500 }
      )
    }

    const anthropic = new Anthropic({
      apiKey: apiKey,
    })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `以下は、PDFをOCRで読み取ったテキストです。貸借対照表（BS）と損益計算書（PL）の勘定科目と数値を抽出してください。

OCRの特性上、文字間にスペースが入ったり、レイアウトが崩れていますが、文脈から正しい勘定科目と金額を判断してください。

【OCRテキスト】
${ocrText}

【指示】
1. 貸借対照表（BS）から以下の項目を抽出：
   - cash_and_deposits: 現金及び預金（普通預金、当座預金、定期預金、現金の合計）
   - accounts_receivable: 売掛金（受取手形含む）
   - inventory: 棚卸資産（商品、製品、仕掛品等）
   - current_assets_total: 流動資産合計
   - tangible_fixed_assets: 有形固定資産
   - intangible_fixed_assets: 無形固定資産
   - investments_and_other_assets: 投資その他の資産
   - fixed_assets_total: 固定資産合計
   - total_assets: 資産合計
   - accounts_payable: 買掛金（支払手形含む、未払金も買掛金として扱う）
   - short_term_borrowings: 短期借入金（1年以内返済予定の長期借入金を含む）
   - current_liabilities_total: 流動負債合計
   - long_term_borrowings: 長期借入金（1年以内返済予定分は除く）
   - fixed_liabilities_total: 固定負債合計
   - total_liabilities: 負債合計
   - capital_stock: 資本金
   - retained_earnings: 利益剰余金
   - total_net_assets: 純資産合計

   **重要な抽出ルール**：
   - 「未払金」は「買掛金」（accounts_payable）として扱ってください
   - 「短期借入金」には「1年以内返済予定の長期借入金」も含めてください
   - 「長期借入金」は「1年以内返済予定の長期借入金」を除いた金額としてください
   - 同じ勘定科目名が複数ある場合は、文脈から正しい金額を判断してください

2. 損益計算書（PL）から以下の項目を抽出：
   - net_sales: 売上高
   - cost_of_sales: 売上原価
   - gross_profit: 売上総利益
   - selling_general_admin_expenses: 販売費及び一般管理費
   - operating_income: 営業利益
   - non_operating_income: 営業外収益
   - non_operating_expenses: 営業外費用
   - ordinary_income: 経常利益
   - extraordinary_income: 特別利益
   - extraordinary_losses: 特別損失
   - income_before_tax: 税引前当期純利益
   - income_taxes: 法人税等
   - net_income: 当期純利益

3. 数値はカンマやスペースを除去して整数で返してください
4. 見つからない項目は省略してください（nullや0を入れないでください）
5. 財務諸表の要約を日本語で記載してください

【出力形式】
必ずこのJSON形式で回答してください（他の説明文は不要です）：
{
  "balanceSheet": {
    "cash_and_deposits": 数値,
    "accounts_receivable": 数値,
    ...
  },
  "profitLoss": {
    "net_sales": 数値,
    "cost_of_sales": 数値,
    ...
  },
  "summary": "財務状況の要約（150文字程度）"
}`,
        },
      ],
    })

    console.log('✅ Claude API レスポンス受信')
    console.log('📊 使用トークン数:', {
      input: message.usage.input_tokens,
      output: message.usage.output_tokens,
    })

    // レスポンスからテキストを抽出
    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    console.log('📝 Claude レスポンス:', responseText.substring(0, 500))

    // JSONを抽出
    let jsonText = responseText
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1]
    }

    // JSONをパース
    const result = JSON.parse(jsonText.trim())

    console.log('✅ 財務データ抽出成功')
    console.log('📊 BS項目数:', Object.keys(result.balanceSheet || {}).length)
    console.log('📊 PL項目数:', Object.keys(result.profitLoss || {}).length)

    return NextResponse.json({
      success: true,
      balanceSheet: result.balanceSheet || {},
      profitLoss: result.profitLoss || {},
      confidence: 0.95,
      summary: result.summary,
    })
  } catch (error) {
    console.error('❌ Claude API エラー:', error)
    if (error instanceof Anthropic.APIError) {
      console.error('API Error Details:', {
        status: error.status,
        message: error.message,
      })
    }
    return NextResponse.json(
      {
        error: 'Claude API による抽出に失敗しました',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
