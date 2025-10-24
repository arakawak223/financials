# Supabase Storage セットアップ手順

PDFアップロード機能を使用するには、Supabase Storageの設定が必要です。

## 1. Storageバケットの作成

1. [Supabase Dashboard](https://supabase.com/dashboard) → プロジェクトを選択
2. 左メニューから **Storage** をクリック
3. **New Bucket** をクリック
4. 以下を入力：
   - **Name**: `financial-documents`
   - **Public bucket**: ✅ チェックを入れる
   - **File size limit**: 50MB（お好みで調整）
5. **Create bucket** をクリック

## 2. ストレージポリシーの設定

作成したバケットにアクセス権限を設定します：

### 方法1: ダッシュボードから設定

1. `financial-documents` バケットをクリック
2. **Policies** タブを開く
3. 以下の3つのポリシーを追加：

#### アップロード許可ポリシー

**Name**: `Allow authenticated upload`

```sql
CREATE POLICY "Allow authenticated upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'financial-documents');
```

#### 読み取り許可ポリシー

**Name**: `Allow public read`

```sql
CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'financial-documents');
```

#### 削除許可ポリシー

**Name**: `Allow authenticated delete`

```sql
CREATE POLICY "Allow authenticated delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'financial-documents');
```

### 方法2: SQL Editorから一括設定

Supabase Dashboard → **SQL Editor** を開き、以下を実行：

```sql
-- アップロード許可
CREATE POLICY "Allow authenticated upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'financial-documents');

-- 読み取り許可（パブリック）
CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'financial-documents');

-- 削除許可
CREATE POLICY "Allow authenticated delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'financial-documents');
```

## 3. 認証なしでのアップロード許可（開発用）

開発中で認証を無効化している場合、以下のポリシーも追加してください：

```sql
-- 認証なしでもアップロード可能（開発用のみ！）
CREATE POLICY "Allow anonymous upload for development" ON storage.objects
FOR INSERT TO anon
WITH CHECK (bucket_id = 'financial-documents');
```

⚠️ **本番環境では必ずこのポリシーを削除してください！**

## 4. 確認方法

### ダッシュボードで確認

1. Storage → `financial-documents` → Policies
2. 3つ（または4つ）のポリシーが表示されていればOK

### 実際にアップロードしてテスト

1. アプリで「新規財務分析」を作成
2. PDFファイルをアップロード
3. エラーが出なければ成功！

## トラブルシューティング

### エラー: "Bucket not found"

→ バケット名が間違っているか、バケットが作成されていません
- バケット名が `financial-documents` であることを確認

### エラー: "Row level security policy violated"

→ ポリシーが設定されていないか、不足しています
- 上記のポリシーがすべて設定されているか確認

### エラー: "Invalid key"

→ ファイルパスに問題があります
- 最新のコードでは自動的にサニタイズされるはずです
- それでもエラーが出る場合は、GitHub Issuesで報告してください

## 参考リンク

- [Supabase Storage ドキュメント](https://supabase.com/docs/guides/storage)
- [Storage Policies](https://supabase.com/docs/guides/storage/security/access-control)
