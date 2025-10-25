-- ============================================
-- Supabase Storage セットアップスクリプト
-- ============================================
--
-- このスクリプトは本番環境のSupabase SQL Editorで実行してください
-- 実行前に: Storage > Create bucket で 'financial-documents' バケットを作成
--

-- ============================================
-- 1. Storage Policies の作成
-- ============================================

-- 既存のポリシーを削除（再実行時用）
DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;

-- ポリシー1: 認証ユーザーのアップロードを許可
CREATE POLICY "Allow authenticated upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'financial-documents');

-- ポリシー2: 認証ユーザーの読み取りを許可
CREATE POLICY "Allow authenticated read"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'financial-documents');

-- ポリシー3: 認証ユーザーの削除を許可
CREATE POLICY "Allow authenticated delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'financial-documents');

-- ============================================
-- 2. データベーステーブルの更新
-- ============================================

-- uploaded_files テーブルに新しいカラムを追加
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS ocr_status VARCHAR(20) DEFAULT 'pending';

-- カラムにコメントを追加（ドキュメント用）
COMMENT ON COLUMN uploaded_files.file_url IS 'Supabase Storageの公開URL';
COMMENT ON COLUMN uploaded_files.mime_type IS 'ファイルのMIMEタイプ (例: application/pdf)';
COMMENT ON COLUMN uploaded_files.file_size IS 'ファイルサイズ（バイト）';
COMMENT ON COLUMN uploaded_files.ocr_status IS 'OCR処理ステータス: pending, processing, completed, failed';

-- ============================================
-- 3. 既存データの移行
-- ============================================

-- file_size_bytes から file_size にデータを移行
UPDATE uploaded_files
SET file_size = file_size_bytes
WHERE file_size IS NULL AND file_size_bytes IS NOT NULL;

-- ocr_applied から ocr_status にデータを移行
UPDATE uploaded_files
SET ocr_status = CASE
  WHEN ocr_applied = TRUE THEN 'completed'
  WHEN ocr_applied = FALSE THEN 'pending'
  ELSE 'pending'
END
WHERE ocr_status = 'pending' AND ocr_applied IS NOT NULL;

-- ============================================
-- 4. 設定確認クエリ
-- ============================================

-- Storage Policiesの確認
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%financial-documents%'
ORDER BY policyname;

-- uploaded_files テーブルのカラム確認
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'uploaded_files'
  AND column_name IN ('file_url', 'mime_type', 'file_size', 'ocr_status')
ORDER BY ordinal_position;

-- ============================================
-- セットアップ完了メッセージ
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Supabase Storage セットアップが完了しました！';
  RAISE NOTICE '';
  RAISE NOTICE '次のステップ:';
  RAISE NOTICE '1. Storage > financial-documents でバケットが作成されていることを確認';
  RAISE NOTICE '2. Policies タブで3つのポリシーが有効になっていることを確認';
  RAISE NOTICE '3. Vercelの環境変数を設定';
  RAISE NOTICE '4. git push origin main でデプロイ';
  RAISE NOTICE '';
  RAISE NOTICE '設定確認クエリの結果を確認してください ↑';
END $$;
