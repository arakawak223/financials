# カスタム科目体系フォーマット機能 - API仕様書

## 1. 概要

カスタム科目体系フォーマット機能のREST API仕様書です。

**ベースURL**: `/api`

## 2. エンドポイント一覧

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/account-formats` | フォーマット一覧取得 |
| POST | `/account-formats` | フォーマット作成 |
| GET | `/account-formats/{id}` | フォーマット詳細取得 |
| PUT | `/account-formats/{id}` | フォーマット更新 |
| DELETE | `/account-formats/{id}` | フォーマット削除 |
| POST | `/account-formats/{id}/assign` | 企業へのフォーマット割り当て |
| GET | `/companies/{id}/account-formats` | 企業に割り当てられたフォーマット一覧取得 |

## 3. API詳細

### 3.1 フォーマット一覧取得

**エンドポイント**: `GET /api/account-formats`

**説明**: 利用可能な科目フォーマットの一覧を取得します。

**クエリパラメータ**:
なし

**レスポンス** (200 OK):
```json
{
  "formats": [
    {
      "id": "uuid",
      "name": "製造業標準フォーマット",
      "description": "製造業向けの標準的な科目体系",
      "is_shared": true,
      "industry": {
        "id": "uuid",
        "name": "製造業"
      },
      "items": [
        {
          "id": "uuid",
          "category": "売上高",
          "account_name": "製品売上高",
          "display_order": 1,
          "level": 0,
          "is_total": false
        }
      ],
      "created_at": "2025-11-02T00:00:00Z",
      "updated_at": "2025-11-02T00:00:00Z"
    }
  ]
}
```

**エラーレスポンス** (500):
```json
{
  "error": "フォーマットの取得に失敗しました"
}
```

---

### 3.2 フォーマット作成

**エンドポイント**: `POST /api/account-formats`

**説明**: 新しい科目フォーマットを作成します。

**リクエストボディ**:
```json
{
  "name": "建設業カスタムフォーマット",
  "description": "建設業向けにカスタマイズしたフォーマット",
  "industry_id": "uuid", // 任意
  "is_shared": false,
  "items": [
    {
      "category": "売上高",
      "account_name": "完成工事高",
      "display_order": 1,
      "parent_id": null,
      "level": 0,
      "calculation_formula": null,
      "is_total": false
    },
    {
      "category": "売上高",
      "account_name": "工事収益",
      "display_order": 2,
      "parent_id": null,
      "level": 1,
      "calculation_formula": null,
      "is_total": false
    }
  ]
}
```

**バリデーション**:
- `name`: 必須、最大255文字
- `items`: 必須、配列、最低1つ以上の項目
- `items[].category`: 必須、「売上高」「売上原価」「売上総利益」のいずれか
- `items[].account_name`: 必須、最大200文字
- `items[].level`: 必須、0-3の整数

**レスポンス** (201 Created):
```json
{
  "format": {
    "id": "uuid",
    "name": "建設業カスタムフォーマット",
    "description": "建設業向けにカスタマイズしたフォーマット",
    "industry_id": "uuid",
    "is_shared": false,
    "items": [...],
    "created_at": "2025-11-02T00:00:00Z",
    "updated_at": "2025-11-02T00:00:00Z"
  }
}
```

**エラーレスポンス** (400):
```json
{
  "error": "必須フィールドが不足しています"
}
```

**エラーレスポンス** (500):
```json
{
  "error": "フォーマットの作成に失敗しました"
}
```

---

### 3.3 フォーマット詳細取得

**エンドポイント**: `GET /api/account-formats/{id}`

**説明**: 指定されたIDの科目フォーマット詳細を取得します。

**パスパラメータ**:
- `id` (required): フォーマットID (UUID)

**レスポンス** (200 OK):
```json
{
  "format": {
    "id": "uuid",
    "name": "製造業標準フォーマット",
    "description": "製造業向けの標準的な科目体系",
    "industry_id": "uuid",
    "is_shared": true,
    "industry": {
      "id": "uuid",
      "name": "製造業"
    },
    "items": [
      {
        "id": "uuid",
        "format_id": "uuid",
        "category": "売上高",
        "account_name": "製品売上高",
        "display_order": 1,
        "parent_id": null,
        "level": 0,
        "calculation_formula": null,
        "is_total": false,
        "created_at": "2025-11-02T00:00:00Z",
        "updated_at": "2025-11-02T00:00:00Z"
      }
    ],
    "created_at": "2025-11-02T00:00:00Z",
    "updated_at": "2025-11-02T00:00:00Z"
  }
}
```

**エラーレスポンス** (404):
```json
{
  "error": "フォーマットが見つかりません"
}
```

**エラーレスポンス** (500):
```json
{
  "error": "フォーマットの取得に失敗しました"
}
```

---

### 3.4 フォーマット更新

**エンドポイント**: `PUT /api/account-formats/{id}`

**説明**: 既存の科目フォーマットを更新します。

**パスパラメータ**:
- `id` (required): フォーマットID (UUID)

**リクエストボディ**:
```json
{
  "name": "製造業標準フォーマット v2",
  "description": "更新された説明",
  "industry_id": "uuid",
  "is_shared": true,
  "items": [
    {
      "category": "売上高",
      "account_name": "製品売上高",
      "display_order": 1,
      "parent_id": null,
      "level": 0,
      "calculation_formula": null,
      "is_total": false
    }
  ]
}
```

**注意事項**:
- `items`を含む場合、既存の項目は全て削除され、新しい項目に置き換えられます
- 部分更新も可能（更新したいフィールドのみ送信）

**レスポンス** (200 OK):
```json
{
  "format": {
    "id": "uuid",
    "name": "製造業標準フォーマット v2",
    ...
  }
}
```

**エラーレスポンス** (400):
```json
{
  "error": "バリデーションエラー"
}
```

**エラーレスポンス** (500):
```json
{
  "error": "フォーマットの更新に失敗しました"
}
```

---

### 3.5 フォーマット削除

**エンドポイント**: `DELETE /api/account-formats/{id}`

**説明**: 指定されたIDの科目フォーマットを削除します。

**パスパラメータ**:
- `id` (required): フォーマットID (UUID)

**レスポンス** (200 OK):
```json
{
  "success": true
}
```

**注意事項**:
- CASCADE設定により、関連する科目項目（account_format_items）も自動的に削除されます
- 企業に割り当て済みのフォーマットを削除すると、割り当て情報も削除されます

**エラーレスポンス** (500):
```json
{
  "error": "フォーマットの削除に失敗しました"
}
```

---

### 3.6 企業へのフォーマット割り当て

**エンドポイント**: `POST /api/account-formats/{id}/assign`

**説明**: 科目フォーマットを企業に割り当てます。

**パスパラメータ**:
- `id` (required): フォーマットID (UUID)

**リクエストボディ**:
```json
{
  "company_id": "uuid",
  "is_active": true
}
```

**バリデーション**:
- `company_id`: 必須

**動作**:
- `is_active = true`の場合、他のアクティブなフォーマットは自動的に非アクティブになります
- 既存の割り当てがある場合はUPSERTで更新されます（onConflict: company_id, format_id）

**レスポンス** (201 Created):
```json
{
  "assignment": {
    "id": "uuid",
    "company_id": "uuid",
    "format_id": "uuid",
    "is_active": true,
    "assigned_at": "2025-11-02T00:00:00Z",
    "format": {
      "id": "uuid",
      "name": "製造業標準フォーマット",
      "industry": {
        "id": "uuid",
        "name": "製造業"
      },
      "items": [...]
    }
  }
}
```

**エラーレスポンス** (400):
```json
{
  "error": "企業IDは必須です"
}
```

**エラーレスポンス** (500):
```json
{
  "error": "フォーマットの割り当てに失敗しました"
}
```

---

### 3.7 企業に割り当てられたフォーマット一覧取得

**エンドポイント**: `GET /api/companies/{id}/account-formats`

**説明**: 指定された企業に割り当てられている科目フォーマットの一覧を取得します。

**パスパラメータ**:
- `id` (required): 企業ID (UUID)

**クエリパラメータ**:
- `active_only` (optional): `true`の場合、アクティブなフォーマットのみ取得

**レスポンス** (200 OK):
```json
{
  "assignments": [
    {
      "id": "uuid",
      "company_id": "uuid",
      "format_id": "uuid",
      "is_active": true,
      "assigned_at": "2025-11-02T00:00:00Z",
      "format": {
        "id": "uuid",
        "name": "製造業標準フォーマット",
        "description": "...",
        "is_shared": true,
        "industry": {
          "id": "uuid",
          "name": "製造業"
        },
        "items": [
          {
            "id": "uuid",
            "category": "売上高",
            "account_name": "製品売上高",
            "display_order": 1,
            "level": 0,
            "is_total": false
          }
        ]
      }
    }
  ]
}
```

**エラーレスポンス** (500):
```json
{
  "error": "企業フォーマットの取得に失敗しました"
}
```

---

## 4. データモデル

### 4.1 AccountFormat
```typescript
interface AccountFormat {
  id: string
  name: string
  description: string | null
  industry_id: string | null
  is_shared: boolean
  created_by: string
  created_at: string
  updated_at: string

  // リレーション
  industry?: Industry
  items?: AccountFormatItem[]
}
```

### 4.2 AccountFormatItem
```typescript
interface AccountFormatItem {
  id: string
  format_id: string
  category: '売上高' | '売上原価' | '売上総利益'
  account_name: string
  display_order: number
  parent_id: string | null
  level: number // 0-3
  calculation_formula: string | null
  is_total: boolean
  created_at: string
  updated_at: string
}
```

### 4.3 CompanyAccountFormat
```typescript
interface CompanyAccountFormat {
  id: string
  company_id: string
  format_id: string
  is_active: boolean
  assigned_at: string
  assigned_by: string | null

  // リレーション
  format?: AccountFormat
}
```

## 5. エラーコード

| HTTPステータス | 説明 |
|---------------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 400 | リクエストが不正（バリデーションエラー等） |
| 404 | リソースが見つからない |
| 500 | サーバー内部エラー |

## 6. 認証・認可

現在、APIは認証無効化モードで動作しています（開発中）。
将来的にはSupabase Authを使用した認証機能が追加される予定です。

## 7. レート制限

現在、レート制限は設定されていません。

## 8. 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-11-02 | 1.0.0 | 初版作成 |
