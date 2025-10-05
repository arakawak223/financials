# Supabase セットアップガイド

## 1. Supabaseプロジェクトの作成

1. [Supabase Dashboard](https://app.supabase.com) にアクセス
2. 「New Project」をクリック
3. プロジェクト情報を入力：
   - Name: `financials` (または任意の名前)
   - Database Password: 強力なパスワードを設定
   - Region: `Northeast Asia (Tokyo)` を推奨
4. 「Create new project」をクリック

## 2. 環境変数の設定

プロジェクト作成後、以下の情報を取得します：

1. Supabase Dashboard で `Settings` → `API` に移動
2. 以下の値をコピー：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. `/workspaces/financials/financials/.env.local` を編集：

```env
# Supabase 設定
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenAI API キー
OPENAI_API_KEY=sk-your-openai-api-key
NEXT_PUBLIC_OPENAI_API_KEY=sk-your-openai-api-key
```

## 3. データベーススキーマの適用

### 方法1: SQL Editorで実行（推奨）

1. Supabase Dashboard で `SQL Editor` に移動
2. `New query` をクリック
3. 以下のファイルの内容をコピー＆ペースト：
   ```
   /workspaces/financials/financials/supabase/migrations/20251005_initial_schema.sql
   ```
4. `Run` をクリックしてSQLを実行

### 方法2: Supabase CLIを使用

```bash
# プロジェクトディレクトリで実行
cd /workspaces/financials/financials

# Supabaseにログイン
npx supabase login

# リモートデータベースに接続
npx supabase link --project-ref your-project-id

# マイグレーションを実行
npx supabase db push
```

## 4. 認証設定（オプション）

1. Supabase Dashboard で `Authentication` → `Providers` に移動
2. `Email` プロバイダーを有効化
3. 必要に応じて他のプロバイダー（Google, GitHubなど）を追加

## 5. Storage設定（PDF保存用）

1. Supabase Dashboard で `Storage` に移動
2. `Create a new bucket` をクリック
3. バケット情報を入力：
   - Name: `financial-pdfs`
   - Public bucket: チェックを外す（プライベート）
4. `Create bucket` をクリック

## 6. Row Level Security (RLS) ポリシーの確認

マイグレーションスクリプトで既にRLSポリシーが設定されていますが、
Supabase Dashboard で `Authentication` → `Policies` から確認できます。

## 7. 開発サーバーの再起動

環境変数を変更したら、開発サーバーを再起動します：

```bash
# Ctrl+C で停止してから
npm run dev
```

## 8. 動作確認

1. ブラウザで `http://localhost:3000` にアクセス
2. 右上の「Sign up」からユーザー登録
3. 登録したメールアドレスに確認メールが届く
4. 確認リンクをクリックしてログイン

## トラブルシューティング

### エラー: "Invalid API key"
- `.env.local` のAPIキーが正しいか確認
- 開発サーバーを再起動

### エラー: "relation does not exist"
- データベースマイグレーションが実行されているか確認
- SQL Editorでテーブルが作成されているか確認

### エラー: "JWT expired"
- Supabase Dashboardで新しいトークンを生成
- `.env.local` を更新して再起動

## 次のステップ

セットアップが完了したら、以下を実装します：

1. ✅ Supabase接続設定
2. 🔄 API Routes実装
   - PDF処理API
   - 財務データ保存API
   - 分析実行API
3. 認証機能の統合
4. Phase 2機能の実装
