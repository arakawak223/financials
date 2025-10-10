-- Financial Analysis Application - Database Schema
-- Created: 2025-10-05

-- Industries Master Table
CREATE TABLE IF NOT EXISTS industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Company Groups
CREATE TABLE IF NOT EXISTS company_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  industry_id UUID REFERENCES industries(id) ON DELETE SET NULL,
  password_hash VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  group_id UUID REFERENCES company_groups(id) ON DELETE SET NULL,
  industry_id UUID REFERENCES industries(id) ON DELETE SET NULL,
  password_hash VARCHAR(255),
  company_code VARCHAR(50),
  address TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial Analyses
CREATE TABLE IF NOT EXISTS financial_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  analysis_date DATE NOT NULL,
  fiscal_year_start INTEGER NOT NULL,
  fiscal_year_end INTEGER NOT NULL,
  periods_count INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'draft', -- draft, completed, archived
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Uploaded Files
CREATE TABLE IF NOT EXISTS uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES financial_analyses(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- balance_sheet, profit_loss, account_details
  file_path VARCHAR(500) NOT NULL,
  file_size_bytes INTEGER,
  fiscal_year INTEGER,
  ocr_applied BOOLEAN DEFAULT FALSE,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial Periods
CREATE TABLE IF NOT EXISTS financial_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES financial_analyses(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  period_start_date DATE,
  period_end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(analysis_id, fiscal_year)
);

-- Balance Sheet Items
CREATE TABLE IF NOT EXISTS balance_sheet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES financial_periods(id) ON DELETE CASCADE,

  -- Assets
  cash_and_deposits DECIMAL(15,2),
  accounts_receivable DECIMAL(15,2),
  inventory DECIMAL(15,2),
  current_assets_total DECIMAL(15,2),
  tangible_fixed_assets DECIMAL(15,2),
  intangible_fixed_assets DECIMAL(15,2),
  investments_and_other_assets DECIMAL(15,2),
  fixed_assets_total DECIMAL(15,2),
  total_assets DECIMAL(15,2),

  -- Liabilities
  accounts_payable DECIMAL(15,2),
  short_term_borrowings DECIMAL(15,2),
  current_liabilities_total DECIMAL(15,2),
  long_term_borrowings DECIMAL(15,2),
  fixed_liabilities_total DECIMAL(15,2),
  total_liabilities DECIMAL(15,2),

  -- Net Assets
  capital_stock DECIMAL(15,2),
  retained_earnings DECIMAL(15,2),
  total_net_assets DECIMAL(15,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(period_id)
);

-- Profit & Loss Items
CREATE TABLE IF NOT EXISTS profit_loss_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES financial_periods(id) ON DELETE CASCADE,

  net_sales DECIMAL(15,2),
  cost_of_sales DECIMAL(15,2),
  gross_profit DECIMAL(15,2),
  selling_general_admin_expenses DECIMAL(15,2),
  operating_income DECIMAL(15,2),
  non_operating_income DECIMAL(15,2),
  non_operating_expenses DECIMAL(15,2),
  ordinary_income DECIMAL(15,2),
  extraordinary_income DECIMAL(15,2),
  extraordinary_losses DECIMAL(15,2),
  income_before_tax DECIMAL(15,2),
  income_taxes DECIMAL(15,2),
  net_income DECIMAL(15,2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(period_id)
);

-- Account Details
CREATE TABLE IF NOT EXISTS account_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES financial_periods(id) ON DELETE CASCADE,
  account_category VARCHAR(100) NOT NULL,
  account_name VARCHAR(200) NOT NULL,
  amount DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Manual Inputs
CREATE TABLE IF NOT EXISTS manual_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES financial_periods(id) ON DELETE CASCADE,
  input_type VARCHAR(50) NOT NULL, -- depreciation, capex, etc.
  amount DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial Metrics
CREATE TABLE IF NOT EXISTS financial_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES financial_analyses(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES financial_periods(id) ON DELETE CASCADE,

  -- Safety Metrics
  net_cash DECIMAL(15,2),
  current_ratio DECIMAL(10,4),

  -- Profitability Metrics
  gross_profit_margin DECIMAL(10,4),
  operating_profit_margin DECIMAL(10,4),
  ebitda_margin DECIMAL(10,4),
  roe DECIMAL(10,4),
  roa DECIMAL(10,4),

  -- Efficiency Metrics
  accounts_receivable_turnover_months DECIMAL(10,2),
  inventory_turnover_months DECIMAL(10,2),

  -- Cash Flow Metrics
  ebitda DECIMAL(15,2),
  fcf DECIMAL(15,2),
  ebitda_to_interest_bearing_debt DECIMAL(10,4),

  -- Growth Metrics
  sales_growth_rate DECIMAL(10,4),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(analysis_id, period_id)
);

-- Analysis Comments
CREATE TABLE IF NOT EXISTS analysis_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES financial_analyses(id) ON DELETE CASCADE,
  comment_type VARCHAR(50) NOT NULL, -- overall, liquidity, profitability, efficiency, safety, growth
  ai_generated_text TEXT,
  user_edited_text TEXT,
  is_edited BOOLEAN DEFAULT FALSE,
  display_order INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Access Logs
CREATE TABLE IF NOT EXISTS access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_companies_group_id ON companies(group_id);
CREATE INDEX IF NOT EXISTS idx_companies_industry_id ON companies(industry_id);
CREATE INDEX IF NOT EXISTS idx_financial_analyses_company_id ON financial_analyses(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_analyses_created_by ON financial_analyses(created_by);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_analysis_id ON uploaded_files(analysis_id);
CREATE INDEX IF NOT EXISTS idx_financial_periods_analysis_id ON financial_periods(analysis_id);
CREATE INDEX IF NOT EXISTS idx_balance_sheet_items_period_id ON balance_sheet_items(period_id);
CREATE INDEX IF NOT EXISTS idx_profit_loss_items_period_id ON profit_loss_items(period_id);
CREATE INDEX IF NOT EXISTS idx_account_details_period_id ON account_details(period_id);
CREATE INDEX IF NOT EXISTS idx_manual_inputs_period_id ON manual_inputs(period_id);
CREATE INDEX IF NOT EXISTS idx_financial_metrics_analysis_id ON financial_metrics(analysis_id);
CREATE INDEX IF NOT EXISTS idx_financial_metrics_period_id ON financial_metrics(period_id);
CREATE INDEX IF NOT EXISTS idx_analysis_comments_analysis_id ON analysis_comments(analysis_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_company_id ON access_logs(company_id);

-- Enable Row Level Security (RLS)
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_sheet_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profit_loss_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Authenticated users can access all data
-- (Phase 2 will implement company/group-level access restrictions)

-- industries
CREATE POLICY "Authenticated users can view industries" ON industries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert industries" ON industries
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update industries" ON industries
  FOR UPDATE TO authenticated USING (true);

-- company_groups
CREATE POLICY "Authenticated users can view company groups" ON company_groups
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert company groups" ON company_groups
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update company groups" ON company_groups
  FOR UPDATE TO authenticated USING (true);

-- companies
CREATE POLICY "Authenticated users can view companies" ON companies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert companies" ON companies
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update companies" ON companies
  FOR UPDATE TO authenticated USING (true);

-- financial_analyses
CREATE POLICY "Authenticated users can view financial analyses" ON financial_analyses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert financial analyses" ON financial_analyses
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update financial analyses" ON financial_analyses
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete financial analyses" ON financial_analyses
  FOR DELETE TO authenticated USING (true);

-- uploaded_files
CREATE POLICY "Authenticated users can view uploaded files" ON uploaded_files
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert uploaded files" ON uploaded_files
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update uploaded files" ON uploaded_files
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete uploaded files" ON uploaded_files
  FOR DELETE TO authenticated USING (true);

-- financial_periods
CREATE POLICY "Authenticated users can view financial periods" ON financial_periods
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert financial periods" ON financial_periods
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update financial periods" ON financial_periods
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete financial periods" ON financial_periods
  FOR DELETE TO authenticated USING (true);

-- balance_sheet_items
CREATE POLICY "Authenticated users can view balance sheet items" ON balance_sheet_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert balance sheet items" ON balance_sheet_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update balance sheet items" ON balance_sheet_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete balance sheet items" ON balance_sheet_items
  FOR DELETE TO authenticated USING (true);

-- profit_loss_items
CREATE POLICY "Authenticated users can view profit loss items" ON profit_loss_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert profit loss items" ON profit_loss_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update profit loss items" ON profit_loss_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete profit loss items" ON profit_loss_items
  FOR DELETE TO authenticated USING (true);

-- account_details
CREATE POLICY "Authenticated users can view account details" ON account_details
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert account details" ON account_details
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update account details" ON account_details
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete account details" ON account_details
  FOR DELETE TO authenticated USING (true);

-- manual_inputs
CREATE POLICY "Authenticated users can view manual inputs" ON manual_inputs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert manual inputs" ON manual_inputs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update manual inputs" ON manual_inputs
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete manual inputs" ON manual_inputs
  FOR DELETE TO authenticated USING (true);

-- financial_metrics
CREATE POLICY "Authenticated users can view financial metrics" ON financial_metrics
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert financial metrics" ON financial_metrics
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update financial metrics" ON financial_metrics
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete financial metrics" ON financial_metrics
  FOR DELETE TO authenticated USING (true);

-- analysis_comments
CREATE POLICY "Authenticated users can view analysis comments" ON analysis_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert analysis comments" ON analysis_comments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update analysis comments" ON analysis_comments
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete analysis comments" ON analysis_comments
  FOR DELETE TO authenticated USING (true);

-- access_logs
CREATE POLICY "Authenticated users can view access logs" ON access_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert access logs" ON access_logs
  FOR INSERT TO authenticated WITH CHECK (true);

-- Auto-update Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply Auto-update Triggers to Each Table
CREATE TRIGGER update_industries_updated_at BEFORE UPDATE ON industries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_groups_updated_at BEFORE UPDATE ON company_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_analyses_updated_at BEFORE UPDATE ON financial_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_periods_updated_at BEFORE UPDATE ON financial_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_balance_sheet_items_updated_at BEFORE UPDATE ON balance_sheet_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profit_loss_items_updated_at BEFORE UPDATE ON profit_loss_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_details_updated_at BEFORE UPDATE ON account_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manual_inputs_updated_at BEFORE UPDATE ON manual_inputs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_metrics_updated_at BEFORE UPDATE ON financial_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_comments_updated_at BEFORE UPDATE ON analysis_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
