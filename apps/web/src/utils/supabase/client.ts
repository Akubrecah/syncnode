import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  'https://drxlsqhxgcihumvevxkl.supabase.co';

const supabaseKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  'sb_publishable_fnZH57EYy2JcZfGh_-NXSw_lXkY3aXt';

export const createClient = () => {
  try {
    return createBrowserClient(supabaseUrl, supabaseKey);
  } catch {
    return createSupabaseClient(supabaseUrl, supabaseKey);
  }
};

export const supabase = createClient();
