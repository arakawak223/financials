// Google Cloud Vision API を使用したOCR処理
import vision from '@google-cloud/vision'
import path from 'path'

/**
 * Google Cloud Vision APIクライアントを初期化
 */
function getVisionClient() {
  console.log('🔧 Vision API クライアント初期化中...')
  console.log('🔍 環境変数チェック:')
  console.log('  - GOOGLE_CLOUD_CREDENTIALS_BASE64:', process.env.GOOGLE_CLOUD_CREDENTIALS_BASE64 ? '設定あり（Base64, 長さ: ' + process.env.GOOGLE_CLOUD_CREDENTIALS_BASE64.length + '）' : '未設定')
  console.log('  - GOOGLE_CLOUD_CREDENTIALS:', process.env.GOOGLE_CLOUD_CREDENTIALS ? '設定あり（JSON, 長さ: ' + process.env.GOOGLE_CLOUD_CREDENTIALS.length + '）' : '未設定')

  // 方法1: Base64エンコードされた認証情報（推奨）
  const credentialsBase64 = process.env.GOOGLE_CLOUD_CREDENTIALS_BASE64
  if (credentialsBase64) {
    try {
      console.log('🔐 Base64エンコードされた認証情報をデコード中...')
      const credentialsJson = Buffer.from(credentialsBase64, 'base64').toString('utf-8')
      console.log('📝 デコード後の長さ:', credentialsJson.length, '文字')

      const credentials = JSON.parse(credentialsJson)

      console.log('✅ Base64デコード＆JSONパース成功')
      console.log('📧 Service Account:', credentials.client_email)
      console.log('🆔 Project ID:', credentials.project_id)

      return new vision.ImageAnnotatorClient({
        credentials,
      })
    } catch (error) {
      console.error('❌ Base64デコードまたはJSONパースに失敗:', error)
      throw new Error(`Base64デコードエラー: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // 方法2: JSON文字列（フォールバック）
  const credentialsJson = process.env.GOOGLE_CLOUD_CREDENTIALS
  if (credentialsJson) {
    try {
      console.log('🔍 JSON文字列形式の認証情報を処理中...')
      console.log('📝 環境変数の長さ:', credentialsJson.length, '文字')

      let credentials
      if (typeof credentialsJson === 'string') {
        credentials = JSON.parse(credentialsJson)
      } else {
        credentials = credentialsJson
      }

      console.log('✅ JSONパース成功')
      console.log('📧 Service Account:', credentials.client_email)
      console.log('🆔 Project ID:', credentials.project_id)

      return new vision.ImageAnnotatorClient({
        credentials,
      })
    } catch (error) {
      console.error('❌ JSON認証情報のパースに失敗')
      console.error('📝 エラー:', error instanceof Error ? error.message : String(error))

      if (error instanceof SyntaxError) {
        console.error('⚠️  JSON構文エラー')
        console.error('💡 ヒント: GOOGLE_CLOUD_CREDENTIALS_BASE64 を使用することを推奨します')
      }

      throw new Error(`JSON認証情報パースエラー: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // ファイルベースの認証を使用（ローカル開発環境）
  const credentialsPath = path.join(process.cwd(), 'google-credentials.json')
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
