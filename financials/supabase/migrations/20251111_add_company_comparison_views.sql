-- Company Comparison Analysis Feature - Database Views
-- Created: 2025-11-11
-- Purpose: Add views for efficient company comparison analysis

-- View: Company Financial Summary
-- Aggregates latest financial data for each company for easy comparison
CREATE OR REPLACE VIEW company_financial_summary AS
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

  -- Financial Metrics
  fm.roa,
  fm.roe,
  fm.gross_profit_margin,
  fm.operating_profit_margin,
  fm.current_ratio,
  fm.ebitda,
  fm.fcf,
  fm.sales_growth_rate,
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

-- View: Industry Comparison Summary
-- Groups companies by industry for industry-level comparisons
CREATE OR REPLACE VIEW industry_comparison_summary AS
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
  AVG(fm.operating_profit_margin) AS avg_operating_profit_margin,
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

-- View: Company Ranking by Metrics
-- Ranks companies by various financial metrics for benchmarking
CREATE OR REPLACE VIEW company_ranking_by_metrics AS
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

  fm.operating_profit_margin,
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

-- View: Year-over-Year Growth Comparison
-- Compares year-over-year growth rates across companies
CREATE OR REPLACE VIEW yoy_growth_comparison AS
SELECT
  c.id AS company_id,
  c.name AS company_name,
  i.name AS industry,
  fp.fiscal_year,

  -- Current Year Data
  pl.net_sales AS current_net_sales,
  pl.operating_income AS current_operating_income,
  pl.net_income AS current_net_income,

  -- Previous Year Data (using LAG)
  LAG(pl.net_sales) OVER (PARTITION BY c.id, fa.id ORDER BY fp.fiscal_year) AS prev_net_sales,
  LAG(pl.operating_income) OVER (PARTITION BY c.id, fa.id ORDER BY fp.fiscal_year) AS prev_operating_income,
  LAG(pl.net_income) OVER (PARTITION BY c.id, fa.id ORDER BY fp.fiscal_year) AS prev_net_income,

  -- Growth Rates
  CASE
    WHEN LAG(pl.net_sales) OVER (PARTITION BY c.id, fa.id ORDER BY fp.fiscal_year) > 0
    THEN ((pl.net_sales - LAG(pl.net_sales) OVER (PARTITION BY c.id, fa.id ORDER BY fp.fiscal_year))
          / LAG(pl.net_sales) OVER (PARTITION BY c.id, fa.id ORDER BY fp.fiscal_year)) * 100
    ELSE NULL
  END AS net_sales_growth_rate,

  CASE
    WHEN LAG(pl.operating_income) OVER (PARTITION BY c.id, fa.id ORDER BY fp.fiscal_year) > 0
    THEN ((pl.operating_income - LAG(pl.operating_income) OVER (PARTITION BY c.id, fa.id ORDER BY fp.fiscal_year))
          / LAG(pl.operating_income) OVER (PARTITION BY c.id, fa.id ORDER BY fp.fiscal_year)) * 100
    ELSE NULL
  END AS operating_income_growth_rate,

  CASE
    WHEN LAG(pl.net_income) OVER (PARTITION BY c.id, fa.id ORDER BY fp.fiscal_year) > 0
    THEN ((pl.net_income - LAG(pl.net_income) OVER (PARTITION BY c.id, fa.id ORDER BY fp.fiscal_year))
          / LAG(pl.net_income) OVER (PARTITION BY c.id, fa.id ORDER BY fp.fiscal_year)) * 100
    ELSE NULL
  END AS net_income_growth_rate

FROM
  companies c
  LEFT JOIN industries i ON c.industry_id = i.id
  LEFT JOIN financial_analyses fa ON c.id = fa.company_id
  LEFT JOIN financial_periods fp ON fa.id = fp.analysis_id
  LEFT JOIN profit_loss_items pl ON fp.id = pl.period_id
ORDER BY
  c.id, fp.fiscal_year DESC;

-- Function: Get Company Comparison Data
-- Returns formatted comparison data for specified companies and periods
CREATE OR REPLACE FUNCTION get_company_comparison(
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
    cfs.operating_profit_margin,
    cfs.ebitda,
    cfs.fcf,
    cfs.sales_growth_rate,
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

-- Function: Get Industry Benchmark
-- Returns industry average metrics for comparison
CREATE OR REPLACE FUNCTION get_industry_benchmark(
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
    ics.avg_operating_profit_margin,
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

-- Grant SELECT permissions on views to authenticated users
GRANT SELECT ON company_financial_summary TO authenticated;
GRANT SELECT ON industry_comparison_summary TO authenticated;
GRANT SELECT ON company_ranking_by_metrics TO authenticated;
GRANT SELECT ON yoy_growth_comparison TO authenticated;
