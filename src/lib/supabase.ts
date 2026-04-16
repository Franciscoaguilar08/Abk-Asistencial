/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

let rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
let sanitizedUrl = rawUrl;
try {
  if (rawUrl) {
    const parsed = new URL(rawUrl);
    sanitizedUrl = parsed.origin; // Ensures it's exactly the base URL (no trailing slash, no /auth/v1)
  }
} catch (e) {
  // ignore
}

const supabaseUrl = sanitizedUrl || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

export const isSupabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
