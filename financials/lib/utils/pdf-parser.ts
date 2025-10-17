// PDF解析ユーティリティ
import * as pdfjsLib from 'pdfjs-dist'
import type { PdfExtractResult, PeriodFinancialData } from '../types/financial'

// PDF.js ワーカーの設定
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`
}

/**
 * PDFからテキストを抽出
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let fullText = ''

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    fullText += pageText + '\n'
  }

  return fullText
}

/**
 * テキストから数値を抽出（カンマ区切りや単位付き数値に対応）
 */
function extractNumber(text: string): number | null {
  // カンマを削除し、数値のみ抽出
  const match = text.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  return match ? parseFloat(match[0]) : null
}

/**
 * テキストから年度を抽出
 */
function extractFiscalYear(text: string): number | null {
  // 「2023年度」「令和5年度」などのパターンに対応
  const yearMatch = text.match(/(\d{4})\s*年/)
  if (yearMatch) {
    return parseInt(yearMatch[1])
  }

  // 令和年号から西暦に変換
  const reiwaMatch = text.match(/令和\s*(\d+)\s*年/)
  if (reiwaMatch) {
    return 2018 + parseInt(reiwaMatch[1])
  }

  return null
}

/**
 * テキストからBS項目を抽出
 */
function extractBalanceSheetItems(text: string): Partial<PeriodFinancialData['balanceSheet']> {
  const bs: Partial<PeriodFinancialData['balanceSheet']> = {}

  // 各勘定科目のパターンマッチング
  const patterns: Record<string, keyof PeriodFinancialData['balanceSheet']> = {
    '現金預金': 'cashAndDeposits',
    '売掛金': 'accountsReceivable',
    '棚卸資産': 'inventory',
    '流動資産合計': 'totalCurrentAssets',
    '有形固定資産': 'tangibleFixedAssets',
    '固定資産合計': 'totalFixedAssets',
    '資産合計': 'totalAssets',
    '買掛金': 'accountsPayable',
    '短期借入金': 'shortTermBorrowings',
    '流動負債合計': 'totalCurrentLiabilities',
    '長期借入金': 'longTermBorrowings',
    '負債合計': 'totalLiabilities',
    '資本金': 'capitalStock',
    '利益剰余金': 'retainedEarnings',
    '純資産合計': 'totalNetAssets',
  }

  for (const [label, key] of Object.entries(patterns)) {
    const regex = new RegExp(`${label}[\\s:：]*([\\d,]+)`, 'g')
    const match = regex.exec(text)
    if (match) {
      const value = extractNumber(match[1])
      if (value !== null) {
        bs[key] = value
      }
    }
  }

  return bs
}

/**
 * テキストからPL項目を抽出
 */
function extractProfitLossItems(text: string): Partial<PeriodFinancialData['profitLoss']> {
  const pl: Partial<PeriodFinancialData['profitLoss']> = {}

  const patterns: Record<string, keyof PeriodFinancialData['profitLoss']> = {
    '売上高': 'netSales',
    '売上原価': 'costOfSales',
    '売上総利益': 'grossProfit',
    '販売費及び一般管理費': 'totalSellingGeneralAdmin',
    '営業利益': 'operatingIncome',
    '経常利益': 'ordinaryIncome',
    '税引前当期純利益': 'incomeBeforeTaxes',
    '当期純利益': 'netIncome',
  }

  for (const [label, key] of Object.entries(patterns)) {
    const regex = new RegExp(`${label}[\\s:：]*([\\d,]+)`, 'g')
    const match = regex.exec(text)
    if (match) {
      const value = extractNumber(match[1])
      if (value !== null) {
        pl[key] = value
      }
    }
  }

  return pl
}

/**
 * PDFファイルから財務データを抽出
 */
export async function extractFinancialDataFromPDF(file: File): Promise<PdfExtractResult> {
  try {
    const text = await extractTextFromPDF(file)

    // 年度を抽出
    const fiscalYear = extractFiscalYear(text)

    // BS・PLデータを抽出
    const balanceSheet = extractBalanceSheetItems(text)
    const profitLoss = extractProfitLossItems(text)

    // 抽出されたデータの数をカウント
    const extractedCount =
      Object.keys(balanceSheet).length + Object.keys(profitLoss).length

    // 信頼度を計算（抽出された項目数に基づく）
    const confidence = Math.min(extractedCount / 20, 1) // 20項目以上で100%

    return {
      success: true,
      fiscalYear: fiscalYear || undefined,
      balanceSheet,
      profitLoss,
      accountDetails: [],
      confidence,
      warnings: fiscalYear ? [] : ['年度が検出できませんでした'],
      errors: extractedCount === 0 ? ['財務データを検出できませんでした'] : [],
    }
  } catch (error) {
    console.error('PDF extraction error:', error)
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'PDF読み込みエラー'],
      confidence: 0,
    }
  }
}

/**
 * 複数のPDFファイルから財務データを抽出
 */
export async function extractMultiplePDFs(
  files: Array<{ file: File; fiscalYear: number }>
): Promise<Record<number, PdfExtractResult>> {
  const results: Record<number, PdfExtractResult> = {}

  for (const { file, fiscalYear } of files) {
    const result = await extractFinancialDataFromPDF(file)
    results[fiscalYear] = {
      ...result,
      fiscalYear: result.fiscalYear || fiscalYear,
    }
  }

  return results
}
