# デプロイチェックリスト

## 📋 事前準備

### 1. データベースマイグレーション

以下のマイグレーションファイルをSupabaseプロダクション環境で実行してください：

```bash
# Supabase CLIを使用する場合
supabase db push

# または、Supabase Dashboardから手動実行
```

必要なマイグレーション（実行順）：
- ✅ `20251005_initial_schema.sql` - 初期スキーマ
- ✅ `20251012_drop_and_recreate.sql` - スキーマ再構築
- ✅ `20251013_sample_data.sql` - サンプルデータ
- ✅ `20251024_add_storage_fields.sql` - ストレージフィールド追加
- ✅ `20251101_add_account_formats.sql` - 勘定科目フォーマット追加
- ✅ `20251102_integrate_account_formats.sql` - 勘定科目フォーマット統合
- ✅ `20251103_add_industry_to_companies.sql` - 企業テーブルに業種追加
- ✅ `20251100_add_industries_and_groups.sql` - 業種・業種グループ追加
- ✅ `20251015_add_growth_rates.sql` - 成長率カラム追加
- ✅ `20251109_add_budget_tables.sql` - 予算テーブル追加
- ✅ `20251111_add_company_comparison_views.sql` - 企業間比較ビュー追加
- ✅ `20251120123005_create_budget_data_table.sql` - 予算データテーブル作成
- ✅ `20251121_add_pdf_support_to_budget_data.sql` - 予算データにPDF対応追加
- ✅ `20251121_add_analysis_purpose.sql` - 分析目的カラム追加

### 2. Supabase Storage設定

Supabase Dashboardで以下のStorageバケットを作成してください：

```
バケット名: financial-pdfs
公開設定: 非公開（private）
ポリシー: 認証済みユーザーのみアップロード・読み取り可能
```

RLSポリシー設定例：
```sql
-- アップロードポリシー
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'financial-pdfs');

-- 読み取りポリシー
CREATE POLICY "Authenticated users can read files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'financial-pdfs');
```

### 3. 環境変数設定

デプロイ先（Vercel、Netlifyなど）で以下の環境変数を設定してください：

#### 必須環境変数

```bash
# Supabase設定（サーバーサイド用）
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Supabase設定（クライアントサイド用）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Anthropic Claude API キー
ANTHROPIC_API_KEY=sk-ant-api03-...
NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-api03-...

# Google Cloud Vision API 認証情報
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account",...}
```

#### オプション環境変数

```bash
# OpenAI API（現在未使用）
# OPENAI_API_KEY=sk-...
# NEXT_PUBLIC_OPENAI_API_KEY=sk-...
```

### 4. APIキーの取得

#### Anthropic Claude API
1. https://console.anthropic.com/ にアクセス
2. Settings → API Keys でキーを作成
3. 使用量制限を設定（推奨: $50/月程度）

#### Google Cloud Vision API
1. https://console.cloud.google.com/ にアクセス
2. プロジェクトを作成（既存のものを使用可）
3. Cloud Vision APIを有効化
4. サービスアカウントを作成
5. JSONキーをダウンロード
6. JSONの内容を1行にして環境変数に設定

```bash
# JSONを1行にする方法（Linux/Mac）
cat key.json | jq -c | pbcopy
```

## 🚀 デプロイ手順

### Vercelへのデプロイ

1. GitHubリポジトリをVercelに接続

```bash
# Vercel CLIを使用する場合
npm i -g vercel
vercel login
cd financials
vercel
```

2. プロジェクト設定
   - Framework Preset: Next.js
   - Root Directory: `financials`
   - Build Command: `npm run build`
   - Output Directory: `.next`

3. 環境変数を設定
   - Vercel Dashboard → Settings → Environment Variables
   - 上記の必須環境変数をすべて追加

4. デプロイ実行

```bash
vercel --prod
```

### その他のプラットフォーム

#### Netlify
```bash
cd financials
npm run build
# Netlify CLI または Dashboard からデプロイ
```

#### Railway/Render
- 環境変数を設定
- ビルドコマンド: `cd financials && npm install && npm run build`
- 起動コマンド: `cd financials && npm start`

## ✅ デプロイ後の確認

### 1. 基本機能テスト

- [ ] ホームページが正常に表示される
- [ ] 企業一覧が取得できる
- [ ] 予算実績分析ページが動作する
- [ ] 企業間比較分析ページが動作する

### 2. PDFアップロード機能テスト

#### 予算実績分析
- [ ] 企業選択ができる
- [ ] 会計期間選択ができる
- [ ] 予算書PDFをアップロードできる
- [ ] 実績PDFをアップロードできる
- [ ] OCR処理が正常に動作する
- [ ] AI分析コメントが生成される
- [ ] データが正しく保存される

#### 企業間比較分析
- [ ] 新規企業登録ができる
- [ ] 企業登録後にPDFアップロード画面が表示される
- [ ] 決算書PDFをアップロードできる
- [ ] データが抽出・保存される
- [ ] 企業が選択リストに追加される
- [ ] 複数企業の比較分析ができる

### 3. AI機能テスト

- [ ] 予算実績分析のAI分析コメント生成
- [ ] 企業間比較分析のAI分析コメント生成
- [ ] PDFからの財務データ抽出（Anthropic Claude）

### 4. エラーハンドリング確認

- [ ] 無効なPDFファイルのエラー処理
- [ ] API制限超過時のエラー表示
- [ ] ネットワークエラー時の再試行
- [ ] 認証エラーの適切な処理

## 🔍 トラブルシューティング

### ビルドエラー

```bash
# ローカルでビルドテスト
cd financials
npm run build
```

### 環境変数エラー

- Vercel Dashboard → Deployments → 最新デプロイ → Environment Variables で確認
- ログを確認: Vercel Dashboard → Deployments → View Function Logs

### データベース接続エラー

- Supabase Dashboard → Settings → API でURL・キーを確認
- RLSポリシーが正しく設定されているか確認

### PDF処理エラー

- Google Cloud Vision APIが有効化されているか確認
- サービスアカウントに必要な権限があるか確認
- Anthropic APIキーが有効か確認

## 📊 監視とメンテナンス

### API使用量の監視

1. **Anthropic Console**
   - https://console.anthropic.com/settings/usage
   - 使用量とコストを確認

2. **Google Cloud Console**
   - https://console.cloud.google.com/apis/dashboard
   - Vision API の使用量を確認

3. **Supabase Dashboard**
   - Database サイズ
   - Storage 使用量
   - API リクエスト数

### ログ確認

```bash
# Vercelの場合
vercel logs

# または Dashboard → Deployments → View Function Logs
```

## 🎯 今後の改善提案

- [ ] エラーログの集約（Sentry、LogRocketなど）
- [ ] パフォーマンス監視（Vercel Analytics、Google Analytics）
- [ ] PDFアップロードの進捗表示改善
- [ ] バッチ処理の実装（複数PDF一括処理）
- [ ] キャッシュ戦略の最適化
- [ ] テストカバレッジの向上

---

**最終更新日**: 2025-11-23
**現在のバージョン**: Phase 1 & 2 完了（PDFアップロード機能実装済み）
