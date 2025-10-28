# Google Cloud Vision API を有効化する手順

## 方法1: Google Cloud Console（推奨）

1. 以下のURLにアクセスしてください：
   https://console.cloud.google.com/apis/library/vision.googleapis.com?project=custom-unison-476405-e4

2. 「**有効にする**」ボタンをクリック

3. 有効化が完了するまで数秒待ちます

## 方法2: gcloud コマンド

```bash
gcloud services enable vision.googleapis.com --project=custom-unison-476405-e4
```

## 確認方法

有効化後、以下のコマンドで確認できます：

```bash
node test-vision-ocr.js
```

成功すれば以下のような出力が表示されます：
```
✅ OCR成功！
検出されたテキスト: ...
✅ Vision API OCR テスト成功！
```

## エラーが出る場合

もしエラーが続く場合は、以下を確認してください：

1. **サービスアカウントの権限**
   - Cloud Vision API ユーザー (`roles/cloudvision.user`)
   - または、プロジェクト編集者 (`roles/editor`)

2. **APIの有効化状態**
   ```bash
   gcloud services list --enabled --project=custom-unison-476405-e4 | grep vision
   ```

3. **請求アカウントの設定**
   - Vision API は有料サービスです
   - Google Cloud プロジェクトに請求アカウントが設定されている必要があります
   - https://console.cloud.google.com/billing?project=custom-unison-476405-e4
