// Vision API OCRテスト
const vision = require('@google-cloud/vision');
const path = require('path');
const fs = require('fs');

async function testVisionOCR() {
  try {
    console.log('🔧 Vision API OCRテスト開始...');

    const credentialsPath = path.join(__dirname, 'google-credentials.json');
    console.log('📁 認証情報ファイル:', credentialsPath);

    const client = new vision.ImageAnnotatorClient({
      keyFilename: credentialsPath,
    });

    console.log('✅ クライアント作成成功');

    // テスト用のPDFファイルを読み込む
    // （実際のファイルパスに置き換える必要があります）
    // ここでは簡単なテキスト検出をテスト
    const testImageUrl = 'gs://cloud-samples-data/vision/ocr/sign.jpg';

    console.log('📤 Vision API テストリクエスト送信中...');

    const [result] = await client.textDetection(testImageUrl);
    const detections = result.textAnnotations;

    if (detections && detections.length > 0) {
      console.log('✅ OCR成功！');
      console.log('検出されたテキスト:', detections[0].description.substring(0, 100));
    } else {
      console.log('⚠️  テキストが検出されませんでした');
    }

    console.log('✅ Vision API OCR テスト成功！');
  } catch (error) {
    console.error('❌ OCRエラー:', error.message);
    console.error('エラーコード:', error.code);
    console.error('詳細:', error);
  }
}

testVisionOCR();
