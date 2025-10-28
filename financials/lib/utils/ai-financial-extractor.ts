// AI（Claude）を使った財務データ抽出ユーティリティ

export interface AIExtractionResult {
  balanceSheet: Record<string, number>
  profitLoss: Record<string, number>
  confidence: number
  summary?: string
}

/**
 * Claude APIを使ってOCRテキストから財務データを抽出
 * サーバーサイドAPI経由で呼び出し（セキュリティのため）
 */
export async function extractFinancialDataWithAI(
  ocrText: string
): Promise<AIExtractionResult> {
  console.log('🤖 Claude API による財務データ抽出開始（API Route経由）...')
  console.log('📄 入力テキスト長:', ocrText.length, '文字')

  try {
    // サーバーサイドAPI Route を呼び出し
    const response = await fetch('/api/extract-financial-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ocrText }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    console.log('✅ 財務データ抽出成功（API Route経由）')
    console.log('📊 BS項目数:', Object.keys(result.balanceSheet || {}).length)
    console.log('📊 PL項目数:', Object.keys(result.profitLoss || {}).length)

    return {
      balanceSheet: result.balanceSheet || {},
      profitLoss: result.profitLoss || {},
      confidence: result.confidence || 0.95,
      summary: result.summary,
    }
  } catch (error) {
    console.error('❌ AI抽出エラー:', error)
    throw new Error(`Claude API による抽出に失敗しました: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * 正規表現による従来の抽出とAI抽出を併用する関数
 * AI抽出を優先し、失敗した場合は従来の方法にフォールバック
 */
export async function extractFinancialDataHybrid(
  ocrText: string,
  fallbackFn: (text: string) => { balanceSheet: Record<string, number>; profitLoss: Record<string, number> }
): Promise<AIExtractionResult> {
  try {
    // まずAI抽出を試みる
    return await extractFinancialDataWithAI(ocrText)
  } catch (error) {
    console.warn('⚠️  AI抽出に失敗、従来の正規表現による抽出にフォールバック')
    console.warn('エラー:', error)

    // フォールバック: 従来の正規表現による抽出
    const fallbackResult = fallbackFn(ocrText)
    return {
      balanceSheet: fallbackResult.balanceSheet,
      profitLoss: fallbackResult.profitLoss,
      confidence: 0.5, // フォールバック時は信頼度を下げる
    }
  }
}
