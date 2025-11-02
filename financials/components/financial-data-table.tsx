'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Save, Edit, X } from 'lucide-react'
import type { PeriodFinancialData, AmountUnit } from '@/lib/types/financial'
import { formatAmountWithUnit, getUnitLabel } from '@/lib/utils/financial-calculations'

interface AccountFormatItem {
  id: string
  category: string
  account_name: string
  display_order: number
  level: number
  is_total: boolean
}

interface AccountFormat {
  id: string
  name: string
  items: AccountFormatItem[]
}

interface FinancialDataTableProps {
  periods: PeriodFinancialData[]
  unit: AmountUnit
  formatId?: string | null
  onUpdate?: (periods: PeriodFinancialData[]) => void
}

export function FinancialDataTable({ periods, unit, formatId, onUpdate }: FinancialDataTableProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedPeriods, setEditedPeriods] = useState(periods)
  const [format, setFormat] = useState<AccountFormat | null>(null)
  const [loadingFormat, setLoadingFormat] = useState(false)
  // フォーマット項目の値を保持: { [periodIndex]: { [formatItemId]: value } }
  const [formatItemValues, setFormatItemValues] = useState<Record<number, Record<string, number | undefined>>>({})

  // periodsが変更されたら編集内容をリセット
  useEffect(() => {
    setEditedPeriods(periods)
  }, [periods])

  // フォーマットを取得
  useEffect(() => {
    if (!formatId) {
      setFormat(null)
      return
    }

    const fetchFormat = async () => {
      try {
        setLoadingFormat(true)
        const response = await fetch(`/api/account-formats/${formatId}`)
        if (response.ok) {
          const data = await response.json()
          setFormat(data.format)
        } else {
          console.error('フォーマットの取得に失敗しました')
        }
      } catch (err) {
        console.error('フォーマット取得エラー:', err)
      } finally {
        setLoadingFormat(false)
      }
    }

    fetchFormat()
  }, [formatId])

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editedPeriods)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedPeriods(periods)
    setFormatItemValues({})
    setIsEditing(false)
  }

  const updateValue = (
    periodIndex: number,
    section: 'balanceSheet' | 'profitLoss' | 'manualInputs',
    field: string,
    value: string
  ) => {
    const newPeriods = [...editedPeriods]

    // manualInputsが存在しない場合は初期化
    if (section === 'manualInputs' && !newPeriods[periodIndex].manualInputs) {
      newPeriods[periodIndex].manualInputs = {}
    }

    // 空文字の場合はundefined、それ以外は数値に変換
    const cleanedValue = value.replace(/,/g, '').trim()
    const numValue = cleanedValue === '' ? undefined : parseFloat(cleanedValue)

    // NaNの場合は0として扱う
    const finalValue = numValue !== undefined && !isNaN(numValue) ? numValue : (cleanedValue === '' ? undefined : 0)

    const sectionData = newPeriods[periodIndex][section] as Record<string, number | undefined>
    sectionData[field] = finalValue
    setEditedPeriods(newPeriods)
  }

  const updateFormatItemValue = (
    periodIndex: number,
    formatItemId: string,
    value: string
  ) => {
    // 空文字の場合はundefined、それ以外は数値に変換
    const cleanedValue = value.replace(/,/g, '').trim()
    const numValue = cleanedValue === '' ? undefined : parseFloat(cleanedValue)

    // NaNの場合は0として扱う
    const finalValue = numValue !== undefined && !isNaN(numValue) ? numValue : (cleanedValue === '' ? undefined : 0)

    setFormatItemValues((prev) => ({
      ...prev,
      [periodIndex]: {
        ...(prev[periodIndex] || {}),
        [formatItemId]: finalValue,
      },
    }))
  }

  const formatValue = (value: number | undefined) => formatAmountWithUnit(value, unit, 1)

  // 「その他」科目の計算関数
  const calculateOtherCurrentAssets = (period: PeriodFinancialData): number => {
    const bs = period.balanceSheet as Record<string, number | undefined>
    const total = bs.currentAssetsTotal || 0
    const cash = bs.cashAndDeposits || 0
    const receivables = bs.accountsReceivable || 0
    const inventory = bs.inventory || 0
    return Math.max(0, total - cash - receivables - inventory)
  }

  const calculateOtherCurrentLiabilities = (period: PeriodFinancialData): number => {
    const bs = period.balanceSheet as Record<string, number | undefined>
    const total = bs.currentLiabilitiesTotal || 0
    const payables = bs.accountsPayable || 0
    const borrowings = bs.shortTermBorrowings || 0
    return Math.max(0, total - payables - borrowings)
  }

  const calculateOtherFixedLiabilities = (period: PeriodFinancialData): number => {
    const bs = period.balanceSheet as Record<string, number | undefined>
    const total = bs.fixedLiabilitiesTotal || 0
    const borrowings = bs.longTermBorrowings || 0
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
                { key: 'cashAndDeposits', label: '現金預金', editable: true },
                { key: 'accountsReceivable', label: '売掛金', editable: true },
                { key: 'inventory', label: '棚卸資産', editable: true },
                { key: 'otherCurrentAssets', label: 'その他流動資産', editable: false, calculated: true },
                { key: 'currentAssetsTotal', label: '流動資産合計', editable: true },
                { key: 'tangibleFixedAssets', label: '有形固定資産', editable: true },
                { key: 'intangibleFixedAssets', label: '無形固定資産', editable: true },
                { key: 'investmentsAndOtherAssets', label: '投資その他の資産', editable: true },
                { key: 'fixedAssetsTotal', label: '固定資産合計', editable: true },
                { key: 'totalAssets', label: '資産合計', editable: true },
              ].map((item) => (
                <tr key={item.key} className="border-b hover:bg-gray-50">
                  <td className="p-2">{item.label}</td>
                  {editedPeriods.map((period, index) => {
                    // 計算項目の値を取得
                    let displayValue: number | undefined
                    if (item.key === 'otherCurrentAssets') {
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
                { key: 'accountsPayable', label: '買掛金', editable: true },
                { key: 'shortTermBorrowings', label: '短期借入金', editable: true },
                { key: 'otherCurrentLiabilities', label: 'その他流動負債', editable: false, calculated: true },
                { key: 'currentLiabilitiesTotal', label: '流動負債合計', editable: true },
                { key: 'longTermBorrowings', label: '長期借入金', editable: true },
                { key: 'otherFixedLiabilities', label: 'その他固定負債', editable: false, calculated: true },
                { key: 'fixedLiabilitiesTotal', label: '固定負債合計', editable: true },
                { key: 'totalLiabilities', label: '負債合計', editable: true },
              ].map((item) => (
                <tr key={item.key} className="border-b hover:bg-gray-50">
                  <td className="p-2">{item.label}</td>
                  {editedPeriods.map((period, index) => {
                    // 計算項目の値を取得
                    let displayValue: number | undefined
                    if (item.key === 'otherCurrentLiabilities') {
                      displayValue = calculateOtherCurrentLiabilities(period)
                    } else if (item.key === 'otherFixedLiabilities') {
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
                { key: 'netSales', label: '売上高' },
                { key: 'costOfSales', label: '売上原価' },
                { key: 'grossProfit', label: '売上総利益' },
                { key: 'sellingGeneralAdminExpenses', label: '販管費' },
                { key: 'operatingIncome', label: '営業利益' },
                { key: 'nonOperatingIncome', label: '営業外収益' },
                { key: 'nonOperatingExpenses', label: '営業外費用' },
                { key: 'ordinaryIncome', label: '経常利益' },
                { key: 'extraordinaryIncome', label: '特別利益' },
                { key: 'extraordinaryLosses', label: '特別損失' },
                { key: 'incomeBeforeTax', label: '税引前当期純利益' },
                { key: 'incomeTaxes', label: '法人税等' },
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

      {/* 科目フォーマット詳細 */}
      {format && format.items && format.items.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">
            科目詳細入力 - {format.name}
          </h3>
          {loadingFormat ? (
            <div className="text-center py-4 text-gray-500">読み込み中...</div>
          ) : (
            <div className="space-y-6">
              {/* 売上高 */}
              {format.items.some((item) => item.category === '売上高') && (
                <div>
                  <h4 className="font-semibold mb-2 text-lg">売上高</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-semibold">科目名</th>
                          {editedPeriods.map((period) => (
                            <th key={period.fiscalYear} className="text-right p-2 font-semibold">
                              {period.fiscalYear}年度
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {format.items
                          .filter((item) => item.category === '売上高')
                          .sort((a, b) => a.display_order - b.display_order)
                          .map((item) => (
                            <tr
                              key={item.id}
                              className={`border-b hover:bg-gray-50 ${
                                item.is_total ? 'bg-blue-50 font-semibold' : ''
                              }`}
                            >
                              <td
                                className="p-2"
                                style={{ paddingLeft: `${item.level * 20 + 8}px` }}
                              >
                                {item.account_name}
                                {item.is_total && ' (合計)'}
                              </td>
                              {editedPeriods.map((period, periodIndex) => {
                                const currentValue = formatItemValues[periodIndex]?.[item.id]
                                return (
                                  <td key={period.fiscalYear} className="p-2 text-right">
                                    {isEditing && !item.is_total ? (
                                      <input
                                        type="text"
                                        className="w-full text-right border rounded px-2 py-1"
                                        placeholder="0"
                                        value={currentValue?.toLocaleString() || ''}
                                        onChange={(e) =>
                                          updateFormatItemValue(periodIndex, item.id, e.target.value)
                                        }
                                      />
                                    ) : (
                                      <span className={item.is_total ? 'font-semibold' : ''}>
                                        {formatValue(currentValue)}
                                      </span>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 売上原価 */}
              {format.items.some((item) => item.category === '売上原価') && (
                <div>
                  <h4 className="font-semibold mb-2 text-lg">売上原価</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-semibold">科目名</th>
                          {editedPeriods.map((period) => (
                            <th key={period.fiscalYear} className="text-right p-2 font-semibold">
                              {period.fiscalYear}年度
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {format.items
                          .filter((item) => item.category === '売上原価')
                          .sort((a, b) => a.display_order - b.display_order)
                          .map((item) => (
                            <tr
                              key={item.id}
                              className={`border-b hover:bg-gray-50 ${
                                item.is_total ? 'bg-blue-50 font-semibold' : ''
                              }`}
                            >
                              <td
                                className="p-2"
                                style={{ paddingLeft: `${item.level * 20 + 8}px` }}
                              >
                                {item.account_name}
                                {item.is_total && ' (合計)'}
                              </td>
                              {editedPeriods.map((period, periodIndex) => {
                                const currentValue = formatItemValues[periodIndex]?.[item.id]
                                return (
                                  <td key={period.fiscalYear} className="p-2 text-right">
                                    {isEditing && !item.is_total ? (
                                      <input
                                        type="text"
                                        className="w-full text-right border rounded px-2 py-1"
                                        placeholder="0"
                                        value={currentValue?.toLocaleString() || ''}
                                        onChange={(e) =>
                                          updateFormatItemValue(periodIndex, item.id, e.target.value)
                                        }
                                      />
                                    ) : (
                                      <span className={item.is_total ? 'font-semibold' : ''}>
                                        {formatValue(currentValue)}
                                      </span>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 売上総利益 */}
              {format.items.some((item) => item.category === '売上総利益') && (
                <div>
                  <h4 className="font-semibold mb-2 text-lg">売上総利益</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-semibold">科目名</th>
                          {editedPeriods.map((period) => (
                            <th key={period.fiscalYear} className="text-right p-2 font-semibold">
                              {period.fiscalYear}年度
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {format.items
                          .filter((item) => item.category === '売上総利益')
                          .sort((a, b) => a.display_order - b.display_order)
                          .map((item) => (
                            <tr
                              key={item.id}
                              className={`border-b hover:bg-gray-50 ${
                                item.is_total ? 'bg-blue-50 font-semibold' : ''
                              }`}
                            >
                              <td
                                className="p-2"
                                style={{ paddingLeft: `${item.level * 20 + 8}px` }}
                              >
                                {item.account_name}
                                {item.is_total && ' (合計)'}
                              </td>
                              {editedPeriods.map((period, periodIndex) => {
                                const currentValue = formatItemValues[periodIndex]?.[item.id]
                                return (
                                  <td key={period.fiscalYear} className="p-2 text-right">
                                    {isEditing && !item.is_total ? (
                                      <input
                                        type="text"
                                        className="w-full text-right border rounded px-2 py-1"
                                        placeholder="0"
                                        value={currentValue?.toLocaleString() || ''}
                                        onChange={(e) =>
                                          updateFormatItemValue(periodIndex, item.id, e.target.value)
                                        }
                                      />
                                    ) : (
                                      <span className={item.is_total ? 'font-semibold' : ''}>
                                        {formatValue(currentValue)}
                                      </span>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

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
              {/* 減価償却費（自動計算） */}
              <tr className="border-b hover:bg-gray-50 bg-blue-50">
                <td className="p-2">減価償却費（自動計算）</td>
                {editedPeriods.map((period) => (
                  <td key={period.fiscalYear} className="p-2 text-right text-blue-700 font-medium">
                    {formatValue(period.manualInputs?.depreciation)}
                  </td>
                ))}
              </tr>

              {/* 設備投資額（自動計算） */}
              <tr className="border-b hover:bg-gray-50 bg-blue-50">
                <td className="p-2">設備投資額（自動計算）</td>
                {editedPeriods.map((period) => (
                  <td key={period.fiscalYear} className="p-2 text-right text-blue-700 font-medium">
                    {formatValue(period.manualInputs?.capex)}
                  </td>
                ))}
              </tr>

              {/* 固定資産売却簿価（手入力） */}
              <tr className="border-b hover:bg-gray-50">
                <td className="p-2">固定資産売却簿価</td>
                {editedPeriods.map((period, index) => (
                  <td key={period.fiscalYear} className="p-2 text-right">
                    {isEditing ? (
                      <input
                        type="text"
                        className="w-full text-right border rounded px-2 py-1"
                        value={
                          period.manualInputs?.fixedAssetDisposalValue?.toLocaleString() || ''
                        }
                        onChange={(e) =>
                          updateValue(index, 'manualInputs', 'fixedAssetDisposalValue', e.target.value)
                        }
                        placeholder="0"
                      />
                    ) : (
                      formatValue(period.manualInputs?.fixedAssetDisposalValue)
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
