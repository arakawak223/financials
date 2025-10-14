# ポート54321を公開に設定する方法

## VSCodeでの設定手順

1. VSCode下部の「ポート」タブをクリック
2. ポート `54321` (Supabase API) を探す
3. 右クリックして「ポートの可視性」→「公開」を選択

## 設定完了後

1. ブラウザをリフレッシュ（Ctrl+Shift+R または Cmd+Shift+R）
2. ログインページで認証情報を入力:
   - Email: test@example.com
   - Password: test123456

## トラブルシューティング

もし「ポート」タブが見つからない場合:
- メニュー → 表示 → ターミナル
- ターミナルパネルの右側にタブが表示されます

## 代替方法: .env.localを手動で更新

ポートの可視性を公開に設定した後、環境変数を以下に変更:

```
NEXT_PUBLIC_SUPABASE_URL=https://verbose-lamp-qv7rq9vw9r9cx5j5-54321.app.github.dev
```

その後、Next.jsサーバーを再起動してください。
