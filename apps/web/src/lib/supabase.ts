import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://drxlsqhxgcihumvevxkl.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_fnZH57EYy2JcZfGh_-NXSw_lXkY3aXt';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const getSupabase = () => supabase;
