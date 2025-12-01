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

    // ocrTextが配列の場合は文字列に変換
    const ocrTextString = Array.isArray(ocrText) ? ocrText.join('\n') : ocrText

    console.log('🤖 Claude API による財務データ抽出開始（サーバーサイド）...')
    console.log('📄 入力テキスト長:', ocrTextString.length, '文字')

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

    // リトライ処理（Overloadedエラー対策）
    let message
    let retryCount = 0
    const maxRetries = 3
    const retryDelay = 2000 // 2秒

    while (retryCount < maxRetries) {
      try {
        message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `以下は、PDFをOCRで読み取ったテキストです。貸借対照表（BS）と損益計算書（PL）の勘定科目と数値を抽出してください。

OCRの特性上、文字間にスペースが入ったり、レイアウトが崩れていますが、文脈から正しい勘定科目と金額を判断してください。

【OCRテキスト】
${ocrTextString}

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

3. 勘定科目明細（account_details）を抽出：

   **【最重要】売上高・売上原価の内訳を必ず抽出してください**：

   a) **売上高の内訳**（必須）:
      - PDFに「売上高」や「売上高の内訳」「売上の明細」などのセクションを探してください
      - 表形式または箇条書きで記載されている各項目を抽出（例：製品売上、商品売上、サービス売上、店舗売上、オンライン売上など）
      - これらは必ず account_category を "売上高" として設定

   b) **売上原価の内訳**（必須）:
      - PDFに「売上原価」や「売上原価の内訳」「原価の明細」などのセクションを探してください
      - 表形式または箇条書きで記載されている各項目を抽出（例：材料費、労務費、外注費、製造経費、商品仕入高など）
      - これらは必ず account_category を "売上原価" として設定

   c) **販売費及び一般管理費の明細**（あれば）:
      - 「販売費及び一般管理費の明細」がある場合、各項目（減価償却費、給料手当、地代家賃など）を抽出
      - これらは account_category を "販売費及び一般管理費" として設定

   - 各明細は以下の形式で返してください：
     * account_category: 区分（**必ず** "売上高" または "売上原価" または "販売費及び一般管理費" のいずれか）
     * account_name: 勘定科目名（正確に）
     * amount: その勘定科目の金額（数値、カンマなし）

   - **【超重要】勘定科目名と金額のペアリングルール**:
     * OCRテキストで科目名が圧縮されている場合があります（例：「役給雑賞法福」は「役員報酬、給料手当、雑給、賞与、法定福利費、福利厚生費」）
     * その場合、各文字が各科目の頭文字を表します。完全な科目名を推測して、金額リストと正しくペアリングしてください
     * 【減価償却費の特別注意】「減」の文字を見つけたら、それは「減価償却費」です。その位置に対応する金額を正確に抽出してください
     * 表形式の場合: 項目名と同じ行の右側にある最初の数値がその項目の金額です
     * 縦並び形式の場合: 項目名の直下の行にある数値がその項目の金額です
     * 1行ずつ丁寧に、項目名→金額の順に読み取ってください
     * 金額リストの順序と科目名の順序を必ず一致させてください

4. 数値はカンマやスペースを除去して整数で返してください
5. 見つからない項目は省略してください（nullや0を入れないでください）
6. 財務諸表の要約を日本語で記載してください

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
  "accountDetails": [
    {
      "account_category": "売上高",
      "account_name": "製品売上",
      "amount": 金額
    },
    {
      "account_category": "売上高",
      "account_name": "サービス売上",
      "amount": 金額
    },
    {
      "account_category": "売上原価",
      "account_name": "材料費",
      "amount": 金額
    },
    {
      "account_category": "売上原価",
      "account_name": "外注費",
      "amount": 金額
    },
    {
      "account_category": "販売費及び一般管理費",
      "account_name": "減価償却費",
      "amount": 金額
    },
    ...
  ],
  "summary": "財務状況の要約（150文字程度）"
}

**重要**: 各勘定科目の項目名とその直後・直下にある金額を正確にペアリングしてください。`,
        },
      ],
    })
        break // 成功したらループを抜ける
      } catch (error: any) {
        retryCount++
        console.log(`⚠️  Claude API エラー (試行 ${retryCount}/${maxRetries}):`, error.message)

        // Overloadedエラーまたはレート制限エラーの場合はリトライ
        if (error.status === 529 || error.status === 429) {
          if (retryCount < maxRetries) {
            console.log(`🔄 ${retryDelay}ms 待機してリトライします...`)
            await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount))
            continue
          }
        }
        // その他のエラーはすぐに投げる
        throw error
      }
    }

    if (!message) {
      throw new Error('Claude API呼び出しが最大リトライ回数に達しました')
    }

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

    // 【補正ロジック】OCRテキストから勘定科目の横にある数値を直接抽出して補正
    if (result.accountDetails && Array.isArray(result.accountDetails)) {
      console.log('🔧 減価償却費の金額を補正します...')

      // 減価償却費を含む項目を特定
      const depreciationIndex = result.accountDetails.findIndex((d: any) =>
        d.account_name?.includes('減価償却') || d.account_name?.includes('償却費')
      )

      if (depreciationIndex >= 0) {
        const depreciationItem = result.accountDetails[depreciationIndex]
        const depreciationName = depreciationItem.account_name

        console.log('  元の減価償却費:', depreciationItem)

        // OCRテキストから「減価償却費」の直後（横並び）の数値を抽出
        // パターン: 「減価償却費」+ 任意の空白・記号 + 数値（カンマ区切り）
        const pattern = new RegExp(
          depreciationName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + // 勘定科目名をエスケープ
          '[\\s　]*' + // 空白（半角・全角）
          '([\\d,，]+)', // 数値（カンマ区切り含む）
          'i'
        )

        const match = ocrTextString.match(pattern)

        if (match && match[1]) {
          // 抽出した数値からカンマを除去して整数に変換
          const correctedAmount = parseInt(match[1].replace(/[,，]/g, ''), 10)

          if (!isNaN(correctedAmount) && correctedAmount !== depreciationItem.amount) {
            console.log('  ✅ 補正後の減価償却費:', correctedAmount, '（元:', depreciationItem.amount, '）')
            result.accountDetails[depreciationIndex].amount = correctedAmount
          } else {
            console.log('  ℹ️  補正不要（既に正しい値）')
          }
        } else {
          console.log('  ⚠️  OCRテキストから減価償却費の横の数値を抽出できませんでした')
        }
      }
    }

    console.log('✅ 財務データ抽出成功')
    console.log('📊 BS項目数:', Object.keys(result.balanceSheet || {}).length)
    console.log('📊 PL項目数:', Object.keys(result.profitLoss || {}).length)
    console.log('📊 勘定科目明細数:', (result.accountDetails || []).length)
    if (result.accountDetails && result.accountDetails.length > 0) {
      console.log('📝 明細項目:', result.accountDetails.map((d: any) => d.account_name).join(', '))

      // カテゴリー別に明細を集計
      const salesItems = result.accountDetails.filter((d: any) => d.account_category === '売上高')
      const cosItems = result.accountDetails.filter((d: any) => d.account_category === '売上原価')
      const sgaItems = result.accountDetails.filter((d: any) => d.account_category === '販売費及び一般管理費')

      if (salesItems.length > 0) {
        console.log('💰 売上高の内訳 (' + salesItems.length + '件):', salesItems.map((d: any) => `${d.account_name}: ${d.amount?.toLocaleString()}円`).join(', '))
      } else {
        console.log('⚠️  売上高の内訳が抽出されていません')
      }

      if (cosItems.length > 0) {
        console.log('💸 売上原価の内訳 (' + cosItems.length + '件):', cosItems.map((d: any) => `${d.account_name}: ${d.amount?.toLocaleString()}円`).join(', '))
      } else {
        console.log('⚠️  売上原価の内訳が抽出されていません')
      }

      if (sgaItems.length > 0) {
        console.log('📋 販管費の明細 (' + sgaItems.length + '件):', sgaItems.map((d: any) => `${d.account_name}: ${d.amount?.toLocaleString()}円`).join(', '))
      }

      // 減価償却費の詳細をログ出力
      const depreciationItems = result.accountDetails.filter((d: any) =>
        d.account_name?.includes('減価償却') || d.account_name?.includes('償却費')
      )
      if (depreciationItems.length > 0) {
        console.log('🔍 減価償却費の詳細（補正後）:', JSON.stringify(depreciationItems, null, 2))
      }
    }

    return NextResponse.json({
      success: true,
      balanceSheet: result.balanceSheet || {},
      profitLoss: result.profitLoss || {},
      accountDetails: result.accountDetails || [],
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
