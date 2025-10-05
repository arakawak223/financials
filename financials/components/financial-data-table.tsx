'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Save, Edit, X } from 'lucide-react'
import type { PeriodFinancialData } from '@/lib/types/financial'
import { formatNumber } from '@/lib/utils/financial-calculations'

interface FinancialDataTableProps {
  periods: PeriodFinancialData[]
  onUpdate?: (periods: PeriodFinancialData[]) => void
}

export function FinancialDataTable({ periods, onUpdate }: FinancialDataTableProps) {
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
    ;(newPeriods[periodIndex][section] as any)[field] = numValue
    setEditedPeriods(newPeriods)
  }

  return (
    <div className="space-y-6">
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
                { key: 'cashAndDeposits', label: '現金預金' },
                { key: 'securities', label: '有価証券' },
                { key: 'notesReceivable', label: '受取手形' },
                { key: 'accountsReceivable', label: '売掛金' },
                { key: 'inventory', label: '棚卸資産' },
                { key: 'totalCurrentAssets', label: '流動資産合計' },
                { key: 'land', label: '土地' },
                { key: 'buildings', label: '建物' },
                { key: 'totalFixedAssets', label: '固定資産合計' },
                { key: 'totalAssets', label: '資産合計' },
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
                            (period.balanceSheet as any)[item.key]?.toLocaleString() || ''
                          }
                          onChange={(e) =>
                            updateValue(index, 'balanceSheet', item.key, e.target.value)
                          }
                        />
                      ) : (
                        formatNumber((period.balanceSheet as any)[item.key])
                      )}
                    </td>
                  ))}
                </tr>
              ))}

              {/* 負債の部 */}
              <tr className="bg-gray-50">
                <td colSpan={editedPeriods.length + 1} className="p-2 font-semibold">
                  【負債の部】
                </td>
              </tr>
              {[
                { key: 'notesPayable', label: '支払手形' },
                { key: 'accountsPayable', label: '買掛金' },
                { key: 'shortTermBorrowings', label: '短期借入金' },
                { key: 'totalCurrentLiabilities', label: '流動負債合計' },
                { key: 'longTermBorrowings', label: '長期借入金' },
                { key: 'bondsPayable', label: '社債' },
                { key: 'leaseObligations', label: 'リース債務' },
                { key: 'totalLongTermLiabilities', label: '固定負債合計' },
                { key: 'totalLiabilities', label: '負債合計' },
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
                            (period.balanceSheet as any)[item.key]?.toLocaleString() || ''
                          }
                          onChange={(e) =>
                            updateValue(index, 'balanceSheet', item.key, e.target.value)
                          }
                        />
                      ) : (
                        formatNumber((period.balanceSheet as any)[item.key])
                      )}
                    </td>
                  ))}
                </tr>
              ))}

              {/* 純資産の部 */}
              <tr className="bg-gray-50">
                <td colSpan={editedPeriods.length + 1} className="p-2 font-semibold">
                  【純資産の部】
                </td>
              </tr>
              {[
                { key: 'capitalStock', label: '資本金' },
                { key: 'retainedEarnings', label: '利益剰余金' },
                { key: 'totalNetAssets', label: '純資産合計' },
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
                            (period.balanceSheet as any)[item.key]?.toLocaleString() || ''
                          }
                          onChange={(e) =>
                            updateValue(index, 'balanceSheet', item.key, e.target.value)
                          }
                        />
                      ) : (
                        formatNumber((period.balanceSheet as any)[item.key])
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
                { key: 'netSales', label: '売上高' },
                { key: 'costOfSales', label: '売上原価' },
                { key: 'grossProfit', label: '売上総利益' },
                { key: 'personnelExpenses', label: '人件費' },
                { key: 'executiveCompensation', label: '役員報酬' },
                { key: 'rentExpenses', label: '地代家賃' },
                { key: 'totalSellingGeneralAdmin', label: '販管費合計' },
                { key: 'operatingIncome', label: '営業利益' },
                { key: 'ordinaryIncome', label: '経常利益' },
                { key: 'netIncome', label: '当期純利益' },
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
                            (period.profitLoss as any)[item.key]?.toLocaleString() || ''
                          }
                          onChange={(e) =>
                            updateValue(index, 'profitLoss', item.key, e.target.value)
                          }
                        />
                      ) : (
                        formatNumber((period.profitLoss as any)[item.key])
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
                            (period.manualInputs as any)[item.key]?.toLocaleString() || ''
                          }
                          onChange={(e) =>
                            updateValue(index, 'manualInputs', item.key, e.target.value)
                          }
                        />
                      ) : (
                        formatNumber((period.manualInputs as any)[item.key])
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
