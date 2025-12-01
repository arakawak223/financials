-- Fix column name aliases in company_financial_summary view
-- This migration adds aliases so frontend can use 'operating_margin' and 'sales_growth'
-- while the database uses 'operating_profit_margin' and 'sales_growth_rate'

-- Drop dependent functions first
DROP FUNCTION IF EXISTS get_company_comparison(UUID[], INTEGER);
DROP FUNCTION IF EXISTS get_industry_benchmark(VARCHAR, INTEGER);

-- Drop views first (PostgreSQL doesn't allow column renames in CREATE OR REPLACE VIEW)
DROP VIEW IF EXISTS company_ranking_by_metrics;
DROP VIEW IF EXISTS industry_comparison_summary;
DROP VIEW IF EXISTS company_financial_summary;

-- Recreate company_financial_summary view with proper aliases
CREATE VIEW company_financial_summary AS
SELECT
  c.id AS company_id,
  c.name AS company_name,
  i.name AS industry,
  fp.id AS period_id,
  fp.fiscal_year,
  fp.period_start_date,
  fp.period_end_date,
  fa.id AS analysis_id,
  fa.status AS analysis_status,

  -- P&L Data
  pl.net_sales,
  pl.cost_of_sales,
  pl.gross_profit,
  pl.selling_general_admin_expenses,
  pl.operating_income,
  pl.non_operating_income,
  pl.non_operating_expenses,
  pl.ordinary_income,
  pl.extraordinary_income,
  pl.extraordinary_losses,
  pl.income_before_tax,
  pl.income_taxes,
  pl.net_income,

  -- Balance Sheet Data
  bs.total_assets,
  bs.total_liabilities,
  bs.total_net_assets,
  bs.current_assets_total,
  bs.current_liabilities_total,

  -- Financial Metrics (with aliases for frontend compatibility)
  fm.roa,
  fm.roe,
  fm.gross_profit_margin,
  fm.operating_profit_margin AS operating_margin,  -- Alias for frontend
  fm.current_ratio,
  fm.ebitda,
  fm.fcf,
  fm.sales_growth_rate AS sales_growth,  -- Alias for frontend
  fm.operating_income_growth_rate,
  fm.ebitda_growth_rate,
  fm.equity_ratio,

  fp.created_at,
  fp.updated_at
FROM
  companies c
  LEFT JOIN industries i ON c.industry_id = i.id
  LEFT JOIN financial_analyses fa ON c.id = fa.company_id
  LEFT JOIN financial_periods fp ON fa.id = fp.analysis_id
  LEFT JOIN profit_loss_items pl ON fp.id = pl.period_id
  LEFT JOIN balance_sheet_items bs ON fp.id = bs.period_id
  LEFT JOIN financial_metrics fm ON fp.id = fm.period_id;

-- Recreate industry_comparison_summary view with proper aliases
CREATE VIEW industry_comparison_summary AS
SELECT
  i.name AS industry,
  fp.fiscal_year,

  -- Aggregated Metrics (Average)
  COUNT(DISTINCT c.id) AS company_count,
  AVG(pl.net_sales) AS avg_net_sales,
  AVG(pl.gross_profit) AS avg_gross_profit,
  AVG(pl.operating_income) AS avg_operating_income,
  AVG(pl.ordinary_income) AS avg_ordinary_income,
  AVG(pl.net_income) AS avg_net_income,

  AVG(fm.roa) AS avg_roa,
  AVG(fm.roe) AS avg_roe,
  AVG(fm.gross_profit_margin) AS avg_gross_profit_margin,
  AVG(fm.operating_profit_margin) AS avg_operating_margin,  -- Alias for frontend
  AVG(fm.current_ratio) AS avg_current_ratio,
  AVG(fm.ebitda) AS avg_ebitda,
  AVG(fm.fcf) AS avg_fcf,
  AVG(fm.equity_ratio) AS avg_equity_ratio,

  -- Min/Max for Range Analysis
  MIN(pl.net_sales) AS min_net_sales,
  MAX(pl.net_sales) AS max_net_sales,
  MIN(fm.roe) AS min_roe,
  MAX(fm.roe) AS max_roe,
  MIN(fm.roa) AS min_roa,
  MAX(fm.roa) AS max_roa

FROM
  companies c
  LEFT JOIN industries i ON c.industry_id = i.id
  LEFT JOIN financial_analyses fa ON c.id = fa.company_id
  LEFT JOIN financial_periods fp ON fa.id = fp.analysis_id
  LEFT JOIN profit_loss_items pl ON fp.id = pl.period_id
  LEFT JOIN financial_metrics fm ON fp.id = fm.period_id
WHERE
  i.name IS NOT NULL
GROUP BY
  i.name, fp.fiscal_year;

-- Recreate company_ranking_by_metrics view with proper aliases
CREATE VIEW company_ranking_by_metrics AS
SELECT
  c.id AS company_id,
  c.name AS company_name,
  i.name AS industry,
  fp.fiscal_year,

  -- P&L Metrics
  pl.net_sales,
  RANK() OVER (PARTITION BY fp.fiscal_year ORDER BY pl.net_sales DESC NULLS LAST) AS net_sales_rank,

  pl.operating_income,
  RANK() OVER (PARTITION BY fp.fiscal_year ORDER BY pl.operating_income DESC NULLS LAST) AS operating_income_rank,

  pl.net_income,
  RANK() OVER (PARTITION BY fp.fiscal_year ORDER BY pl.net_income DESC NULLS LAST) AS net_income_rank,

  -- Financial Metrics
  fm.roe,
  RANK() OVER (PARTITION BY fp.fiscal_year ORDER BY fm.roe DESC NULLS LAST) AS roe_rank,

  fm.roa,
  RANK() OVER (PARTITION BY fp.fiscal_year ORDER BY fm.roa DESC NULLS LAST) AS roa_rank,

  fm.operating_profit_margin AS operating_margin,  -- Alias for frontend
  RANK() OVER (PARTITION BY fp.fiscal_year ORDER BY fm.operating_profit_margin DESC NULLS LAST) AS operating_margin_rank,

  fm.ebitda,
  RANK() OVER (PARTITION BY fp.fiscal_year ORDER BY fm.ebitda DESC NULLS LAST) AS ebitda_rank,

  fm.fcf,
  RANK() OVER (PARTITION BY fp.fiscal_year ORDER BY fm.fcf DESC NULLS LAST) AS fcf_rank

FROM
  companies c
  LEFT JOIN industries i ON c.industry_id = i.id
  LEFT JOIN financial_analyses fa ON c.id = fa.company_id
  LEFT JOIN financial_periods fp ON fa.id = fp.analysis_id
  LEFT JOIN profit_loss_items pl ON fp.id = pl.period_id
  LEFT JOIN financial_metrics fm ON fp.id = fm.period_id;

-- Recreate get_company_comparison function to use correct column names
CREATE FUNCTION get_company_comparison(
  p_company_ids UUID[],
  p_fiscal_year INTEGER
)
RETURNS TABLE (
  company_id UUID,
  company_name VARCHAR,
  industry VARCHAR,
  fiscal_year INTEGER,
  net_sales DECIMAL,
  operating_income DECIMAL,
  net_income DECIMAL,
  roe DECIMAL,
  roa DECIMAL,
  operating_margin DECIMAL,
  ebitda DECIMAL,
  fcf DECIMAL,
  sales_growth DECIMAL,
  operating_growth DECIMAL,
  ebitda_growth DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cfs.company_id,
    cfs.company_name,
    cfs.industry,
    cfs.fiscal_year,
    cfs.net_sales,
    cfs.operating_income,
    cfs.net_income,
    cfs.roe,
    cfs.roa,
    cfs.operating_margin,  -- Now using the aliased column
    cfs.ebitda,
    cfs.fcf,
    cfs.sales_growth,  -- Now using the aliased column
    cfs.operating_income_growth_rate,
    cfs.ebitda_growth_rate
  FROM
    company_financial_summary cfs
  WHERE
    cfs.company_id = ANY(p_company_ids)
    AND cfs.fiscal_year = p_fiscal_year
  ORDER BY
    cfs.company_name;
END;
$$ LANGUAGE plpgsql;

-- Recreate get_industry_benchmark function
CREATE FUNCTION get_industry_benchmark(
  p_industry VARCHAR,
  p_fiscal_year INTEGER
)
RETURNS TABLE (
  industry VARCHAR,
  fiscal_year INTEGER,
  company_count BIGINT,
  avg_net_sales DECIMAL,
  avg_operating_income DECIMAL,
  avg_net_income DECIMAL,
  avg_roe DECIMAL,
  avg_roa DECIMAL,
  avg_operating_margin DECIMAL,
  avg_ebitda DECIMAL,
  avg_fcf DECIMAL,
  avg_equity_ratio DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ics.industry,
    ics.fiscal_year,
    ics.company_count,
    ics.avg_net_sales,
    ics.avg_operating_income,
    ics.avg_net_income,
    ics.avg_roe,
    ics.avg_roa,
    ics.avg_operating_margin,  -- Now using the aliased column
    ics.avg_ebitda,
    ics.avg_fcf,
    ics.avg_equity_ratio
  FROM
    industry_comparison_summary ics
  WHERE
    ics.industry = p_industry
    AND ics.fiscal_year = p_fiscal_year;
END;
$$ LANGUAGE plpgsql;
