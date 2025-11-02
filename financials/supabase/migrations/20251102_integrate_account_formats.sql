-- 科目フォーマットと財務分析の統合
-- account_detailsとaccount_format_itemsの紐付け、財務分析へのフォーマット割り当て

-- 1. account_detailsテーブルにformat_item_idを追加
ALTER TABLE account_details
ADD COLUMN format_item_id UUID REFERENCES account_format_items(id) ON DELETE SET NULL;

-- インデックスを追加
CREATE INDEX idx_account_details_format_item_id ON account_details(format_item_id);

-- 2. financial_analysesテーブルにformat_idを追加
ALTER TABLE financial_analyses
ADD COLUMN format_id UUID REFERENCES account_formats(id) ON DELETE SET NULL;

-- インデックスを追加
CREATE INDEX idx_financial_analyses_format_id ON financial_analyses(format_id);

-- コメント追加
COMMENT ON COLUMN account_details.format_item_id IS '科目フォーマット項目へのリンク（任意）。フォーマットベースの入力時に使用。';
COMMENT ON COLUMN financial_analyses.format_id IS 'この分析で使用する科目フォーマット（任意）。設定すると詳細な科目内訳が利用可能。';
