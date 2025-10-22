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

  // 売上高と利益の推移（複数系列）
  const revenueAndProfitData = periods.map(p => ({
    fiscalYear: p.fiscalYear,
    売上高: convertAmount(p.profitLoss?.netSales, unit),
    売上総利益: convertAmount(p.profitLoss?.grossProfit, unit),
    営業利益: convertAmount(p.profitLoss?.operatingIncome, unit),
    経常利益: convertAmount(p.profitLoss?.ordinaryIncome, unit),
    当期純利益: convertAmount(p.profitLoss?.netIncome, unit),
  }))

  // 貸借対照表の推移（積み上げ）
  const balanceSheetData = periods.map(p => ({
    fiscalYear: p.fiscalYear,
    流動資産: convertAmount(p.balanceSheet?.currentAssets, unit),
    固定資産: convertAmount(p.balanceSheet?.fixedAssets, unit),
    流動負債: convertAmount(p.balanceSheet?.currentLiabilities, unit),
    固定負債: convertAmount(p.balanceSheet?.fixedLiabilities, unit),
    純資産: convertAmount(p.balanceSheet?.totalNetAssets, unit),
  }))

  // 資産・負債・純資産の推移
  const balanceSheetTrendData = periods.map(p => ({
    fiscalYear: p.fiscalYear,
    総資産: convertAmount(p.balanceSheet?.totalAssets, unit),
    総負債: convertAmount(p.balanceSheet?.totalLiabilities, unit),
    純資産: convertAmount(p.balanceSheet?.totalNetAssets, unit),
  }))

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

  // コスト構造の推移（エリアチャート）
  const costStructureData = periods.map(p => ({
    fiscalYear: p.fiscalYear,
    売上原価: convertAmount(p.profitLoss?.costOfSales, unit),
    販管費: convertAmount(p.profitLoss?.sellingGeneralAdminExpenses, unit),
  }))

  // 資産構成の推移
  const assetCompositionData = periods.map(p => ({
    fiscalYear: p.fiscalYear,
    現金及び預金: convertAmount(p.balanceSheet?.cashAndDeposits, unit),
    売掛金: convertAmount(p.balanceSheet?.accountsReceivable, unit),
    棚卸資産: convertAmount(p.balanceSheet?.inventory, unit),
  }))

  return (
    <div className="space-y-6">
      {/* 売上高と各種利益の推移 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">売上高と利益の推移</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={revenueAndProfitData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="fiscalYear"
              label={{ value: '年度', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              label={{ value: unitLabel, angle: -90, position: 'insideLeft' }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip unit={unitLabel} />} />
            <Legend />
            <Line type="monotone" dataKey="売上高" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="売上総利益" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="営業利益" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="経常利益" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="当期純利益" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* 貸借対照表の推移 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">資産・負債・純資産の推移</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={balanceSheetTrendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="fiscalYear"
              label={{ value: '年度', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              label={{ value: unitLabel, angle: -90, position: 'insideLeft' }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip unit={unitLabel} />} />
            <Legend />
            <Line type="monotone" dataKey="総資産" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} />
            <Line type="monotone" dataKey="総負債" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="純資産" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* 資産・負債構成（積み上げ棒グラフ） */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">資産構成の推移</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={balanceSheetData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fiscalYear" />
              <YAxis tickFormatter={(value) => value.toLocaleString()} />
              <Tooltip content={<CustomTooltip unit={unitLabel} />} />
              <Legend />
              <Bar dataKey="流動資産" stackId="a" fill="#3b82f6" />
              <Bar dataKey="固定資産" stackId="a" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">負債・純資産構成の推移</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={balanceSheetData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fiscalYear" />
              <YAxis tickFormatter={(value) => value.toLocaleString()} />
              <Tooltip content={<CustomTooltip unit={unitLabel} />} />
              <Legend />
              <Bar dataKey="流動負債" stackId="a" fill="#ef4444" />
              <Bar dataKey="固定負債" stackId="a" fill="#f97316" />
              <Bar dataKey="純資産" stackId="a" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* コスト構造（エリアチャート） */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">コスト構造の推移</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={costStructureData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fiscalYear" />
            <YAxis
              label={{ value: unitLabel, angle: -90, position: 'insideLeft' }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip unit={unitLabel} />} />
            <Legend />
            <Area type="monotone" dataKey="売上原価" stackId="1" stroke="#ef4444" fill="#ef4444" />
            <Area type="monotone" dataKey="販管費" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* 資産構成の詳細 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">主要資産項目の推移</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={assetCompositionData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fiscalYear" />
            <YAxis
              label={{ value: unitLabel, angle: -90, position: 'insideLeft' }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip unit={unitLabel} />} />
            <Legend />
            <Line type="monotone" dataKey="現金及び預金" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="売掛金" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="棚卸資産" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

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
