# 財務分析システム (Financial Analysis System)

Next.jsとSupabaseを使用した企業財務分析プラットフォーム

## 概要

このシステムは、企業の財務データを管理・分析するためのWebアプリケーションです。予算実績比較分析、企業間比較分析、AI による分析コメント生成などの機能を提供します。

## 主な機能

- **予算実績分析**: PDF から財務データを抽出し、予算と実績を比較分析
- **企業間比較分析**: 複数企業の財務指標を比較・ベンチマーク
- **AI 分析コメント生成**: Anthropic Claude による専門的な財務分析コメント生成
- **PDF アップロード**: Google Cloud Vision API による OCR 処理
- **時系列分析**: 複数年度にわたる財務データの推移分析
- **勘定科目フォーマット管理**: 企業ごとの勘定科目マッピング

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS
- **UI コンポーネント**: shadcn/ui
- **バックエンド**: Next.js API Routes, Supabase
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth
- **ストレージ**: Supabase Storage
- **AI**: Anthropic Claude API (Sonnet 4.5)
- **OCR**: Google Cloud Vision API

## ローカル開発環境のセットアップ

### 前提条件

- Node.js 18.x 以降
- npm または yarn
- Docker Desktop (Supabase ローカル環境用)
- Supabase CLI

### セットアップ手順

1. リポジトリをクローン

```bash
git clone <repository-url>
cd financials
```

2. 依存関係をインストール

```bash
npm install
```

3. Supabase ローカル環境を起動

```bash
supabase start
```

4. 環境変数を設定

`.env.example` を `.env.local` にコピーして、必要な環境変数を設定してください。

```bash
cp .env.example .env.local
```

必要な環境変数：
- `SUPABASE_URL`: Supabase プロジェクト URL
- `SUPABASE_ANON_KEY`: Supabase 匿名キー
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase サービスロールキー
- `ANTHROPIC_API_KEY`: Anthropic Claude API キー
- `GOOGLE_CLOUD_CREDENTIALS`: Google Cloud Vision API 認証情報 (JSON)

5. マイグレーションを実行

```bash
supabase db reset
```

6. 開発サーバーを起動

```bash
npm run dev
```

アプリケーションは [http://localhost:3000](http://localhost:3000) で起動します。

## プロダクション環境へのデプロイ

詳細なデプロイ手順は [`DEPLOYMENT_CHECKLIST.md`](../DEPLOYMENT_CHECKLIST.md) を参照してください。

### クイックデプロイ手順

#### 1. Supabase プロジェクトの作成

1. [Supabase Dashboard](https://app.supabase.com/) でプロジェクトを作成
2. マイグレーションファイルを順番に実行 (`supabase/migrations/` 内のファイル)
3. Storage バケット `financial-pdfs` を作成し、RLS ポリシーを設定 (`supabase/setup_storage_bucket.sql`)

#### 2. API キーの取得

- **Anthropic Claude API**: https://console.anthropic.com/settings/keys
- **Google Cloud Vision API**: https://console.cloud.google.com/apis/credentials

#### 3. Vercel へのデプロイ

```bash
npm i -g vercel
vercel login
cd financials
vercel
```

環境変数を Vercel Dashboard で設定後：

```bash
vercel --prod
```

## プロジェクト構造

```
financials/
├── app/                          # Next.js App Router ページ
│   ├── api/                      # API Routes
│   ├── analysis/                 # 財務分析ページ
│   ├── budget-vs-actual/         # 予算実績分析ページ
│   ├── company-comparison/       # 企業間比較分析ページ
│   └── companies/                # 企業管理ページ
├── components/                   # React コンポーネント
│   └── ui/                       # shadcn/ui コンポーネント
├── lib/                          # ユーティリティ関数
│   └── supabase/                 # Supabase クライアント
├── supabase/                     # Supabase 設定
│   ├── migrations/               # データベースマイグレーション
│   └── setup_storage_bucket.sql  # Storage バケット設定
└── public/                       # 静的ファイル
```

## データベーススキーマ

主要なテーブル：

- `companies`: 企業マスタ
- `financial_periods`: 会計期間
- `pl_data`: 損益計算書データ
- `budget_data`: 予算データ
- `industries`: 業種マスタ
- `account_formats`: 勘定科目フォーマット

詳細は `supabase/migrations/` 内のマイグレーションファイルを参照してください。

## API エンドポイント

- `POST /api/analyze-budget`: 予算実績分析 AI コメント生成
- `POST /api/analyze-comparison`: 企業間比較分析 AI コメント生成
- `POST /api/extract-financial-data`: PDF から財務データ抽出
- `POST /api/budget-vs-actual/upload-pdf`: 予算実績分析用 PDF アップロード
- `POST /api/company-comparison/quick-upload`: 企業間比較分析用 PDF アップロード

## 環境変数

### 必須

```bash
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Anthropic Claude API
ANTHROPIC_API_KEY=
NEXT_PUBLIC_ANTHROPIC_API_KEY=

# Google Cloud Vision API
GOOGLE_CLOUD_CREDENTIALS=
```

### オプション

```bash
# OpenAI API (現在未使用)
OPENAI_API_KEY=
NEXT_PUBLIC_OPENAI_API_KEY=
```

## ビルド

```bash
npm run build
```

## テスト

```bash
npm run test
```

## コントリビューション

プルリクエストを歓迎します。大きな変更の場合は、まず issue を開いて変更内容を議論してください。

## ライセンス

[MIT](LICENSE)

## サポート

問題や質問がある場合は、GitHub Issues でお知らせください。

## 関連ドキュメント

- [デプロイチェックリスト](../DEPLOYMENT_CHECKLIST.md)
- [Next.js ドキュメント](https://nextjs.org/docs)
- [Supabase ドキュメント](https://supabase.com/docs)
- [Anthropic Claude API ドキュメント](https://docs.anthropic.com/)
