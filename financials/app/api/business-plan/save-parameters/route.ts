export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { planId, parameterType, data } = body

    if (!planId || !parameterType || !data) {
      return NextResponse.json(
        { error: '必須パラメータが不足しています' },
        { status: 400 }
      )
    }

    let result

    switch (parameterType) {
      case 'general':
        // 基本パラメータの更新
        result = await supabase
          .from('plan_general_parameters')
          .upsert({
            plan_id: planId,
            corporate_tax_rate: data.corporateTaxRate,
            accounts_receivable_months: data.accountsReceivableMonths,
            inventory_months: data.inventoryMonths,
            accounts_payable_months: data.accountsPayableMonths,
          }, { onConflict: 'plan_id' })
        break

      case 'salesCategories':
        // 既存データを削除して再挿入
        await supabase.from('plan_sales_categories').delete().eq('plan_id', planId)
        if (data.length > 0) {
          result = await supabase.from('plan_sales_categories').insert(
            data.map((c: any, index: number) => ({
              plan_id: planId,
              category_name: c.categoryName,
              category_type: c.categoryType || 'product',
              display_order: index,
              base_year_amount: c.baseYearAmount,
              base_year_unit_price: c.baseYearUnitPrice,
              base_year_quantity: c.baseYearQuantity,
              use_unit_price_quantity: c.useUnitPriceQuantity || false,
            }))
          )
        }
        break

      case 'salesGrowthRates':
        await supabase.from('plan_sales_growth_rates').delete().eq('plan_id', planId)
        if (data.length > 0) {
          result = await supabase.from('plan_sales_growth_rates').insert(
            data.map((r: any) => ({
              plan_id: planId,
              category_id: r.categoryId || null,
              fiscal_year: r.fiscalYear,
              growth_rate: r.growthRate,
              unit_price_growth_rate: r.unitPriceGrowthRate,
              quantity_growth_rate: r.quantityGrowthRate,
            }))
          )
        }
        break

      case 'costSettings':
        await supabase.from('plan_cost_settings').delete().eq('plan_id', planId)
        if (data.length > 0) {
          result = await supabase.from('plan_cost_settings').insert(
            data.map((c: any) => ({
              plan_id: planId,
              category_id: c.categoryId || null,
              fiscal_year: c.fiscalYear,
              cost_rate: c.costRate,
            }))
          )
        }
        break

      case 'personnelSettings':
        await supabase.from('plan_personnel_settings').delete().eq('plan_id', planId)
        if (data.length > 0) {
          result = await supabase.from('plan_personnel_settings').insert(
            data.map((p: any) => ({
              plan_id: planId,
              fiscal_year: p.fiscalYear,
              base_year_employee_count: p.baseYearEmployeeCount,
              base_year_avg_salary: p.baseYearAvgSalary,
              wage_growth_rate: p.wageGrowthRate,
              hiring_rate: p.hiringRate,
              turnover_rate: p.turnoverRate,
              base_year_executive_compensation: p.baseYearExecutiveCompensation,
              executive_compensation_growth_rate: p.executiveCompensationGrowthRate,
            }))
          )
        }
        break

      case 'expenseItems':
        await supabase.from('plan_expense_items').delete().eq('plan_id', planId)
        if (data.length > 0) {
          result = await supabase.from('plan_expense_items').insert(
            data.map((e: any, index: number) => ({
              plan_id: planId,
              expense_name: e.expenseName,
              expense_type: e.expenseType || 'fixed',
              is_personnel_cost: e.isPersonnelCost || false,
              base_year_amount: e.baseYearAmount,
              display_order: index,
            }))
          )
        }
        break

      case 'expenseGrowthRates':
        await supabase.from('plan_expense_growth_rates').delete().eq('plan_id', planId)
        if (data.length > 0) {
          result = await supabase.from('plan_expense_growth_rates').insert(
            data.map((g: any) => ({
              plan_id: planId,
              expense_item_id: g.expenseItemId,
              fiscal_year: g.fiscalYear,
              growth_rate: g.growthRate,
            }))
          )
        }
        break

      case 'nonOperatingItems':
        await supabase.from('plan_non_operating_items').delete().eq('plan_id', planId)
        if (data.length > 0) {
          result = await supabase.from('plan_non_operating_items').insert(
            data.map((n: any, index: number) => ({
              plan_id: planId,
              item_name: n.itemName,
              item_type: n.itemType,
              base_year_amount: n.baseYearAmount,
              display_order: index,
            }))
          )
        }
        break

      case 'nonOperatingGrowthRates':
        await supabase.from('plan_non_operating_growth_rates').delete().eq('plan_id', planId)
        if (data.length > 0) {
          result = await supabase.from('plan_non_operating_growth_rates').insert(
            data.map((g: any) => ({
              plan_id: planId,
              item_id: g.itemId,
              fiscal_year: g.fiscalYear,
              growth_rate: g.growthRate,
            }))
          )
        }
        break

      case 'extraordinaryItems':
        await supabase.from('plan_extraordinary_items').delete().eq('plan_id', planId)
        if (data.length > 0) {
          result = await supabase.from('plan_extraordinary_items').insert(
            data.map((e: any) => ({
              plan_id: planId,
              fiscal_year: e.fiscalYear,
              item_name: e.itemName,
              item_type: e.itemType,
              amount: e.amount,
              description: e.description,
            }))
          )
        }
        break

      case 'capexSettings':
        await supabase.from('plan_capex_settings').delete().eq('plan_id', planId)
        if (data.length > 0) {
          result = await supabase.from('plan_capex_settings').insert(
            data.map((c: any) => ({
              plan_id: planId,
              fiscal_year: c.fiscalYear,
              growth_investment: c.growthInvestment || 0,
              maintenance_investment: c.maintenanceInvestment || 0,
            }))
          )
        }
        break

      case 'depreciationSettings':
        await supabase.from('plan_depreciation_settings').delete().eq('plan_id', planId)
        if (data.length > 0) {
          result = await supabase.from('plan_depreciation_settings').insert(
            data.map((d: any) => ({
              plan_id: planId,
              asset_category: d.assetCategory,
              asset_subcategory: d.assetSubcategory,
              existing_remaining_years: d.existingRemainingYears,
              existing_book_value: d.existingBookValue,
              new_asset_useful_life: d.newAssetUsefulLife,
              depreciation_method: d.depreciationMethod || 'straight_line',
            }))
          )
        }
        break

      case 'debtSettings':
        await supabase.from('plan_debt_settings').delete().eq('plan_id', planId)
        if (data.length > 0) {
          result = await supabase.from('plan_debt_settings').insert(
            data.map((d: any) => ({
              plan_id: planId,
              debt_type: d.debtType,
              debt_name: d.debtName,
              existing_balance: d.existingBalance,
              existing_interest_rate: d.existingInterestRate,
              repayment_years: d.repaymentYears,
              planned_borrowing: d.plannedBorrowing || 0,
              planned_interest_rate: d.plannedInterestRate,
              planned_repayment_years: d.plannedRepaymentYears,
            }))
          )
        }
        break

      default:
        return NextResponse.json(
          { error: '無効なパラメータタイプです' },
          { status: 400 }
        )
    }

    if (result?.error) {
      console.error('Save parameter error:', result.error)
      return NextResponse.json(
        { error: 'パラメータの保存に失敗しました', details: result.error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Save parameters error:', error)
    return NextResponse.json(
      { error: 'パラメータの保存に失敗しました' },
      { status: 500 }
    )
  }
}
