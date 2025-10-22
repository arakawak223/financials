import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // ブラウザ環境でのみ動作することを確認
  if (typeof window === 'undefined') {
    throw new Error('createClient should only be called in the browser');
  }

  // 環境変数を確認
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('=== Supabase Client Debug ===');
  console.log('ENV NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.log('ENV NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? 'SET' : 'NOT SET');
  console.log('window.location.origin:', window.location.origin);

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are not set');
  }

  // 実行時に完全なURLを構築
  let fullUrl: string;

  if (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://')) {
    // 完全なURLの場合、localhostを現在のオリジンに置き換える
    fullUrl = supabaseUrl.replace('http://localhost:3000', window.location.origin);
  } else {
    // 相対URLの場合は現在のオリジンを付与
    fullUrl = `${window.location.origin}${supabaseUrl}`;
  }

  console.log('Final Supabase URL:', fullUrl);
  console.log('============================');

  return createBrowserClient(fullUrl, supabaseKey);
}
