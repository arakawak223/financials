export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server'
import { extractTextWithGoogleVision } from '@/lib/utils/google-vision-ocr'

export async function POST(request: NextRequest) {
  try {
    // FormDataからファイルを取得
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが必要です' },
        { status: 400 }
      )
    }

    console.log('🔧 Vision API OCR リクエスト受信:', file.name, file.size, 'bytes')

    // FileからBufferに変換
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Google Vision APIでOCR
    const result = await extractTextWithGoogleVision(buffer)

    // OCRテキスト全体をログ出力（デバッグ用）
    console.log('\n========== OCRテキスト全体 ==========')
    result.text.forEach((page, idx) => {
      console.log(`\n--- ページ ${idx + 1} ---`)
      console.log(page)
    })
    console.log('\n========================================\n')

    return NextResponse.json({
      success: true,
      text: result.text,
      confidence: result.confidence,
    })
  } catch (error) {
    console.error('❌ Vision API OCR エラー:', error)
    return NextResponse.json(
      {
        error: 'Vision API によるOCRに失敗しました',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
