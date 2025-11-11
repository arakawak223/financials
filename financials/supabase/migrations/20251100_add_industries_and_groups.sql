-- Add Industries and Company Groups tables
-- Created: 2025-11-02
-- Purpose: Add industries master table and company groups for grouping companies

-- ============================================
-- 1. Industries Master Table（業種マスタ）
-- ============================================
CREATE TABLE IF NOT EXISTS industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(20),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON industries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow anonymous access for development
CREATE POLICY "Allow all for anon users" ON industries FOR ALL TO anon USING (true) WITH CHECK (true);

-- Auto-update Trigger
CREATE TRIGGER update_industries_updated_at BEFORE UPDATE ON industries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert industry master data
INSERT INTO industries (name, code, description) VALUES
  ('製造業', 'manufacturing', '製造業全般'),
  ('小売業', 'retail', '小売業全般'),
  ('サービス業', 'service', 'サービス業全般'),
  ('建設業', 'construction', '建設業全般'),
  ('卸売業', 'wholesale', '卸売業全般'),
  ('運輸業', 'transportation', '運輸業全般'),
  ('不動産業', 'real_estate', '不動産業全般'),
  ('金融業', 'finance', '金融業全般'),
  ('情報通信業', 'information', '情報通信業全般'),
  ('医療・福祉', 'healthcare', '医療・福祉'),
  ('教育', 'education', '教育関連'),
  ('飲食業', 'food_service', '飲食サービス業'),
  ('宿泊業', 'accommodation', '宿泊業'),
  ('コンサルティング業', 'consulting', 'コンサルティング業'),
  ('その他', 'other', 'その他の業種')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2. Company Groups（企業グループ）
-- ============================================
CREATE TABLE IF NOT EXISTS company_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  industry_id UUID REFERENCES industries(id) ON DELETE SET NULL,
  password_hash VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE company_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON company_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow anonymous access for development
CREATE POLICY "Allow all for anon users" ON company_groups FOR ALL TO anon USING (true) WITH CHECK (true);

-- Create index
CREATE INDEX IF NOT EXISTS idx_company_groups_industry_id ON company_groups(industry_id);

-- Auto-update Trigger
CREATE TRIGGER update_company_groups_updated_at BEFORE UPDATE ON company_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
