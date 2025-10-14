// PDF処理ユーティリティ
import * as pdfjsLib from 'pdfjs-dist'
import { createWorker } from 'tesseract.js'
import type { PdfExtractResult, FileType } from '../types/financial'

// PDF.jsワーカーの設定
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
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
      .map((item: any) => item.str)
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

  const worker = await createWorker('jpn') // 日本語OCR

  const textPages: string[] = []
  let totalConfidence = 0

  try {
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 2.0 })

      // Canvasにレンダリング
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!
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
  try {
    // スキャンPDFかどうか判定
    const isScanned = await isPdfScanned(file)

    let textPages: string[]
    let confidence = 1.0

    if (isScanned) {
      // OCRで読み取り
      const ocrResult = await extractTextWithOcr(file)
      textPages = ocrResult.text
      confidence = ocrResult.confidence
    } else {
      // デジタルPDFから直接テキスト抽出
      textPages = await extractTextFromPdf(file)
    }

    // テキストから財務データを解析
    const extractedData = parseFinancialData(textPages, fileType, fiscalYear)

    return {
      success: true,
      fiscalYear,
      ...extractedData,
      confidence,
    }
  } catch (error) {
    console.error('PDF extraction error:', error)
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      confidence: 0,
    }
  }
}

/**
 * 抽出したテキストから財務データを解析
 */
function parseFinancialData(
  textPages: string[],
  fileType: FileType,
  fiscalYear: number
): Partial<PdfExtractResult> {
  const fullText = textPages.join('\n')

  if (fileType === 'financial_statement') {
    // 決算書（BS・PL）のパース
    return parseFinancialStatement(fullText, fiscalYear)
  } else {
    // 勘定科目内訳書のパース
    return parseAccountDetails(fullText, fiscalYear)
  }
}

/**
 * 決算書（BS・PL）のパース
 */
function parseFinancialStatement(
  text: string,
  fiscalYear: number
): Partial<PdfExtractResult> {
  const errors: string[] = []
  const warnings: string[] = []

  // 正規表現パターンで金額を抽出
  // 実際の会計ソフトのフォーマットに応じて調整が必要

  const balanceSheet: any = {}
  const profitLoss: any = {}

  // BS項目の抽出例
  const patterns = {
    // 資産
    cashAndDeposits: /現金.*?預金.*?[：:]\s*([\d,]+)/i,
    securities: /有価証券.*?[：:]\s*([\d,]+)/i,
    accountsReceivable: /売掛金.*?[：:]\s*([\d,]+)/i,
    inventory: /棚卸資産.*?[：:]\s*([\d,]+)/i,
    totalCurrentAssets: /流動資産.*?合計.*?[：:]\s*([\d,]+)/i,
    land: /土地.*?[：:]\s*([\d,]+)/i,
    totalAssets: /資産.*?合計.*?[：:]\s*([\d,]+)/i,

    // 負債
    shortTermBorrowings: /短期.*?借入金.*?[：:]\s*([\d,]+)/i,
    accountsPayable: /買掛金.*?[：:]\s*([\d,]+)/i,
    longTermBorrowings: /長期.*?借入金.*?[：:]\s*([\d,]+)/i,
    bondsPayable: /社債.*?[：:]\s*([\d,]+)/i,
    totalLiabilities: /負債.*?合計.*?[：:]\s*([\d,]+)/i,

    // 純資産
    totalNetAssets: /純資産.*?合計.*?[：:]\s*([\d,]+)/i,
  }

  // PL項目の抽出例
  const plPatterns = {
    netSales: /売上.*?高.*?[：:]\s*([\d,]+)/i,
    costOfSales: /売上.*?原価.*?[：:]\s*([\d,]+)/i,
    grossProfit: /売上.*?総利益.*?[：:]\s*([\d,]+)/i,
    operatingIncome: /営業.*?利益.*?[：:]\s*([\d,]+)/i,
    ordinaryIncome: /経常.*?利益.*?[：:]\s*([\d,]+)/i,
    netIncome: /当期.*?純利益.*?[：:]\s*([\d,]+)/i,
  }

  // BS項目を抽出
  for (const [key, pattern] of Object.entries(patterns)) {
    const match = text.match(pattern)
    if (match) {
      const value = parseFloat(match[1].replace(/,/g, ''))
      if (!isNaN(value)) {
        balanceSheet[key] = value
      }
    } else {
      warnings.push(`${key}が見つかりませんでした`)
    }
  }

  // PL項目を抽出
  for (const [key, pattern] of Object.entries(plPatterns)) {
    const match = text.match(pattern)
    if (match) {
      const value = parseFloat(match[1].replace(/,/g, ''))
      if (!isNaN(value)) {
        profitLoss[key] = value
      }
    } else {
      warnings.push(`${key}が見つかりませんでした`)
    }
  }

  return {
    balanceSheet,
    profitLoss,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

/**
 * 勘定科目内訳書のパース
 */
function parseAccountDetails(
  text: string,
  fiscalYear: number
): Partial<PdfExtractResult> {
  const accountDetails: any[] = []
  const errors: string[] = []
  const warnings: string[] = []

  // 勘定科目内訳書のフォーマットは標準化されているため、
  // 国税庁のフォーマットに基づいてパース

  // 簡易的な実装例（実際にはもっと詳細なパースが必要）
  const lines = text.split('\n')
  let currentAccountType = ''

  for (const line of lines) {
    // 勘定科目タイプを検出
    if (line.includes('現金預金')) {
      currentAccountType = 'cash_deposits'
    } else if (line.includes('売掛金') || line.includes('受取手形')) {
      currentAccountType = 'receivables'
    } else if (line.includes('棚卸資産')) {
      currentAccountType = 'inventory'
    } else if (line.includes('借入金')) {
      currentAccountType = 'borrowings'
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
