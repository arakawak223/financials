-- Add columns for Supabase Storage support
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);

-- Add file_size column if using newer naming convention
-- Keep file_size_bytes for backwards compatibility
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- Add ocr_status column for better status tracking
-- Keep ocr_applied for backwards compatibility
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS ocr_status VARCHAR(20) DEFAULT 'pending';

-- Migrate existing data
UPDATE uploaded_files
SET file_size = file_size_bytes
WHERE file_size IS NULL AND file_size_bytes IS NOT NULL;

UPDATE uploaded_files
SET ocr_status = CASE
  WHEN ocr_applied = TRUE THEN 'completed'
  WHEN ocr_applied = FALSE THEN 'pending'
  ELSE 'pending'
END
WHERE ocr_status = 'pending' AND ocr_applied IS NOT NULL;

-- Create storage bucket policy (run this in Supabase SQL Editor if not exists)
-- This is informational - bucket creation needs to be done via Supabase Dashboard or API
--
-- Storage bucket name: financial-documents
--
-- Policies needed:
-- 1. Allow authenticated users to upload files:
--    CREATE POLICY "Allow authenticated upload" ON storage.objects
--    FOR INSERT TO authenticated
--    WITH CHECK (bucket_id = 'financial-documents');
--
-- 2. Allow authenticated users to read files:
--    CREATE POLICY "Allow authenticated read" ON storage.objects
--    FOR SELECT TO authenticated
--    USING (bucket_id = 'financial-documents');
--
-- 3. Allow authenticated users to delete their files:
--    CREATE POLICY "Allow authenticated delete" ON storage.objects
--    FOR DELETE TO authenticated
--    USING (bucket_id = 'financial-documents');
