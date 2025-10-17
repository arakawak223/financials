import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

  // 相対URLの場合は絶対URLに変換（ブラウザ環境のみ）
  if (typeof window !== 'undefined' && supabaseUrl.startsWith('/')) {
    supabaseUrl = `${window.location.origin}${supabaseUrl}`;
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('Supabase environment variables are not set');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
