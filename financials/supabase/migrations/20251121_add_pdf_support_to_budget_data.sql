-- 予算データテーブルにPDFアップロード対応のカラムを追加

-- source_file_idカラムを追加（アップロードされたPDFファイルとの紐付け）
ALTER TABLE budget_data
ADD COLUMN source_file_id UUID REFERENCES uploaded_files(id) ON DELETE SET NULL;

-- data_typeカラムをuploaded_filesテーブルに追加（予算/実績の区分）
ALTER TABLE uploaded_files
ADD COLUMN data_type VARCHAR(20);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_budget_data_source_file_id ON budget_data(source_file_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_data_type ON uploaded_files(data_type);

-- コメントの追加
COMMENT ON COLUMN budget_data.source_file_id IS 'アップロードされた予算書PDFファイルのID';
COMMENT ON COLUMN uploaded_files.data_type IS 'データ種別（actual: 実績, budget: 予算）';
