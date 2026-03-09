import { createClient } from '@supabase/supabase-js'

// These are set as environment variables in Netlify dashboard
// (safe to expose - they're public anon keys, security is via Row Level Security)
const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null
