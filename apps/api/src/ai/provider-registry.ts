/**
 * Vercel AI SDK Provider Registry
 *
 * Centralized management of AI model providers
 */

import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { createProviderRegistry } from "ai";
import { createOllama } from "ollama-ai-provider";

/**
 * Model provider types
 */
export type Provider = "openai" | "anthropic" | "ollama" | "apple";

/**
 * Supported models
 */
export const MODELS = {
	// OpenAI
	"openai:gpt-4o": "gpt-4o",
	"openai:gpt-4o-mini": "gpt-4o-mini",
	"openai:gpt-4-turbo": "gpt-4-turbo",
	"openai:gpt-3.5-turbo": "gpt-3.5-turbo",

	// Anthropic
	"anthropic:claude-3-5-sonnet-20241022": "claude-3-5-sonnet-20241022",
	"anthropic:claude-3-5-haiku-20241022": "claude-3-5-haiku-20241022",
	"anthropic:claude-3-opus-20240229": "claude-3-opus-20240229",

	// Ollama (local) - Small/Medium
	"ollama:llama3.2:3b": "llama3.2:3b",
	"ollama:qwen2.5:0.5b": "qwen2.5:0.5b",
	"ollama:mixtral:8x7b": "mixtral:8x7b",

	// OpenAI GPT-OSS (local via Ollama) - Apache 2.0, MoE, 128k context
	"ollama:gpt-oss:20b": "gpt-oss:20b",
	"ollama:gpt-oss:120b": "gpt-oss:120b",

	// Ollama (local) - Large (20B+ class)
	"ollama:yi:34b": "yi:34b",
	"ollama:deepseek-coder:33b": "deepseek-coder:33b",

	// Ollama (local) - Very Large (70B+ class)
	"ollama:llama3.1:70b": "llama3.1:70b",
	"ollama:qwen2.5:72b": "qwen2.5:72b",
} as const;

export type ModelId = keyof typeof MODELS;

/**
 * Create AI provider registry
 */
export function createAIProviderRegistry() {
	const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

	return createProviderRegistry({
		openai: openai,
		anthropic: anthropic,
		ollama: createOllama({
			baseURL: `${ollamaBaseUrl}/api`,
		}),
	});
}

/**
 * Global provider registry instance
 */
export const aiRegistry = createAIProviderRegistry();

/**
 * Parse model ID into provider and model name
 */
export function parseModelId(modelId: string): {
	provider: string;
	model: string;
} {
	const [provider, ...modelParts] = modelId.split(":");
	const model = modelParts.join(":");
	return { provider, model };
}

/**
 * Get language model from registry
 */
export function getLanguageModel(modelId: ModelId | string) {
	return aiRegistry.languageModel(modelId);
}

/**
 * Check if model is supported
 */
export function isModelSupported(modelId: string): modelId is ModelId {
	return modelId in MODELS;
}

/**
 * Get default model based on feature flags
 */
export function getDefaultModel(): ModelId {
	// Check environment for default model
	const defaultModel = process.env.DEFAULT_AI_MODEL as ModelId;

	if (defaultModel && isModelSupported(defaultModel)) {
		return defaultModel;
	}

	// Fallback to GPT-4o mini
	return "openai:gpt-4o-mini";
}

/**
 * List all available models
 */
export function listAvailableModels(): {
	provider: string;
	models: string[];
}[] {
	const modelsByProvider: Record<string, string[]> = {};

	for (const modelId of Object.keys(MODELS)) {
		const { provider, model } = parseModelId(modelId);
		if (!modelsByProvider[provider]) {
			modelsByProvider[provider] = [];
		}
		modelsByProvider[provider].push(model);
	}

	return Object.entries(modelsByProvider).map(([provider, models]) => ({
		provider,
		models,
	}));
}
