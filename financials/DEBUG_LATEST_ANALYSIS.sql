-- 最新の分析と減価償却費の確認
SELECT
  fa.id as analysis_id,
  fa.created_at,
  fp.fiscal_year as 年度,
  ad.account_name as 勘定科目名,
  ad.amount as 金額
FROM financial_analyses fa
JOIN financial_periods fp ON fp.analysis_id = fa.id
JOIN account_details ad ON ad.period_id = fp.id
WHERE ad.account_name LIKE '%償却%'
ORDER BY fa.created_at DESC, fp.fiscal_year
LIMIT 20;
