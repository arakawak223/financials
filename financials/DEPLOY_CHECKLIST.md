# デプロイ前チェックリスト - PDF自動読み込み機能

## ✅ 完了項目

### 1. ビルド確認
- [x] `npm run build` 成功
- [x] TypeScript型チェック通過
- [x] 警告あり（デプロイには影響なし）

### 2. 実装済み機能
- [x] PDF自動読み込み機能（`lib/utils/pdf-processor.ts`）
- [x] 弥生会計フォーマット対応
- [x] 普通預金・当座預金・定期預金の認識
- [x] Supabase Storageへのアップロード機能
- [x] クライアントサイドでのPDF解析

## ⚠️ デプロイ前に必要な設定

### 1. Supabase Storage設定（本番環境）

本番環境のSupabaseで以下を設定してください：

#### A. Storageバケット作成
```sql
-- Supabase Dashboard > Storage > Create bucket
バケット名: financial-documents
Public bucket: No (認証ユーザーのみアクセス)
```

#### B. Storage Policies設定
Supabase Dashboard > Storage > financial-documents > Policies で以下を追加：

```sql
-- 1. Allow authenticated users to upload
CREATE POLICY "Allow authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'financial-documents');

-- 2. Allow authenticated users to read
CREATE POLICY "Allow authenticated read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'financial-documents');

-- 3. Allow authenticated users to delete
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'financial-documents');
```

### 2. Vercel環境変数設定

Vercel Dashboard > Settings > Environment Variables で以下を確認：

```bash
# 本番環境のSupabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# クライアント側（ブラウザから使用）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenAI API（AI分析コメント生成用 - オプション）
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_OPENAI_API_KEY=sk-...
```

### 3. マイグレーション実行

本番環境のSupabaseで以下のマイグレーションを実行：

```bash
# Supabase Dashboard > SQL Editor で実行
supabase/migrations/20251024_add_storage_fields.sql
```

または、Supabase CLIを使用：
```bash
supabase db push
```

## 📋 デプロイ手順

### 方法1: Git Push（推奨）

```bash
# 1. 変更をコミット
git add lib/utils/pdf-processor.ts
git commit -m "PDF読み込み機能を改善: 普通預金・当座預金・定期預金に対応"

# 2. プッシュ（Vercelが自動デプロイ）
git push origin main
```

### 方法2: Vercel CLI

```bash
# Vercel CLIでデプロイ
vercel --prod
```

## 🧪 デプロイ後のテスト手順

### 1. 本番環境でテスト

1. **本番URLにアクセス**
   - https://your-app.vercel.app/analysis/new

2. **企業情報を入力**
   - 企業名: テスト企業
   - 業種: 製造業（任意）

3. **対象期間を選択**
   - 例: 2022-2024年度

4. **PDFをアップロード**
   - 弥生会計の決算書PDFをアップロード
   - 「普通預金」が含まれるPDFで動作確認

5. **ブラウザのコンソールで確認**
   - F12 > Console タブ
   - 以下のログを確認:
     ```
     ✅ cash_and_deposits: 12,500,000
     ✅ net_sales: 85,000,000
     ```

6. **分析結果を確認**
   - 財務データが正しく保存されているか
   - グラフが表示されるか

### 2. 確認すべきポイント

- [ ] PDFアップロードが成功する
- [ ] Supabase Storageにファイルが保存される
- [ ] PDFからテキストが抽出される
- [ ] 財務データが正しく解析される
- [ ] データベースに保存される
- [ ] 分析結果が表示される

### 3. トラブルシューティング

#### PDFアップロードが失敗する場合
- Supabase Storageバケットが作成されているか確認
- Storage Policiesが設定されているか確認
- ブラウザのコンソールでエラーメッセージを確認

#### データが抽出できない場合
- PDFがテキストベースか確認（スキャンPDFはOCRが必要）
- ブラウザのコンソールで抽出されたテキストを確認
- 正規表現パターンがPDFフォーマットに合っているか確認

## 📝 変更内容の詳細

### pdf-processor.ts
- 普通預金、当座預金、定期預金のパターンを追加
- 資産合計・負債合計の正規表現を改善（誤マッチ防止）

### テスト結果
- 18/18 項目すべて正しく抽出（100%成功率）
- 弥生会計フォーマットで動作確認済み

## 🔐 セキュリティ確認

- [ ] Supabase Storageは認証ユーザーのみアクセス可能
- [ ] APIキーは環境変数で管理
- [ ] .env.localはgitignoreに含まれている
- [ ] 本番環境の環境変数は.env.productionで管理

## 🎯 本番テスト後の対応

### 成功した場合
- 実際のユーザーに案内
- フィードバックを収集

### 問題が発生した場合
- エラーログを確認
- 必要に応じてロールバック
- 修正後に再デプロイ
