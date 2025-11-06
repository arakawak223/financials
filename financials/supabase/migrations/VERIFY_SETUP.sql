-- ============================================
-- セットアップ確認用SQL
-- ============================================
-- このSQLを実行して、セットアップが正常に完了したか確認してください

-- 1. industriesテーブルの確認
SELECT 'industries テーブル' as check_item, COUNT(*) as record_count
FROM industries;

-- 2. industriesのデータ確認（最初の5件）
SELECT 'industries データサンプル' as check_item, name, code
FROM industries
ORDER BY name
LIMIT 5;

-- 3. account_formatsテーブルの存在確認
SELECT 'account_formats テーブル' as check_item,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'account_formats'
  ) THEN '存在します' ELSE '存在しません' END as status;

-- 4. account_format_itemsテーブルの存在確認
SELECT 'account_format_items テーブル' as check_item,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'account_format_items'
  ) THEN '存在します' ELSE '存在しません' END as status;

-- 5. companiesテーブルのカラム確認
SELECT 'companies.industry_id カラム' as check_item,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'industry_id'
  ) THEN '存在します' ELSE '存在しません' END as status;

-- 6. companiesテーブルのカラム確認
SELECT 'companies.group_id カラム' as check_item,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'group_id'
  ) THEN '存在します' ELSE '存在しません' END as status;

-- 7. financial_analysesテーブルのカラム確認
SELECT 'financial_analyses.format_id カラム' as check_item,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_analyses' AND column_name = 'format_id'
  ) THEN '存在します' ELSE '存在しません' END as status;

-- 8. 総合判定
SELECT '総合判定' as check_item,
  CASE
    WHEN (SELECT COUNT(*) FROM industries) >= 14
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_formats')
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'industry_id')
      AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_analyses' AND column_name = 'format_id')
    THEN '✅ セットアップ完了'
    ELSE '⚠️ セットアップ未完了'
  END as status;
