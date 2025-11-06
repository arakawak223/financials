-- Add industry_id column to companies table
-- This column was accidentally removed in 20251012_drop_and_recreate.sql

-- Add industry_id column to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS industry_id UUID REFERENCES industries(id) ON DELETE SET NULL;

-- Add group_id column to companies table (also missing)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES company_groups(id) ON DELETE SET NULL;

-- Add password_hash column to companies table (also missing)
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_companies_industry_id ON companies(industry_id);
CREATE INDEX IF NOT EXISTS idx_companies_group_id ON companies(group_id);
