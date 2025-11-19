/**
 * Chat Routes - Vercel AI SDK Implementation
 *
 * Streaming chat with multi-provider support and RAG tools
 */

import { streamText } from "ai";
import { Hono } from "hono";
import { z } from "zod";
import { Effect, Stream } from "effect";
import { useAISDKFeature, useEffectForRoute } from "../config/features";
import { aiRegistry, getLanguageModel, isModelSupported, getDefaultModel, listAvailableModels, type ModelId } from "../ai/provider-registry";
import { searchPubMed, formatCitations } from "../services/pubmed-service";
import { AppLive, AIService, errorToResponse } from "../effect";

export const chatAISDKRouter = new Hono();

/**
 * Chat request schema
 */
const chatStreamSchema = z.object({
	messages: z.array(
		z.object({
			role: z.enum(["user", "assistant", "system"]),
			content: z.string(),
		})
	),
	modelId: z.string().optional(),
	temperature: z.number().min(0).max(2).optional(),
	maxTokens: z.number().positive().optional(),
});

/**
 * Effect.ts-based streaming handler
 */
async function handleStreamWithEffect(c: any) {
	const body = await c.req.json();
	const parsed = chatStreamSchema.safeParse(body);

	if (!parsed.success) {
		return c.json(
			{
				error: "Validation error",
				details: parsed.error.flatten(),
			},
			400
		);
	}

	const { messages, modelId, temperature, maxTokens } = parsed.data;

	// Create Effect program
	const program = Effect.gen(function* () {
		const ai = yield* AIService;

		// Stream chat responses
		const stream = yield* ai.streamChat({
			messages,
			modelId,
			temperature,
			maxTokens,
			enableTools: useAISDKFeature("TOOL_CALLING"),
		});

		return stream;
	}).pipe(Effect.provide(AppLive));

	// Run Effect program and handle errors
	const result = await Effect.runPromise(Effect.either(program));

	if (result._tag === "Left") {
		const errorResponse = errorToResponse(result.left);
		return c.json(errorResponse, errorResponse.statusCode);
	}

	const textStream = result.right;

	// Convert Effect Stream to Web ReadableStream
	const encoder = new TextEncoder();
	const webStream = new ReadableStream({
		async start(controller) {
			try {
				await Stream.runForEach(textStream, (chunk) =>
					Effect.sync(() => {
						// Format as SSE for compatibility with Vercel AI SDK client
						const data = JSON.stringify(chunk);
						controller.enqueue(encoder.encode(`data: ${data}\n\n`));
					}),
				)
					.pipe(
						Effect.catchAll((error) =>
							Effect.sync(() => {
								console.error("Stream processing error:", error);
								const errorData = JSON.stringify({ error: "Stream error" });
								controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
							}),
						),
						Effect.ensuring(
							Effect.sync(() => {
								controller.close();
							}),
						),
						Effect.runPromise,
					);
			} catch (error) {
				console.error("ReadableStream error:", error);
				controller.close();
			}
		},
	});

	return new Response(webStream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
}

/**
 * Streaming chat endpoint with Vercel AI SDK
 */
chatAISDKRouter.post("/api/chat/stream", async (c) => {
	// Check if AI SDK streaming is enabled
	if (!useAISDKFeature("STREAMING_CHAT")) {
		return c.json(
			{
				error: "AI SDK streaming not enabled",
				message: "Enable with AI_SDK_STREAMING=true",
			},
			503
		);
	}

	// Use Effect.ts implementation if enabled
	if (useEffectForRoute("CHAT")) {
		return handleStreamWithEffect(c);
	}

	try {
		const body = await c.req.json();
		const parsed = chatStreamSchema.safeParse(body);

		if (!parsed.success) {
			return c.json(
				{
					error: "Validation error",
					details: parsed.error.flatten(),
				},
				400
			);
		}

		const { messages, modelId, temperature, maxTokens } = parsed.data;

		// Get model (default to gpt-4o-mini if not provided)
		const selectedModelId = (modelId || getDefaultModel()) as ModelId;

		if (!isModelSupported(selectedModelId)) {
			return c.json(
				{
					error: "Unsupported model",
					message: `Model ${selectedModelId} is not supported`,
					availableModels: listAvailableModels(),
				},
				400
			);
		}

		// Configure tools if feature flag is enabled
		const tools = useAISDKFeature("TOOL_CALLING")
			? {
					searchLiterature: {
						description:
							"Search medical literature on PubMed for research articles, clinical trials, and studies. " +
							"Use this when the user asks about recent research, clinical evidence, studies, or needs citations. " +
							"The query should be specific medical terms or conditions (e.g., 'sickle cell disease hydroxyurea', 'vaso-occlusive crisis pain management').",
						parameters: z.object({
							query: z
								.string()
								.describe("Medical search query with specific terms and conditions"),
							limit: z
								.number()
								.min(1)
								.max(10)
								.optional()
								.describe("Maximum number of articles to return (default: 5)"),
						}),
						execute: async ({ query, limit }) => {
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

		// Stream response using Vercel AI SDK
		const result = streamText({
			model: getLanguageModel(selectedModelId),
			messages,
			temperature: temperature ?? 0.7,
			maxTokens: maxTokens ?? 1000,
			tools,
		});

		// Return streaming response
		return result.toDataStreamResponse();
	} catch (error) {
		console.error("Chat stream error:", error);
		return c.json(
			{
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			500
		);
	}
});

/**
 * List available models endpoint
 */
chatAISDKRouter.get("/api/chat/models", (c) => {
	const models = listAvailableModels();
	const defaultModel = getDefaultModel();

	return c.json({
		success: true,
		data: {
			defaultModel,
			providers: models,
		},
	});
});

/**
 * Health check for AI SDK
 */
chatAISDKRouter.get("/api/chat/ai-sdk/health", (c) => {
	const isEnabled = useAISDKFeature("STREAMING_CHAT");

	return c.json({
		success: true,
		data: {
			enabled: isEnabled,
			status: isEnabled ? "ready" : "disabled",
			features: {
				streaming: useAISDKFeature("STREAMING_CHAT"),
				toolCalling: useAISDKFeature("TOOL_CALLING"),
				multiModal: useAISDKFeature("MULTI_MODAL"),
			},
		},
	});
});
