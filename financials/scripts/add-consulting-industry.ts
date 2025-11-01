// コンサルティング業をデータベースに追加するスクリプト
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addConsultingIndustry() {
  console.log('📝 コンサルティング業を追加中...')

  // コンサルティング業を追加
  const { data, error } = await supabase
    .from('industries')
    .insert({
      name: 'コンサルティング業',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()

  if (error) {
    // 既に存在する場合のエラーは無視
    if (error.code === '23505') {
      console.log('ℹ️  コンサルティング業は既に存在します')
    } else {
      console.error('❌ エラー:', error)
      process.exit(1)
    }
  } else {
    console.log('✅ コンサルティング業を追加しました:', data)
  }

  // 全業種を表示
  const { data: industries, error: fetchError } = await supabase
    .from('industries')
    .select('*')
    .order('name')

  if (fetchError) {
    console.error('❌ 業種取得エラー:', fetchError)
  } else {
    console.log('\n📋 登録されている業種:')
    industries?.forEach((industry) => {
      console.log(`  - ${industry.name}`)
    })
  }
}

addConsultingIndustry()
  .then(() => {
    console.log('\n✅ 完了')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ エラー:', error)
    process.exit(1)
  })
