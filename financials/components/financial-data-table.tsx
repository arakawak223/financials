'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Save, Edit, X } from 'lucide-react'
import type { PeriodFinancialData, AmountUnit } from '@/lib/types/financial'
import { formatAmountWithUnit, getUnitLabel } from '@/lib/utils/financial-calculations'

interface FinancialDataTableProps {
  periods: PeriodFinancialData[]
  unit: AmountUnit
  onUpdate?: (periods: PeriodFinancialData[]) => void
}

export function FinancialDataTable({ periods, unit, onUpdate }: FinancialDataTableProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedPeriods, setEditedPeriods] = useState(periods)

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editedPeriods)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedPeriods(periods)
    setIsEditing(false)
  }

  const updateValue = (
    periodIndex: number,
    section: 'balanceSheet' | 'profitLoss' | 'manualInputs',
    field: string,
    value: string
  ) => {
    const newPeriods = [...editedPeriods]
    const numValue = parseFloat(value.replace(/,/g, '')) || 0
    const sectionData = newPeriods[periodIndex][section] as Record<string, number | undefined>
    sectionData[field] = numValue
    setEditedPeriods(newPeriods)
  }

  const formatValue = (value: number | undefined) => formatAmountWithUnit(value, unit, 1)

  // 「その他」科目の計算関数
  const calculateOtherCurrentAssets = (period: PeriodFinancialData): number => {
    const bs = period.balanceSheet as Record<string, number | undefined>
    const total = bs.current_assets_total || 0
    const cash = bs.cash_and_deposits || 0
    const receivables = bs.accounts_receivable || 0
    const inventory = bs.inventory || 0
    return Math.max(0, total - cash - receivables - inventory)
  }

  const calculateOtherCurrentLiabilities = (period: PeriodFinancialData): number => {
    const bs = period.balanceSheet as Record<string, number | undefined>
    const total = bs.current_liabilities_total || 0
    const payables = bs.accounts_payable || 0
    const borrowings = bs.short_term_borrowings || 0
    return Math.max(0, total - payables - borrowings)
  }

  const calculateOtherFixedLiabilities = (period: PeriodFinancialData): number => {
    const bs = period.balanceSheet as Record<string, number | undefined>
    const total = bs.fixed_liabilities_total || 0
    const borrowings = bs.long_term_borrowings || 0
    return Math.max(0, total - borrowings)
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600 mb-2">
        ※金額の単位: {getUnitLabel(unit)}
      </div>

      {/* アクションボタン */}
      <div className="flex justify-end gap-2">
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            編集
          </Button>
        ) : (
          <>
            <Button onClick={handleCancel} variant="outline">
              <X className="h-4 w-4 mr-2" />
              キャンセル
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              保存
            </Button>
          </>
        )}
      </div>

      {/* 貸借対照表 */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">貸借対照表（BS）</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-semibold">勘定科目</th>
                {editedPeriods.map((period) => (
                  <th key={period.fiscalYear} className="text-right p-2 font-semibold">
                    {period.fiscalYear}年度
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* 資産の部 */}
              <tr className="bg-gray-50">
                <td colSpan={editedPeriods.length + 1} className="p-2 font-semibold">
                  【資産の部】
                </td>
              </tr>
              {[
                { key: 'cash_and_deposits', label: '現金預金', editable: true },
                { key: 'accounts_receivable', label: '売掛金', editable: true },
                { key: 'inventory', label: '棚卸資産', editable: true },
                { key: 'other_current_assets', label: 'その他流動資産', editable: false, calculated: true },
                { key: 'current_assets_total', label: '流動資産合計', editable: true },
                { key: 'tangible_fixed_assets', label: '有形固定資産', editable: true },
                { key: 'intangible_fixed_assets', label: '無形固定資産', editable: true },
                { key: 'investments_and_other_assets', label: '投資その他の資産', editable: true },
                { key: 'fixed_assets_total', label: '固定資産合計', editable: true },
                { key: 'total_assets', label: '資産合計', editable: true },
              ].map((item) => (
                <tr key={item.key} className="border-b hover:bg-gray-50">
                  <td className="p-2">{item.label}</td>
                  {editedPeriods.map((period, index) => {
                    // 計算項目の値を取得
                    let displayValue: number | undefined
                    if (item.key === 'other_current_assets') {
                      displayValue = calculateOtherCurrentAssets(period)
                    } else {
                      displayValue = (period.balanceSheet as Record<string, number | undefined>)[item.key]
                    }

                    return (
                      <td key={period.fiscalYear} className="p-2 text-right">
                        {isEditing && item.editable !== false ? (
                          <input
                            type="text"
                            className="w-full text-right border rounded px-2 py-1"
                            value={displayValue?.toLocaleString() || ''}
                            onChange={(e) =>
                              updateValue(index, 'balanceSheet', item.key, e.target.value)
                            }
                          />
                        ) : (
                          <span className={item.calculated ? 'text-gray-600 italic' : ''}>
                            {formatValue(displayValue)}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}

              {/* 負債の部 */}
              <tr className="bg-gray-50">
                <td colSpan={editedPeriods.length + 1} className="p-2 font-semibold">
                  【負債の部】
                </td>
              </tr>
              {[
                { key: 'accounts_payable', label: '買掛金', editable: true },
                { key: 'short_term_borrowings', label: '短期借入金', editable: true },
                { key: 'other_current_liabilities', label: 'その他流動負債', editable: false, calculated: true },
                { key: 'current_liabilities_total', label: '流動負債合計', editable: true },
                { key: 'long_term_borrowings', label: '長期借入金', editable: true },
                { key: 'other_fixed_liabilities', label: 'その他固定負債', editable: false, calculated: true },
                { key: 'fixed_liabilities_total', label: '固定負債合計', editable: true },
                { key: 'total_liabilities', label: '負債合計', editable: true },
              ].map((item) => (
                <tr key={item.key} className="border-b hover:bg-gray-50">
                  <td className="p-2">{item.label}</td>
                  {editedPeriods.map((period, index) => {
                    // 計算項目の値を取得
                    let displayValue: number | undefined
                    if (item.key === 'other_current_liabilities') {
                      displayValue = calculateOtherCurrentLiabilities(period)
                    } else if (item.key === 'other_fixed_liabilities') {
                      displayValue = calculateOtherFixedLiabilities(period)
                    } else {
                      displayValue = (period.balanceSheet as Record<string, number | undefined>)[item.key]
                    }

                    return (
                      <td key={period.fiscalYear} className="p-2 text-right">
                        {isEditing && item.editable !== false ? (
                          <input
                            type="text"
                            className="w-full text-right border rounded px-2 py-1"
                            value={displayValue?.toLocaleString() || ''}
                            onChange={(e) =>
                              updateValue(index, 'balanceSheet', item.key, e.target.value)
                            }
                          />
                        ) : (
                          <span className={item.calculated ? 'text-gray-600 italic' : ''}>
                            {formatValue(displayValue)}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}

              {/* 純資産の部 */}
              <tr className="bg-gray-50">
                <td colSpan={editedPeriods.length + 1} className="p-2 font-semibold">
                  【純資産の部】
                </td>
              </tr>
              {[
                { key: 'capital_stock', label: '資本金' },
                { key: 'retained_earnings', label: '利益剰余金' },
                { key: 'total_net_assets', label: '純資産合計' },
              ].map((item) => (
                <tr key={item.key} className="border-b hover:bg-gray-50">
                  <td className="p-2">{item.label}</td>
                  {editedPeriods.map((period, index) => (
                    <td key={period.fiscalYear} className="p-2 text-right">
                      {isEditing ? (
                        <input
                          type="text"
                          className="w-full text-right border rounded px-2 py-1"
                          value={
                            (period.balanceSheet as Record<string, number | undefined>)[item.key]?.toLocaleString() || ''
                          }
                          onChange={(e) =>
                            updateValue(index, 'balanceSheet', item.key, e.target.value)
                          }
                        />
                      ) : (
                        formatValue((period.balanceSheet as Record<string, number | undefined>)[item.key])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 損益計算書 */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">損益計算書（PL）</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-semibold">勘定科目</th>
                {editedPeriods.map((period) => (
                  <th key={period.fiscalYear} className="text-right p-2 font-semibold">
                    {period.fiscalYear}年度
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { key: 'net_sales', label: '売上高' },
                { key: 'cost_of_sales', label: '売上原価' },
                { key: 'gross_profit', label: '売上総利益' },
                { key: 'selling_general_admin_expenses', label: '販管費' },
                { key: 'operating_income', label: '営業利益' },
                { key: 'non_operating_income', label: '営業外収益' },
                { key: 'non_operating_expenses', label: '営業外費用' },
                { key: 'ordinary_income', label: '経常利益' },
                { key: 'extraordinary_income', label: '特別利益' },
                { key: 'extraordinary_losses', label: '特別損失' },
                { key: 'income_before_tax', label: '税引前当期純利益' },
                { key: 'income_taxes', label: '法人税等' },
                { key: 'net_income', label: '当期純利益' },
              ].map((item) => (
                <tr key={item.key} className="border-b hover:bg-gray-50">
                  <td className="p-2">{item.label}</td>
                  {editedPeriods.map((period, index) => (
                    <td key={period.fiscalYear} className="p-2 text-right">
                      {isEditing ? (
                        <input
                          type="text"
                          className="w-full text-right border rounded px-2 py-1"
                          value={
                            (period.profitLoss as Record<string, number | undefined>)[item.key]?.toLocaleString() || ''
                          }
                          onChange={(e) =>
                            updateValue(index, 'profitLoss', item.key, e.target.value)
                          }
                        />
                      ) : (
                        formatValue((period.profitLoss as Record<string, number | undefined>)[item.key])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 手入力データ */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">手入力データ</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-semibold">項目</th>
                {editedPeriods.map((period) => (
                  <th key={period.fiscalYear} className="text-right p-2 font-semibold">
                    {period.fiscalYear}年度
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { key: 'depreciation', label: '減価償却費' },
                { key: 'capex', label: '設備投資額' },
              ].map((item) => (
                <tr key={item.key} className="border-b hover:bg-gray-50">
                  <td className="p-2">{item.label}</td>
                  {editedPeriods.map((period, index) => (
                    <td key={period.fiscalYear} className="p-2 text-right">
                      {isEditing ? (
                        <input
                          type="text"
                          className="w-full text-right border rounded px-2 py-1"
                          value={
                            (period.manualInputs as Record<string, number | undefined>)[item.key]?.toLocaleString() || ''
                          }
                          onChange={(e) =>
                            updateValue(index, 'manualInputs', item.key, e.target.value)
                          }
                        />
                      ) : (
                        formatValue((period.manualInputs as Record<string, number | undefined>)[item.key])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
