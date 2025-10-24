-- シンプルな確認クエリ

-- ===== 1. 期間データの確認 =====
SELECT
  id as period_id,
  analysis_id,
  fiscal_year,
  period_start_date,
  period_end_date
FROM financial_periods
WHERE analysis_id = '800eaf0f-3648-4863-a5b3-b3fc22802fd8'
ORDER BY fiscal_year;

-- ===== 2. PLデータの確認（JOINなし） =====
SELECT
  period_id,
  net_sales,
  cost_of_sales,
  gross_profit,
  operating_income,
  ordinary_income,
  net_income,
  created_at
FROM profit_loss_items
WHERE period_id IN (
  SELECT id FROM financial_periods
  WHERE analysis_id = '800eaf0f-3648-4863-a5b3-b3fc22802fd8'
)
ORDER BY created_at;

-- ===== 3. BSデータの確認（JOINなし） =====
SELECT
  period_id,
  cash_and_deposits,
  accounts_receivable,
  inventory,
  total_assets,
  total_liabilities,
  total_net_assets,
  created_at
FROM balance_sheet_items
WHERE period_id IN (
  SELECT id FROM financial_periods
  WHERE analysis_id = '800eaf0f-3648-4863-a5b3-b3fc22802fd8'
)
ORDER BY created_at;

-- ===== 4. 全カラムを確認（PLデータ） =====
SELECT *
FROM profit_loss_items
WHERE period_id IN (
  SELECT id FROM financial_periods
  WHERE analysis_id = '800eaf0f-3648-4863-a5b3-b3fc22802fd8'
)
LIMIT 5;

-- ===== 5. 全カラムを確認（BSデータ） =====
SELECT *
FROM balance_sheet_items
WHERE period_id IN (
  SELECT id FROM financial_periods
  WHERE analysis_id = '800eaf0f-3648-4863-a5b3-b3fc22802fd8'
)
LIMIT 5;
