import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // ブラウザで動的にURLを構築（Next.jsプロキシ経由）
  const supabaseUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/supabase`
    : process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return createBrowserClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
  );
}
