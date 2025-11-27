/**
 * Conversation Service - Unit Tests
 *
 * Tests for NotFoundError detection and error handling
 */

import { describe, it, expect } from "bun:test";
import { Effect, Layer, Logger, LogLevel } from "effect";
import { ConversationService, ConversationServiceLive } from "./conversation-service";
import { DatabaseService } from "./database-service";
import { LoggerService, LoggerServiceTest } from "./logger-service";
import { ConfigService, ConfigServiceTest } from "./config-service";
import { DatabaseError, NotFoundError } from "../errors";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Mock Database Service that simulates "not found" scenarios
 */
const DatabaseNotFoundMock = Layer.succeed(DatabaseService, {
	client: null as unknown as SupabaseClient,
	query: <T>(_table: string, _operation: (client: SupabaseClient) => Promise<{ data: T | null; error: unknown }>) =>
		Effect.fail(
			new DatabaseError({
				operation: "query",
				table: _table,
				cause: "No data returned",
			})
		),
});

/**
 * Mock Database Service that simulates database errors
 */
const DatabaseErrorMock = Layer.succeed(DatabaseService, {
	client: null as unknown as SupabaseClient,
	query: <T>(_table: string, _operation: (client: SupabaseClient) => Promise<{ data: T | null; error: unknown }>) =>
		Effect.fail(
			new DatabaseError({
				operation: "query",
				table: _table,
				cause: { code: "SOME_DB_ERROR", message: "Database connection failed" },
			})
		),
});

/**
 * Silent logger layer - suppresses all Effect.log output during tests
 */
const SilentLoggerLayer = Logger.minimumLogLevel(LogLevel.None);

/**
 * Test layer with NotFound mock - composes ConversationServiceLive with mocked dependencies
 */
const AppNotFoundTest = ConversationServiceLive.pipe(
	Layer.provide(Layer.mergeAll(
		ConfigServiceTest,
		LoggerServiceTest,
		DatabaseNotFoundMock,
		SilentLoggerLayer
	))
);

/**
 * Test layer with DatabaseError mock - composes ConversationServiceLive with mocked dependencies
 */
const AppDatabaseErrorTest = ConversationServiceLive.pipe(
	Layer.provide(Layer.mergeAll(
		ConfigServiceTest,
		LoggerServiceTest,
		DatabaseErrorMock,
		SilentLoggerLayer
	))
);

describe("ConversationService", () => {
	describe("get() - Missing conversation", () => {
		it("should return NotFoundError when conversation doesn't exist", async () => {
			const program = Effect.gen(function* () {
				const conversationService = yield* ConversationService;
				return yield* conversationService.get("non-existent-id", "user-123");
			}).pipe(Effect.provide(AppNotFoundTest));

			const result = await Effect.runPromise(Effect.either(program));

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				expect(result.left._tag).toBe("NotFoundError");
				if (result.left._tag === "NotFoundError") {
					expect(result.left.resource).toBe("conversation");
					expect(result.left.id).toBe("non-existent-id");
				}
			}
		});

		it("should propagate DatabaseError when it's not a 'not found' error", async () => {
			const program = Effect.gen(function* () {
				const conversationService = yield* ConversationService;
				return yield* conversationService.get("some-id", "user-123");
			}).pipe(Effect.provide(AppDatabaseErrorTest));

			const result = await Effect.runPromise(Effect.either(program));

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				expect(result.left._tag).toBe("DatabaseError");
			}
		});
	});

	describe("addMessage() - Missing or wrong-user conversation", () => {
		it("should return NotFoundError when conversation doesn't exist", async () => {
			const program = Effect.gen(function* () {
				const conversationService = yield* ConversationService;
				return yield* conversationService.addMessage("non-existent-id", "user-123", {
					role: "user",
					content: "Hello",
				});
			}).pipe(Effect.provide(AppNotFoundTest));

			const result = await Effect.runPromise(Effect.either(program));

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				expect(result.left._tag).toBe("NotFoundError");
				if (result.left._tag === "NotFoundError") {
					expect(result.left.resource).toBe("conversation");
					expect(result.left.id).toBe("non-existent-id");
				}
			}
		});

		it("should return NotFoundError when conversation belongs to different user", async () => {
			// This test simulates the case where the query returns "No data returned"
			// because the user_id doesn't match
			const program = Effect.gen(function* () {
				const conversationService = yield* ConversationService;
				return yield* conversationService.addMessage("conversation-123", "wrong-user", {
					role: "user",
					content: "Hello",
				});
			}).pipe(Effect.provide(AppNotFoundTest));

			const result = await Effect.runPromise(Effect.either(program));

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				expect(result.left._tag).toBe("NotFoundError");
				if (result.left._tag === "NotFoundError") {
					expect(result.left.resource).toBe("conversation");
					expect(result.left.id).toBe("conversation-123");
				}
			}
		});

		it("should propagate DatabaseError when it's not a 'not found' error", async () => {
			const program = Effect.gen(function* () {
				const conversationService = yield* ConversationService;
				return yield* conversationService.addMessage("some-id", "user-123", {
					role: "user",
					content: "Hello",
				});
			}).pipe(Effect.provide(AppDatabaseErrorTest));

			const result = await Effect.runPromise(Effect.either(program));

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				expect(result.left._tag).toBe("DatabaseError");
			}
		});
	});

	describe("addMessage() - Validation", () => {
		it("should return ValidationError when content is empty", async () => {
			const program = Effect.gen(function* () {
				const conversationService = yield* ConversationService;
				return yield* conversationService.addMessage("conversation-123", "user-123", {
					role: "user",
					content: "", // Empty content
				});
			}).pipe(Effect.provide(AppNotFoundTest));

			const result = await Effect.runPromise(Effect.either(program));

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				expect(result.left._tag).toBe("ValidationError");
				if (result.left._tag === "ValidationError") {
					expect(result.left.message).toContain("cannot be empty");
					expect(result.left.field).toBe("content");
				}
			}
		});
	});

	describe("create() - Validation", () => {
		it("should return ValidationError when title is empty", async () => {
			const program = Effect.gen(function* () {
				const conversationService = yield* ConversationService;
				return yield* conversationService.create("user-123", {
					title: "", // Empty title
				});
			}).pipe(Effect.provide(AppNotFoundTest));

			const result = await Effect.runPromise(Effect.either(program));

			expect(result._tag).toBe("Left");
			if (result._tag === "Left") {
				expect(result.left._tag).toBe("ValidationError");
				if (result.left._tag === "ValidationError") {
					expect(result.left.message).toContain("required");
					expect(result.left.field).toBe("title");
				}
			}
		});
	});
});
