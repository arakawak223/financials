export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { regenerateComment } from '@/lib/utils/ai-comment-generator'
import type { FinancialAnalysis, CommentType } from '@/lib/types/financial'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const supabase = await createClient()
    const params = await context.params
    const analysisId = params.id
    const commentId = params.commentId

    // コメント情報を取得
    const { data: comment, error: commentError } = await supabase
      .from('analysis_comments')
      .select('comment_type')
      .eq('id', commentId)
      .eq('analysis_id', analysisId)
      .single()

    if (commentError || !comment) {
      return NextResponse.json(
        { error: 'コメントが見つかりません' },
        { status: 404 }
      )
    }

    // 分析データを取得
    const { data: analysisData, error: analysisError } = await supabase
      .from('financial_analyses')
      .select('*, companies(name)')
      .eq('id', analysisId)
      .single()

    if (analysisError || !analysisData) {
      return NextResponse.json(
        { error: '分析データが見つかりません' },
        { status: 404 }
      )
    }

    // 期間データを取得
    const { data: periodsData, error: periodsError } = await supabase
      .from('financial_periods')
      .select(`
        *,
        balance_sheet_items(*),
        profit_loss_items(*),
        manual_inputs(*),
        account_details(*)
      `)
      .eq('analysis_id', analysisId)
      .order('fiscal_year', { ascending: true })

    if (periodsError || !periodsData) {
      return NextResponse.json(
        { error: '期間データの取得に失敗しました' },
        { status: 500 }
      )
    }

    // データを変換（execute/route.tsと同様の処理）
    const periods = periodsData.map((p: any) => {
      const balanceSheetRaw = Array.isArray(p.balance_sheet_items)
        ? (p.balance_sheet_items.length > 0 ? p.balance_sheet_items[0] : {})
        : (p.balance_sheet_items || {})

      const profitLossRaw = Array.isArray(p.profit_loss_items)
        ? (p.profit_loss_items.length > 0 ? p.profit_loss_items[0] : {})
        : (p.profit_loss_items || {})

      return {
        fiscalYear: p.fiscal_year,
        balanceSheet: convertKeysToCamelCase(balanceSheetRaw),
        profitLoss: convertKeysToCamelCase(profitLossRaw),
        manualInputs: {
          depreciation: p.manual_inputs?.find((m: any) => m.input_type === 'depreciation')?.amount || 0,
          capex: p.manual_inputs?.find((m: any) => m.input_type === 'capex')?.amount || 0,
          fixedAssetDisposalValue: p.manual_inputs?.find((m: any) => m.input_type === 'fixed_asset_disposal_value')?.amount,
        },
        accountDetails: [],
        metrics: undefined,
      }
    })

    // 財務指標を取得
    for (let i = 0; i < periods.length; i++) {
      const periodRecord = periodsData[i]
      const { data: metricsData } = await supabase
        .from('financial_metrics')
        .select('*')
        .eq('period_id', periodRecord.id)
        .single()

      if (metricsData) {
        periods[i].metrics = convertKeysToCamelCase(metricsData)
      }
    }

    // 業種情報を取得
    const companyData = analysisData.companies as { name: string; industry_id?: string } | null
    let industryName: string | undefined
    if (companyData?.industry_id) {
      const { data: industryData } = await supabase
        .from('industries')
        .select('name')
        .eq('id', companyData.industry_id)
        .single()
      industryName = industryData?.name
    }

    const analysis: FinancialAnalysis = {
      id: analysisData.id,
      companyId: analysisData.company_id,
      companyName: companyData?.name || '不明',
      industryName,
      analysisDate: new Date(analysisData.analysis_date),
      fiscalYearStart: analysisData.fiscal_year_start,
      fiscalYearEnd: analysisData.fiscal_year_end,
      periodsCount: analysisData.periods_count,
      status: analysisData.status,
      periods,
      comments: [],
      createdAt: new Date(analysisData.created_at),
      updatedAt: new Date(analysisData.updated_at),
    }

    // コメントを再生成
    console.log(`🔄 コメント再生成開始: ${comment.comment_type}`)
    const newCommentText = await regenerateComment(analysis, comment.comment_type as CommentType)
    console.log(`✅ コメント再生成完了`)

    // DBを更新
    const { error: updateError } = await supabase
      .from('analysis_comments')
      .update({
        ai_generated_text: newCommentText,
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)

    if (updateError) {
      console.error('コメント更新エラー:', updateError)
      return NextResponse.json(
        { error: 'コメントの更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      commentText: newCommentText,
    })
  } catch (error) {
    console.error('Regenerate comment error:', error)
    return NextResponse.json(
      { error: 'コメントの再生成に失敗しました' },
      { status: 500 }
    )
  }
}

// ヘルパー関数
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

function convertKeysToCamelCase<T = any>(obj: Record<string, any> | null | undefined): T {
  if (!obj || typeof obj !== 'object') return {} as T

  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key)
    result[camelKey] = value
  }
  return result as T
}
