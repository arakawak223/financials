-- Add growth rate columns and equity_ratio to financial_metrics table
ALTER TABLE financial_metrics
ADD COLUMN IF NOT EXISTS operating_income_growth_rate DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS ebitda_growth_rate DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS equity_ratio DECIMAL(10,4);

-- Add comment explaining the columns
COMMENT ON COLUMN financial_metrics.operating_income_growth_rate IS '営業利益成長率（前期比）';
COMMENT ON COLUMN financial_metrics.ebitda_growth_rate IS 'EBITDA成長率（前期比）';
COMMENT ON COLUMN financial_metrics.equity_ratio IS '自己資本比率';
