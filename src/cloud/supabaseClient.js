import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const supabaseConfigured = Boolean(
  url && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url) &&
  publishableKey && (publishableKey.startsWith('sb_publishable_') || publishableKey.startsWith('eyJ'))
);

// No dummy connection, leaked secret, or silent fallback to an unrelated project.
export const supabase = supabaseConfigured
  ? createClient(url, publishableKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      autoRefreshToken: true,
      persistSession: true,
    },
  })
  : null;
