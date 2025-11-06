# 本番環境セットアップ手順

デプロイ後に本番環境のSupabaseで実行する必要がある手順です。

## 🚀 クイックセットアップ（推奨）

すべてを一度に実行する場合は、以下の手順に従ってください：

### ステップ1: 完全セットアップSQLの実行

1. Supabase Dashboard (https://supabase.com/dashboard) にアクセス
2. プロジェクトを選択
3. **SQL Editor** を開く
4. **New query** をクリック
5. 以下のファイルの内容をコピー＆ペースト：
   - `supabase/migrations/PRODUCTION_COMPLETE_SETUP.sql`
6. **Run** をクリック

このSQLは以下をすべて実行します：
- ✅ `industries` テーブルの作成
- ✅ 業種マスタデータの挿入（14業種）
- ✅ `company_groups` テーブルの作成
- ✅ `companies` テーブルへのカラム追加（industry_id, group_id, password_hash）
- ✅ `account_formats` と `account_format_items` テーブルの作成
- ✅ `financial_analyses` テーブルへの `format_id` カラム追加
- ✅ 必要なインデックスの作成
- ✅ セットアップ完了の確認メッセージ

### ステップ2: セットアップ結果の確認

SQL実行後、以下のようなメッセージが表示されます：

```
NOTICE: ============================================
NOTICE: セットアップ完了確認
NOTICE: ============================================
NOTICE: industries テーブル: レコード数 14
NOTICE: account_formats テーブル: 存在します
NOTICE: companies.industry_id カラン: 存在します
NOTICE: ============================================
NOTICE: ✅ セットアップが正常に完了しました！
NOTICE: ============================================
```

---

## 📝 個別セットアップ（手動）

何らかの理由で個別に実行したい場合は、以下の手順に従ってください。

### 1. industriesテーブルの作成

```sql
CREATE TABLE IF NOT EXISTS industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. 業種マスタデータの挿入

```sql
INSERT INTO industries (name, code, description) VALUES
  ('製造業', 'manufacturing', '製造業全般'),
  ('小売業', 'retail', '小売業全般'),
  ('サービス業', 'service', 'サービス業全般'),
  ('建設業', 'construction', '建設業全般'),
  ('卸売業', 'wholesale', '卸売業全般'),
  ('運輸業', 'transportation', '運輸業全般'),
  ('不動産業', 'real_estate', '不動産業全般'),
  ('金融業', 'finance', '金融業全般'),
  ('情報通信業', 'information', '情報通信業全般'),
  ('医療・福祉', 'healthcare', '医療・福祉'),
  ('教育', 'education', '教育関連'),
  ('飲食業', 'food_service', '飲食サービス業'),
  ('宿泊業', 'accommodation', '宿泊業'),
  ('その他', 'other', 'その他の業種')
ON CONFLICT (name) DO NOTHING;
```

### 3. companiesテーブルにカラム追加

```sql
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS industry_id UUID REFERENCES industries(id) ON DELETE SET NULL;

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES company_groups(id) ON DELETE SET NULL;

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_companies_industry_id ON companies(industry_id);
CREATE INDEX IF NOT EXISTS idx_companies_group_id ON companies(group_id);
```

---

## ✅ 動作確認

### テンプレート機能の確認

1. アプリケーションにアクセス
2. 「新しい分析」ページを開く
3. 科目テンプレートのドロップダウンに以下が表示されることを確認：
   - 基本テンプレート
   - 製造業テンプレート
   - 小売業テンプレート
   - サービス業テンプレート
   - 使用しない

### PDFアップロード機能の確認

1. 企業情報を入力
2. 対象期間を選択
3. PDFファイルをアップロード
4. エラーが発生しないことを確認

---

## 🔧 トラブルシューティング

### 問題1: "relation industries does not exist" エラー

**症状:**
```
ERROR: 42P01: relation "industries" does not exist
```

**原因:**
- `industries` テーブルが作成されていない

**解決策:**
1. `PRODUCTION_COMPLETE_SETUP.sql` を実行してください
2. または、個別セットアップの手順1を実行してください

### 問題2: テンプレートが選択できない（「使用しない」しか表示されない）

**症状:**
- 科目テンプレートのドロップダウンに「使用しない」しか表示されない
- 4つのテンプレートが表示されない

**原因:**
- テンプレートファイルが本番環境にデプロイされていない可能性（極めて稀）
- または、API `/api/account-formats/templates` が500エラーを返している

**解決策:**
1. ブラウザの開発者ツール（F12）を開く
2. **Console** タブで `/api/account-formats/templates` のエラーを確認
3. Vercelのログで以下を確認：
   - `テンプレートディレクトリ:` のログが出力されているか
   - `見つかったテンプレートファイル:` に4つのファイルが表示されているか
4. エラーがある場合は、`details` フィールドの内容を確認

### 問題3: PDFアップロードで「分析の作成に失敗しました」エラー

**症状:**
```
Error: 分析の作成に失敗しました
POST /api/analysis/create 500 (Internal Server Error)
```

**原因:**
- `companies` テーブルに `industry_id` カラムがない
- または、`financial_analyses` テーブルに `format_id` カラムがない

**解決策:**
1. `PRODUCTION_COMPLETE_SETUP.sql` を実行してください
2. Vercelのログで詳細なエラーメッセージを確認：
   ```
   Error details: ...
   ```
3. エラー内容に応じて、不足しているカラムを追加

### 問題4: 500エラーが頻発する

**症状:**
- 複数のAPIで500エラーが発生する

**原因:**
- データベーススキーマが不完全

**解決策:**
1. 以下のSQLでスキーマを確認：
   ```sql
   -- 必要なテーブルの存在確認
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN (
     'industries',
     'companies',
     'account_formats',
     'account_format_items',
     'financial_analyses'
   )
   ORDER BY table_name;
   ```

2. 必要なカラムの存在確認：
   ```sql
   -- companies テーブルのカラム確認
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'companies'
   AND column_name IN ('industry_id', 'group_id', 'password_hash');

   -- financial_analyses テーブルのカラム確認
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'financial_analyses'
   AND column_name = 'format_id';
   ```

3. 不足している要素がある場合は、`PRODUCTION_COMPLETE_SETUP.sql` を実行

---

## 📋 確認項目チェックリスト

セットアップ完了後、以下をすべて確認してください：

### データベース
- [ ] `industries` テーブルが存在し、14件のレコードが入っている
- [ ] `company_groups` テーブルが存在する
- [ ] `companies` テーブルに `industry_id`, `group_id`, `password_hash` カラムがある
- [ ] `account_formats` テーブルが存在する
- [ ] `account_format_items` テーブルが存在する
- [ ] `financial_analyses` テーブルに `format_id` カラムがある

### アプリケーション機能
- [ ] 新しい分析ページにアクセスできる
- [ ] 科目テンプレート選択で4つのテンプレートが表示される
  - 基本テンプレート
  - 製造業テンプレート
  - 小売業テンプレート
  - サービス業テンプレート
- [ ] PDFファイルをアップロードできる
- [ ] 分析の作成が成功する
- [ ] 500エラーが発生しない

### トラブルがある場合
- [ ] ブラウザの開発者ツール（F12 > Console）でエラーを確認
- [ ] Vercelのログで詳細なエラーメッセージを確認
- [ ] `PRODUCTION_COMPLETE_SETUP.sql` を再実行

---

## 📞 サポート情報

問題が解決しない場合は、以下の情報を提供してください：

1. **実行したSQL**: `PRODUCTION_COMPLETE_SETUP.sql` の実行結果
2. **エラーメッセージ全文**: Supabase SQL Editor のエラー
3. **ブラウザコンソールのログ**: F12 > Console のエラーメッセージ
4. **Vercelのログ**: Deployments > Function Logs
5. **スキーマ確認結果**: トラブルシューティングのSQL実行結果
