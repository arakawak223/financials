// データベース型定義
// Supabaseスキーマに対応

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      industries: {
        Row: {
          id: string
          name: string
          code: string | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      company_groups: {
        Row: {
          id: string
          name: string
          industry_id: string | null
          password_hash: string | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          industry_id?: string | null
          password_hash?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          industry_id?: string | null
          password_hash?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          group_id: string | null
          industry_id: string | null
          password_hash: string | null
          company_code: string | null
          address: string | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          group_id?: string | null
          industry_id?: string | null
          password_hash?: string | null
          company_code?: string | null
          address?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          group_id?: string | null
          industry_id?: string | null
          password_hash?: string | null
          company_code?: string | null
          address?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      financial_analyses: {
        Row: {
          id: string
          company_id: string
          analysis_date: string
          fiscal_year_start: number
          fiscal_year_end: number
          periods_count: number
          status: string
          notes: string | null
          format_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          analysis_date?: string
          fiscal_year_start: number
          fiscal_year_end: number
          periods_count?: number
          status?: string
          notes?: string | null
          format_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          analysis_date?: string
          fiscal_year_start?: number
          fiscal_year_end?: number
          periods_count?: number
          status?: string
          notes?: string | null
          format_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      uploaded_files: {
        Row: {
          id: string
          analysis_id: string
          file_type: string
          fiscal_year: number
          file_name: string
          file_path: string
          file_size: number | null
          mime_type: string | null
          ocr_status: string
          ocr_result: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          analysis_id: string
          file_type: string
          fiscal_year: number
          file_name: string
          file_path: string
          file_size?: number | null
          mime_type?: string | null
          ocr_status?: string
          ocr_result?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          analysis_id?: string
          file_type?: string
          fiscal_year?: number
          file_name?: string
          file_path?: string
          file_size?: number | null
          mime_type?: string | null
          ocr_status?: string
          ocr_result?: Json | null
          created_at?: string
        }
      }
      financial_periods: {
        Row: {
          id: string
          analysis_id: string
          fiscal_year: number
          period_start_date: string | null
          period_end_date: string | null
          is_modified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          analysis_id: string
          fiscal_year: number
          period_start_date?: string | null
          period_end_date?: string | null
          is_modified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          analysis_id?: string
          fiscal_year?: number
          period_start_date?: string | null
          period_end_date?: string | null
          is_modified?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      balance_sheet_items: {
        Row: {
          id: string
          period_id: string
          cash_and_deposits: number | null
          securities: number | null
          notes_receivable: number | null
          accounts_receivable: number | null
          inventory: number | null
          other_current_assets: number | null
          total_current_assets: number | null
          tangible_fixed_assets: number | null
          land: number | null
          buildings: number | null
          machinery: number | null
          intangible_assets: number | null
          investments: number | null
          loans_receivable: number | null
          other_fixed_assets: number | null
          total_fixed_assets: number | null
          deferred_assets: number | null
          total_assets: number | null
          notes_payable: number | null
          accounts_payable: number | null
          short_term_borrowings: number | null
          current_portion_long_term_debt: number | null
          accrued_expenses: number | null
          accrued_income_taxes: number | null
          advances_received: number | null
          deposits_received: number | null
          other_current_liabilities: number | null
          total_current_liabilities: number | null
          long_term_borrowings: number | null
          bonds_payable: number | null
          lease_obligations: number | null
          other_long_term_liabilities: number | null
          total_long_term_liabilities: number | null
          total_liabilities: number | null
          capital_stock: number | null
          capital_surplus: number | null
          retained_earnings: number | null
          treasury_stock: number | null
          total_net_assets: number | null
          total_liabilities_and_net_assets: number | null
          is_modified: boolean
          modified_fields: Json | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['balance_sheet_items']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['balance_sheet_items']['Insert']>
      }
      profit_loss_items: {
        Row: {
          id: string
          period_id: string
          net_sales: number | null
          cost_of_sales: number | null
          gross_profit: number | null
          personnel_expenses: number | null
          executive_compensation: number | null
          rent_expenses: number | null
          depreciation: number | null
          other_selling_expenses: number | null
          total_selling_general_admin: number | null
          operating_income: number | null
          interest_income: number | null
          dividend_income: number | null
          other_non_operating_income: number | null
          total_non_operating_income: number | null
          interest_expense: number | null
          other_non_operating_expenses: number | null
          total_non_operating_expenses: number | null
          ordinary_income: number | null
          extraordinary_income: number | null
          extraordinary_losses: number | null
          income_before_taxes: number | null
          corporate_tax: number | null
          net_income: number | null
          is_modified: boolean
          modified_fields: Json | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profit_loss_items']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profit_loss_items']['Insert']>
      }
      account_details: {
        Row: {
          id: string
          period_id: string
          account_type: string
          item_name: string | null
          amount: number | null
          note: string | null
          is_modified: boolean
          format_item_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          period_id: string
          account_type: string
          item_name?: string | null
          amount?: number | null
          note?: string | null
          is_modified?: boolean
          format_item_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['account_details']['Insert']>
      }
      manual_inputs: {
        Row: {
          id: string
          period_id: string
          input_type: string
          amount: number
          note: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          period_id: string
          input_type: string
          amount: number
          note?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['manual_inputs']['Insert']>
      }
      financial_metrics: {
        Row: {
          id: string
          analysis_id: string
          period_id: string | null
          net_cash: number | null
          current_ratio: number | null
          receivables_turnover_months: number | null
          inventory_turnover_months: number | null
          ebitda: number | null
          fcf: number | null
          sales_growth_rate: number | null
          gross_profit_margin: number | null
          operating_profit_margin: number | null
          ebitda_margin: number | null
          ebitda_to_interest_bearing_debt: number | null
          roe: number | null
          roa: number | null
          calculation_date: string
          created_at: string
        }
        Insert: {
          id?: string
          analysis_id: string
          period_id?: string | null
          net_cash?: number | null
          current_ratio?: number | null
          receivables_turnover_months?: number | null
          inventory_turnover_months?: number | null
          ebitda?: number | null
          fcf?: number | null
          sales_growth_rate?: number | null
          gross_profit_margin?: number | null
          operating_profit_margin?: number | null
          ebitda_margin?: number | null
          ebitda_to_interest_bearing_debt?: number | null
          roe?: number | null
          roa?: number | null
          calculation_date?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['financial_metrics']['Insert']>
      }
      analysis_comments: {
        Row: {
          id: string
          analysis_id: string
          comment_type: string
          ai_generated_text: string | null
          edited_text: string | null
          is_edited: boolean
          display_order: number | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          analysis_id: string
          comment_type: string
          ai_generated_text?: string | null
          edited_text?: string | null
          is_edited?: boolean
          display_order?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['analysis_comments']['Insert']>
      }
      access_logs: {
        Row: {
          id: string
          user_id: string | null
          company_id: string | null
          company_group_id: string | null
          action: string
          resource_type: string | null
          resource_id: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          company_id?: string | null
          company_group_id?: string | null
          action: string
          resource_type?: string | null
          resource_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['access_logs']['Insert']>
      }
      account_formats: {
        Row: {
          id: string
          name: string
          description: string | null
          industry_id: string | null
          is_shared: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          industry_id?: string | null
          is_shared?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['account_formats']['Insert']>
      }
      account_format_items: {
        Row: {
          id: string
          format_id: string
          category: string
          account_name: string
          display_order: number
          parent_id: string | null
          level: number
          calculation_formula: string | null
          is_total: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          format_id: string
          category: string
          account_name: string
          display_order?: number
          parent_id?: string | null
          level?: number
          calculation_formula?: string | null
          is_total?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['account_format_items']['Insert']>
      }
      company_account_formats: {
        Row: {
          id: string
          company_id: string
          format_id: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          format_id: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['company_account_formats']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
