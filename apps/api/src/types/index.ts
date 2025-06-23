// Re-export all shared types
export * from "@angstromscd/shared-types";

// API-specific types and overrides
import type { DbUser } from "@angstromscd/shared-types";
import type { User as SupabaseUser } from "@supabase/supabase-js";

// Extend Supabase types with our types
export interface AuthenticatedRequest {
	user: DbUser;
	supabaseUser: SupabaseUser;
}

// Request context type for Hono
export interface ApiContext {
	user?: AuthenticatedRequest;
	requestId: string;
}

// API-specific configurations
export interface ApiConfig {
	port: number;
	corsOrigins: string[];
	rateLimit: {
		windowMs: number;
		max: number;
	};
	features: {
		enableAuth: boolean;
		enableRateLimit: boolean;
		enableMetrics: boolean;
	};
}
