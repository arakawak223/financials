-- Supabase Storage のポリシーを確認するSQL
-- Supabase Dashboard → SQL Editor で実行してください

-- 現在のストレージポリシーを確認
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
ORDER BY policyname;

-- 必要なポリシー一覧：
-- 1. Allow authenticated upload (INSERT, authenticated)
-- 2. Allow public read (SELECT, public)
-- 3. Allow authenticated delete (DELETE, authenticated)
-- 4. Allow anonymous upload for development (INSERT, anon) ← 開発用のみ

-- 不足しているポリシーを追加する場合、以下を実行：

-- アップロード許可（認証済みユーザー用）
-- 既に存在する場合はスキップ
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname = 'Allow authenticated upload'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow authenticated upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = ''financial-documents'')';
  END IF;
END $$;

-- 読み取り許可（パブリック）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname = 'Allow public read'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow public read" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = ''financial-documents'')';
  END IF;
END $$;

-- 削除許可
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname = 'Allow authenticated delete'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow authenticated delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = ''financial-documents'')';
  END IF;
END $$;

-- 開発用：認証なしでもアップロード可能
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname = 'Allow anonymous upload for development'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow anonymous upload for development" ON storage.objects
    FOR INSERT TO anon
    WITH CHECK (bucket_id = ''financial-documents'')';
  END IF;
END $$;
