'use client'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card } from '@/components/ui/card'
import type { ChartData } from '@/lib/types/financial'

interface FinancialChartsProps {
  charts: ChartData[]
}

export function FinancialCharts({ charts }: FinancialChartsProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {charts.map((chart, index) => (
        <Card key={index} className="p-6">
          <h3 className="text-lg font-semibold mb-4">{chart.title}</h3>
          <ResponsiveContainer width="100%" height={300}>
            {chart.type === 'bar' ? (
              <BarChart data={chart.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fiscalYear" label={{ value: '年度', position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: chart.unit || '', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" name={chart.title} />
              </BarChart>
            ) : (
              <LineChart data={chart.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fiscalYear" label={{ value: '年度', position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: chart.unit || '', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name={chart.title}
                  dot={{ fill: '#3b82f6', r: 5 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </Card>
      ))}
    </div>
  )
}

// 財務指標からチャートデータを生成するヘルパー関数
export function generateChartsFromMetrics(periods: Array<{
  fiscalYear: number
  profitLoss?: {
    netSales?: number
    operatingIncome?: number
  }
  metrics?: {
    netCash?: number
    ebitda?: number
    fcf?: number
    grossProfitMargin?: number
    operatingProfitMargin?: number
    currentRatio?: number
    roe?: number
    roa?: number
    receivablesTurnoverMonths?: number
    inventoryTurnoverMonths?: number
  }
}>): ChartData[] {
  const charts: ChartData[] = []

  // NetCash推移
  if (periods.some((p) => p.metrics?.netCash !== undefined)) {
    charts.push({
      title: 'NetCash / NetDebt推移',
      type: 'bar',
      unit: '百万円',
      data: periods.map((p) => ({
        fiscalYear: p.fiscalYear,
        value: Math.round((p.metrics?.netCash || 0) / 1000000),  // 百万円に変換
      })),
    })
  }

  // 売上高推移
  if (periods.some((p) => p.profitLoss?.netSales !== undefined)) {
    charts.push({
      title: '売上高推移',
      type: 'line',
      unit: '百万円',
      data: periods.map((p) => ({
        fiscalYear: p.fiscalYear,
        value: Math.round((p.profitLoss?.netSales || 0) / 1000000),  // 百万円に変換
      })),
    })
  }

  // 営業利益推移
  if (periods.some((p) => p.profitLoss?.operatingIncome !== undefined)) {
    charts.push({
      title: '営業利益推移',
      type: 'line',
      unit: '百万円',
      data: periods.map((p) => ({
        fiscalYear: p.fiscalYear,
        value: Math.round((p.profitLoss?.operatingIncome || 0) / 1000000),  // 百万円に変換
      })),
    })
  }

  // EBITDA推移
  if (periods.some((p) => p.metrics?.ebitda !== undefined)) {
    charts.push({
      title: 'EBITDA推移',
      type: 'bar',
      unit: '百万円',
      data: periods.map((p) => ({
        fiscalYear: p.fiscalYear,
        value: Math.round((p.metrics?.ebitda || 0) / 1000000),  // 百万円に変換
      })),
    })
  }

  // FCF推移
  if (periods.some((p) => p.metrics?.fcf !== undefined)) {
    charts.push({
      title: 'FCF推移',
      type: 'bar',
      unit: '百万円',
      data: periods.map((p) => ({
        fiscalYear: p.fiscalYear,
        value: Math.round((p.metrics?.fcf || 0) / 1000000),  // 百万円に変換
      })),
    })
  }

  // 売上総利益率推移
  if (periods.some((p) => p.metrics?.grossProfitMargin !== undefined)) {
    charts.push({
      title: '売上総利益率推移',
      type: 'line',
      unit: '%',
      data: periods.map((p) => ({
        fiscalYear: p.fiscalYear,
        value: p.metrics?.grossProfitMargin || 0,
      })),
    })
  }

  // 営業利益率推移
  if (periods.some((p) => p.metrics?.operatingProfitMargin !== undefined)) {
    charts.push({
      title: '営業利益率推移',
      type: 'line',
      unit: '%',
      data: periods.map((p) => ({
        fiscalYear: p.fiscalYear,
        value: p.metrics?.operatingProfitMargin || 0,
      })),
    })
  }

  // 流動比率推移
  if (periods.some((p) => p.metrics?.currentRatio !== undefined)) {
    charts.push({
      title: '流動比率推移',
      type: 'line',
      unit: '%',
      data: periods.map((p) => ({
        fiscalYear: p.fiscalYear,
        value: p.metrics?.currentRatio || 0,
      })),
    })
  }

  // ROE推移
  if (periods.some((p) => p.metrics?.roe !== undefined)) {
    charts.push({
      title: 'ROE推移',
      type: 'line',
      unit: '%',
      data: periods.map((p) => ({
        fiscalYear: p.fiscalYear,
        value: p.metrics?.roe || 0,
      })),
    })
  }

  // ROA推移
  if (periods.some((p) => p.metrics?.roa !== undefined)) {
    charts.push({
      title: 'ROA推移',
      type: 'line',
      unit: '%',
      data: periods.map((p) => ({
        fiscalYear: p.fiscalYear,
        value: p.metrics?.roa || 0,
      })),
    })
  }

  // 売掛金滞留月数推移
  if (periods.some((p) => p.metrics?.receivablesTurnoverMonths !== undefined)) {
    charts.push({
      title: '売掛金滞留月数推移',
      type: 'bar',
      unit: 'ヶ月',
      data: periods.map((p) => ({
        fiscalYear: p.fiscalYear,
        value: p.metrics?.receivablesTurnoverMonths || 0,
      })),
    })
  }

  // 棚卸資産滞留月数推移
  if (periods.some((p) => p.metrics?.inventoryTurnoverMonths !== undefined)) {
    charts.push({
      title: '棚卸資産滞留月数推移',
      type: 'bar',
      unit: 'ヶ月',
      data: periods.map((p) => ({
        fiscalYear: p.fiscalYear,
        value: p.metrics?.inventoryTurnoverMonths || 0,
      })),
    })
  }

  return charts
}
