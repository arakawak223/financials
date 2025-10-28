# サービスアカウントに Vision API 権限を付与する手順

## 方法1: Google Cloud Console（推奨）

1. IAMページにアクセス：
   https://console.cloud.google.com/iam-admin/iam?project=custom-unison-476405-e4

2. サービスアカウント `financials-vision-154@custom-unison-476405-e4.iam.gserviceaccount.com` を探す

3. サービスアカウントの右側の鉛筆アイコン（編集）をクリック

4. 「別のロールを追加」をクリック

5. 以下のロールを選択：
   - **Cloud Vision API ユーザー** (`roles/cloudvision.user`)

   または、より広い権限が必要な場合：
   - **編集者** (`roles/editor`)

6. 「保存」をクリック

## 方法2: gcloud コマンド

```bash
# Cloud Vision API ユーザー権限を付与
gcloud projects add-iam-policy-binding custom-unison-476405-e4 \
  --member="serviceAccount:financials-vision-154@custom-unison-476405-e4.iam.gserviceaccount.com" \
  --role="roles/cloudvision.user"
```

## 別の解決策: 新しいキーを生成

もし上記で解決しない場合は、サービスアカウントのキーを再生成してください：

1. サービスアカウントページにアクセス：
   https://console.cloud.google.com/iam-admin/serviceaccounts?project=custom-unison-476405-e4

2. `financials-vision-154@custom-unison-476405-e4.iam.gserviceaccount.com` をクリック

3. 「キー」タブをクリック

4. 古いキーを削除（オプション）

5. 「鍵を追加」→「新しい鍵を作成」→「JSON」を選択

6. ダウンロードした新しいJSONファイルの内容で `google-credentials.json` を置き換える

## 確認方法

設定変更後、以下のコマンドでテスト：

```bash
node test-vision-ocr.js
```

成功すれば：
```
✅ OCR成功！
検出されたテキスト: ...
✅ Vision API OCR テスト成功！
```
