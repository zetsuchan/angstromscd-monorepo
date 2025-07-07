import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../lib/db";
import { EnhancedChatService } from "../services/enhanced-chat-service";
import { 
  DatabaseError,
  ValidationError,
  AuthenticationError,
  isAppError,
  errorToApiError
} from "@angstromscd/shared-types";
import type { 
  ApiResponse, 
  DbMessage, 
  DbUser
} from "@angstromscd/shared-types";

export const router = new Hono();

// Type-safe wrapper for API responses
function createApiResponse<T>(data: T): ApiResponse<T> {
	return {
		success: true,
		data,
		meta: {
			requestId: crypto.randomUUID(),
			timestamp: new Date().toISOString(),
			version: "1.0.0",
		},
	};
}

function createErrorResponse(error: unknown): ApiResponse<never> {
	return {
		success: false,
		error: errorToApiError(error),
		meta: {
			requestId: crypto.randomUUID(),
			timestamp: new Date().toISOString(),
			version: "1.0.0",
		},
	};
}

// Initialize enhanced chat service
const chatService = new EnhancedChatService()

// health endpoint
router.get("/health", (c) => {
	const response = createApiResponse({
		status: "ok",
		timestamp: new Date().toISOString(),
	});
	return c.json(response);
});

router.get("/health/db", async (c) => {
	try {
		const { error } = await supabase.from("messages").select("id").limit(1);
		if (error) {
			throw new DatabaseError("health check", error);
		}
		return c.json(createApiResponse({ status: "ok", database: "connected" }));
	} catch (error) {
		const response = createErrorResponse(error);
		const statusCode = isAppError(error) ? error.statusCode : 500;
		return c.json(response, statusCode);
	}
});

// Validation schemas
const authSchema = z.object({
	email: z.string().email("Invalid email format"),
	password: z.string().min(8, "Password must be at least 8 characters"),
});

// user signup
router.post("/auth/signup", async (c) => {
	try {
		const body = (await c.req.json()) as unknown;
		const parsed = authSchema.safeParse(body);

		if (!parsed.success) {
			throw new ValidationError("Invalid signup data", parsed.error.flatten());
		}

		const { data, error } = await supabase.auth.signUp({
			email: parsed.data.email,
			password: parsed.data.password,
		});

		if (error) {
			throw new AuthenticationError(error.message);
		}

		if (!data.user) {
			throw new AuthenticationError("Failed to create user");
		}

		// TODO: Create user profile in our database
		// const dbUser: Partial<DbUser> = {
		// 	id: data.user.id,
		// 	email: data.user.email!,
		// 	role: "viewer",
		// 	created_at: new Date().toISOString(),
		// 	updated_at: new Date().toISOString(),
		// };
		// await supabase.from("users").insert(dbUser);

		const response = createApiResponse({
			user: {
				id: data.user.id,
				email: data.user.email!,
				role: "viewer" as const,
			},
			session: data.session
				? {
						token: data.session.access_token,
						expiresAt: new Date(data.session.expires_at! * 1000),
						refreshToken: data.session.refresh_token,
					}
				: undefined,
		});

		return c.json(response);
	} catch (error) {
		const response = createErrorResponse(error);
		const statusCode = isAppError(error) ? error.statusCode : 500;
		return c.json(response, statusCode);
	}
});

// user login
router.post("/auth/login", async (c) => {
	try {
		const body = (await c.req.json()) as unknown;
		const parsed = authSchema.safeParse(body);

		if (!parsed.success) {
			throw new ValidationError("Invalid login data", parsed.error.flatten());
		}

		const { data, error } = await supabase.auth.signInWithPassword({
			email: parsed.data.email,
			password: parsed.data.password,
		});

		if (error) {
			throw new AuthenticationError("Invalid email or password");
		}

		if (!data.user || !data.session) {
			throw new AuthenticationError("Login failed");
		}

		const response = createApiResponse({
			user: {
				id: data.user.id,
				email: data.user.email!,
				role: "viewer" as const, // Would fetch from DB in production
			},
			session: {
				token: data.session.access_token,
				expiresAt: new Date(data.session.expires_at! * 1000),
				refreshToken: data.session.refresh_token,
			},
		});

		return c.json(response);
	} catch (error) {
		const response = createErrorResponse(error);
		const statusCode = isAppError(error) ? error.statusCode : 500;
		return c.json(response, statusCode);
	}
});

// Message schema
const messageSchema = z.object({
	content: z.string().min(1, "Message content cannot be empty"),
	thread_id: z.string().uuid("Invalid thread ID").optional(),
	user_id: z.string().uuid("Invalid user ID").optional(),
});

// create message
router.post("/api/messages", async (c) => {
	try {
		const body = (await c.req.json()) as unknown;
		const parsed = messageSchema.safeParse(body);

		if (!parsed.success) {
			throw new ValidationError("Invalid message data", parsed.error.flatten());
		}

		const messageData: Partial<DbMessage> = {
			...parsed.data,
			sender: "user",
			created_at: new Date().toISOString(),
		};

		const { data, error } = await supabase
			.from("messages")
			.insert(messageData)
			.select()
			.single();

		if (error) {
			throw new DatabaseError("create message", error);
		}

		if (!data) {
			throw new DatabaseError("create message", "No data returned");
		}

		const response = createApiResponse({ message: data });
		return c.json(response);
	} catch (error) {
		const response = createErrorResponse(error);
		const statusCode = isAppError(error) ? error.statusCode : 500;
		return c.json(response, statusCode);
	}
});

// list messages
router.get("/api/messages", async (c) => {
	try {
		// Parse query parameters
		const threadId = c.req.query("thread_id");
		const limitStr = c.req.query("limit") || "50";
		const offsetStr = c.req.query("offset") || "0";
		
		const limit = Number.parseInt(limitStr);
		const offset = Number.parseInt(offsetStr);

		// Validate parameters
		if (Number.isNaN(limit) || limit < 1 || limit > 100) {
			throw new ValidationError("Limit must be a number between 1 and 100");
		}
		
		if (Number.isNaN(offset) || offset < 0) {
			throw new ValidationError("Offset must be a non-negative number");
		}

		let query = supabase.from("messages").select("*", { count: "exact" });

		if (threadId) {
			query = query.eq("thread_id", threadId);
		}

		const { data, error, count } = await query
			.order("created_at", { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			throw new DatabaseError("list messages", error);
		}

		const response = createApiResponse({
			messages: data || [],
			pagination: {
				total: count || 0,
				limit,
				offset,
				hasMore: (count || 0) > offset + limit,
			},
		});

		return c.json(response);
	} catch (error) {
		const response = createErrorResponse(error);
		const statusCode = isAppError(error) ? error.statusCode : 500;
		return c.json(response, statusCode);
	}
});

// Chat endpoints
const chatRequestSchema = z.object({
	message: z.string().min(1, "Message cannot be empty"),
	model: z.string().optional(),
});

// Main chat endpoint
router.post("/api/chat", async (c) => {
	try {
		const body = (await c.req.json()) as unknown;
		const parsed = chatRequestSchema.safeParse(body);

		if (!parsed.success) {
			throw new ValidationError("Invalid chat request", parsed.error.flatten());
		}

		const { message, model } = parsed.data;
		const result = await chatService.processMessage(message, model);

		const response = createApiResponse({
			reply: result.reply,
			citations: result.citations,
			pubmedArticles: result.pubmedArticles,
			model: result.model,
		});

		return c.json(response);
	} catch (error) {
		const response = createErrorResponse(error);
		const statusCode = isAppError(error) ? error.statusCode : 500;
		return c.json(response, statusCode);
	}
});

// Chat health check
router.get("/api/chat/health", async (c) => {
	try {
		const isConnected = await chatService.testConnection();
		
		const response = createApiResponse({
			status: isConnected ? "connected" : "disconnected",
			meditronAvailable: isConnected,
			timestamp: new Date().toISOString(),
		});

		return c.json(response);
	} catch (error) {
		const response = createErrorResponse(error);
		const statusCode = isAppError(error) ? error.statusCode : 500;
		return c.json(response, statusCode);
	}
});
