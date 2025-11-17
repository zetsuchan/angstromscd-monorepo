/**
 * Chat Routes - Vercel AI SDK Implementation
 *
 * Streaming chat with multi-provider support and RAG tools
 */

import { streamText } from "ai";
import { Hono } from "hono";
import { z } from "zod";
import { useAISDKFeature } from "../config/features";
import { aiRegistry, getLanguageModel, isModelSupported, getDefaultModel, listAvailableModels, type ModelId } from "../ai/provider-registry";

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

		// Stream response using Vercel AI SDK
		const result = streamText({
			model: getLanguageModel(selectedModelId),
			messages,
			temperature: temperature ?? 0.7,
			maxTokens: maxTokens ?? 1000,
			// TODO: Add medical literature search tool
			// tools: {
			//   searchLiterature: {
			//     description: 'Search medical literature on PubMed',
			//     parameters: z.object({ query: z.string() }),
			//     execute: async ({ query }) => searchPubMed(query),
			//   },
			// },
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
