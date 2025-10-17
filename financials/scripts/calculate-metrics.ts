#!/usr/bin/env ts-node
// Script to calculate and save financial metrics for all periods

import {
  calculateAllMetrics,
  calculateOperatingIncomeGrowthRate,
  calculateEbitdaGrowthRate
} from '../lib/utils/financial-calculations'

// Mock data structure for period
interface PeriodData {
  id: string
  analysis_id: string
  fiscal_year: number
  balance_sheet_items: any
  profit_loss_items: any
  manual_inputs: any[]
}

async function calculateMetricsForAllPeriods() {
  const API_URL = 'http://127.0.0.1:54321/rest/v1'
  const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

  try {
    // Fetch all periods with their financial data
    const response = await fetch(
      `${API_URL}/financial_periods?select=id,analysis_id,fiscal_year,balance_sheet_items(*),profit_loss_items(*),manual_inputs(*)`,
      {
        headers: {
          apikey: API_KEY,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch periods: ${response.statusText}`)
    }

    const periods: PeriodData[] = await response.json()
    console.log(`Found ${periods.length} periods to process`)

    // Group periods by analysis_id to handle previous period logic
    const periodsByAnalysis: Record<string, PeriodData[]> = {}
    for (const period of periods) {
      if (!periodsByAnalysis[period.analysis_id]) {
        periodsByAnalysis[period.analysis_id] = []
      }
      periodsByAnalysis[period.analysis_id].push(period)
    }

    // Sort periods by fiscal year within each analysis
    for (const analysisId in periodsByAnalysis) {
      periodsByAnalysis[analysisId].sort((a, b) => a.fiscal_year - b.fiscal_year)
    }

    let processed = 0
    let errors = 0

    // Process each period
    for (const analysisId in periodsByAnalysis) {
      const analysisPeriods = periodsByAnalysis[analysisId]

      for (let i = 0; i < analysisPeriods.length; i++) {
        const period = analysisPeriods[i]
        const previousPeriod = i > 0 ? analysisPeriods[i - 1] : null

        try {
          // Transform data for calculation
          const currentData = {
            fiscalYear: period.fiscal_year,
            balanceSheet: period.balance_sheet_items || {},
            profitLoss: period.profit_loss_items || {},
            manualInputs: {
              depreciation: Array.isArray(period.manual_inputs)
                ? period.manual_inputs.find((m: any) => m.input_type === 'depreciation')?.amount
                : undefined,
              capex: Array.isArray(period.manual_inputs)
                ? period.manual_inputs.find((m: any) => m.input_type === 'capex')?.amount
                : undefined,
            },
            accountDetails: [],
          }

          const previousData = previousPeriod
            ? {
                fiscalYear: previousPeriod.fiscal_year,
                balanceSheet: previousPeriod.balance_sheet_items || {},
                profitLoss: previousPeriod.profit_loss_items || {},
                manualInputs: {
                  depreciation: Array.isArray(previousPeriod.manual_inputs)
                    ? previousPeriod.manual_inputs.find((m: any) => m.input_type === 'depreciation')?.amount
                    : undefined,
                  capex: Array.isArray(previousPeriod.manual_inputs)
                    ? previousPeriod.manual_inputs.find((m: any) => m.input_type === 'capex')?.amount
                    : undefined,
                },
                accountDetails: [],
              }
            : null

          // Calculate metrics
          const metrics = calculateAllMetrics(currentData as any, previousData as any)

          // Calculate growth rates
          const operatingIncomeGrowthRate = previousData
            ? calculateOperatingIncomeGrowthRate(currentData as any, previousData as any)
            : null
          const ebitdaGrowthRate = previousData
            ? calculateEbitdaGrowthRate(currentData as any, previousData as any)
            : null

          // Save metrics to database
          const saveResponse = await fetch(`${API_URL}/financial_metrics`, {
            method: 'POST',
            headers: {
              apikey: API_KEY,
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates',
            },
            body: JSON.stringify({
              analysis_id: period.analysis_id,
              period_id: period.id,
              net_cash: metrics.netCash ?? null,
              current_ratio: metrics.currentRatio ?? null,
              gross_profit_margin: metrics.grossProfitMargin ?? null,
              operating_profit_margin: metrics.operatingProfitMargin ?? null,
              ebitda_margin: metrics.ebitdaMargin ?? null,
              roe: metrics.roe ?? null,
              roa: metrics.roa ?? null,
              accounts_receivable_turnover_months: metrics.receivablesTurnoverMonths ?? null,
              inventory_turnover_months: metrics.inventoryTurnoverMonths ?? null,
              ebitda: metrics.ebitda ?? null,
              fcf: metrics.fcf ?? null,
              ebitda_to_interest_bearing_debt: metrics.ebitdaToInterestBearingDebt ?? null,
              sales_growth_rate: metrics.salesGrowthRate ?? null,
              operating_income_growth_rate: operatingIncomeGrowthRate ?? null,
              ebitda_growth_rate: ebitdaGrowthRate ?? null,
            }),
          })

          if (!saveResponse.ok) {
            const errorText = await saveResponse.text()
            throw new Error(`Failed to save metrics: ${saveResponse.statusText} - ${errorText}`)
          }

          processed++
          console.log(`✓ Processed period ${period.fiscal_year} for analysis ${analysisId}`)
        } catch (error) {
          errors++
          console.error(
            `✗ Error processing period ${period.fiscal_year} for analysis ${analysisId}:`,
            error
          )
        }
      }
    }

    console.log(`\nCompleted: ${processed} periods processed, ${errors} errors`)
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

// Run the script
calculateMetricsForAllPeriods()
