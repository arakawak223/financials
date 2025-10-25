# Supabase Storage 設定ガイド

PDF自動読み込み機能を使用するには、本番環境のSupabase Storageを設定する必要があります。

## 📋 設定手順

### ステップ1: Supabase Dashboardにアクセス

1. ブラウザで本番環境のSupabaseにアクセス
   - URL: https://supabase.com/dashboard
   - プロジェクトを選択

2. 左サイドバーから **Storage** を選択

---

### ステップ2: Storageバケットを作成

#### 2-1. 既存バケットの確認

**確認項目:**
- `financial-documents` という名前のバケットが既に存在するか確認
- 存在する場合 → ステップ3に進む
- 存在しない場合 → 以下の手順で作成

#### 2-2. 新規バケット作成

1. **「New bucket」または「Create a new bucket」をクリック**

2. **バケット設定:**
   ```
   Name: financial-documents
   Public bucket: ☐ オフ（チェックを外す）
   File size limit: 50 MB（デフォルト）
   Allowed MIME types: (空欄のままでOK)
   ```

3. **「Create bucket」をクリック**

**✅ 確認:**
- バケット一覧に `financial-documents` が表示されればOK
- Public: `private` になっていることを確認

---

### ステップ3: Storage Policiesを設定

#### 3-1. Policiesページにアクセス

1. Storage > `financial-documents` バケットをクリック
2. 上部タブの **「Policies」** をクリック

#### 3-2. ポリシーの確認

**以下の3つのポリシーが必要です:**
- ✅ Allow authenticated upload
- ✅ Allow authenticated read
- ✅ Allow authenticated delete

既に存在する場合 → ステップ4に進む
存在しない場合 → 以下の手順で作成

#### 3-3. ポリシー作成手順

##### **ポリシー1: アップロード許可**

1. **「New policy」をクリック**
2. **「Create a policy from scratch」を選択**
3. 以下を入力:

```
Policy name: Allow authenticated upload
Allowed operation: INSERT
Target roles: authenticated

WITH CHECK expression:
bucket_id = 'financial-documents'
```

4. **「Review」→「Save policy」をクリック**

##### **ポリシー2: 読み取り許可**

1. **「New policy」をクリック**
2. **「Create a policy from scratch」を選択**
3. 以下を入力:

```
Policy name: Allow authenticated read
Allowed operation: SELECT
Target roles: authenticated

USING expression:
bucket_id = 'financial-documents'
```

4. **「Review」→「Save policy」をクリック**

##### **ポリシー3: 削除許可**

1. **「New policy」をクリック**
2. **「Create a policy from scratch」を選択**
3. 以下を入力:

```
Policy name: Allow authenticated delete
Allowed operation: DELETE
Target roles: authenticated

USING expression:
bucket_id = 'financial-documents'
```

4. **「Review」→「Save policy」をクリック**

#### 3-4. SQL Editorで一括作成（代替方法）

もしくは、SQL Editorで以下を実行して一括作成できます:

1. **左サイドバー > SQL Editor をクリック**
2. **「New query」をクリック**
3. 以下のSQLを貼り付けて実行:

```sql
-- ポリシー1: アップロード許可
CREATE POLICY "Allow authenticated upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'financial-documents');

-- ポリシー2: 読み取り許可
CREATE POLICY "Allow authenticated read"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'financial-documents');

-- ポリシー3: 削除許可
CREATE POLICY "Allow authenticated delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'financial-documents');
```

4. **「Run」をクリック**

**✅ 確認:**
- エラーなく実行完了
- Storage > financial-documents > Policies で3つのポリシーが表示される

---

### ステップ4: データベースマイグレーション実行

#### 4-1. SQL Editorにアクセス

1. **左サイドバー > SQL Editor をクリック**
2. **「New query」をクリック**

#### 4-2. マイグレーションSQLを実行

以下のSQLを貼り付けて実行:

```sql
-- Add columns for Supabase Storage support
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS ocr_status VARCHAR(20) DEFAULT 'pending';

-- Migrate existing data
UPDATE uploaded_files
SET file_size = file_size_bytes
WHERE file_size IS NULL AND file_size_bytes IS NOT NULL;

UPDATE uploaded_files
SET ocr_status = CASE
  WHEN ocr_applied = TRUE THEN 'completed'
  WHEN ocr_applied = FALSE THEN 'pending'
  ELSE 'pending'
END
WHERE ocr_status = 'pending' AND ocr_applied IS NOT NULL;
```

**✅ 確認:**
- エラーなく実行完了
- Table Editor > uploaded_files で新しいカラムが追加されている:
  - file_url
  - mime_type
  - file_size
  - ocr_status

---

### ステップ5: 設定の動作確認（オプション）

#### 5-1. テストアップロード

1. **Storage > financial-documents をクリック**
2. **「Upload file」をクリック**
3. 任意のPDFファイルをアップロード
4. アップロードが成功すればOK

#### 5-2. テストファイル削除

- アップロードしたテストファイルを削除してOK

---

## ✅ 設定完了チェックリスト

設定が完了したら、以下をチェックしてください:

- [ ] Storageバケット `financial-documents` が作成されている
- [ ] Public bucket: `private` になっている
- [ ] 3つのポリシーが設定されている:
  - [ ] Allow authenticated upload
  - [ ] Allow authenticated read
  - [ ] Allow authenticated delete
- [ ] データベースマイグレーションが完了している
- [ ] uploaded_files テーブルに新しいカラムが追加されている

---

## 🚀 次のステップ

すべての設定が完了したら:

1. **Vercel環境変数を確認**
   - Vercel Dashboard > Settings > Environment Variables
   - 本番環境のSupabase接続情報が設定されているか確認

2. **デプロイ実行**
   ```bash
   git push origin main
   ```

3. **本番環境でテスト**
   - https://your-app.vercel.app/analysis/new
   - PDFアップロード機能をテスト

---

## 🔧 トラブルシューティング

### エラー: "new row violates row-level security policy"

**原因:** Storage Policiesが正しく設定されていない

**解決策:**
1. Storage > financial-documents > Policies を確認
2. 3つのポリシーがすべて `enabled` になっているか確認
3. ポリシーのSQL式が正しいか確認

### エラー: "Bucket not found"

**原因:** バケット名が間違っている

**解決策:**
1. Storage で `financial-documents` という名前のバケットが存在するか確認
2. スペルミスがないか確認（ハイフンに注意）

### エラー: "column does not exist"

**原因:** マイグレーションが実行されていない

**解決策:**
1. SQL Editor でマイグレーションSQLを再実行
2. Table Editor > uploaded_files でカラムが追加されているか確認

---

## 📞 サポート

設定中に問題が発生した場合は、以下の情報を共有してください:

1. エラーメッセージ全文
2. 実行したSQL（該当する場合）
3. スクリーンショット（可能であれば）
