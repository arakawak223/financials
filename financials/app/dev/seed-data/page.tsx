'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

export default function SeedDataPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message?: string
    data?: {
      industries: number
      companies: number
      analyses: number
      periods: number
    }
    error?: string
  } | null>(null)

  const handleSeedData = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/dev/seed-sample-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : '不明なエラーが発生しました',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card className="p-8">
        <h1 className="text-3xl font-bold mb-4">サンプルデータ投入</h1>
        <p className="text-gray-600 mb-6">
          開発用のサンプルデータをデータベースに投入します。
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>注意:</strong> このページは開発環境専用です。
          </p>
          <p className="text-sm text-yellow-700 mt-2">
            投入されるデータ:
          </p>
          <ul className="list-disc list-inside text-sm text-yellow-700 mt-1 ml-2">
            <li>業種: 5件</li>
            <li>企業グループ: 2件</li>
            <li>企業: 3件（サンプル製造、サンプル商事、テックイノベーション）</li>
            <li>財務分析: 3件</li>
            <li>財務期間: 8期分</li>
            <li>完全な財務データ（BS・PL・指標）</li>
          </ul>
        </div>

        <Button
          onClick={handleSeedData}
          disabled={loading}
          className="w-full mb-4"
          size="lg"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'データ投入中...' : 'サンプルデータを投入'}
        </Button>

        {result && (
          <Card className="p-4 mt-4">
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3
                  className={`font-semibold ${
                    result.success ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {result.success ? '成功' : 'エラー'}
                </h3>
                <p
                  className={`text-sm mt-1 ${
                    result.success ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {result.message || result.error}
                </p>
                {result.data && (
                  <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                    <p className="font-medium mb-2">投入されたデータ:</p>
                    <ul className="list-disc list-inside text-gray-700">
                      <li>業種: {result.data.industries}件</li>
                      <li>企業: {result.data.companies}件</li>
                      <li>財務分析: {result.data.analyses}件</li>
                      <li>財務期間: {result.data.periods}件</li>
                    </ul>
                  </div>
                )}
                {result.success && (
                  <Button
                    onClick={() => (window.location.href = '/analysis')}
                    variant="outline"
                    className="mt-4"
                  >
                    分析一覧ページへ →
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}
      </Card>
    </div>
  )
}
