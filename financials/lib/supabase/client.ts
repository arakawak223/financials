import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // ブラウザ環境でのみ動作することを確認
  if (typeof window === 'undefined') {
    throw new Error('createClient should only be called in the browser');
  }

  // 環境変数を確認
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not set');
  }

  // 実行時に完全なURLを構築
  let fullUrl: string;

  // Supabase CloudのURLの場合はそのまま使用（本番環境）
  if (supabaseUrl.includes('.supabase.co')) {
    fullUrl = supabaseUrl;
  }
  // 完全なURLの場合（Codespaces等）
  else if (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://')) {
    // localhostを現在のオリジンに置き換える（Codespaces対応）
    fullUrl = supabaseUrl.replace('http://localhost:3000', window.location.origin);
  }
  // 相対URLの場合（/api/supabase等）
  else {
    fullUrl = `${window.location.origin}${supabaseUrl}`;
  }

  return createBrowserClient(fullUrl, supabaseKey);
}
