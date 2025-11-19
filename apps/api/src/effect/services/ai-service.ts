/**
 * AI Service - Effect-based wrapper for Vercel AI SDK
 *
 * Provides type-safe streaming chat with error handling
 */

import { Context, Effect, Layer, Stream } from "effect";
import { streamText, type CoreMessage } from "ai";
import { z } from "zod";
import { AIServiceError, ValidationError } from "../errors";
import { LoggerService } from "./logger-service";
import {
	getLanguageModel,
	isModelSupported,
	getDefaultModel,
	type ModelId,
} from "../../ai/provider-registry";
import { searchPubMed, formatCitations } from "../../services/pubmed-service";

/**
 * Chat request configuration
 */
export interface ChatRequest {
	readonly messages: CoreMessage[];
	readonly modelId?: string;
	readonly temperature?: number;
	readonly maxTokens?: number;
	readonly enableTools?: boolean;
}

/**
 * Streaming text chunk
 */
export interface TextChunk {
	readonly type: "text-delta" | "tool-call" | "tool-result" | "finish";
	readonly content: string;
	readonly toolName?: string;
	readonly toolArgs?: unknown;
}

/**
 * AI service context tag
 */
export class AIService extends Context.Tag("AIService")<
	AIService,
	{
		readonly streamChat: (
			request: ChatRequest,
		) => Effect.Effect<Stream.Stream<TextChunk, AIServiceError>, AIServiceError | ValidationError>;

		readonly validateModel: (modelId: string) => Effect.Effect<ModelId, ValidationError>;

		readonly getDefaultModelId: () => Effect.Effect<ModelId, never>;
	}
>() {}

/**
 * Live implementation of AI service
 */
export const AIServiceLive = Layer.effect(
	AIService,
	Effect.gen(function* () {
		const logger = yield* LoggerService;

		yield* logger.info("AI service initialized");

		return {
			/**
			 * Validate and normalize model ID
			 */
			validateModel: (modelId: string) =>
				Effect.gen(function* () {
					if (!isModelSupported(modelId)) {
						return yield* Effect.fail(
							new ValidationError({
								message: `Unsupported model: ${modelId}`,
								field: "modelId",
							}),
						);
					}
					return modelId as ModelId;
				}),

			/**
			 * Get default model ID
			 */
			getDefaultModelId: () => Effect.succeed(getDefaultModel()),

			/**
			 * Stream chat responses with tools
			 */
			streamChat: (request: ChatRequest) =>
				Effect.gen(function* () {
					const { messages, modelId, temperature, maxTokens, enableTools } = request;

					// Validate messages
					if (!messages || messages.length === 0) {
						return yield* Effect.fail(
							new ValidationError({
								message: "Messages array cannot be empty",
								field: "messages",
							}),
						);
					}

					// Get and validate model
					const selectedModelId = modelId || getDefaultModel();
					if (!isModelSupported(selectedModelId)) {
						return yield* Effect.fail(
							new ValidationError({
								message: `Unsupported model: ${selectedModelId}`,
								field: "modelId",
							}),
						);
					}

					yield* Effect.log("Starting chat stream", {
						model: selectedModelId,
						messageCount: messages.length,
					});

					// Configure tools
					const tools = enableTools
						? {
								searchLiterature: {
									description:
										"Search medical literature on PubMed for research articles, clinical trials, and studies. " +
										"Use this when the user asks about recent research, clinical evidence, studies, or needs citations.",
									parameters: z.object({
										query: z
											.string()
											.describe("Medical search query with specific terms and conditions"),
										limit: z
											.number()
											.min(1)
											.max(10)
											.optional()
											.describe("Maximum number of articles to return"),
									}),
									execute: async ({ query, limit }: { query: string; limit?: number }) => {
										const result = await searchPubMed(query, limit ?? 5);
										return {
											count: result.count,
											articles: result.articles,
											citations: formatCitations(result.articles),
										};
									},
								},
							}
						: undefined;

					// Create stream using Vercel AI SDK
					const result = yield* Effect.tryPromise({
						try: () =>
							streamText({
								model: getLanguageModel(selectedModelId),
								messages,
								temperature: temperature ?? 0.7,
								maxTokens: maxTokens ?? 1000,
								tools,
							}),
						catch: (error) =>
							new AIServiceError({
								provider: "vercel-ai-sdk",
								model: selectedModelId,
								cause: error,
								message: "Failed to start chat stream",
							}),
					});

					// Convert AI SDK stream to Effect Stream
					const textStream = Stream.fromAsyncIterable(
						result.textStream,
						(error) =>
							new AIServiceError({
								provider: "vercel-ai-sdk",
								model: selectedModelId,
								cause: error,
								message: "Stream processing error",
							}),
					).pipe(
						Stream.map((text) => ({
							type: "text-delta" as const,
							content: text,
						})),
					);

					return textStream;
				}).pipe(
					Effect.withSpan("AIService.streamChat", {
						attributes: { model: request.modelId || "default" },
					}),
				),
		};
	}),
);

/**
 * Test implementation of AI service
 */
export const AIServiceTest = Layer.succeed(AIService, {
	validateModel: (modelId: string) => Effect.succeed(modelId as ModelId),
	getDefaultModelId: () => Effect.succeed("openai:gpt-4o-mini" as ModelId),
	streamChat: () =>
		Effect.succeed(
			Stream.make({
				type: "text-delta" as const,
				content: "test response",
			}),
		),
});
