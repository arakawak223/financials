-- 勘定科目明細の確認クエリ
-- 2024年度の勘定科目明細を確認

SELECT
  fp.fiscal_year as 年度,
  ad.account_category as 区分,
  ad.account_name as 勘定科目名,
  ad.amount as 金額
FROM account_details ad
JOIN financial_periods fp ON ad.period_id = fp.id
WHERE fp.analysis_id = 'b1cbff1a-8cd3-4bea-a183-d8bada2573d0'
  AND ad.account_name LIKE '%償却%'
ORDER BY fp.fiscal_year, ad.account_name;
