# 財務分析アプリケーション デプロイガイド

## 📋 前提条件

- GitHubアカウント
- Vercelアカウント（GitHub連携）
- Supabaseアカウント（オプション1の場合）

---

## 🚀 オプション1: Supabase Cloud + Vercel（推奨）

**✅ 本番環境用の設定は完了済みです！**

最新のコミット（`15a409a`）で本番環境用の設定に変更済みのため、すぐにデプロイ可能です。

### ステップ1: Supabase Cloudプロジェクト作成

1. [Supabase](https://supabase.com)にログイン
2. 「New Project」をクリック
3. プロジェクト情報を入力:
   - Name: `financials-prod`
   - Database Password: 強力なパスワード（メモしておく）
   - Region: 近い地域（例: Tokyo）
4. プロジェクトの準備完了を待つ（2-3分）

### ステップ2: データベーススキーマを移行

1. Supabase Dashboard → SQL Editor を開く
2. 以下のSQLファイルを順番に実行:

**1つ目: スキーマ作成（既存テーブルを削除して再作成）**
- ファイル: `financials/supabase/migrations/20251012_drop_and_recreate.sql`
- このファイルの全内容をコピー&ペースト
- "Run"ボタンをクリック
- ⚠️ 既存データはすべて削除されます

**2つ目: サンプルデータ投入**
- ファイル: `financials/supabase/migrations/20251013_sample_data.sql`
- このファイルの全内容をコピー&ペースト
- "Run"ボタンをクリック
- 3社分のサンプルデータと財務分析が投入されます

### ステップ3: Supabase接続情報を取得

1. Supabase Dashboard → Settings → API
2. 以下をメモ:
   - Project URL: `https://xxxxx.supabase.co`
   - anon public key: `eyJhbGci...`

### ステップ4: GitHubにプッシュ

```bash
git push origin main
```

### ステップ5: Vercelでデプロイ

1. [Vercel](https://vercel.com)にログイン
2. 「New Project」をクリック
3. GitHubリポジトリを選択: `financials`
4. **Framework Preset**: Next.js（自動検出されます）
5. **Root Directory**: `financials`（重要！）
6. 環境変数を追加:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   OPENAI_API_KEY=your-openai-api-key (オプション)
   ```
7. 「Deploy」をクリック

### ステップ6: Supabaseの認証設定

デプロイが完了したら、VercelのURLを確認し、Supabaseに設定します：

1. Supabase Dashboard → Authentication → URL Configuration
2. 以下を設定:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: 以下を追加
     - `https://your-app.vercel.app/**`
     - `https://your-app.vercel.app/auth/callback`
     - `https://your-app.vercel.app/auth/confirm`

### ステップ7: デプロイ完了

数分後、デプロイが完了します。Vercelが提供するURLでアクセス可能になります。

例: `https://financials-xxx.vercel.app`

---

## 🔧 オプション2: 既存のSupabaseを使用

ローカルSupabaseを本番環境にデプロイする必要があります：

1. **Docker Composeで自前サーバーにデプロイ**
   - VPS（AWS EC2, DigitalOcean, etc.）にSupabaseをインストール
   - 公開URLを設定
   - SSL証明書を設定

2. **Supabase Self-Hosting**
   - [Supabase Self-Hosting Guide](https://supabase.com/docs/guides/self-hosting)
   - より複雑だが完全なコントロールが可能

---

## 📊 デプロイ後の確認事項

### ✅ チェックリスト

- [ ] ホームページが表示される
- [ ] ログインが機能する
- [ ] 企業管理ページにアクセスできる
- [ ] 分析一覧ページにアクセスできる
- [ ] データベースからデータが取得できる
- [ ] 新規データの作成が可能

### 🐛 トラブルシューティング

#### エラー: "Invalid Supabase URL"

**原因:** 環境変数が正しく設定されていない

**解決策:**
1. Vercel Dashboard → Settings → Environment Variables
2. 変数を確認・修正
3. Redeploy

#### エラー: "Failed to fetch"

**原因:** CORS設定またはネットワーク問題

**解決策:**
1. Supabase Dashboard → Authentication → URL Configuration
2. Site URL と Redirect URLs を設定:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/**`

#### エラー: "Session not found"

**原因:** Cookie設定の問題

**解決策:**
1. middleware.tsの設定を確認
2. Vercel環境変数を確認

---

## 🔐 セキュリティ推奨事項

### 本番環境での必須設定

1. **Row Level Security (RLS) を有効化**
   ```sql
   ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
   ALTER TABLE financial_analyses ENABLE ROW LEVEL SECURITY;
   -- 他のテーブルも同様に
   ```

2. **RLSポリシーを設定**
   ```sql
   -- 例: ユーザーは自分のデータのみアクセス可能
   CREATE POLICY "Users can view own data"
     ON companies FOR SELECT
     USING (auth.uid() = created_by);
   ```

3. **環境変数を絶対にコミットしない**
   - `.env.local` は `.gitignore` に含まれていることを確認

4. **OpenAI API Keyを保護**
   - 使用量制限を設定
   - 本番用の別キーを使用

---

## 📈 パフォーマンス最適化

### 推奨設定

1. **Vercel Edge Network活用**
   - 自動的に有効

2. **Database Indexing**
   ```sql
   CREATE INDEX idx_companies_created_at ON companies(created_at DESC);
   CREATE INDEX idx_analyses_company_id ON financial_analyses(company_id);
   ```

3. **Image Optimization**
   - Next.js Image コンポーネントを使用（既に使用中）

---

## 💰 コスト見積もり

### Vercel（無料プラン）
- ✅ Hobby: 無料
- 100GB Bandwidth/月
- Serverless Functions: 100時間/月

### Supabase（無料プラン）
- ✅ Free Tier: 無料
- 500MB Database
- 1GB File Storage
- 50,000 Monthly Active Users

**推定月額:** $0（無料枠内で運用可能）

### 有料プランへのアップグレード

**Vercel Pro ($20/月):**
- より多くのBandwidth
- 商用利用

**Supabase Pro ($25/月):**
- 8GB Database
- 100GB File Storage
- 優先サポート

---

## 🔄 継続的デプロイ（CI/CD）

Vercel + GitHubで自動的に設定されます：

1. `main` ブランチへのプッシュ → 本番デプロイ
2. Pull Request → プレビューデプロイ

---

## 📞 サポート

問題が発生した場合：
1. Vercel Dashboard → Logs でエラーを確認
2. Supabase Dashboard → Logs でクエリを確認
3. GitHub Issuesで質問

---

**次のステップ:**
どちらのオプションで進めますか？
