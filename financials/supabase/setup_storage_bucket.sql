-- Supabase Storage バケット設定スクリプト
-- プロダクション環境デプロイ時に実行

-- 注意: バケット作成はSupabase Dashboard (Storage > New bucket) から手動で行ってください
-- バケット名: financial-pdfs
-- 公開設定: Private (非公開)

-- RLSポリシー設定
-- アップロードポリシー
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'financial-pdfs');

-- 読み取りポリシー
CREATE POLICY "Authenticated users can read files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'financial-pdfs');

-- 更新ポリシー
CREATE POLICY "Authenticated users can update their files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'financial-pdfs')
WITH CHECK (bucket_id = 'financial-pdfs');

-- 削除ポリシー
CREATE POLICY "Authenticated users can delete their files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'financial-pdfs');
