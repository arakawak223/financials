-- financial_analysesテーブルにanalysis_purposeカラムを追加
-- 用途: 完全な分析 vs 企業間比較専用の軽量レコード を区別

ALTER TABLE financial_analyses
ADD COLUMN analysis_purpose VARCHAR(50) DEFAULT 'full_analysis';

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_financial_analyses_purpose ON financial_analyses(analysis_purpose);

-- コメントの追加
COMMENT ON COLUMN financial_analyses.analysis_purpose IS '分析の目的（full_analysis: 完全分析, comparison_only: 企業間比較専用）';
