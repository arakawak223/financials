// Claude API を使用したOCR処理
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

/**
 * PDFをClaude APIでOCR処理
 * @param pdfBuffer PDFファイルのバッファ
 * @returns OCRで抽出されたテキスト（ページごと）
 */
export async function extractTextWithGoogleVision(
  pdfBuffer: Buffer
): Promise<{
  text: string[]
  confidence: number
}> {
  console.log('🔧 Claude API による OCR 処理開始...')

  try {
    // PDFをbase64エンコード
    const base64Pdf = pdfBuffer.toString('base64')
    console.log('📄 PDFサイズ:', pdfBuffer.length, 'bytes')

    console.log('📤 Claude API リクエスト送信中...')
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Pdf,
              },
            },
            {
              type: 'text',
              text: 'このPDF文書に含まれる全てのテキストを抽出してください。文書の構造や書式を無視して、テキストのみを出力してください。',
            },
          ],
        },
      ],
    })

    console.log('✅ Claude API レスポンス受信')

    // レスポンスからテキストを抽出
    const extractedText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('\n')

    console.log(`✅ Claude API OCR 完了`)
    console.log(`📝 総文字数: ${extractedText.length}`)

    // デバッグ用：最初の200文字を表示
    console.log(`📖 内容（最初の200文字）:`)
    console.log(extractedText.substring(0, 200))

    // 単一ページとして扱う（Claudeは全ページを1つのテキストとして返す）
    return {
      text: [extractedText],
      confidence: 0.95, // Claudeの精度は高いため固定値
    }
  } catch (error) {
    console.error('❌ Claude API エラー:', error)
    throw new Error(
      `Claude API による OCR に失敗しました: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
