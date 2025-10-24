-- ===== ステップ1: まずこれを実行してください =====
-- 作成した分析が存在するか確認
SELECT
  id,
  company_id,
  analysis_date,
  fiscal_year_start,
  fiscal_year_end,
  periods_count,
  status,
  created_at
FROM financial_analyses
ORDER BY created_at DESC
LIMIT 5;

-- ↑ このクエリを実行して、最新の分析の「id」をコピーしてください
-- 例: 88d04f8e-67e8-4edb-88b6-dbc6f11cf75b


-- ===== ステップ2: 上でコピーしたIDを下のクエリに貼り付けて実行 =====
-- 期間データとBS/PLデータの確認
SELECT
  fp.fiscal_year,
  COUNT(bs.id) as bs_data_count,
  COUNT(pl.id) as pl_data_count,
  CASE
    WHEN COUNT(bs.id) = 0 AND COUNT(pl.id) = 0 THEN '❌ データなし'
    WHEN COUNT(bs.id) > 0 AND COUNT(pl.id) > 0 THEN '✅ データあり'
    ELSE '⚠️  一部のみ'
  END as status
FROM financial_periods fp
LEFT JOIN balance_sheet_items bs ON bs.period_id = fp.id
LEFT JOIN profit_loss_items pl ON pl.period_id = fp.id
WHERE fp.analysis_id = '88d04f8e-67e8-4edb-88b6-dbc6f11cf75b'  -- ← ここをステップ1で取得したIDに置き換え
GROUP BY fp.fiscal_year
ORDER BY fp.fiscal_year;


-- ===== ステップ3: アップロードされたファイルの確認 =====
SELECT
  file_type,
  fiscal_year,
  file_name,
  file_size,
  ocr_status,
  uploaded_at
FROM uploaded_files
WHERE analysis_id = '88d04f8e-67e8-4edb-88b6-dbc6f11cf75b'  -- ← ここも同じIDに置き換え
ORDER BY fiscal_year, file_type;


-- ===== ステップ4: 詳細なBSデータの確認（データがある場合のみ） =====
SELECT
  fp.fiscal_year,
  bs.cash_and_deposits,
  bs.accounts_receivable,
  bs.inventory,
  bs.total_assets,
  bs.total_liabilities,
  bs.total_net_assets
FROM balance_sheet_items bs
JOIN financial_periods fp ON fp.id = bs.period_id
WHERE fp.analysis_id = '88d04f8e-67e8-4edb-88b6-dbc6f11cf75b'  -- ← ここも同じIDに置き換え
ORDER BY fp.fiscal_year;


-- ===== ステップ5: 詳細なPLデータの確認（データがある場合のみ） =====
SELECT
  fp.fiscal_year,
  pl.net_sales,
  pl.cost_of_sales,
  pl.gross_profit,
  pl.operating_income,
  pl.ordinary_income,
  pl.net_income
FROM profit_loss_items pl
JOIN financial_periods fp ON fp.id = pl.period_id
WHERE fp.analysis_id = '88d04f8e-67e8-4edb-88b6-dbc6f11cf75b'  -- ← ここも同じIDに置き換え
ORDER BY fp.fiscal_year;
