import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://drxlsqhxgcihumvevxkl.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_fnZH57EYy2JcZfGh_-NXSw_lXkY3aXt';

export const createClient = () => {
  return createSupabaseClient(supabaseUrl, supabaseKey);
};

export const supabase = createClient();
