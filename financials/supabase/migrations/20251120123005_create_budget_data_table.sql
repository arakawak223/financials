-- 予算データテーブルの作成
CREATE TABLE IF NOT EXISTS budget_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id UUID NOT NULL REFERENCES financial_periods(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,

  -- 予算値（損益計算書項目）
  budget_net_sales NUMERIC,
  budget_cost_of_sales NUMERIC,
  budget_gross_profit NUMERIC,
  budget_personnel_expenses NUMERIC,
  budget_depreciation NUMERIC,
  budget_other_operating_expenses NUMERIC,
  budget_operating_income NUMERIC,
  budget_non_operating_income NUMERIC,
  budget_non_operating_expenses NUMERIC,
  budget_ordinary_income NUMERIC,
  budget_extraordinary_income NUMERIC,
  budget_extraordinary_loss NUMERIC,
  budget_income_before_taxes NUMERIC,
  budget_corporate_tax NUMERIC,
  budget_net_income NUMERIC,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- ユニーク制約（1つの期間に対して1つの予算データのみ）
  UNIQUE(period_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_budget_data_period_id ON budget_data(period_id);
CREATE INDEX IF NOT EXISTS idx_budget_data_company_id ON budget_data(company_id);
CREATE INDEX IF NOT EXISTS idx_budget_data_fiscal_year ON budget_data(fiscal_year);

-- コメントの追加
COMMENT ON TABLE budget_data IS '予算データ';
COMMENT ON COLUMN budget_data.period_id IS '会計期間ID';
COMMENT ON COLUMN budget_data.company_id IS '企業ID';
COMMENT ON COLUMN budget_data.fiscal_year IS '会計年度';
COMMENT ON COLUMN budget_data.budget_net_sales IS '予算売上高';
COMMENT ON COLUMN budget_data.budget_operating_income IS '予算営業利益';
COMMENT ON COLUMN budget_data.budget_net_income IS '予算当期純利益';
