// 秘密鍵のフォーマットをテスト
const fs = require('fs');
const crypto = require('crypto');

async function testKeyFormat() {
  try {
    console.log('🔧 秘密鍵フォーマットテスト開始...');

    const creds = JSON.parse(fs.readFileSync('google-credentials.json', 'utf8'));
    const privateKey = creds.private_key;

    console.log('📝 秘密鍵情報:');
    console.log('  - 長さ:', privateKey.length, '文字');
    console.log('  - 改行数:', (privateKey.match(/\n/g) || []).length);
    console.log('  - 開始:', privateKey.substring(0, 30));
    console.log('  - 終了:', privateKey.substring(privateKey.length - 30));

    // 秘密鍵をNode.jsで読み込めるかテスト
    console.log('\n🔐 秘密鍵のパーステスト...');
    const keyObject = crypto.createPrivateKey({
      key: privateKey,
      format: 'pem',
      type: 'pkcs8'
    });

    console.log('✅ 秘密鍵のパース成功！');
    console.log('  - キータイプ:', keyObject.asymmetricKeyType);
    console.log('  - キーサイズ:', keyObject.asymmetricKeyDetails?.modulusLength || 'N/A', 'bits');

    // 署名テスト
    console.log('\n✍️  署名テスト...');
    const sign = crypto.createSign('SHA256');
    sign.update('test data');
    const signature = sign.sign(keyObject);
    console.log('✅ 署名成功！');
    console.log('  - 署名長:', signature.length, 'bytes');

    console.log('\n✅ 秘密鍵は正常です！');
    console.log('\n次のステップ:');
    console.log('1. Google Cloudでサービスアカウントの権限を確認');
    console.log('2. IAMページで "Cloud Vision API ユーザー" ロールが付与されているか確認');
    console.log('   https://console.cloud.google.com/iam-admin/iam?project=custom-unison-476405-e4');

  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('詳細:', error);

    if (error.message.includes('unsupported')) {
      console.error('\n🔍 推奨される対処法:');
      console.error('1. Google Cloudで新しいサービスアカウントキーを生成');
      console.error('2. ダウンロードしたJSONファイルで google-credentials.json を置き換え');
      console.error('3. サーバーを再起動');
    }
  }
}

testKeyFormat();
