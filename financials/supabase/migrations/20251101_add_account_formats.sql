-- カスタム科目体系フォーマット機能
-- 企業の業種や事業分野ごとに、売上高・売上原価・売上総利益の内訳を
-- ユーザーが任意で科目体系を設定・変更できる機能

-- 1. フォーマットマスターテーブル
CREATE TABLE account_formats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  industry_id UUID REFERENCES industries(id) ON DELETE SET NULL,
  is_shared BOOLEAN DEFAULT FALSE, -- true=共有, false=専用
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. フォーマット科目定義テーブル
CREATE TABLE account_format_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  format_id UUID NOT NULL REFERENCES account_formats(id) ON DELETE CASCADE,
  category VARCHAR(100) NOT NULL, -- 売上高、売上原価、売上総利益など
  account_name VARCHAR(200) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  parent_id UUID REFERENCES account_format_items(id) ON DELETE CASCADE, -- 階層構造用
  level INTEGER DEFAULT 0, -- 階層レベル（0=トップレベル）
  calculation_formula TEXT, -- 計算式（オプション、例: "item_1 + item_2"）
  is_total BOOLEAN DEFAULT FALSE, -- 合計行フラグ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 企業とフォーマットの紐付けテーブル
CREATE TABLE company_account_formats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  format_id UUID NOT NULL REFERENCES account_formats(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT FALSE, -- アクティブフラグ（企業ごとに1つのみアクティブ）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, format_id)
);

-- インデックス作成
CREATE INDEX idx_account_formats_industry_id ON account_formats(industry_id);
CREATE INDEX idx_account_formats_created_by ON account_formats(created_by);
CREATE INDEX idx_account_formats_is_shared ON account_formats(is_shared);
CREATE INDEX idx_account_format_items_format_id ON account_format_items(format_id);
CREATE INDEX idx_account_format_items_parent_id ON account_format_items(parent_id);
CREATE INDEX idx_account_format_items_category ON account_format_items(category);
CREATE INDEX idx_company_account_formats_company_id ON company_account_formats(company_id);
CREATE INDEX idx_company_account_formats_format_id ON company_account_formats(format_id);
CREATE INDEX idx_company_account_formats_is_active ON company_account_formats(is_active);

-- Row Level Security (RLS) を有効化
ALTER TABLE account_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_format_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_account_formats ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー: 共有フォーマットは全員が閲覧可能、専用フォーマットは作成者のみ
CREATE POLICY "Shared formats are viewable by all" ON account_formats
  FOR SELECT TO authenticated, anon
  USING (is_shared = true OR created_by = auth.uid());

CREATE POLICY "Users can insert their own formats" ON account_formats
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own formats" ON account_formats
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own formats" ON account_formats
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- 開発環境用: 匿名ユーザーも全操作可能
CREATE POLICY "Allow all for anon users" ON account_formats
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- フォーマット科目定義のRLSポリシー
CREATE POLICY "Format items viewable by format viewers" ON account_format_items
  FOR SELECT TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM account_formats
      WHERE id = account_format_items.format_id
        AND (is_shared = true OR created_by = auth.uid())
    )
  );

CREATE POLICY "Format items insertable by format owners" ON account_format_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_formats
      WHERE id = account_format_items.format_id
        AND created_by = auth.uid()
    )
  );

CREATE POLICY "Format items updatable by format owners" ON account_format_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM account_formats
      WHERE id = account_format_items.format_id
        AND created_by = auth.uid()
    )
  );

CREATE POLICY "Format items deletable by format owners" ON account_format_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM account_formats
      WHERE id = account_format_items.format_id
        AND created_by = auth.uid()
    )
  );

-- 開発環境用: 匿名ユーザーも全操作可能
CREATE POLICY "Allow all for anon users" ON account_format_items
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- 企業フォーマット紐付けのRLSポリシー
CREATE POLICY "Company formats viewable by all" ON company_account_formats
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Company formats insertable by authenticated users" ON company_account_formats
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Company formats updatable by authenticated users" ON company_account_formats
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Company formats deletable by authenticated users" ON company_account_formats
  FOR DELETE TO authenticated USING (true);

-- 開発環境用: 匿名ユーザーも全操作可能
CREATE POLICY "Allow all for anon users" ON company_account_formats
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- 自動更新トリガー
CREATE TRIGGER update_account_formats_updated_at BEFORE UPDATE ON account_formats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_format_items_updated_at BEFORE UPDATE ON account_format_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_account_formats_updated_at BEFORE UPDATE ON company_account_formats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- サンプルデータ: デフォルトの標準フォーマット
INSERT INTO account_formats (name, description, is_shared, created_by)
VALUES
  ('標準フォーマット', '一般的な企業向けの標準的な科目体系', true, NULL),
  ('製造業フォーマット', '製造業向けの科目体系', true, NULL),
  ('小売業フォーマット', '小売業向けの科目体系', true, NULL);

-- 標準フォーマットの科目定義
DO $$
DECLARE
  standard_format_id UUID;
BEGIN
  -- 標準フォーマットのIDを取得
  SELECT id INTO standard_format_id FROM account_formats WHERE name = '標準フォーマット';

  -- 売上高関連
  INSERT INTO account_format_items (format_id, category, account_name, display_order, level, is_total)
  VALUES
    (standard_format_id, '売上高', '売上高', 1, 0, false),
    (standard_format_id, '売上高', '製品売上', 2, 1, false),
    (standard_format_id, '売上高', 'サービス売上', 3, 1, false),
    (standard_format_id, '売上高', 'その他売上', 4, 1, false);

  -- 売上原価関連
  INSERT INTO account_format_items (format_id, category, account_name, display_order, level, is_total)
  VALUES
    (standard_format_id, '売上原価', '売上原価', 11, 0, false),
    (standard_format_id, '売上原価', '材料費', 12, 1, false),
    (standard_format_id, '売上原価', '労務費', 13, 1, false),
    (standard_format_id, '売上原価', '外注費', 14, 1, false),
    (standard_format_id, '売上原価', '経費', 15, 1, false);

  -- 売上総利益
  INSERT INTO account_format_items (format_id, category, account_name, display_order, level, is_total)
  VALUES
    (standard_format_id, '売上総利益', '売上総利益', 21, 0, true);
END $$;

-- 製造業フォーマットの科目定義
DO $$
DECLARE
  manufacturing_format_id UUID;
BEGIN
  SELECT id INTO manufacturing_format_id FROM account_formats WHERE name = '製造業フォーマット';

  INSERT INTO account_format_items (format_id, category, account_name, display_order, level, is_total)
  VALUES
    -- 売上高
    (manufacturing_format_id, '売上高', '売上高', 1, 0, false),
    (manufacturing_format_id, '売上高', '製品売上高', 2, 1, false),
    (manufacturing_format_id, '売上高', '半製品売上高', 3, 1, false),
    (manufacturing_format_id, '売上高', '加工売上高', 4, 1, false),

    -- 売上原価
    (manufacturing_format_id, '売上原価', '売上原価', 11, 0, false),
    (manufacturing_format_id, '売上原価', '原材料費', 12, 1, false),
    (manufacturing_format_id, '売上原価', '直接労務費', 13, 1, false),
    (manufacturing_format_id, '売上原価', '製造経費', 14, 1, false),
    (manufacturing_format_id, '売上原価', '外注加工費', 15, 1, false),

    -- 売上総利益
    (manufacturing_format_id, '売上総利益', '売上総利益', 21, 0, true);
END $$;

-- 小売業フォーマットの科目定義
DO $$
DECLARE
  retail_format_id UUID;
BEGIN
  SELECT id INTO retail_format_id FROM account_formats WHERE name = '小売業フォーマット';

  INSERT INTO account_format_items (format_id, category, account_name, display_order, level, is_total)
  VALUES
    -- 売上高
    (retail_format_id, '売上高', '売上高', 1, 0, false),
    (retail_format_id, '売上高', '商品売上高', 2, 1, false),
    (retail_format_id, '売上高', 'オンライン売上高', 3, 1, false),
    (retail_format_id, '売上高', '店舗売上高', 4, 1, false),

    -- 売上原価
    (retail_format_id, '売上原価', '売上原価', 11, 0, false),
    (retail_format_id, '売上原価', '商品仕入高', 12, 1, false),
    (retail_format_id, '売上原価', '物流費', 13, 1, false),

    -- 売上総利益
    (retail_format_id, '売上総利益', '売上総利益', 21, 0, true);
END $$;

-- コメント追加
COMMENT ON TABLE account_formats IS 'カスタム科目体系フォーマットマスター';
COMMENT ON TABLE account_format_items IS 'フォーマットの科目定義';
COMMENT ON TABLE company_account_formats IS '企業とフォーマットの紐付け';
COMMENT ON COLUMN account_formats.is_shared IS 'true=共有フォーマット（他のユーザーも使用可能）, false=専用フォーマット（作成者のみ）';
COMMENT ON COLUMN account_format_items.level IS '階層レベル（0=トップレベル、1=第1階層、2=第2階層...）';
COMMENT ON COLUMN account_format_items.calculation_formula IS '計算式（オプション、例: "item_1 + item_2"）';
COMMENT ON COLUMN company_account_formats.is_active IS '企業ごとに1つのみアクティブなフォーマットを設定可能';
