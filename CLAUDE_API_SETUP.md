# Claude API 連携セットアップ手順

## 概要

PDFから財務データを抽出する際、従来の正規表現パターンマッチングでは対応しきれないレイアウトの崩れ（OCR時の文字間スペース、数値フォーマットの不整合など）に対応するため、**Claude API**を使った高精度な財務データ抽出機能を実装しました。

## 実装内容

### 新規ファイル
- `financials/lib/utils/ai-financial-extractor.ts` - Claude API連携ユーティリティ

### 変更ファイル
- `financials/lib/utils/pdf-processor.ts` - AI抽出機能の統合
- `financials/lib/types/financial.ts` - `PdfExtractResult` に `summary` フィールドを追加
- `financials/.env.local` - `NEXT_PUBLIC_ANTHROPIC_API_KEY` を追加

### パッケージ追加
- `@anthropic-ai/sdk` (v0.x)

## セットアップ手順

### 1. Claude API キーの取得

1. https://console.anthropic.com/ にアクセス
2. アカウントを作成（未作成の場合）
3. 「Settings」→「API Keys」に移動
4. 「Create Key」をクリックして新しいAPIキーを作成
5. 生成されたAPIキーをコピー（`sk-ant-...` で始まる文字列）

### 2. 環境変数の設定

`.env.local` ファイルを開き、以下の行を編集：

```bash
# Anthropic Claude API キー（PDF財務データ抽出用）
# https://console.anthropic.com/settings/keys から取得
NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-your-actual-api-key-here
```

**重要**: `your-anthropic-api-key` を実際に取得したAPIキーに置き換えてください。

### 3. 開発サーバーの再起動

環境変数を反映させるため、開発サーバーを再起動：

```bash
cd financials
npm run dev
```

## 動作の仕組み

### 処理フロー

```
1. PDFアップロード
   ↓
2. OCR処理（Tesseract.js）
   ↓
3. Claude API による財務データ抽出 ← NEW!
   - 文脈から勘定科目を理解
   - レイアウト崩れに強い
   - 数値の正規化
   - 財務状況の要約生成
   ↓
4. データベースに保存
```

### フォールバック機能

Claude API が利用できない場合（APIキー未設定、エラー発生時など）は、従来の正規表現による抽出に自動的にフォールバックします。

```typescript
// ai-financial-extractor.ts
export async function extractFinancialDataHybrid(
  ocrText: string,
  fallbackFn: (text: string) => { ... }
): Promise<AIExtractionResult> {
  try {
    // まずAI抽出を試みる
    return await extractFinancialDataWithAI(ocrText)
  } catch (error) {
    // フォールバック: 従来の正規表現による抽出
    return fallbackFn(ocrText)
  }
}
```

## コスト試算

### Claude API 料金（Sonnet 3.5）

- **入力**: $3 / 1M tokens
- **出力**: $15 / 1M tokens

### 1PDFあたりのコスト

3ページのPDF（約3000文字）の場合：
- 入力トークン: 約4,000 tokens → **$0.012**
- 出力トークン: 約1,000 tokens → **$0.015**
- **合計: 約$0.03（約4円）**

### 月間コスト例

- 月100件処理: 約400円
- 月500件処理: 約2,000円
- 月1,000件処理: 約4,000円

## 使用方法

通常通りPDFをアップロードするだけで、自動的にClaude APIを使用した抽出が実行されます。

### ログの確認

ブラウザの開発者ツール（F12）のConsoleで以下のログを確認できます：

```
🤖 Claude API による財務データ抽出開始...
📄 入力テキスト長: 3245 文字
✅ Claude API レスポンス受信
📊 使用トークン数: { input: 4123, output: 987 }
✅ 財務データ抽出成功
📊 BS項目数: 12
📊 PL項目数: 6
```

### エラー時の動作

Claude APIでエラーが発生した場合：

```
⚠️ AI抽出に失敗、従来の正規表現による抽出にフォールバック
=== PDF抽出開始（正規表現フォールバック） ===
```

このログが表示された場合は、以下を確認してください：
1. `.env.local` にAPIキーが正しく設定されているか
2. APIキーが有効か（期限切れでないか）
3. API利用制限に達していないか

## トラブルシューティング

### APIキーエラー

```
❌ ANTHROPIC_API_KEY が設定されていません
```

**解決方法**: `.env.local` に `NEXT_PUBLIC_ANTHROPIC_API_KEY` を設定し、開発サーバーを再起動

### API利用制限エラー

```
❌ Claude API エラー: 429 Too Many Requests
```

**解決方法**: しばらく待ってから再試行、またはAPI利用プランの確認

### 抽出結果が空

```
📊 BS項目数: 0
📊 PL項目数: 0
```

**解決方法**:
1. PDFの品質を確認（スキャン画質が低い場合はOCRの精度が下がります）
2. ログでClaude APIのレスポンスを確認
3. 必要に応じてプロンプトを調整（`ai-financial-extractor.ts` の `content` フィールド）

## 今後の拡張案

### 1. 要約の活用

現在、Claude APIは財務状況の要約も生成していますが、UI上では表示していません。今後、以下のような活用が可能です：

- PDFアップロード後に要約を表示
- 分析レポートに要約を含める
- 異常値の自動検出と警告

### 2. 複数AIモデルの対応

OpenAI GPT-4o など、他のAIモデルにも対応することで、コスト最適化や精度向上が可能です。

### 3. プロンプトのカスタマイズ

業種や会計ソフトに応じて、抽出プロンプトをカスタマイズできるようにする。

## 参考リンク

- [Anthropic Claude API ドキュメント](https://docs.anthropic.com/)
- [Claude API Console](https://console.anthropic.com/)
- [料金プラン](https://www.anthropic.com/pricing)
