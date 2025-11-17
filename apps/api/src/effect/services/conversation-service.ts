/**
 * Conversation Service - Effect-based CRUD operations
 */

import { Context, Effect, Layer } from "effect";
import type {
	Conversation,
	ConversationMessage,
	ConversationSummary,
} from "@angstromscd/shared-types";
import { DatabaseError, NotFoundError, ValidationError } from "../errors";
import { DatabaseService } from "./database-service";
import { LoggerService } from "./logger-service";

/**
 * Conversation list response
 */
export interface ConversationListResult {
	conversations: ConversationSummary[];
	total: number;
	page: number;
	limit: number;
}

/**
 * Conversation detail response
 */
export interface ConversationDetailResult {
	conversation: Conversation;
	messages: ConversationMessage[];
}

/**
 * Conversation service context tag
 */
export class ConversationService extends Context.Tag("ConversationService")<
	ConversationService,
	{
		readonly list: (
			userId: string,
			page: number,
			limit: number,
		) => Effect.Effect<ConversationListResult, DatabaseError>;

		readonly get: (
			conversationId: string,
			userId: string,
		) => Effect.Effect<ConversationDetailResult, DatabaseError | NotFoundError>;

		readonly create: (
			userId: string,
			data: { title: string; metadata?: Record<string, unknown> },
		) => Effect.Effect<Conversation, DatabaseError | ValidationError>;

		readonly addMessage: (
			conversationId: string,
			userId: string,
			message: {
				role: "user" | "assistant" | "system";
				content: string;
				model?: string;
				citations?: unknown[];
				pubmedArticles?: unknown[];
				metadata?: Record<string, unknown>;
			},
		) => Effect.Effect<ConversationMessage, DatabaseError | NotFoundError | ValidationError>;

		readonly delete: (
			conversationId: string,
			userId: string,
		) => Effect.Effect<boolean, DatabaseError>;
	}
>() {}

/**
 * Live implementation of Conversation service
 */
export const ConversationServiceLive = Layer.effect(
	ConversationService,
	Effect.gen(function* () {
		const db = yield* DatabaseService;
		const logger = yield* LoggerService;

		yield* logger.info("Conversation service initialized");

		return {
			/**
			 * List conversations for a user
			 */
			list: (userId: string, page: number, limit: number) =>
				Effect.gen(function* () {
					const offset = (page - 1) * limit;

					yield* Effect.log("Listing conversations", { userId, page, limit });

					// Get total count
					const countResult = yield* db.query<{ count: number }>(
						"conversation_summaries",
						(client) =>
							client
								.from("conversation_summaries")
								.select("*", { count: "exact", head: true })
								.eq("user_id", userId)
								.then((result) => ({
									data: { count: result.count || 0 },
									error: result.error,
								})),
					);

					// Get conversations
					const conversationsResult = yield* db.query<ConversationSummary[]>(
						"conversation_summaries",
						(client) =>
							client
								.from("conversation_summaries")
								.select("*")
								.eq("user_id", userId)
								.order("updated_at", { ascending: false })
								.range(offset, offset + limit - 1)
								.then((result) => ({
									data: result.data as ConversationSummary[] | null,
									error: result.error,
								})),
					);

					return {
						conversations: conversationsResult || [],
						total: countResult.count || 0,
						page,
						limit,
					};
				}).pipe(
					Effect.withSpan("ConversationService.list", {
						attributes: { userId, page, limit },
					}),
				),

			/**
			 * Get conversation details with messages
			 */
			get: (conversationId: string, userId: string) =>
				Effect.gen(function* () {
					yield* Effect.log("Getting conversation", { conversationId, userId });

					// Get conversation
					const conversation = yield* db
						.query<Conversation>("conversations", (client) =>
							client
								.from("conversations")
								.select("*")
								.eq("id", conversationId)
								.eq("user_id", userId)
								.single(),
						)
						.pipe(
							Effect.catchAll((error) => {
								if (error._tag === "DatabaseError" && error.cause === "No data returned") {
									return Effect.fail(
										new NotFoundError({
											resource: "conversation",
											id: conversationId,
										}),
									);
								}
								return Effect.fail(error);
							}),
						);

					// Get messages
					const messages = yield* db.query<ConversationMessage[]>(
						"conversation_messages",
						(client) =>
							client
								.from("conversation_messages")
								.select("*")
								.eq("conversation_id", conversationId)
								.order("created_at", { ascending: true })
								.then((result) => ({
									data: result.data as ConversationMessage[] | null,
									error: result.error,
								})),
					);

					return {
						conversation,
						messages: messages || [],
					};
				}).pipe(
					Effect.withSpan("ConversationService.get", {
						attributes: { conversationId, userId },
					}),
				),

			/**
			 * Create a new conversation
			 */
			create: (
				userId: string,
				data: { title: string; metadata?: Record<string, unknown> },
			) =>
				Effect.gen(function* () {
					if (!data.title || data.title.trim().length === 0) {
						return yield* Effect.fail(
							new ValidationError({
								message: "Title is required",
								field: "title",
							}),
						);
					}

					yield* Effect.log("Creating conversation", { userId, title: data.title });

					const conversation = yield* db.query<Conversation>("conversations", (client) =>
						client
							.from("conversations")
							.insert({
								user_id: userId,
								title: data.title,
								metadata: data.metadata || {},
							})
							.select()
							.single(),
					);

					return conversation;
				}).pipe(
					Effect.withSpan("ConversationService.create", {
						attributes: { userId },
					}),
				),

			/**
			 * Add a message to a conversation
			 */
			addMessage: (
				conversationId: string,
				userId: string,
				message: {
					role: "user" | "assistant" | "system";
					content: string;
					model?: string;
					citations?: unknown[];
					pubmedArticles?: unknown[];
					metadata?: Record<string, unknown>;
				},
			) =>
				Effect.gen(function* () {
					if (!message.content || message.content.trim().length === 0) {
						return yield* Effect.fail(
							new ValidationError({
								message: "Message content cannot be empty",
								field: "content",
							}),
						);
					}

					yield* Effect.log("Adding message to conversation", {
						conversationId,
						role: message.role,
					});

					// Verify conversation exists and belongs to user
					const _conversation = yield* db
						.query<{ id: string }>("conversations", (client) =>
							client
								.from("conversations")
								.select("id")
								.eq("id", conversationId)
								.eq("user_id", userId)
								.single(),
						)
						.pipe(
							Effect.catchAll((error) => {
								if (error._tag === "DatabaseError" && error.cause === "No data returned") {
									return Effect.fail(
										new NotFoundError({
											resource: "conversation",
											id: conversationId,
										}),
									);
								}
								return Effect.fail(error);
							}),
						);

					// Insert message
					const createdMessage = yield* db.query<ConversationMessage>(
						"conversation_messages",
						(client) =>
							client
								.from("conversation_messages")
								.insert({
									conversation_id: conversationId,
									role: message.role,
									content: message.content,
									model: message.model,
									citations: message.citations || [],
									pubmed_articles: message.pubmedArticles || [],
									metadata: message.metadata || {},
								})
								.select()
								.single(),
					);

					return createdMessage;
				}).pipe(
					Effect.withSpan("ConversationService.addMessage", {
						attributes: { conversationId, role: message.role },
					}),
				),

			/**
			 * Delete a conversation
			 */
			delete: (conversationId: string, userId: string) =>
				Effect.gen(function* () {
					yield* Effect.log("Deleting conversation", { conversationId, userId });

					yield* db.query<void>("conversations", (client) =>
						client
							.from("conversations")
							.delete()
							.eq("id", conversationId)
							.eq("user_id", userId)
							.then((result) => ({
								data: null as void | null,
								error: result.error,
							})),
					);

					return true;
				}).pipe(
					Effect.withSpan("ConversationService.delete", {
						attributes: { conversationId, userId },
					}),
				),
		};
	}),
);

/**
 * Test implementation of Conversation service
 */
export const ConversationServiceTest = Layer.succeed(ConversationService, {
	list: (_userId: string, _page: number, _limit: number) =>
		Effect.succeed({
			conversations: [],
			total: 0,
			page: 1,
			limit: 20,
		}),
	get: (_conversationId: string, _userId: string) =>
		Effect.succeed({
			conversation: {} as Conversation,
			messages: [],
		}),
	create: (
		_userId: string,
		_data: { title: string; metadata?: Record<string, unknown> },
	) => Effect.succeed({} as Conversation),
	addMessage: (
		_conversationId: string,
		_userId: string,
		_message: {
			role: "user" | "assistant" | "system";
			content: string;
			model?: string;
			citations?: unknown[];
			pubmedArticles?: unknown[];
			metadata?: Record<string, unknown>;
		},
	) => Effect.succeed({} as ConversationMessage),
	delete: (_conversationId: string, _userId: string) => Effect.succeed(true),
});
