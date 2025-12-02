-- =====================================================
-- 事業計画策定ツール用テーブル
-- =====================================================

-- 1. 事業計画マスタ
CREATE TABLE business_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_name VARCHAR(200) NOT NULL,
  description TEXT,
  base_analysis_id UUID REFERENCES financial_analyses(id) ON DELETE SET NULL,
  plan_start_year INTEGER NOT NULL,
  plan_years INTEGER NOT NULL DEFAULT 5,
  status VARCHAR(20) DEFAULT 'draft', -- draft, active, archived
  scenario_type VARCHAR(20) DEFAULT 'standard', -- optimistic, standard, pessimistic
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 基本パラメータ（全体設定）
CREATE TABLE plan_general_parameters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
  -- 税率設定
  corporate_tax_rate DECIMAL(5,2) DEFAULT 30.00,
  -- 運転資本回転設定
  accounts_receivable_months DECIMAL(5,2),
  inventory_months DECIMAL(5,2),
  accounts_payable_months DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plan_id)
);

-- 3. 売上カテゴリー設定
CREATE TABLE plan_sales_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
  category_name VARCHAR(100) NOT NULL,
  category_type VARCHAR(50) DEFAULT 'product', -- product, merchandise, service
  display_order INTEGER DEFAULT 0,
  -- 基準年度の実績
  base_year_amount DECIMAL(15,2),
  base_year_unit_price DECIMAL(15,2),
  base_year_quantity DECIMAL(15,2),
  -- 単価×数量分解を使用するか
  use_unit_price_quantity BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 売上成長率設定（年度別）
CREATE TABLE plan_sales_growth_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
  category_id UUID REFERENCES plan_sales_categories(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  -- カテゴリー別設定（category_idがNULLの場合は全社設定）
  growth_rate DECIMAL(8,4), -- 成長率（%）
  unit_price_growth_rate DECIMAL(8,4), -- 単価成長率（%）
  quantity_growth_rate DECIMAL(8,4), -- 数量成長率（%）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plan_id, category_id, fiscal_year)
);

-- 5. 原価設定
CREATE TABLE plan_cost_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
  category_id UUID REFERENCES plan_sales_categories(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  -- カテゴリー別原価率（category_idがNULLの場合は全社設定）
  cost_rate DECIMAL(8,4), -- 原価率（%）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plan_id, category_id, fiscal_year)
);

-- 6. 人件費設定
CREATE TABLE plan_personnel_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  -- 従業員人件費
  base_year_employee_count INTEGER,
  base_year_avg_salary DECIMAL(15,2),
  wage_growth_rate DECIMAL(8,4), -- 1人当たり賃金上昇率（%）
  hiring_rate DECIMAL(8,4), -- 採用による人員増加率（%）
  turnover_rate DECIMAL(8,4), -- 退職率（%）
  -- 役員報酬
  base_year_executive_compensation DECIMAL(15,2),
  executive_compensation_growth_rate DECIMAL(8,4), -- 役員報酬増減率（%）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plan_id, fiscal_year)
);

-- 7. 販管費科目設定
CREATE TABLE plan_expense_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
  expense_name VARCHAR(100) NOT NULL,
  expense_type VARCHAR(50) DEFAULT 'fixed', -- fixed, variable, semi_variable
  is_personnel_cost BOOLEAN DEFAULT FALSE, -- 人件費関連かどうか
  base_year_amount DECIMAL(15,2),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 販管費増減率設定（年度別）
CREATE TABLE plan_expense_growth_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
  expense_item_id UUID NOT NULL REFERENCES plan_expense_items(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  growth_rate DECIMAL(8,4), -- 増減率（%）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plan_id, expense_item_id, fiscal_year)
);

-- 9. 営業外損益設定
CREATE TABLE plan_non_operating_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
  item_name VARCHAR(100) NOT NULL,
  item_type VARCHAR(20) NOT NULL, -- income, expense
  base_year_amount DECIMAL(15,2),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. 営業外損益増減率設定（年度別）
CREATE TABLE plan_non_operating_growth_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES plan_non_operating_items(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  growth_rate DECIMAL(8,4), -- 増減率（%）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plan_id, item_id, fiscal_year)
);

-- 11. 特別損益設定（年度別の個別金額）
CREATE TABLE plan_extraordinary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  item_name VARCHAR(100) NOT NULL,
  item_type VARCHAR(20) NOT NULL, -- income, loss
  amount DECIMAL(15,2),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. 設備投資設定
CREATE TABLE plan_capex_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  growth_investment DECIMAL(15,2) DEFAULT 0, -- 成長投資額
  maintenance_investment DECIMAL(15,2) DEFAULT 0, -- 維持投資額
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plan_id, fiscal_year)
);

-- 13. 償却設定（資産区分別）
CREATE TABLE plan_depreciation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
  asset_category VARCHAR(50) NOT NULL, -- tangible, intangible, deferred
  asset_subcategory VARCHAR(100), -- 詳細区分（建物、機械設備等）
  -- 既存資産の残存耐用年数
  existing_remaining_years DECIMAL(5,2),
  existing_book_value DECIMAL(15,2),
  -- 新規取得資産の耐用年数
  new_asset_useful_life DECIMAL(5,2),
  depreciation_method VARCHAR(20) DEFAULT 'straight_line', -- straight_line, declining_balance
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. 有利子負債設定
CREATE TABLE plan_debt_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
  debt_type VARCHAR(50) NOT NULL, -- short_term_loan, long_term_loan, bond, lease
  debt_name VARCHAR(100),
  -- 既存債務
  existing_balance DECIMAL(15,2),
  existing_interest_rate DECIMAL(8,4),
  repayment_years INTEGER, -- 償還年数
  -- 新規調達設定
  planned_borrowing DECIMAL(15,2) DEFAULT 0,
  planned_interest_rate DECIMAL(8,4),
  planned_repayment_years INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. 計画PL結果（年度別）
CREATE TABLE plan_results_pl (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  -- 売上高
  net_sales DECIMAL(15,2),
  -- 売上原価
  cost_of_sales DECIMAL(15,2),
  -- 売上総利益
  gross_profit DECIMAL(15,2),
  -- 販管費内訳
  personnel_cost DECIMAL(15,2),
  other_sga_expenses DECIMAL(15,2),
  depreciation_expense DECIMAL(15,2),
  selling_general_admin_expenses DECIMAL(15,2),
  -- 営業利益
  operating_income DECIMAL(15,2),
  -- 営業外損益
  non_operating_income DECIMAL(15,2),
  non_operating_expenses DECIMAL(15,2),
  interest_expense DECIMAL(15,2),
  -- 経常利益
  ordinary_income DECIMAL(15,2),
  -- 特別損益
  extraordinary_income DECIMAL(15,2),
  extraordinary_losses DECIMAL(15,2),
  -- 税引前利益
  income_before_tax DECIMAL(15,2),
  -- 法人税等
  income_taxes DECIMAL(15,2),
  -- 当期純利益
  net_income DECIMAL(15,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plan_id, fiscal_year)
);

-- 16. 計画BS結果（年度別）
CREATE TABLE plan_results_bs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  -- 流動資産
  cash_and_deposits DECIMAL(15,2),
  accounts_receivable DECIMAL(15,2),
  inventory DECIMAL(15,2),
  other_current_assets DECIMAL(15,2),
  current_assets_total DECIMAL(15,2),
  -- 固定資産
  tangible_fixed_assets DECIMAL(15,2),
  intangible_fixed_assets DECIMAL(15,2),
  investments_and_other_assets DECIMAL(15,2),
  fixed_assets_total DECIMAL(15,2),
  -- 総資産
  total_assets DECIMAL(15,2),
  -- 流動負債
  accounts_payable DECIMAL(15,2),
  short_term_borrowings DECIMAL(15,2),
  other_current_liabilities DECIMAL(15,2),
  current_liabilities_total DECIMAL(15,2),
  -- 固定負債
  long_term_borrowings DECIMAL(15,2),
  bonds_payable DECIMAL(15,2),
  lease_obligations DECIMAL(15,2),
  other_fixed_liabilities DECIMAL(15,2),
  fixed_liabilities_total DECIMAL(15,2),
  -- 負債合計
  total_liabilities DECIMAL(15,2),
  -- 純資産
  capital_stock DECIMAL(15,2),
  retained_earnings DECIMAL(15,2),
  total_net_assets DECIMAL(15,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plan_id, fiscal_year)
);

-- 17. 計画CF結果（年度別）
CREATE TABLE plan_results_cf (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES business_plans(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  -- 営業活動によるCF
  net_income_cf DECIMAL(15,2),
  depreciation_cf DECIMAL(15,2),
  change_in_receivables DECIMAL(15,2),
  change_in_inventory DECIMAL(15,2),
  change_in_payables DECIMAL(15,2),
  other_operating_cf DECIMAL(15,2),
  operating_cash_flow DECIMAL(15,2),
  -- 投資活動によるCF
  capex DECIMAL(15,2),
  other_investing_cf DECIMAL(15,2),
  investing_cash_flow DECIMAL(15,2),
  -- 財務活動によるCF
  debt_repayment DECIMAL(15,2),
  new_borrowings DECIMAL(15,2),
  dividends_paid DECIMAL(15,2),
  other_financing_cf DECIMAL(15,2),
  financing_cash_flow DECIMAL(15,2),
  -- 現金増減
  net_change_in_cash DECIMAL(15,2),
  beginning_cash DECIMAL(15,2),
  ending_cash DECIMAL(15,2),
  -- FCF
  free_cash_flow DECIMAL(15,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plan_id, fiscal_year)
);

-- =====================================================
-- インデックス作成
-- =====================================================
CREATE INDEX idx_business_plans_company_id ON business_plans(company_id);
CREATE INDEX idx_business_plans_created_by ON business_plans(created_by);
CREATE INDEX idx_plan_general_parameters_plan_id ON plan_general_parameters(plan_id);
CREATE INDEX idx_plan_sales_categories_plan_id ON plan_sales_categories(plan_id);
CREATE INDEX idx_plan_sales_growth_rates_plan_id ON plan_sales_growth_rates(plan_id);
CREATE INDEX idx_plan_cost_settings_plan_id ON plan_cost_settings(plan_id);
CREATE INDEX idx_plan_personnel_settings_plan_id ON plan_personnel_settings(plan_id);
CREATE INDEX idx_plan_expense_items_plan_id ON plan_expense_items(plan_id);
CREATE INDEX idx_plan_expense_growth_rates_plan_id ON plan_expense_growth_rates(plan_id);
CREATE INDEX idx_plan_non_operating_items_plan_id ON plan_non_operating_items(plan_id);
CREATE INDEX idx_plan_non_operating_growth_rates_plan_id ON plan_non_operating_growth_rates(plan_id);
CREATE INDEX idx_plan_extraordinary_items_plan_id ON plan_extraordinary_items(plan_id);
CREATE INDEX idx_plan_capex_settings_plan_id ON plan_capex_settings(plan_id);
CREATE INDEX idx_plan_depreciation_settings_plan_id ON plan_depreciation_settings(plan_id);
CREATE INDEX idx_plan_debt_settings_plan_id ON plan_debt_settings(plan_id);
CREATE INDEX idx_plan_results_pl_plan_id ON plan_results_pl(plan_id);
CREATE INDEX idx_plan_results_bs_plan_id ON plan_results_bs(plan_id);
CREATE INDEX idx_plan_results_cf_plan_id ON plan_results_cf(plan_id);

-- =====================================================
-- RLS設定
-- =====================================================
ALTER TABLE business_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_general_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_sales_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_sales_growth_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_cost_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_personnel_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_expense_growth_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_non_operating_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_non_operating_growth_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_extraordinary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_capex_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_depreciation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_debt_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_results_pl ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_results_bs ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_results_cf ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（認証ユーザー用）
CREATE POLICY "Allow all for authenticated users" ON business_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON plan_general_parameters FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON plan_sales_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON plan_sales_growth_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON plan_cost_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON plan_personnel_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON plan_expense_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON plan_expense_growth_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON plan_non_operating_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON plan_non_operating_growth_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON plan_extraordinary_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON plan_capex_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON plan_depreciation_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON plan_debt_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON plan_results_pl FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON plan_results_bs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON plan_results_cf FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLSポリシー（開発用匿名アクセス）
CREATE POLICY "Allow all for anon users" ON business_plans FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon users" ON plan_general_parameters FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon users" ON plan_sales_categories FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon users" ON plan_sales_growth_rates FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon users" ON plan_cost_settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon users" ON plan_personnel_settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon users" ON plan_expense_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon users" ON plan_expense_growth_rates FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon users" ON plan_non_operating_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon users" ON plan_non_operating_growth_rates FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon users" ON plan_extraordinary_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon users" ON plan_capex_settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon users" ON plan_depreciation_settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon users" ON plan_debt_settings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon users" ON plan_results_pl FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon users" ON plan_results_bs FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon users" ON plan_results_cf FOR ALL TO anon USING (true) WITH CHECK (true);

-- =====================================================
-- 自動更新トリガー
-- =====================================================
CREATE TRIGGER update_business_plans_updated_at BEFORE UPDATE ON business_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_general_parameters_updated_at BEFORE UPDATE ON plan_general_parameters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_sales_categories_updated_at BEFORE UPDATE ON plan_sales_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_sales_growth_rates_updated_at BEFORE UPDATE ON plan_sales_growth_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_cost_settings_updated_at BEFORE UPDATE ON plan_cost_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_personnel_settings_updated_at BEFORE UPDATE ON plan_personnel_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_expense_items_updated_at BEFORE UPDATE ON plan_expense_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_expense_growth_rates_updated_at BEFORE UPDATE ON plan_expense_growth_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_non_operating_items_updated_at BEFORE UPDATE ON plan_non_operating_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_non_operating_growth_rates_updated_at BEFORE UPDATE ON plan_non_operating_growth_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_extraordinary_items_updated_at BEFORE UPDATE ON plan_extraordinary_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_capex_settings_updated_at BEFORE UPDATE ON plan_capex_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_depreciation_settings_updated_at BEFORE UPDATE ON plan_depreciation_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_debt_settings_updated_at BEFORE UPDATE ON plan_debt_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_results_pl_updated_at BEFORE UPDATE ON plan_results_pl
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_results_bs_updated_at BEFORE UPDATE ON plan_results_bs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_results_cf_updated_at BEFORE UPDATE ON plan_results_cf
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
