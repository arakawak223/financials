// Google Cloud Vision API を使用したOCR処理
import vision from '@google-cloud/vision'
import path from 'path'

/**
 * Google Cloud Vision APIクライアントを初期化
 */
function getVisionClient() {
  // ファイルベースの認証を使用（推奨方法）
  const credentialsPath = path.join(process.cwd(), 'google-credentials.json')

  console.log('🔧 Vision API クライアント初期化中...')
  console.log('📁 認証情報ファイル:', credentialsPath)

  return new vision.ImageAnnotatorClient({
    keyFilename: credentialsPath,
  })
}

/**
 * PDFをGoogle Cloud Vision APIでOCR処理
 * @param pdfBuffer PDFファイルのバッファ
 * @returns OCRで抽出されたテキスト（ページごと）
 */
export async function extractTextWithGoogleVision(
  pdfBuffer: Buffer
): Promise<{
  text: string[]
  confidence: number
}> {
  console.log('🔧 Google Cloud Vision API による OCR 処理開始...')

  try {
    const client = getVisionClient()

    // PDFをbase64エンコード
    const base64Pdf = pdfBuffer.toString('base64')

    // Vision APIリクエスト
    const request = {
      requests: [
        {
          inputConfig: {
            mimeType: 'application/pdf',
            content: base64Pdf,
          },
          features: [
            {
              type: 'DOCUMENT_TEXT_DETECTION' as const,
              // 日本語の精度向上のため、言語ヒントを設定
              languageHints: ['ja', 'en'],
            },
          ],
        },
      ],
    }

    console.log('📤 Vision API リクエスト送信中...')
    const [result] = await client.batchAnnotateFiles(request)

    if (!result.responses || result.responses.length === 0) {
      throw new Error('Vision API からレスポンスがありません')
    }

    const textPages: string[] = []
    let totalConfidence = 0
    let pageCount = 0

    // 各ページのテキストを抽出
    for (const response of result.responses) {
      if (response.responses) {
        for (const pageResponse of response.responses) {
          if (pageResponse.fullTextAnnotation) {
            const text = pageResponse.fullTextAnnotation.text || ''
            textPages.push(text)

            // 信頼度の計算（全ページの平均）
            if (pageResponse.fullTextAnnotation.pages) {
              pageResponse.fullTextAnnotation.pages.forEach(page => {
                if (page.confidence) {
                  totalConfidence += page.confidence
                  pageCount++
                }
              })
            }
          }
        }
      }
    }

    const averageConfidence = pageCount > 0 ? totalConfidence / pageCount : 0.9

    console.log(`✅ Vision API OCR 完了`)
    console.log(`📄 抽出ページ数: ${textPages.length}`)
    console.log(`📊 平均信頼度: ${(averageConfidence * 100).toFixed(1)}%`)
    console.log(`📝 総文字数: ${textPages.join('').length}`)

    // デバッグ用：最初のページの一部を表示
    if (textPages.length > 0) {
      console.log(`📖 1ページ目の内容（最初の200文字）:`)
      console.log(textPages[0].substring(0, 200))
    }

    return {
      text: textPages,
      confidence: averageConfidence,
    }
  } catch (error) {
    console.error('❌ Google Vision API エラー:', error)
    throw new Error(
      `Vision API による OCR に失敗しました: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
