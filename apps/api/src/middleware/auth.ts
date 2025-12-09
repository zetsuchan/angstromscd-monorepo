import { AuthenticationError } from "@angstromscd/shared-types";
import { createClient } from "@supabase/supabase-js";
import type { Context, Next } from "hono";

const supabaseUrl = process.env.SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";

export interface AuthUser {
	id: string;
	email: string;
	role?: string;
}

declare module "hono" {
	interface ContextVariableMap {
		user: AuthUser;
	}
}

/**
 * Routes that don't require authentication
 */
const PUBLIC_ROUTES = [
	"/",
	"/health",
	"/health/db",
	"/auth/signup",
	"/auth/login",
	"/api/chat/models",
	"/api/chat/health",
	"/api/chat/ai-sdk/health",
];

/**
 * Check if a path matches any public route pattern
 */
function isPublicRoute(path: string): boolean {
	return PUBLIC_ROUTES.some((route) => {
		if (route === path) return true;
		if (route.endsWith("*") && path.startsWith(route.slice(0, -1))) return true;
		return false;
	});
}

/**
 * Auth middleware that validates Supabase JWT tokens
 *
 * Extracts the Bearer token from Authorization header,
 * verifies it with Supabase, and attaches user info to context.
 */
export async function authMiddleware(c: Context, next: Next) {
	const path = c.req.path;

	// Skip auth for public routes
	if (isPublicRoute(path)) {
		return next();
	}

	const authHeader = c.req.header("Authorization");

	if (!authHeader) {
		return c.json(
			{
				success: false,
				error: {
					code: "UNAUTHORIZED",
					message: "Missing Authorization header",
				},
			},
			401,
		);
	}

	if (!authHeader.startsWith("Bearer ")) {
		return c.json(
			{
				success: false,
				error: {
					code: "UNAUTHORIZED",
					message: "Invalid Authorization header format. Use: Bearer <token>",
				},
			},
			401,
		);
	}

	const token = authHeader.slice(7);

	try {
		// Create a client with the user's token to verify it
		const supabase = createClient(supabaseUrl, supabaseAnonKey, {
			global: {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		});

		const {
			data: { user },
			error,
		} = await supabase.auth.getUser();

		if (error || !user) {
			return c.json(
				{
					success: false,
					error: {
						code: "UNAUTHORIZED",
						message: error?.message || "Invalid or expired token",
					},
				},
				401,
			);
		}

		// Attach user to context for use in route handlers
		c.set("user", {
			id: user.id,
			email: user.email ?? "",
			role: user.user_metadata?.role || "viewer",
		});

		return next();
	} catch (err) {
		console.error("Auth middleware error:", err);
		return c.json(
			{
				success: false,
				error: {
					code: "UNAUTHORIZED",
					message: "Authentication failed",
				},
			},
			401,
		);
	}
}

/**
 * Helper to get the authenticated user from context
 * Throws if user is not authenticated (should not happen if middleware is applied)
 */
export function getAuthUser(c: Context): AuthUser {
	const user = c.get("user");
	if (!user) {
		throw new AuthenticationError("User not authenticated");
	}
	return user;
}
