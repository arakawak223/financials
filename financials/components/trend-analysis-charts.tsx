'use client'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card } from '@/components/ui/card'
import type { AmountUnit } from '@/lib/types/financial'

interface Period {
  fiscalYear: number
  balanceSheet?: {
    totalAssets?: number | null
    totalLiabilities?: number | null
    totalNetAssets?: number | null
    currentAssets?: number | null
    fixedAssets?: number | null
    currentLiabilities?: number | null
    fixedLiabilities?: number | null
    cashAndDeposits?: number | null
    accountsReceivable?: number | null
    inventory?: number | null
  }
  profitLoss?: {
    netSales?: number | null
    costOfSales?: number | null
    grossProfit?: number | null
    operatingIncome?: number | null
    ordinaryIncome?: number | null
    netIncome?: number | null
    sellingGeneralAdminExpenses?: number | null
  }
  metrics?: {
    grossProfitMargin?: number | null
    operatingProfitMargin?: number | null
    ordinaryProfitMargin?: number | null
    netProfitMargin?: number | null
    roe?: number | null
    roa?: number | null
    currentRatio?: number | null
    equityRatio?: number | null
    debtEquityRatio?: number | null
  }
}

interface TrendAnalysisChartsProps {
  periods: Period[]
  unit: AmountUnit
}

// 金額を単位に応じて変換
function convertAmount(amount: number | null | undefined, unit: AmountUnit): number {
  if (amount === null || amount === undefined) return 0

  switch (unit) {
    case 'ones':
      return amount
    case 'thousands':
      return amount / 1000
    case 'millions':
      return amount / 1000000
    case 'billions':
      return amount / 1000000000
    default:
      return amount
  }
}

// 単位ラベルを取得
function getUnitLabel(unit: AmountUnit): string {
  switch (unit) {
    case 'ones':
      return '円'
    case 'thousands':
      return '千円'
    case 'millions':
      return '百万円'
    case 'billions':
      return '十億円'
    default:
      return '円'
  }
}

// カスタムツールチップ
const CustomTooltip = ({ active, payload, label, unit }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
        <p className="font-semibold">{label}年度</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            {unit && ` ${unit}`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function TrendAnalysisCharts({ periods, unit }: TrendAnalysisChartsProps) {
  const unitLabel = getUnitLabel(unit)

  // 収益性指標の推移
  const profitabilityData = periods.map(p => ({
    fiscalYear: p.fiscalYear,
    売上総利益率: p.metrics?.grossProfitMargin || 0,
    営業利益率: p.metrics?.operatingProfitMargin || 0,
  }))

  // 安全性指標の推移
  const safetyData = periods.map(p => ({
    fiscalYear: p.fiscalYear,
    流動比率: p.metrics?.currentRatio || 0,
    自己資本比率: p.metrics?.equityRatio || 0,
  }))

  // 資本効率性指標の推移
  const efficiencyData = periods.map(p => ({
    fiscalYear: p.fiscalYear,
    ROE: p.metrics?.roe || 0,
    ROA: p.metrics?.roa || 0,
  }))

  return (
    <div className="space-y-6">
      {/* 収益性指標の推移 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">収益性指標の推移（利益率）</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={profitabilityData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fiscalYear" />
            <YAxis
              label={{ value: '%', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip unit="%" />} />
            <Legend />
            <Line type="monotone" dataKey="売上総利益率" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="営業利益率" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* 効率性・安全性指標 */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">資本効率性の推移</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={efficiencyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fiscalYear" />
              <YAxis label={{ value: '%', angle: -90, position: 'insideLeft' }} />
              <Tooltip content={<CustomTooltip unit="%" />} />
              <Legend />
              <Line type="monotone" dataKey="ROE" stroke="#3b82f6" strokeWidth={2} dot={{ r: 5 }} />
              <Line type="monotone" dataKey="ROA" stroke="#10b981" strokeWidth={2} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">安全性指標の推移</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={safetyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fiscalYear" />
              <YAxis label={{ value: '%', angle: -90, position: 'insideLeft' }} />
              <Tooltip content={<CustomTooltip unit="%" />} />
              <Legend />
              <Line type="monotone" dataKey="流動比率" stroke="#f59e0b" strokeWidth={2} dot={{ r: 5 }} />
              <Line type="monotone" dataKey="自己資本比率" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}
