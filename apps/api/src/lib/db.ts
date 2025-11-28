import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set");
}

// Client for normal operations (respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for operations that need to bypass RLS (e.g., user profile creation)
// Falls back to anon client if service role key not available
export const supabaseAdmin = supabaseServiceRoleKey
	? createClient(supabaseUrl, supabaseServiceRoleKey)
	: supabase;
