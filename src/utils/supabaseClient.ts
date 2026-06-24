import { createClient, SupabaseClient } from '@supabase/supabase-js';

const HARDCODED_URL = "https://xzfrbhtrcjtaafjkonbo.supabase.co";
const HARDCODED_KEY = "sb_publishable_6hdjwsq0hLbulI0k2LiZjA_d9ItftE0";

let supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || HARDCODED_URL).trim();
let supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || HARDCODED_KEY).trim();

if (typeof window !== "undefined") {
  const storedUrl = localStorage.getItem("VITE_SUPABASE_URL");
  const storedKey = localStorage.getItem("VITE_SUPABASE_ANON_KEY");
  if (storedUrl) supabaseUrl = storedUrl.trim();
  else if (!supabaseUrl) supabaseUrl = HARDCODED_URL;

  if (storedKey) supabaseAnonKey = storedKey.trim();
  else if (!supabaseAnonKey) supabaseAnonKey = HARDCODED_KEY;
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
