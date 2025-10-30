-- 最新の分析IDを確認
SELECT id, company_id, analysis_date, fiscal_year_start, fiscal_year_end
FROM financial_analyses
ORDER BY created_at DESC
LIMIT 1;

-- 最新分析の貸借対照表データをチェック（NULLの項目を確認）
SELECT
  fp.fiscal_year,
  bsi.cash_and_deposits,
  bsi.accounts_receivable,
  bsi.inventory,
  bsi.current_assets_total,
  bsi.tangible_fixed_assets,
  bsi.intangible_fixed_assets,
  bsi.investments_and_other_assets,
  bsi.fixed_assets_total,
  bsi.total_assets,
  bsi.accounts_payable,
  bsi.short_term_borrowings,
  bsi.current_liabilities_total,
  bsi.long_term_borrowings,
  bsi.fixed_liabilities_total,
  bsi.total_liabilities,
  bsi.capital_stock,
  bsi.retained_earnings,
  bsi.total_net_assets
FROM financial_periods fp
LEFT JOIN balance_sheet_items bsi ON fp.id = bsi.period_id
WHERE fp.analysis_id = (
  SELECT id FROM financial_analyses ORDER BY created_at DESC LIMIT 1
)
ORDER BY fp.fiscal_year;

-- 最新分析の損益計算書データをチェック（NULLの項目を確認）
SELECT
  fp.fiscal_year,
  pli.net_sales,
  pli.cost_of_sales,
  pli.gross_profit,
  pli.selling_general_admin_expenses,
  pli.operating_income,
  pli.non_operating_income,
  pli.non_operating_expenses,
  pli.ordinary_income,
  pli.extraordinary_income,
  pli.extraordinary_losses,
  pli.income_before_tax,
  pli.income_taxes,
  pli.net_income
FROM financial_periods fp
LEFT JOIN profit_loss_items pli ON fp.id = pli.period_id
WHERE fp.analysis_id = (
  SELECT id FROM financial_analyses ORDER BY created_at DESC LIMIT 1
)
ORDER BY fp.fiscal_year;
