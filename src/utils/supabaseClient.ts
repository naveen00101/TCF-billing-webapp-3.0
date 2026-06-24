import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
let supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

if (typeof window !== "undefined") {
  const storedUrl = localStorage.getItem("VITE_SUPABASE_URL");
  const storedKey = localStorage.getItem("VITE_SUPABASE_ANON_KEY");
  if (storedUrl) supabaseUrl = storedUrl.trim();
  if (storedKey) supabaseAnonKey = storedKey.trim();
}

export let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (e) {
    console.error("Failed to initialize Supabase client:", e);
  }
}

export const getSupabaseConfig = () => {
  return { url: supabaseUrl, key: supabaseAnonKey };
};

export const updateSupabaseClient = (url: string, key: string) => {
  supabaseUrl = url.trim();
  supabaseAnonKey = key.trim();
  if (typeof window !== "undefined") {
    localStorage.setItem("VITE_SUPABASE_URL", supabaseUrl);
    localStorage.setItem("VITE_SUPABASE_ANON_KEY", supabaseAnonKey);
  }
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } else {
    supabase = null;
  }
  return supabase;
};
