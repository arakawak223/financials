-- ============================================
-- 本番環境用 完全セットアップSQL
-- ============================================
-- このSQLは本番環境のSupabaseで実行してください
-- 既存のテーブルには影響しません（CREATE TABLE IF NOT EXISTS使用）

-- ============================================
-- 1. Industries Master Table（業種マスタ）
-- ============================================
CREATE TABLE IF NOT EXISTS industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2. Company Groups（企業グループ）
-- ============================================
CREATE TABLE IF NOT EXISTS company_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  industry_id UUID REFERENCES industries(id) ON DELETE SET NULL,
  password_hash VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. Companies（企業）
-- ============================================
-- 既存のcompaniesテーブルにカラムを追加
DO $$
BEGIN
  -- industry_id カラムを追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'industry_id'
  ) THEN
    ALTER TABLE companies ADD COLUMN industry_id UUID REFERENCES industries(id) ON DELETE SET NULL;
  END IF;

  -- group_id カラムを追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE companies ADD COLUMN group_id UUID REFERENCES company_groups(id) ON DELETE SET NULL;
  END IF;

  -- password_hash カラムを追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE companies ADD COLUMN password_hash VARCHAR(255);
  END IF;
END $$;

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_companies_industry_id ON companies(industry_id);
CREATE INDEX IF NOT EXISTS idx_companies_group_id ON companies(group_id);

-- ============================================
-- 4. Account Formats（勘定科目フォーマット）
-- ============================================
CREATE TABLE IF NOT EXISTS account_formats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  industry_id UUID REFERENCES industries(id) ON DELETE SET NULL,
  is_shared BOOLEAN DEFAULT FALSE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. Account Format Items（勘定科目フォーマット項目）
-- ============================================
CREATE TABLE IF NOT EXISTS account_format_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  format_id UUID NOT NULL REFERENCES account_formats(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  display_order INTEGER DEFAULT 0,
  parent_id UUID REFERENCES account_format_items(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 0,
  calculation_formula TEXT,
  is_total BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_account_format_items_format_id ON account_format_items(format_id);
CREATE INDEX IF NOT EXISTS idx_account_format_items_parent_id ON account_format_items(parent_id);

-- ============================================
-- 6. Financial Analyses（財務分析）にformat_idカラムを追加
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_analyses' AND column_name = 'format_id'
  ) THEN
    ALTER TABLE financial_analyses ADD COLUMN format_id UUID REFERENCES account_formats(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_financial_analyses_format_id ON financial_analyses(format_id);

-- ============================================
-- セットアップ完了確認
-- ============================================
DO $$
DECLARE
  industries_count INTEGER;
  account_formats_table_exists BOOLEAN;
  companies_has_industry_id BOOLEAN;
BEGIN
  -- industries テーブルのレコード数を確認
  SELECT COUNT(*) INTO industries_count FROM industries;

  -- account_formats テーブルが存在するか確認
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'account_formats'
  ) INTO account_formats_table_exists;

  -- companies テーブルに industry_id カラムがあるか確認
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'industry_id'
  ) INTO companies_has_industry_id;

  -- 結果を出力
  RAISE NOTICE '============================================';
  RAISE NOTICE 'セットアップ完了確認';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'industries テーブル: レコード数 %', industries_count;
  RAISE NOTICE 'account_formats テーブル: %',
    CASE WHEN account_formats_table_exists THEN '存在します' ELSE '存在しません' END;
  RAISE NOTICE 'companies.industry_id カラム: %',
    CASE WHEN companies_has_industry_id THEN '存在します' ELSE '存在しません' END;
  RAISE NOTICE '============================================';

  IF industries_count > 0 AND account_formats_table_exists AND companies_has_industry_id THEN
    RAISE NOTICE '✅ セットアップが正常に完了しました！';
  ELSE
    RAISE WARNING '⚠️ セットアップに問題がある可能性があります';
  END IF;
  RAISE NOTICE '============================================';
END $$;
