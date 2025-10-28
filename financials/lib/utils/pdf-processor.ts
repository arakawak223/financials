// PDF処理ユーティリティ
import * as pdfjsLib from 'pdfjs-dist'
import type { PdfExtractResult, FileType, AccountDetail, AccountType } from '../types/financial'
import { extractFinancialDataHybrid } from './ai-financial-extractor'

// PDF.jsワーカーの設定
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
}

/**
 * PDFからテキストを抽出（デジタルPDF用）
 */
export async function extractTextFromPdf(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const textPages: string[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    textPages.push(pageText)
  }

  return textPages
}

/**
 * PDFをOCRで読み取り（スキャンPDF用）
 */
export async function extractTextWithOcr(file: File): Promise<{
  text: string[]
  confidence: number
}> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  // 英語OCR（一時的に日本語を無効化）
  console.log('🔧 Tesseract.js worker 作成中...')
  const worker = await createWorker('eng')
  console.log('✅ Tesseract.js worker 作成完了')

  const textPages: string[] = []
  let totalConfidence = 0

  try {
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 2.0 })

      // Canvasにレンダリング
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('Failed to get canvas context')
      }

      canvas.height = viewport.height
      canvas.width = viewport.width

      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas as unknown as HTMLCanvasElement,
      }).promise

      // OCR実行
      const imageData = canvas.toDataURL('image/png')
      const { data } = await worker.recognize(imageData)

      textPages.push(data.text)
      totalConfidence += data.confidence
    }

    const averageConfidence = totalConfidence / pdf.numPages

    return {
      text: textPages,
      confidence: averageConfidence / 100, // 0-1に正規化
    }
  } finally {
    await worker.terminate()
  }
}

/**
 * PDFが画像ベース（スキャン）かテキストベースかを判定
 */
export async function isPdfScanned(file: File): Promise<boolean> {
  const textPages = await extractTextFromPdf(file)
  const totalText = textPages.join('').trim()

  // テキストがほとんどない場合はスキャンPDFと判定
  return totalText.length < 100
}

/**
 * PDFから財務データを抽出（メイン関数）
 */
export async function extractFinancialDataFromPdf(
  file: File,
  fileType: FileType,
  fiscalYear: number
): Promise<PdfExtractResult> {
  console.log(`📄 extractFinancialDataFromPdf 開始:`, { fileName: file.name, fileType, fiscalYear, fileSize: file.size })

  try {
    // まずデジタルPDFとして直接テキスト抽出を試みる
    console.log(`📖 デジタルPDFとしてテキスト抽出を試行...`)
    const textPages = await extractTextFromPdf(file)
    const directTextLength = textPages.join('').length
    console.log(`📝 直接抽出された文字数: ${directTextLength}`)

    let finalTextPages: string[]
    let confidence: number

    // テキストがほとんど抽出できない場合はGoogle Vision APIでOCR
    if (directTextLength < 100) {
      console.log(`⚠️  デジタルPDFとしてのテキスト抽出失敗（文字数: ${directTextLength}）`)
      console.log(`🔧 Google Cloud Vision API による OCR 処理に切り替えます...`)

      // APIルート経由でVision API OCRを実行
      const formData = new FormData()
      formData.append('file', file)

      const ocrResponse = await fetch('/api/ocr/vision', {
        method: 'POST',
        body: formData,
      })

      if (!ocrResponse.ok) {
        const errorData = await ocrResponse.json()
        throw new Error(errorData.error || 'Vision API OCR に失敗しました')
      }

      const ocrResult = await ocrResponse.json()
      finalTextPages = ocrResult.text
      confidence = ocrResult.confidence

      console.log(`✅ Vision API OCR完了: pages=${finalTextPages.length}, 総文字数=${finalTextPages.join('').length}, confidence=${confidence}`)
    } else {
      console.log(`✅ デジタルPDFとして正常にテキスト抽出完了`)
      finalTextPages = textPages
      confidence = 1.0
    }

    // テキストから財務データを解析
    console.log(`🔬 財務データ解析開始...`)
    const extractedData = await parseFinancialData(finalTextPages, fileType)
    console.log(`✅ 財務データ解析完了`)

    const result = {
      success: true,
      fiscalYear,
      ...extractedData,
      confidence,
    }

    console.log(`✅ extractFinancialDataFromPdf 完了:`, result)
    return result
  } catch (error) {
    console.error(`❌ PDF extraction error:`, error)
    console.error(`エラー詳細:`, {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'N/A'
    })
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      confidence: 0,
    }
  }
}

/**
 * 抽出したテキストから財務データを解析
 * AI（Claude）を優先使用し、失敗時は従来の正規表現にフォールバック
 */
async function parseFinancialData(
  textPages: string[],
  fileType: FileType
): Promise<Partial<PdfExtractResult>> {
  const fullText = textPages.join('\n')

  if (fileType === 'financial_statement') {
    // 決算書（BS・PL）のパース
    // AI抽出を試み、失敗時は正規表現にフォールバック
    try {
      console.log('🤖 AI（Claude）による財務データ抽出を試行...')
      const aiResult = await extractFinancialDataHybrid(
        fullText,
        parseFinancialStatementWithRegex // フォールバック関数
      )

      return {
        balanceSheet: aiResult.balanceSheet,
        profitLoss: aiResult.profitLoss,
        summary: aiResult.summary,
      }
    } catch (error) {
      console.error('❌ AI抽出エラー、正規表現フォールバックを使用:', error)
      return parseFinancialStatementWithRegex(fullText)
    }
  } else {
    // 勘定科目内訳書のパース
    return parseAccountDetails(fullText)
  }
}

/**
 * 決算書（BS・PL）のパース（正規表現版）
 * AI抽出のフォールバックとして使用
 */
function parseFinancialStatementWithRegex(
  text: string
): { balanceSheet: Record<string, number>; profitLoss: Record<string, number> } {
  console.log('=== PDF抽出開始（正規表現フォールバック） ===')
  console.log('抽出されたテキスト（最初の500文字）:', text.substring(0, 500))

  const balanceSheet: Record<string, number> = {}
  const profitLoss: Record<string, number> = {}

  // 弥生会計対応：複数のパターンを試す
  // パターン1: コロン区切り（例: 現金預金：10,000,000）
  // パターン2: スペース/タブ区切り（例: 現金預金    10,000,000）
  // パターン3: 改行を含む（例: 現金預金\n10,000,000）

  const patterns = {
    // 資産（複数パターンを配列で定義）
    cash_and_deposits: [
      /現金.*?預金[：:\s]+(\d[\d,]+)/i,
      /普通預金[：:\s]+(\d[\d,]+)/i,
      /当座預金[：:\s]+(\d[\d,]+)/i,
      /定期預金[：:\s]+(\d[\d,]+)/i,
      /現金[：:\s]+(\d[\d,]+)/i,
    ],
    accounts_receivable: [
      /売掛金[：:\s]+(\d[\d,]+)/i,
      /受取手形.*?売掛金[：:\s]+(\d[\d,]+)/i,
    ],
    inventory: [
      /棚卸資産[：:\s]+(\d[\d,]+)/i,
      /商品[：:\s]+(\d[\d,]+)/i,
    ],
    current_assets_total: [
      /流動資産.*?合計[：:\s]+(\d[\d,]+)/i,
      /流動資産[：:\s]+(\d[\d,]+)/i,
    ],
    tangible_fixed_assets: [
      /有形固定資産[：:\s]+(\d[\d,]+)/i,
      /建物.*?構築物[：:\s]+(\d[\d,]+)/i,
    ],
    total_assets: [
      /(?:^|[\s\n])資産合計[：:\s]+(\d[\d,]+)/i,
      /(?:^|[\s\n])資産の部.*?合計[：:\s]+(\d[\d,]+)/i,
      /(?<!流動)(?<!固定)資産.*?合計[：:\s]+(\d[\d,]+)/i,
    ],

    // 負債
    accounts_payable: [
      /買掛金[：:\s]+(\d[\d,]+)/i,
      /支払手形.*?買掛金[：:\s]+(\d[\d,]+)/i,
      /未払金[：:\s]+(\d[\d,]+)/i, // 未払金も買掛金として扱う
    ],
    short_term_borrowings: [
      /短期借入金[：:\s]+(\d[\d,]+)/i,
      /短期.*?借入[：:\s]+(\d[\d,]+)/i,
      /1年以内.*?返済.*?長期借入金[：:\s]+(\d[\d,]+)/i,
      /一年以内.*?返済.*?長期借入金[：:\s]+(\d[\d,]+)/i,
    ],
    current_liabilities_total: [
      /流動負債.*?合計[：:\s]+(\d[\d,]+)/i,
      /流動負債[：:\s]+(\d[\d,]+)/i,
    ],
    long_term_borrowings: [
      /長期借入金[：:\s]+(\d[\d,]+)/i,
      /長期.*?借入[：:\s]+(\d[\d,]+)/i,
    ],
    total_liabilities: [
      /(?:^|[\s\n])負債合計[：:\s]+(\d[\d,]+)/i,
      /(?:^|[\s\n])負債の部.*?合計[：:\s]+(\d[\d,]+)/i,
      /(?<!流動)(?<!固定)負債.*?合計[：:\s]+(\d[\d,]+)/i,
    ],

    // 純資産
    total_net_assets: [
      /純資産.*?合計[：:\s]+(\d[\d,]+)/i,
      /純資産の部.*?合計[：:\s]+(\d[\d,]+)/i,
      /資本.*?合計[：:\s]+(\d[\d,]+)/i,
    ],
  }

  // PL項目（弥生会計フォーマット対応）
  const plPatterns = {
    net_sales: [
      /売上.*?高[：:\s]+(\d[\d,]+)/i,
      /売上[：:\s]+(\d[\d,]+)/i,
    ],
    cost_of_sales: [
      /売上原価[：:\s]+(\d[\d,]+)/i,
      /売上.*?原価[：:\s]+(\d[\d,]+)/i,
    ],
    gross_profit: [
      /売上総利益[：:\s]+(\d[\d,]+)/i,
      /売上.*?総利益[：:\s]+(\d[\d,]+)/i,
    ],
    operating_income: [
      /営業利益[：:\s]+(\d[\d,]+)/i,
      /営業.*?利益[：:\s]+(\d[\d,]+)/i,
    ],
    ordinary_income: [
      /経常利益[：:\s]+(\d[\d,]+)/i,
      /経常.*?利益[：:\s]+(\d[\d,]+)/i,
    ],
    net_income: [
      /当期純利益[：:\s]+(\d[\d,]+)/i,
      /当期.*?純利益[：:\s]+(\d[\d,]+)/i,
      /税引後.*?当期純利益[：:\s]+(\d[\d,]+)/i,
    ],
  }

  // BS項目を抽出（複数パターンを試す）
  for (const [key, patternArray] of Object.entries(patterns)) {
    let found = false
    for (const pattern of patternArray) {
      const match = text.match(pattern)
      if (match) {
        const value = parseFloat(match[1].replace(/,/g, ''))
        if (!isNaN(value) && value > 0) {
          balanceSheet[key] = value
          console.log(`✅ ${key}: ${value.toLocaleString()}`)
          found = true
          break
        }
      }
    }
    if (!found) {
      console.log(`⚠️  ${key}が見つかりませんでした`)
    }
  }

  // PL項目を抽出（複数パターンを試す）
  for (const [key, patternArray] of Object.entries(plPatterns)) {
    let found = false
    for (const pattern of patternArray) {
      const match = text.match(pattern)
      if (match) {
        const value = parseFloat(match[1].replace(/,/g, ''))
        if (!isNaN(value) && value > 0) {
          profitLoss[key] = value
          console.log(`✅ ${key}: ${value.toLocaleString()}`)
          found = true
          break
        }
      }
    }
    if (!found) {
      console.log(`⚠️  ${key}が見つかりませんでした`)
    }
  }

  console.log('=== BS抽出結果 ===', balanceSheet)
  console.log('=== PL抽出結果 ===', profitLoss)

  return {
    balanceSheet,
    profitLoss,
  }
}

/**
 * 勘定科目内訳書のパース
 */
function parseAccountDetails(
  text: string
): Partial<PdfExtractResult> {
  const accountDetails: AccountDetail[] = []
  const errors: string[] = []
  const warnings: string[] = []

  // 勘定科目内訳書のフォーマットは標準化されているため、
  // 国税庁のフォーマットに基づいてパース

  // 簡易的な実装例（実際にはもっと詳細なパースが必要）
  const lines = text.split('\n')
  let currentAccountType: AccountType | '' = ''

  for (const line of lines) {
    // 勘定科目タイプを検出
    if (line.includes('現金預金')) {
      currentAccountType = 'cash_deposits' as AccountType
    } else if (line.includes('売掛金') || line.includes('受取手形')) {
      currentAccountType = 'receivables' as AccountType
    } else if (line.includes('棚卸資産')) {
      currentAccountType = 'inventory' as AccountType
    } else if (line.includes('借入金')) {
      currentAccountType = 'borrowings' as AccountType
    }

    // 金額パターンを検出
    const amountMatch = line.match(/([\d,]+)\s*円?$/i)
    if (amountMatch && currentAccountType) {
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''))
      if (!isNaN(amount) && amount > 0) {
        accountDetails.push({
          accountType: currentAccountType,
          itemName: line.replace(amountMatch[0], '').trim(),
          amount,
        })
      }
    }
  }

  if (accountDetails.length === 0) {
    warnings.push('勘定科目内訳が抽出できませんでした')
  }

  return {
    accountDetails,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

/**
 * 数値文字列をパース
 */
export function parseNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value

  const cleanValue = value.replace(/[,円]/g, '').trim()
  const parsed = parseFloat(cleanValue)

  return isNaN(parsed) ? null : parsed
}
