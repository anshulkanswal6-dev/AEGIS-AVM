import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Pre-flight check: If URL is missing or malformed, provide a safe fallback ID to prevent crash
const isConfigured = supabaseUrl && supabaseUrl.startsWith('https://');
const safeUrl = isConfigured ? supabaseUrl : 'https://temp.supabase.co'
const safeKey = isConfigured ? supabaseAnonKey : 'no-key'

export const supabase = createClient(safeUrl, safeKey)
