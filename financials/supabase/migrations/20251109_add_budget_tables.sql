-- Budget vs Actual Analysis Feature - Database Schema
-- Created: 2025-11-09
-- Purpose: Add budget data management and variance analysis

-- Budgets Master Table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  budget_type VARCHAR(20) NOT NULL, -- 'annual', 'quarterly'
  quarter INTEGER, -- 1, 2, 3, 4 (NULL for annual budget)
  version INTEGER DEFAULT 1,
  approval_status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'approved'
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, fiscal_year, budget_type, quarter, version)
);

-- Budget Profit & Loss Items
CREATE TABLE IF NOT EXISTS budget_profit_loss_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,

  -- Revenue & Cost
  net_sales DECIMAL(15,2),
  cost_of_sales DECIMAL(15,2),
  gross_profit DECIMAL(15,2),

  -- Operating Expenses & Income
  selling_general_admin_expenses DECIMAL(15,2),
  operating_income DECIMAL(15,2),

  -- Non-Operating
  non_operating_income DECIMAL(15,2),
  non_operating_expenses DECIMAL(15,2),
  ordinary_income DECIMAL(15,2),

  -- Extraordinary & Tax
  extraordinary_income DECIMAL(15,2),
  extraordinary_losses DECIMAL(15,2),
  income_before_tax DECIMAL(15,2),
  income_taxes DECIMAL(15,2),
  net_income DECIMAL(15,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(budget_id)
);

-- Budget Cash Flow Items
CREATE TABLE IF NOT EXISTS budget_cash_flow_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,

  -- CF Components
  depreciation DECIMAL(15,2),
  capex DECIMAL(15,2),
  working_capital_change DECIMAL(15,2),
  loan_repayment DECIMAL(15,2),

  -- CF Metrics
  ebitda_budget DECIMAL(15,2),
  fcf_budget DECIMAL(15,2),

  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(budget_id)
);

-- Budget Variance Metrics (Pre-calculated)
CREATE TABLE IF NOT EXISTS budget_variance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES financial_periods(id) ON DELETE CASCADE,

  -- P&L Variances (Actual - Budget)
  net_sales_budget DECIMAL(15,2),
  net_sales_actual DECIMAL(15,2),
  net_sales_variance DECIMAL(15,2),
  net_sales_achievement DECIMAL(10,4), -- %

  cost_of_sales_budget DECIMAL(15,2),
  cost_of_sales_actual DECIMAL(15,2),
  cost_of_sales_variance DECIMAL(15,2),
  cost_of_sales_achievement DECIMAL(10,4),

  gross_profit_budget DECIMAL(15,2),
  gross_profit_actual DECIMAL(15,2),
  gross_profit_variance DECIMAL(15,2),
  gross_profit_achievement DECIMAL(10,4),

  operating_income_budget DECIMAL(15,2),
  operating_income_actual DECIMAL(15,2),
  operating_income_variance DECIMAL(15,2),
  operating_income_achievement DECIMAL(10,4),

  ordinary_income_budget DECIMAL(15,2),
  ordinary_income_actual DECIMAL(15,2),
  ordinary_income_variance DECIMAL(15,2),
  ordinary_income_achievement DECIMAL(10,4),

  net_income_budget DECIMAL(15,2),
  net_income_actual DECIMAL(15,2),
  net_income_variance DECIMAL(15,2),
  net_income_achievement DECIMAL(10,4),

  -- CF Metrics Variances
  ebitda_budget DECIMAL(15,2),
  ebitda_actual DECIMAL(15,2),
  ebitda_variance DECIMAL(15,2),
  ebitda_achievement DECIMAL(10,4),

  fcf_budget DECIMAL(15,2),
  fcf_actual DECIMAL(15,2),
  fcf_variance DECIMAL(15,2),
  fcf_achievement DECIMAL(10,4),

  -- Analysis
  overall_status VARCHAR(20), -- 'excellent', 'good', 'warning', 'poor'
  key_issues TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(budget_id, period_id)
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_budgets_company_id ON budgets(company_id);
CREATE INDEX IF NOT EXISTS idx_budgets_fiscal_year ON budgets(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_budgets_created_by ON budgets(created_by);
CREATE INDEX IF NOT EXISTS idx_budget_profit_loss_items_budget_id ON budget_profit_loss_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_cash_flow_items_budget_id ON budget_cash_flow_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_variance_metrics_budget_id ON budget_variance_metrics(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_variance_metrics_period_id ON budget_variance_metrics(period_id);

-- Enable Row Level Security (RLS)
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_profit_loss_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_cash_flow_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_variance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Authenticated users can access all data
CREATE POLICY "Authenticated users can view budgets" ON budgets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert budgets" ON budgets
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update budgets" ON budgets
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete budgets" ON budgets
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view budget profit loss items" ON budget_profit_loss_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert budget profit loss items" ON budget_profit_loss_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update budget profit loss items" ON budget_profit_loss_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete budget profit loss items" ON budget_profit_loss_items
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view budget cash flow items" ON budget_cash_flow_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert budget cash flow items" ON budget_cash_flow_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update budget cash flow items" ON budget_cash_flow_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete budget cash flow items" ON budget_cash_flow_items
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view budget variance metrics" ON budget_variance_metrics
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert budget variance metrics" ON budget_variance_metrics
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update budget variance metrics" ON budget_variance_metrics
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete budget variance metrics" ON budget_variance_metrics
  FOR DELETE TO authenticated USING (true);

-- Auto-update Triggers
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_profit_loss_items_updated_at BEFORE UPDATE ON budget_profit_loss_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_cash_flow_items_updated_at BEFORE UPDATE ON budget_cash_flow_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_variance_metrics_updated_at BEFORE UPDATE ON budget_variance_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate variance metrics
CREATE OR REPLACE FUNCTION calculate_budget_variance(
  p_budget_id UUID,
  p_period_id UUID
)
RETURNS void AS $$
DECLARE
  v_budget_pl budget_profit_loss_items%ROWTYPE;
  v_actual_pl profit_loss_items%ROWTYPE;
  v_budget_cf budget_cash_flow_items%ROWTYPE;
  v_actual_metrics financial_metrics%ROWTYPE;
BEGIN
  -- Get budget data
  SELECT * INTO v_budget_pl FROM budget_profit_loss_items WHERE budget_id = p_budget_id;
  SELECT * INTO v_budget_cf FROM budget_cash_flow_items WHERE budget_id = p_budget_id;

  -- Get actual data
  SELECT * INTO v_actual_pl FROM profit_loss_items WHERE period_id = p_period_id;
  SELECT * INTO v_actual_metrics FROM financial_metrics WHERE period_id = p_period_id;

  -- Insert or update variance metrics
  INSERT INTO budget_variance_metrics (
    budget_id,
    period_id,
    net_sales_budget, net_sales_actual, net_sales_variance, net_sales_achievement,
    cost_of_sales_budget, cost_of_sales_actual, cost_of_sales_variance, cost_of_sales_achievement,
    gross_profit_budget, gross_profit_actual, gross_profit_variance, gross_profit_achievement,
    operating_income_budget, operating_income_actual, operating_income_variance, operating_income_achievement,
    ordinary_income_budget, ordinary_income_actual, ordinary_income_variance, ordinary_income_achievement,
    net_income_budget, net_income_actual, net_income_variance, net_income_achievement,
    ebitda_budget, ebitda_actual, ebitda_variance, ebitda_achievement,
    fcf_budget, fcf_actual, fcf_variance, fcf_achievement
  ) VALUES (
    p_budget_id,
    p_period_id,
    -- Net Sales
    v_budget_pl.net_sales,
    v_actual_pl.net_sales,
    COALESCE(v_actual_pl.net_sales, 0) - COALESCE(v_budget_pl.net_sales, 0),
    CASE WHEN COALESCE(v_budget_pl.net_sales, 0) != 0
         THEN (COALESCE(v_actual_pl.net_sales, 0) / v_budget_pl.net_sales) * 100
         ELSE NULL END,
    -- Cost of Sales
    v_budget_pl.cost_of_sales,
    v_actual_pl.cost_of_sales,
    COALESCE(v_actual_pl.cost_of_sales, 0) - COALESCE(v_budget_pl.cost_of_sales, 0),
    CASE WHEN COALESCE(v_budget_pl.cost_of_sales, 0) != 0
         THEN (COALESCE(v_actual_pl.cost_of_sales, 0) / v_budget_pl.cost_of_sales) * 100
         ELSE NULL END,
    -- Gross Profit
    v_budget_pl.gross_profit,
    v_actual_pl.gross_profit,
    COALESCE(v_actual_pl.gross_profit, 0) - COALESCE(v_budget_pl.gross_profit, 0),
    CASE WHEN COALESCE(v_budget_pl.gross_profit, 0) != 0
         THEN (COALESCE(v_actual_pl.gross_profit, 0) / v_budget_pl.gross_profit) * 100
         ELSE NULL END,
    -- Operating Income
    v_budget_pl.operating_income,
    v_actual_pl.operating_income,
    COALESCE(v_actual_pl.operating_income, 0) - COALESCE(v_budget_pl.operating_income, 0),
    CASE WHEN COALESCE(v_budget_pl.operating_income, 0) != 0
         THEN (COALESCE(v_actual_pl.operating_income, 0) / v_budget_pl.operating_income) * 100
         ELSE NULL END,
    -- Ordinary Income
    v_budget_pl.ordinary_income,
    v_actual_pl.ordinary_income,
    COALESCE(v_actual_pl.ordinary_income, 0) - COALESCE(v_budget_pl.ordinary_income, 0),
    CASE WHEN COALESCE(v_budget_pl.ordinary_income, 0) != 0
         THEN (COALESCE(v_actual_pl.ordinary_income, 0) / v_budget_pl.ordinary_income) * 100
         ELSE NULL END,
    -- Net Income
    v_budget_pl.net_income,
    v_actual_pl.net_income,
    COALESCE(v_actual_pl.net_income, 0) - COALESCE(v_budget_pl.net_income, 0),
    CASE WHEN COALESCE(v_budget_pl.net_income, 0) != 0
         THEN (COALESCE(v_actual_pl.net_income, 0) / v_budget_pl.net_income) * 100
         ELSE NULL END,
    -- EBITDA
    v_budget_cf.ebitda_budget,
    v_actual_metrics.ebitda,
    COALESCE(v_actual_metrics.ebitda, 0) - COALESCE(v_budget_cf.ebitda_budget, 0),
    CASE WHEN COALESCE(v_budget_cf.ebitda_budget, 0) != 0
         THEN (COALESCE(v_actual_metrics.ebitda, 0) / v_budget_cf.ebitda_budget) * 100
         ELSE NULL END,
    -- FCF
    v_budget_cf.fcf_budget,
    v_actual_metrics.fcf,
    COALESCE(v_actual_metrics.fcf, 0) - COALESCE(v_budget_cf.fcf_budget, 0),
    CASE WHEN COALESCE(v_budget_cf.fcf_budget, 0) != 0
         THEN (COALESCE(v_actual_metrics.fcf, 0) / v_budget_cf.fcf_budget) * 100
         ELSE NULL END
  )
  ON CONFLICT (budget_id, period_id)
  DO UPDATE SET
    net_sales_budget = EXCLUDED.net_sales_budget,
    net_sales_actual = EXCLUDED.net_sales_actual,
    net_sales_variance = EXCLUDED.net_sales_variance,
    net_sales_achievement = EXCLUDED.net_sales_achievement,
    cost_of_sales_budget = EXCLUDED.cost_of_sales_budget,
    cost_of_sales_actual = EXCLUDED.cost_of_sales_actual,
    cost_of_sales_variance = EXCLUDED.cost_of_sales_variance,
    cost_of_sales_achievement = EXCLUDED.cost_of_sales_achievement,
    gross_profit_budget = EXCLUDED.gross_profit_budget,
    gross_profit_actual = EXCLUDED.gross_profit_actual,
    gross_profit_variance = EXCLUDED.gross_profit_variance,
    gross_profit_achievement = EXCLUDED.gross_profit_achievement,
    operating_income_budget = EXCLUDED.operating_income_budget,
    operating_income_actual = EXCLUDED.operating_income_actual,
    operating_income_variance = EXCLUDED.operating_income_variance,
    operating_income_achievement = EXCLUDED.operating_income_achievement,
    ordinary_income_budget = EXCLUDED.ordinary_income_budget,
    ordinary_income_actual = EXCLUDED.ordinary_income_actual,
    ordinary_income_variance = EXCLUDED.ordinary_income_variance,
    ordinary_income_achievement = EXCLUDED.ordinary_income_achievement,
    net_income_budget = EXCLUDED.net_income_budget,
    net_income_actual = EXCLUDED.net_income_actual,
    net_income_variance = EXCLUDED.net_income_variance,
    net_income_achievement = EXCLUDED.net_income_achievement,
    ebitda_budget = EXCLUDED.ebitda_budget,
    ebitda_actual = EXCLUDED.ebitda_actual,
    ebitda_variance = EXCLUDED.ebitda_variance,
    ebitda_achievement = EXCLUDED.ebitda_achievement,
    fcf_budget = EXCLUDED.fcf_budget,
    fcf_actual = EXCLUDED.fcf_actual,
    fcf_variance = EXCLUDED.fcf_variance,
    fcf_achievement = EXCLUDED.fcf_achievement,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
