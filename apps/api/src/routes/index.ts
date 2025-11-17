import {
	AuthenticationError,
	DatabaseError,
	ValidationError,
	errorToApiError,
	isAppError,
} from "@angstromscd/shared-types";
import type { ApiResponse, DbUser } from "@angstromscd/shared-types";
import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../lib/db";
import { EnhancedChatService } from "../services/enhanced-chat-service";
import { OutboxService } from "../services/outbox-service";
import { conversationsRouter } from "./conversations";
import queueRoutes from "./queue";
import { streamRouter } from "./stream";
import { chatAISDKRouter } from "./chat.ai-sdk";

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

// Initialize services used across routes
const chatService = new EnhancedChatService();
const outboxService = new OutboxService();

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
		const { error } = await supabase
			.from("conversation_messages")
			.select("id")
			.limit(1);
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
	conversation_id: z.string().uuid("Invalid conversation ID").optional(),
	thread_id: z.string().uuid("Invalid thread ID").optional(),
	role: z.enum(["user", "assistant", "system"]).optional(),
	model: z.string().optional(),
	citations: z.unknown().optional(),
	pubmed_articles: z.unknown().optional(),
	metadata: z.record(z.unknown()).optional(),
});

// create message
router.post("/api/messages", async (c) => {
	try {
		const body = (await c.req.json()) as unknown;
		const parsed = messageSchema.safeParse(body);

		if (!parsed.success) {
			throw new ValidationError("Invalid message data", parsed.error.flatten());
		}

		const {
			content,
			conversation_id,
			thread_id,
			role,
			model,
			citations,
			pubmed_articles,
			metadata,
		} = parsed.data;
		const conversationId = conversation_id ?? thread_id;
		if (!conversationId) {
			throw new ValidationError("Conversation ID is required", [
				{
					field: "conversation_id",
					message: "Provide a valid conversation identifier",
				},
			]);
		}

		const result = await outboxService.enqueueMessage({
			conversationId,
			role: role ?? "user",
			content,
			model,
			citations,
			pubmedArticles: pubmed_articles,
			metadata: metadata as Record<string, unknown> | undefined,
		});

		const response = createApiResponse({
			message: result.message,
			outbox: {
				id: result.outboxEntry.id,
				sequence: result.sequence,
				dedupeId: result.outboxEntry.dedupe_id,
				status: result.outboxEntry.status,
			},
		});
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
		const conversationFilter = c.req.query("conversation_id") ?? threadId;
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

		let query = supabase
			.from("conversation_messages")
			.select("*", { count: "exact" });

		if (conversationFilter) {
			query = query.eq("conversation_id", conversationFilter);
		}

		const { data, error, count } = await query
			.order("sequence", { ascending: true })
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
			visualizations: result.visualizations,
			executionCode: result.executionCode,
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

// Mount conversations router
router.route("/api/conversations", conversationsRouter);

// Mount queue routes
router.route("/api/queue", queueRoutes);

// Mount AI SDK chat routes
router.route("/", chatAISDKRouter);

// Realtime stream endpoints
router.route("/", streamRouter);
