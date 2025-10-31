'use client'

import { Card } from '@/components/ui/card'
import type { PeriodFinancialData, AmountUnit } from '@/lib/types/financial'
import {
  formatPercent,
  formatAmountWithUnit,
  getUnitLabel,
} from '@/lib/utils/financial-calculations'

interface FinancialMetricsTableProps {
  periods: PeriodFinancialData[]
  unit: AmountUnit
}

export function FinancialMetricsTable({ periods, unit }: FinancialMetricsTableProps) {
  if (!periods || periods.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-gray-500">財務指標データがありません</p>
      </Card>
    )
  }

  const formatAmount = (v: number | null | undefined) => formatAmountWithUnit(v, unit, 1)

  const metricsGroups = [
    {
      title: '安全性指標',
      metrics: [
        {
          label: 'Net Cash / Net Debt',
          key: 'netCash',
          format: formatAmount,
          description: '現金預金 - 有利子負債',
        },
        {
          label: '流動比率',
          key: 'currentRatio',
          format: (v: number | null | undefined) => v !== null && v !== undefined ? `${v.toFixed(1)}%` : '-',
          description: '流動資産 ÷ 流動負債 × 100',
        },
        {
          label: '自己資本比率',
          key: 'equityRatio',
          format: (v: number | null | undefined) => v !== null && v !== undefined ? `${v.toFixed(1)}%` : '-',
          description: '自己資本 ÷ 総資産 × 100',
        },
      ],
    },
    {
      title: '効率性指標',
      metrics: [
        {
          label: '売掛金滞留月数',
          key: 'receivablesTurnoverMonths',
          format: (v: number | null | undefined) => v !== null && v !== undefined ? `${v.toFixed(1)}ヶ月` : '-',
          description: '売掛金 ÷ (売上高 ÷ 12)',
        },
        {
          label: '棚卸資産滞留月数',
          key: 'inventoryTurnoverMonths',
          format: (v: number | null | undefined) => v !== null && v !== undefined ? `${v.toFixed(1)}ヶ月` : '-',
          description: '棚卸資産 ÷ (売上原価 ÷ 12)',
        },
      ],
    },
    {
      title: 'キャッシュフロー指標',
      metrics: [
        {
          label: 'EBITDA',
          key: 'ebitda',
          format: formatAmount,
          description: '営業利益 + 減価償却費',
        },
        {
          label: 'FCF (フリーキャッシュフロー)',
          key: 'fcf',
          format: formatAmount,
          description: 'EBITDA - 設備投資額',
        },
        {
          label: 'EBITDA対有利子負債比率',
          key: 'ebitdaToInterestBearingDebt',
          format: (v: number | null | undefined) => v !== null && v !== undefined ? `${v.toFixed(2)}倍` : '-',
          description: '平均有利子負債 ÷ EBITDA',
        },
      ],
    },
    {
      title: '収益性指標',
      metrics: [
        {
          label: '売上総利益率',
          key: 'grossProfitMargin',
          format: formatPercent,
          description: '売上総利益 ÷ 売上高 × 100',
        },
        {
          label: '営業利益率',
          key: 'operatingProfitMargin',
          format: formatPercent,
          description: '営業利益 ÷ 売上高 × 100',
        },
        {
          label: 'EBITDA対売上高比率',
          key: 'ebitdaMargin',
          format: formatPercent,
          description: 'EBITDA ÷ 売上高 × 100',
        },
      ],
    },
    {
      title: '成長性指標',
      metrics: [
        {
          label: '売上高成長率（前期比）',
          key: 'salesGrowthRate',
          format: formatPercent,
          description: '(当期売上 - 前期売上) ÷ 前期売上 × 100',
        },
        {
          label: '営業利益成長率（前期比）',
          key: 'operatingIncomeGrowthRate',
          format: formatPercent,
          description: '(当期営業利益 - 前期営業利益) ÷ 前期営業利益 × 100',
          isCalculated: true,
        },
        {
          label: 'EBITDA成長率（前期比）',
          key: 'ebitdaGrowthRate',
          format: formatPercent,
          description: '(当期EBITDA - 前期EBITDA) ÷ 前期EBITDA × 100',
          isCalculated: true,
        },
      ],
    },
    {
      title: '資本効率指標',
      metrics: [
        {
          label: 'ROE（自己資本利益率）',
          key: 'roe',
          format: formatPercent,
          description: '当期純利益 ÷ 純資産 × 100',
        },
        {
          label: 'ROA（総資産利益率）',
          key: 'roa',
          format: formatPercent,
          description: '当期純利益 ÷ 総資産 × 100',
        },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600 mb-2">
        ※金額の単位: {getUnitLabel(unit)}
      </div>
      {metricsGroups.map((group) => (
        <Card key={group.title} className="p-6">
          <h3 className="text-lg font-semibold mb-4">{group.title}</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4 font-medium">指標</th>
                  {periods.map((period) => (
                    <th key={period.fiscalYear} className="text-right py-2 px-4 font-medium">
                      {period.fiscalYear}年度
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.metrics.map((metric) => (
                  <tr key={metric.key} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{metric.label}</div>
                        <div className="text-xs text-gray-500">{metric.description}</div>
                      </div>
                    </td>
                    {periods.map((period) => {
                      const value = period.metrics?.[metric.key as keyof typeof period.metrics]
                      return (
                        <td key={period.fiscalYear} className="text-right py-3 px-4 font-mono">
                          {metric.format(value as number | null | undefined)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  )
}
