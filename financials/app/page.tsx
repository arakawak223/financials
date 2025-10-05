import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Plus, BarChart3, FileText, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* ナビゲーションバー */}
      <nav className="w-full border-b border-b-foreground/10">
        <div className="max-w-7xl mx-auto flex justify-between items-center p-4 px-6">
          <div className="flex gap-6 items-center">
            <Link href="/" className="font-bold text-xl">
              財務分析アプリ
            </Link>
            <Link href="/analysis" className="text-sm hover:underline">
              分析一覧
            </Link>
            <Link href="/companies" className="text-sm hover:underline">
              企業管理
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            {hasEnvVars && <AuthButton />}
          </div>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto py-12 px-6">
          {/* ヘッダー */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-4">
              企業財務分析プラットフォーム
            </h1>
            <p className="text-xl text-gray-600">
              PDFから財務データを読み取り、専門的な分析レポートを自動生成
            </p>
          </div>

          {/* クイックアクション */}
          <div className="mb-12">
            <Link href="/analysis/new">
              <Button size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                新規財務分析を開始
              </Button>
            </Link>
          </div>

          {/* 機能紹介 */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="p-6">
              <FileText className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">PDF自動読み取り</h3>
              <p className="text-sm text-gray-600">
                決算書・勘定科目内訳書をアップロードするだけで、AIが自動でデータを抽出。手作業での入力は不要です。
              </p>
            </Card>

            <Card className="p-6">
              <BarChart3 className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">高度な財務分析</h3>
              <p className="text-sm text-gray-600">
                EBITDA、FCF、各種財務比率など、専門的な指標を自動計算。3期比較で推移を可視化します。
              </p>
            </Card>

            <Card className="p-6">
              <TrendingUp className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Excel・PowerPoint出力
              </h3>
              <p className="text-sm text-gray-600">
                分析結果をExcelとPowerPoint形式でエクスポート。クライアントへの報告資料が即座に完成。
              </p>
            </Card>
          </div>

          {/* 最近の分析（プレースホルダー） */}
          <div>
            <h2 className="text-2xl font-semibold mb-6">最近の分析</h2>
            <Card className="p-8 text-center text-gray-500">
              <p>まだ分析がありません</p>
              <p className="text-sm mt-2">
                「新規財務分析を開始」から最初の分析を作成しましょう
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* フッター */}
      <footer className="border-t py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-600">
          <p>© 2025 財務分析アプリ. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
