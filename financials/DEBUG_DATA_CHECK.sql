-- データが表示されない原因を調査するSQL
-- Supabase Dashboard → SQL Editor で実行してください

-- ===== ステップ1: 分析データの確認 =====
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

-- ===== ステップ2: 期間データの確認 =====
-- 最新の分析IDを使って確認（上の結果からIDをコピー）
-- 例: WHERE analysis_id = '88d04f8e-67e8-4edb-88b6-dbc6f11cf75b'
SELECT
  fp.id as period_id,
  fp.analysis_id,
  fp.fiscal_year,
  fp.period_start_date,
  fp.period_end_date,
  COUNT(bs.id) as bs_count,
  COUNT(pl.id) as pl_count
FROM financial_periods fp
LEFT JOIN balance_sheet_items bs ON bs.period_id = fp.id
LEFT JOIN profit_loss_items pl ON pl.period_id = fp.id
WHERE fp.analysis_id = 'あなたの分析ID'  -- ここを置き換えてください
GROUP BY fp.id, fp.analysis_id, fp.fiscal_year, fp.period_start_date, fp.period_end_date
ORDER BY fp.fiscal_year;

-- ===== ステップ3: BS（貸借対照表）データの確認 =====
-- データが入っているか確認
SELECT
  bs.*
FROM balance_sheet_items bs
JOIN financial_periods fp ON fp.id = bs.period_id
WHERE fp.analysis_id = 'あなたの分析ID'  -- ここを置き換えてください
ORDER BY fp.fiscal_year;

-- ===== ステップ4: PL（損益計算書）データの確認 =====
-- データが入っているか確認
SELECT
  pl.*
FROM profit_loss_items pl
JOIN financial_periods fp ON fp.id = pl.period_id
WHERE fp.analysis_id = 'あなたの分析ID'  -- ここを置き換えてください
ORDER BY fp.fiscal_year;

-- ===== ステップ5: アップロードされたファイルの確認 =====
SELECT
  id,
  analysis_id,
  file_type,
  fiscal_year,
  file_name,
  file_size,
  ocr_status,
  uploaded_at
FROM uploaded_files
WHERE analysis_id = 'あなたの分析ID'  -- ここを置き換えてください
ORDER BY fiscal_year, file_type;

-- ===== 診断結果の解釈 =====
--
-- 【ケース1】financial_periods に行があるが、bs_count=0, pl_count=0
--   → PDFからデータが抽出できていない
--   → 原因: 正規表現パターンがPDFのフォーマットにマッチしていない
--   → 解決策: 手動でデータを入力するか、PDFのフォーマットを確認
--
-- 【ケース2】financial_periods に行がない
--   → 分析作成時にperiodが作成されていない
--   → 原因: /api/analysis/create のバグ
--   → 解決策: コードを確認
--
-- 【ケース3】balance_sheet_items, profit_loss_items にデータはあるが画面に表示されない
--   → フロントエンドまたはAPIのバグ
--   → 解決策: ブラウザのコンソールログを確認
--
-- 【ケース4】uploaded_files にファイルがない
--   → アップロードが失敗している
--   → 原因: Storageポリシーの問題
--   → 解決策: ストレージポリシーを確認
