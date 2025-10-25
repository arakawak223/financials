# 🚀 クイックデプロイガイド

PDF自動読み込み機能を本番環境でテストするための最短手順です。

## 📋 準備チェックリスト

### 必要なもの
- [ ] Supabaseアカウント（本番環境）
- [ ] Vercelアカウント（デプロイ先）
- [ ] 本番環境のSupabase接続情報

---

## ⚡ 3ステップでデプロイ

### ステップ1: Supabase Storage設定（5分）

#### 1-1. バケット作成

1. https://supabase.com/dashboard にアクセス
2. プロジェクトを選択
3. **Storage** > **New bucket** をクリック
4. 以下を入力:
   ```
   Name: financial-documents
   Public bucket: オフ
   ```
5. **Create bucket** をクリック

#### 1-2. SQL実行

1. **SQL Editor** を開く
2. **New query** をクリック
3. `supabase/setup-storage.sql` の内容をコピー＆ペースト
4. **Run** をクリック

**✅ 確認:**
- エラーなく実行完了
- 「✅ Supabase Storage セットアップが完了しました！」と表示される

---

### ステップ2: Vercel環境変数確認（2分）

1. https://vercel.com にアクセス
2. プロジェクトを選択
3. **Settings** > **Environment Variables**
4. 以下が設定されているか確認:

```bash
# 本番環境のSupabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# サーバーサイド用
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
```

**未設定の場合:**
1. **Add New** をクリック
2. 各変数を入力して保存

---

### ステップ3: デプロイ（1分）

```bash
# コミット済みの変更をプッシュ
git push origin main
```

Vercelが自動的にデプロイを開始します。

**✅ 確認:**
- Vercel Dashboard でデプロイが進行中
- 約2-3分で完了

---

## 🧪 デプロイ後のテスト

### テスト手順（5分）

1. **本番URLにアクセス**
   ```
   https://your-app.vercel.app/analysis/new
   ```

2. **ログイン/サインアップ**
   - テストアカウントでログイン
   - または新規アカウント作成

3. **企業情報を入力**
   ```
   企業名: テスト企業
   業種: 製造業（任意）
   ```

4. **対象期間を選択**
   ```
   開始年度: 2022
   終了年度: 2024
   ```

5. **PDFをアップロード**
   - 弥生会計の決算書PDFを選択
   - 「普通預金」が含まれるPDFが理想的

6. **ブラウザコンソールで確認**
   - `F12` キーを押す
   - **Console** タブを開く
   - 以下のようなログが表示されることを確認:
   ```
   === PDF抽出開始 ===
   ✅ cash_and_deposits: 12,500,000
   ✅ net_sales: 85,000,000
   ...
   ```

7. **分析開始**
   - 「分析開始」ボタンをクリック
   - 処理完了まで待機（1-2分）

8. **結果確認**
   - 分析詳細ページが表示される
   - 財務データが正しく表示される
   - グラフが表示される

---

## ✅ 成功の判定基準

以下がすべて満たされれば成功です:

- [ ] PDFアップロードが成功
- [ ] ブラウザコンソールに「✅ cash_and_deposits」などのログが表示
- [ ] 「普通預金」が現金預金として認識される
- [ ] 分析詳細ページでデータが表示される
- [ ] グラフが正しく描画される

---

## 🔧 トラブルシューティング

### 問題1: PDFアップロードが失敗する

**症状:**
- 「ファイルのアップロードに失敗しました」というエラー

**原因:**
- Supabase Storageのバケットが作成されていない
- Storage Policiesが設定されていない

**解決策:**
1. Supabase Dashboard > Storage を確認
2. `financial-documents` バケットが存在するか確認
3. Policies タブで3つのポリシーが有効か確認
4. `supabase/setup-storage.sql` を再実行

---

### 問題2: データが抽出できない

**症状:**
- ブラウザコンソールに「⚠️ が見つかりませんでした」と表示
- 分析ページでデータが空欄

**原因:**
- PDFがスキャン画像（OCR未対応）
- PDFフォーマットが対応していない

**解決策:**
1. PDFがテキストベースか確認（PDFを開いてテキストをコピーできるか）
2. ブラウザコンソールで抽出されたテキストを確認
3. 必要に応じてPDFフォーマットに合わせて正規表現を調整

---

### 問題3: 環境変数エラー

**症状:**
- 「Supabaseに接続できません」というエラー

**原因:**
- Vercelの環境変数が設定されていない

**解決策:**
1. Vercel Dashboard > Settings > Environment Variables
2. 以下をすべて設定:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. **Redeploy** をクリック

---

## 📞 サポート

問題が解決しない場合は、以下の情報を提供してください:

1. **エラーメッセージ全文**
2. **ブラウザコンソールのログ** (F12 > Console)
3. **Vercelのデプロイログ** (Deployments > ログ)
4. **使用したPDFのフォーマット** (弥生会計、freee、など)

---

## 📚 関連ドキュメント

- 詳細な設定手順: `SUPABASE_STORAGE_SETUP.md`
- デプロイ前チェックリスト: `DEPLOY_CHECKLIST.md`
- SQLスクリプト: `supabase/setup-storage.sql`
