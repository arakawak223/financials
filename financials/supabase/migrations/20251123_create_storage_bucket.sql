-- Create Storage bucket for financial PDFs
-- This migration creates the financial-pdfs bucket and sets up RLS policies

-- Insert bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'financial-pdfs',
  'financial-pdfs',
  false, -- private bucket
  52428800, -- 50MB file size limit
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their files" ON storage.objects;

-- Create RLS policies for the financial-pdfs bucket
-- Upload policy
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'financial-pdfs');

-- Read policy
CREATE POLICY "Authenticated users can read files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'financial-pdfs');

-- Update policy
CREATE POLICY "Authenticated users can update their files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'financial-pdfs')
WITH CHECK (bucket_id = 'financial-pdfs');

-- Delete policy
CREATE POLICY "Authenticated users can delete their files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'financial-pdfs');

-- Allow public access for anon users as well (for development)
CREATE POLICY "Allow anon upload"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'financial-pdfs');

CREATE POLICY "Allow anon read"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'financial-pdfs');

CREATE POLICY "Allow anon update"
ON storage.objects FOR UPDATE
TO anon
USING (bucket_id = 'financial-pdfs')
WITH CHECK (bucket_id = 'financial-pdfs');

CREATE POLICY "Allow anon delete"
ON storage.objects FOR DELETE
TO anon
USING (bucket_id = 'financial-pdfs');
