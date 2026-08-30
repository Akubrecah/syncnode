import { createBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  'https://drxlsqhxgcihumvevxkl.supabase.co';

export const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  'sb_publishable_fnZH57EYy2JcZfGh_-NXSw_lXkY3aXt';

export const SUPABASE_AUTH_CALLBACK_URL = `${SUPABASE_URL}/auth/v1/callback`;

export const createClient = () => {
  try {
    return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch {
    return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
};

export const supabase = createClient();
export const getSupabase = () => supabase;

/**
 * Initiates Google OAuth authentication via Supabase.
 * Callback URL: https://drxlsqhxgcihumvevxkl.supabase.co/auth/v1/callback
 * Redirects user back to local app / dashboard on completion.
 */
export const signInWithGoogle = async (redirectTo?: string) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const targetRedirect = redirectTo || `${origin}/dashboard`;
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: targetRedirect,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  if (error) throw error;
  return data;
};

/**
 * Initiates GitHub OAuth authentication via Supabase.
 */
export const signInWithGithub = async (redirectTo?: string) => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const targetRedirect = redirectTo || `${origin}/dashboard`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: targetRedirect,
    },
  });
  if (error) throw error;
  return data;
};

/**
 * Sign in with email and password via Supabase.
 */
export const signInWithEmail = async (email: string, pass: string) => {
  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: pass,
  });
  if (error) throw error;
  return data;
};

/**
 * Sign up with email, password, and metadata via Supabase.
 * Directly records into Supabase Auth and attempts public profile save.
 */
export const signUpWithEmail = async (email: string, pass: string, fullName?: string) => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = fullName?.trim() || cleanEmail.split('@')[0];

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: pass,
    options: {
      data: {
        full_name: cleanName,
      },
    },
  });
  if (error) throw error;

  if (data?.user) {
    try {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: cleanEmail,
        full_name: cleanName,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Optional profile table
    }
  }

  return data;
};

/**
 * Synchronize Supabase authenticated user with Syncnode backend
 */
export const syncSupabaseUserWithBackend = async (supabaseUser: any, sessionToken?: string) => {
  if (!supabaseUser || !supabaseUser.email) return null;
  try {
    const res = await fetch('/api/v1/auth/supabase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supabaseId: supabaseUser.id,
        email: supabaseUser.email,
        fullName:
          supabaseUser.user_metadata?.full_name ||
          supabaseUser.user_metadata?.name ||
          supabaseUser.email.split('@')[0],
        avatarUrl:
          supabaseUser.user_metadata?.avatar_url ||
          supabaseUser.user_metadata?.picture ||
          null,
        accessToken: sessionToken || null,
        provider: supabaseUser.app_metadata?.provider || 'supabase',
      }),
    });
    const json = await res.json();
    if (json.success && json.token) {
      localStorage.setItem('syncnode_token', json.token);
      if (json.refreshToken) localStorage.setItem('syncnode_refresh_token', json.refreshToken);
      if (json.user) localStorage.setItem('syncnode_user', JSON.stringify(json.user));
      return json;
    }
  } catch (err) {
    console.warn('Failed to sync Supabase user with backend:', err);
  }
  return null;
};

/**
 * Sign out of Supabase session
 */
export const signOutSupabase = async () => {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('Supabase sign out error:', e);
  }
};
