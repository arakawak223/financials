// Claude API 財務データ抽出テスト

const sampleOCRText = `
貸借対照表
令和5年3月31日現在

【資産の部】
Ⅰ 流動資産
  現金及び預金           12,500,000
  受取手形               3,200,000
  売掛金                 8,750,000
  商品                   4,500,000
  流動資産合計          28,950,000

Ⅱ 固定資産
  有形固定資産
    建物                15,000,000
    機械装置             8,500,000
    有形固定資産合計    23,500,000
  固定資産合計          23,500,000

  資産合計              52,450,000

【負債の部】
Ⅰ 流動負債
  買掛金                 5,600,000
  短期借入金            10,000,000
  流動負債合計          15,600,000

Ⅱ 固定負債
  長期借入金            15,000,000
  固定負債合計          15,000,000

  負債合計              30,600,000

【純資産の部】
  資本金                10,000,000
  利益剰余金            11,850,000
  純資産合計            21,850,000

損益計算書
自令和4年4月1日 至令和5年3月31日

Ⅰ 売上高               95,000,000

Ⅱ 売上原価            68,000,000

   売上総利益          27,000,000

Ⅲ 販売費及び一般管理費 18,500,000

   営業利益             8,500,000

Ⅳ 営業外収益            500,000

Ⅴ 営業外費用            800,000

   経常利益             8,200,000

Ⅵ 税引前当期純利益      8,200,000

Ⅶ 法人税等             2,450,000

   当期純利益           5,750,000
`;

async function testClaudeExtraction() {
  try {
    console.log('🧪 Claude API 財務データ抽出テスト開始...\n');

    // 開発サーバーが起動していることを前提
    const url = 'http://localhost:3000/api/extract-financial-data';

    console.log('📤 リクエスト送信中...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ocrText: sampleOCRText }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${errorData.error || errorData.details || 'Unknown error'}`);
    }

    const result = await response.json();

    console.log('\n✅ 抽出成功！\n');

    console.log('📊 貸借対照表（BS）:');
    console.log(JSON.stringify(result.balanceSheet, null, 2));

    console.log('\n📊 損益計算書（PL）:');
    console.log(JSON.stringify(result.profitLoss, null, 2));

    if (result.summary) {
      console.log('\n📝 財務状況サマリー:');
      console.log(result.summary);
    }

    console.log('\n✅ テスト完了！');
  } catch (error) {
    console.error('\n❌ テスト失敗:', error.message);
    if (error.stack) {
      console.error('\nスタックトレース:');
      console.error(error.stack);
    }

    console.log('\n💡 開発サーバーが起動していることを確認してください:');
    console.log('   npm run dev');
  }
}

testClaudeExtraction();
