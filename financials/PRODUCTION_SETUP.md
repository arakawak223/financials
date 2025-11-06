# 本番環境セットアップ手順

デプロイ後に本番環境のSupabaseで実行する必要がある手順です。

## 1. マイグレーションの適用

Supabase Dashboard > SQL Editor で以下のSQLを実行してください。

### A. companiesテーブルにカラム追加

```sql
-- supabase/migrations/20251103_add_industry_to_companies.sql

-- Add industry_id column to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS industry_id UUID REFERENCES industries(id) ON DELETE SET NULL;

-- Add group_id column to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES company_groups(id) ON DELETE SET NULL;

-- Add password_hash column to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_companies_industry_id ON companies(industry_id);
CREATE INDEX IF NOT EXISTS idx_companies_group_id ON companies(group_id);
```

### B. industriesテーブルのデータ確認

industriesテーブルにデータが入っているか確認：

```sql
SELECT * FROM industries;
```

データがない場合は、以下を実行してシードデータを挿入：

```sql
-- 業種マスタデータの挿入
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
ON CONFLICT DO NOTHING;
```

## 2. account_formatsテーブルの確認

account_formatsテーブルとaccount_format_itemsテーブルが存在するか確認：

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('account_formats', 'account_format_items');
```

テーブルが存在しない場合は、以下のマイグレーションを実行：

```sql
-- supabase/migrations/20251101_add_account_formats.sql の内容を実行
```

## 3. 動作確認

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

## トラブルシューティング

### テンプレートが表示されない

Vercelのログで以下を確認：
- `テンプレートディレクトリ:` のログが出力されているか
- `見つかったテンプレートファイル:` に4つのファイルが表示されているか

### 500エラーが発生する

Vercelのログで詳細なエラーメッセージを確認：
- `Error details:` のログを確認
- `details` フィールドに具体的なエラー内容が表示されます

### industriesテーブルのエラー

```sql
-- industriesテーブルが存在するか確認
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'industries';

-- テーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS industries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 確認項目チェックリスト

- [ ] companiesテーブルにindustry_id、group_id、password_hashカラムが追加されている
- [ ] industriesテーブルにデータが入っている
- [ ] account_formatsテーブルとaccount_format_itemsテーブルが存在する
- [ ] テンプレート選択で4つのテンプレートが表示される
- [ ] PDFアップロードでエラーが発生しない
- [ ] 分析作成が正常に動作する
