// Vision API認証テスト
const vision = require('@google-cloud/vision');
const path = require('path');

async function testVisionAuth() {
  try {
    console.log('🔧 Vision API認証テスト開始...');

    const credentialsPath = path.join(__dirname, 'google-credentials.json');
    console.log('📁 認証情報ファイル:', credentialsPath);

    const client = new vision.ImageAnnotatorClient({
      keyFilename: credentialsPath,
    });

    console.log('✅ クライアント作成成功');

    // 簡単なテスト：プロジェクトIDを取得
    const projectId = await client.getProjectId();
    console.log('✅ プロジェクトID:', projectId);

    console.log('✅ 認証成功！');
  } catch (error) {
    console.error('❌ 認証エラー:', error.message);
    console.error('詳細:', error);
  }
}

testVisionAuth();
