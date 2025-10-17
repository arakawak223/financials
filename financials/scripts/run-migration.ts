#!/usr/bin/env ts-node
// Script to run migration directly

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

async function runMigration() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Execute the ALTER TABLE statements
    const { error } = await supabase.rpc('exec', {
      sql: `
        ALTER TABLE financial_metrics
        ADD COLUMN IF NOT EXISTS operating_income_growth_rate DECIMAL(10,4),
        ADD COLUMN IF NOT EXISTS ebitda_growth_rate DECIMAL(10,4);

        COMMENT ON COLUMN financial_metrics.operating_income_growth_rate IS '営業利益成長率（前期比）';
        COMMENT ON COLUMN financial_metrics.ebitda_growth_rate IS 'EBITDA成長率（前期比）';
      `
    })

    if (error) {
      console.error('Migration error:', error)
      process.exit(1)
    }

    console.log('✓ Migration completed successfully')
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

runMigration()
