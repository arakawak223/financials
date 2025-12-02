export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculatePlanFinancials, type PlanCalculationInput } from '@/lib/utils/plan-calculator'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { planId } = body

    if (!planId) {
      return NextResponse.json(
        { error: '計画IDが必要です' },
        { status: 400 }
      )
    }

    // 事業計画を取得
    const { data: plan, error: planError } = await supabase
      .from('business_plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (planError || !plan) {
      return NextResponse.json(
        { error: '事業計画が見つかりません' },
        { status: 404 }
      )
    }

    // 各種設定データを取得
    const [
      generalParamsResult,
      salesCategoriesResult,
      salesGrowthRatesResult,
      costSettingsResult,
      personnelSettingsResult,
      expenseItemsResult,
      expenseGrowthRatesResult,
      nonOperatingItemsResult,
      nonOperatingGrowthRatesResult,
      extraordinaryItemsResult,
      capexSettingsResult,
      depreciationSettingsResult,
      debtSettingsResult,
    ] = await Promise.all([
      supabase.from('plan_general_parameters').select('*').eq('plan_id', planId).single(),
      supabase.from('plan_sales_categories').select('*').eq('plan_id', planId).order('display_order'),
      supabase.from('plan_sales_growth_rates').select('*').eq('plan_id', planId),
      supabase.from('plan_cost_settings').select('*').eq('plan_id', planId),
      supabase.from('plan_personnel_settings').select('*').eq('plan_id', planId),
      supabase.from('plan_expense_items').select('*').eq('plan_id', planId).order('display_order'),
      supabase.from('plan_expense_growth_rates').select('*').eq('plan_id', planId),
      supabase.from('plan_non_operating_items').select('*').eq('plan_id', planId).order('display_order'),
      supabase.from('plan_non_operating_growth_rates').select('*').eq('plan_id', planId),
      supabase.from('plan_extraordinary_items').select('*').eq('plan_id', planId),
      supabase.from('plan_capex_settings').select('*').eq('plan_id', planId),
      supabase.from('plan_depreciation_settings').select('*').eq('plan_id', planId),
      supabase.from('plan_debt_settings').select('*').eq('plan_id', planId),
    ])

    // 過去データを取得（リクエストボディから、またはDBから）
    const historicalData = body.historicalData || []

    // 計算入力を構成
    const input: PlanCalculationInput = {
      planId,
      planStartYear: plan.plan_start_year,
      planYears: plan.plan_years,
      historicalData,
      generalParameters: generalParamsResult.data ? {
        id: generalParamsResult.data.id,
        planId: generalParamsResult.data.plan_id,
        corporateTaxRate: generalParamsResult.data.corporate_tax_rate || 30,
        accountsReceivableMonths: generalParamsResult.data.accounts_receivable_months,
        inventoryMonths: generalParamsResult.data.inventory_months,
        accountsPayableMonths: generalParamsResult.data.accounts_payable_months,
      } : {
        id: '',
        planId,
        corporateTaxRate: 30,
        accountsReceivableMonths: 2,
        inventoryMonths: 1.5,
        accountsPayableMonths: 1.5,
      },
      salesCategories: (salesCategoriesResult.data || []).map((c: any) => ({
        id: c.id,
        planId: c.plan_id,
        categoryName: c.category_name,
        categoryType: c.category_type,
        displayOrder: c.display_order,
        baseYearAmount: c.base_year_amount,
        baseYearUnitPrice: c.base_year_unit_price,
        baseYearQuantity: c.base_year_quantity,
        useUnitPriceQuantity: c.use_unit_price_quantity,
      })),
      salesGrowthRates: (salesGrowthRatesResult.data || []).map((r: any) => ({
        id: r.id,
        planId: r.plan_id,
        categoryId: r.category_id,
        fiscalYear: r.fiscal_year,
        growthRate: r.growth_rate,
        unitPriceGrowthRate: r.unit_price_growth_rate,
        quantityGrowthRate: r.quantity_growth_rate,
      })),
      costSettings: (costSettingsResult.data || []).map((c: any) => ({
        id: c.id,
        planId: c.plan_id,
        categoryId: c.category_id,
        fiscalYear: c.fiscal_year,
        costRate: c.cost_rate,
      })),
      personnelSettings: (personnelSettingsResult.data || []).map((p: any) => ({
        id: p.id,
        planId: p.plan_id,
        fiscalYear: p.fiscal_year,
        baseYearEmployeeCount: p.base_year_employee_count,
        baseYearAvgSalary: p.base_year_avg_salary,
        wageGrowthRate: p.wage_growth_rate,
        hiringRate: p.hiring_rate,
        turnoverRate: p.turnover_rate,
        baseYearExecutiveCompensation: p.base_year_executive_compensation,
        executiveCompensationGrowthRate: p.executive_compensation_growth_rate,
      })),
      expenseItems: (expenseItemsResult.data || []).map((e: any) => ({
        id: e.id,
        planId: e.plan_id,
        expenseName: e.expense_name,
        expenseType: e.expense_type,
        isPersonnelCost: e.is_personnel_cost,
        baseYearAmount: e.base_year_amount,
        displayOrder: e.display_order,
      })),
      expenseGrowthRates: (expenseGrowthRatesResult.data || []).map((g: any) => ({
        id: g.id,
        planId: g.plan_id,
        expenseItemId: g.expense_item_id,
        fiscalYear: g.fiscal_year,
        growthRate: g.growth_rate,
      })),
      nonOperatingItems: (nonOperatingItemsResult.data || []).map((n: any) => ({
        id: n.id,
        planId: n.plan_id,
        itemName: n.item_name,
        itemType: n.item_type,
        baseYearAmount: n.base_year_amount,
        displayOrder: n.display_order,
      })),
      nonOperatingGrowthRates: (nonOperatingGrowthRatesResult.data || []).map((g: any) => ({
        id: g.id,
        planId: g.plan_id,
        itemId: g.item_id,
        fiscalYear: g.fiscal_year,
        growthRate: g.growth_rate,
      })),
      extraordinaryItems: (extraordinaryItemsResult.data || []).map((e: any) => ({
        id: e.id,
        planId: e.plan_id,
        fiscalYear: e.fiscal_year,
        itemName: e.item_name,
        itemType: e.item_type,
        amount: e.amount,
        description: e.description,
      })),
      capexSettings: (capexSettingsResult.data || []).map((c: any) => ({
        id: c.id,
        planId: c.plan_id,
        fiscalYear: c.fiscal_year,
        growthInvestment: c.growth_investment || 0,
        maintenanceInvestment: c.maintenance_investment || 0,
      })),
      depreciationSettings: (depreciationSettingsResult.data || []).map((d: any) => ({
        id: d.id,
        planId: d.plan_id,
        assetCategory: d.asset_category,
        assetSubcategory: d.asset_subcategory,
        existingRemainingYears: d.existing_remaining_years,
        existingBookValue: d.existing_book_value,
        newAssetUsefulLife: d.new_asset_useful_life,
        depreciationMethod: d.depreciation_method,
      })),
      debtSettings: (debtSettingsResult.data || []).map((d: any) => ({
        id: d.id,
        planId: d.plan_id,
        debtType: d.debt_type,
        debtName: d.debt_name,
        existingBalance: d.existing_balance,
        existingInterestRate: d.existing_interest_rate,
        repaymentYears: d.repayment_years,
        plannedBorrowing: d.planned_borrowing || 0,
        plannedInterestRate: d.planned_interest_rate,
        plannedRepaymentYears: d.planned_repayment_years,
      })),
    }

    // 計算実行
    const results = calculatePlanFinancials(input)

    // 結果をDBに保存
    // 既存の結果を削除
    await Promise.all([
      supabase.from('plan_results_pl').delete().eq('plan_id', planId),
      supabase.from('plan_results_bs').delete().eq('plan_id', planId),
      supabase.from('plan_results_cf').delete().eq('plan_id', planId),
    ])

    // 新しい結果を挿入
    const [plInsertResult, bsInsertResult, cfInsertResult] = await Promise.all([
      supabase.from('plan_results_pl').insert(
        results.plResults.map((pl) => ({
          plan_id: planId,
          fiscal_year: pl.fiscalYear,
          net_sales: pl.netSales,
          cost_of_sales: pl.costOfSales,
          gross_profit: pl.grossProfit,
          personnel_cost: pl.personnelCost,
          other_sga_expenses: pl.otherSgaExpenses,
          depreciation_expense: pl.depreciationExpense,
          selling_general_admin_expenses: pl.sellingGeneralAdminExpenses,
          operating_income: pl.operatingIncome,
          non_operating_income: pl.nonOperatingIncome,
          non_operating_expenses: pl.nonOperatingExpenses,
          interest_expense: pl.interestExpense,
          ordinary_income: pl.ordinaryIncome,
          extraordinary_income: pl.extraordinaryIncome,
          extraordinary_losses: pl.extraordinaryLosses,
          income_before_tax: pl.incomeBeforeTax,
          income_taxes: pl.incomeTaxes,
          net_income: pl.netIncome,
        }))
      ),
      supabase.from('plan_results_bs').insert(
        results.bsResults.map((bs) => ({
          plan_id: planId,
          fiscal_year: bs.fiscalYear,
          cash_and_deposits: bs.cashAndDeposits,
          accounts_receivable: bs.accountsReceivable,
          inventory: bs.inventory,
          other_current_assets: bs.otherCurrentAssets,
          current_assets_total: bs.currentAssetsTotal,
          tangible_fixed_assets: bs.tangibleFixedAssets,
          intangible_fixed_assets: bs.intangibleFixedAssets,
          investments_and_other_assets: bs.investmentsAndOtherAssets,
          fixed_assets_total: bs.fixedAssetsTotal,
          total_assets: bs.totalAssets,
          accounts_payable: bs.accountsPayable,
          short_term_borrowings: bs.shortTermBorrowings,
          other_current_liabilities: bs.otherCurrentLiabilities,
          current_liabilities_total: bs.currentLiabilitiesTotal,
          long_term_borrowings: bs.longTermBorrowings,
          bonds_payable: bs.bondsPayable,
          lease_obligations: bs.leaseObligations,
          other_fixed_liabilities: bs.otherFixedLiabilities,
          fixed_liabilities_total: bs.fixedLiabilitiesTotal,
          total_liabilities: bs.totalLiabilities,
          capital_stock: bs.capitalStock,
          retained_earnings: bs.retainedEarnings,
          total_net_assets: bs.totalNetAssets,
        }))
      ),
      supabase.from('plan_results_cf').insert(
        results.cfResults.map((cf) => ({
          plan_id: planId,
          fiscal_year: cf.fiscalYear,
          net_income_cf: cf.netIncomeCf,
          depreciation_cf: cf.depreciationCf,
          change_in_receivables: cf.changeInReceivables,
          change_in_inventory: cf.changeInInventory,
          change_in_payables: cf.changeInPayables,
          other_operating_cf: cf.otherOperatingCf,
          operating_cash_flow: cf.operatingCashFlow,
          capex: cf.capex,
          other_investing_cf: cf.otherInvestingCf,
          investing_cash_flow: cf.investingCashFlow,
          debt_repayment: cf.debtRepayment,
          new_borrowings: cf.newBorrowings,
          dividends_paid: cf.dividendsPaid,
          other_financing_cf: cf.otherFinancingCf,
          financing_cash_flow: cf.financingCashFlow,
          net_change_in_cash: cf.netChangeInCash,
          beginning_cash: cf.beginningCash,
          ending_cash: cf.endingCash,
          free_cash_flow: cf.freeCashFlow,
        }))
      ),
    ])

    if (plInsertResult.error || bsInsertResult.error || cfInsertResult.error) {
      console.error('Insert errors:', { plInsertResult, bsInsertResult, cfInsertResult })
    }

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error('Calculate error:', error)
    return NextResponse.json(
      { error: '計算に失敗しました' },
      { status: 500 }
    )
  }
}
