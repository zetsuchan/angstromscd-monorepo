import {
	type ApiResponse,
	AuthenticationError,
	type Conversation,
	type ConversationDetailResponse,
	type ConversationListResponse,
	type ConversationMessage,
	type ConversationSummary,
	type CreateConversationRequest,
	type CreateMessageRequest,
	DatabaseError,
	NotFoundError,
	ValidationError,
	type ValidationErrorDetail,
	errorToApiError,
	isAppError,
} from "@angstromscd/shared-types";
import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../lib/db";

export const conversationsRouter = new Hono();

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

// Validation schemas
const createConversationSchema = z.object({
	title: z.string().min(1, "Title is required"),
	metadata: z.record(z.any()).optional(),
});

const createMessageSchema = z.object({
	conversation_id: z.string().uuid("Invalid conversation ID"),
	role: z.enum(["user", "assistant", "system"]),
	content: z.string().min(1, "Message content cannot be empty"),
	model: z.string().optional(),
	citations: z.array(z.any()).optional(),
	pubmed_articles: z.array(z.any()).optional(),
	metadata: z.record(z.any()).optional(),
});

// Middleware to extract user ID
const getUserId = (c: any): string => {
	const userId = c.req.header("X-User-Id");
	if (!userId) {
		throw new AuthenticationError("X-User-Id header is required");
	}
	return userId;
};

// Helper to convert Zod flatten() output to ValidationErrorDetail[]
const zodToValidationErrors = (
	flatErrors: z.typeToFlattenedError<any>,
): ValidationErrorDetail[] => {
	return [
		...Object.entries(flatErrors.fieldErrors || {}).flatMap(
			([field, messages]) =>
				(messages || []).map((message) => ({ field, message })),
		),
		...flatErrors.formErrors.map((message) => ({ field: "_form", message })),
	];
};

// List conversations
conversationsRouter.get("/", async (c) => {
	try {
		const userId = getUserId(c);
		const page = Number.parseInt(c.req.query("page") || "1");
		const limit = Number.parseInt(c.req.query("limit") || "20");
		const offset = (page - 1) * limit;

		// Get total count
		const { count } = await supabase
			.from("conversation_summaries")
			.select("*", { count: "exact", head: true })
			.eq("user_id", userId);

		// Get conversations
		const { data, error } = await supabase
			.from("conversation_summaries")
			.select("*")
			.eq("user_id", userId)
			.order("updated_at", { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			throw new DatabaseError("Failed to list conversations", undefined, error);
		}

		const response: ConversationListResponse = {
			conversations: data as ConversationSummary[],
			total: count || 0,
			page,
			limit,
		};

		return c.json(createApiResponse(response));
	} catch (error) {
		const response = createErrorResponse(error);
		const statusCode = isAppError(error) ? error.statusCode : 500;
		return c.json(response, statusCode);
	}
});

// Create conversation
conversationsRouter.post("/", async (c) => {
	try {
		const userId = getUserId(c);
		const body = await c.req.json();
		const parsed = createConversationSchema.safeParse(body);

		if (!parsed.success) {
			throw new ValidationError(
				"Invalid conversation data",
				zodToValidationErrors(parsed.error.flatten()),
			);
		}

		const { data, error } = await supabase
			.from("conversations")
			.insert({
				user_id: userId,
				title: parsed.data.title,
				metadata: parsed.data.metadata || {},
			})
			.select()
			.single();

		if (error) {
			throw new DatabaseError(
				"Failed to create conversation",
				undefined,
				error,
			);
		}

		return c.json(createApiResponse({ conversation: data as Conversation }));
	} catch (error) {
		const response = createErrorResponse(error);
		const statusCode = isAppError(error) ? error.statusCode : 500;
		return c.json(response, statusCode);
	}
});

// Get conversation details with messages
conversationsRouter.get("/:id", async (c) => {
	try {
		const userId = getUserId(c);
		const conversationId = c.req.param("id");

		// Get conversation
		const { data: conversation, error: convError } = await supabase
			.from("conversations")
			.select("*")
			.eq("id", conversationId)
			.eq("user_id", userId)
			.single();

		if (convError) {
			// Supabase PGRST116 = "no rows returned" - this is a 404, not a DB error
			if ((convError as any).code === "PGRST116") {
				throw new NotFoundError("Conversation", conversationId);
			}
			throw new DatabaseError(
				"Failed to get conversation",
				undefined,
				convError,
			);
		}

		if (!conversation) {
			throw new NotFoundError("Conversation", conversationId);
		}

		// Get messages
		const { data: messages, error: msgError } = await supabase
			.from("conversation_messages")
			.select("*")
			.eq("conversation_id", conversationId)
			.order("created_at", { ascending: true });

		if (msgError) {
			throw new DatabaseError("Failed to get messages", undefined, msgError);
		}

		const response: ConversationDetailResponse = {
			conversation: conversation as Conversation,
			messages: messages as ConversationMessage[],
		};

		return c.json(createApiResponse(response));
	} catch (error) {
		const response = createErrorResponse(error);
		const statusCode = isAppError(error) ? error.statusCode : 500;
		return c.json(response, statusCode);
	}
});

// Add message to conversation
conversationsRouter.post("/:id/messages", async (c) => {
	try {
		const userId = getUserId(c);
		const conversationId = c.req.param("id");
		const body = await c.req.json();

		// Verify conversation exists and belongs to user
		const { data: conversation, error: convError } = await supabase
			.from("conversations")
			.select("id")
			.eq("id", conversationId)
			.eq("user_id", userId)
			.single();

		if (convError) {
			// Supabase PGRST116 = "no rows returned" - this is a 404, not a DB error
			if ((convError as any).code === "PGRST116") {
				throw new NotFoundError("Conversation", conversationId);
			}
			throw new DatabaseError(
				"Failed to verify conversation ownership",
				undefined,
				convError,
			);
		}

		if (!conversation) {
			throw new NotFoundError("Conversation", conversationId);
		}

		const messageData = {
			...body,
			conversation_id: conversationId,
		};

		const parsed = createMessageSchema.safeParse(messageData);

		if (!parsed.success) {
			throw new ValidationError(
				"Invalid message data",
				zodToValidationErrors(parsed.error.flatten()),
			);
		}

		const { data, error } = await supabase
			.from("conversation_messages")
			.insert({
				conversation_id: parsed.data.conversation_id,
				role: parsed.data.role,
				content: parsed.data.content,
				model: parsed.data.model,
				citations: parsed.data.citations || [],
				pubmed_articles: parsed.data.pubmed_articles || [],
				metadata: parsed.data.metadata || {},
			})
			.select()
			.single();

		if (error) {
			throw new DatabaseError("Failed to create message", undefined, error);
		}

		return c.json(createApiResponse({ message: data as ConversationMessage }));
	} catch (error) {
		const response = createErrorResponse(error);
		const statusCode = isAppError(error) ? error.statusCode : 500;
		return c.json(response, statusCode);
	}
});

// Delete conversation
conversationsRouter.delete("/:id", async (c) => {
	try {
		const userId = getUserId(c);
		const conversationId = c.req.param("id");

		// First verify conversation exists and belongs to user
		const { data: existing, error: checkError } = await supabase
			.from("conversations")
			.select("id")
			.eq("id", conversationId)
			.eq("user_id", userId)
			.single();

		if (checkError) {
			// Supabase PGRST116 = "no rows returned" - this is a 404, not a DB error
			if ((checkError as any).code === "PGRST116") {
				throw new NotFoundError("Conversation", conversationId);
			}
			throw new DatabaseError(
				"Failed to verify conversation",
				undefined,
				checkError,
			);
		}

		if (!existing) {
			throw new NotFoundError("Conversation", conversationId);
		}

		// Proceed with delete
		const { error } = await supabase
			.from("conversations")
			.delete()
			.eq("id", conversationId)
			.eq("user_id", userId);

		if (error) {
			throw new DatabaseError(
				"Failed to delete conversation",
				undefined,
				error,
			);
		}

		return c.json(createApiResponse({ deleted: true }));
	} catch (error) {
		const response = createErrorResponse(error);
		const statusCode = isAppError(error) ? error.statusCode : 500;
		return c.json(response, statusCode);
	}
});
