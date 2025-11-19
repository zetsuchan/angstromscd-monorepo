import { ClientRegistry } from "@boundaryml/baml";
// Import BAML client
import { b } from "../../baml_client";
import type { MedicalInsight } from "../../baml_client/types";
import { fetchWithRetry } from "../utils/retry";
import { withTimeout } from "../utils/timeout";

/**
 * Checks if a valid connection to the OpenAI API can be established using the configured API key.
 *
 * @returns `true` if the OpenAI API is reachable and the API key is valid; otherwise, `false`.
 */
export async function testOpenAIConnection(): Promise<boolean> {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) return false;

	try {
		const res = await fetchWithRetry("https://api.openai.com/v1/models", {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});
		return res.ok;
	} catch {
		return false;
	}
}

/**
 * Checks connectivity to the Anthropic API using the configured API key.
 *
 * @returns `true` if the Anthropic API is reachable and the API key is set; otherwise, `false`.
 */
export async function testAnthropicConnection(): Promise<boolean> {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) return false;

	try {
		const res = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
			method: "POST",
			headers: {
				"x-api-key": apiKey,
				"anthropic-version": "2023-06-01",
			},
		});
		return res.ok;
	} catch {
		return false;
	}
}

/**
 * Tests connectivity to the local Ollama server.
 *
 * @returns `true` if Ollama is running and accessible; otherwise, `false`.
 */
export async function testOllamaConnection(): Promise<boolean> {
	const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

	try {
		const res = await fetchWithRetry(`${baseUrl}/api/tags`);
		return res.ok;
	} catch {
		return false;
	}
}

/**
 * Tests connectivity to the Apple Foundation Models Bridge.
 *
 * @returns `true` if the bridge is running and accessible; otherwise, `false`.
 */
export async function testAppleBridgeConnection(): Promise<boolean> {
	const bridgeUrl = process.env.APPLE_BRIDGE_URL || "http://localhost:3004";

	try {
		const res = await fetchWithRetry(`${bridgeUrl}/health`);
		return res.ok;
	} catch {
		return false;
	}
}

/**
 * Tests connectivity to OpenRouter API using the configured API key.
 *
 * @returns `true` if OpenRouter is accessible and the API key is valid; otherwise, `false`.
 */
export async function testOpenRouterConnection(): Promise<boolean> {
	const apiKey = process.env.OPENROUTER_API_KEY;
	if (!apiKey) return false;

	try {
		const res = await fetchWithRetry("https://openrouter.ai/api/v1/auth/key", {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});
		return res.ok;
	} catch {
		return false;
	}
}

/**
 * Tests connectivity to LM Studio local server.
 *
 * @returns `true` if LM Studio is running and accessible; otherwise, `false`.
 */
export async function testLMStudioConnection(): Promise<boolean> {
	const baseUrl = process.env.LMSTUDIO_BASE_URL || "http://localhost:1234/v1";

	try {
		const res = await fetchWithRetry(`${baseUrl}/models`);
		return res.ok;
	} catch {
		return false;
	}
}

/**
 * Create a ClientRegistry with the appropriate model configuration
 */
const DEFAULT_CHAT_TIMEOUT_MS = parseTimeoutEnv(
	process.env.BAML_CHAT_TIMEOUT_MS,
	20000,
);

const OPENROUTER_CHAT_TIMEOUT_MS = parseTimeoutEnv(
	process.env.OPENROUTER_CHAT_TIMEOUT_MS,
	15000,
);

function parseTimeoutEnv(value: string | undefined, fallback: number) {
	const parsed = Number.parseInt(value ?? "", 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getProviderTimeout(provider: string) {
	if (provider === "openrouter") {
		return OPENROUTER_CHAT_TIMEOUT_MS;
	}
	return DEFAULT_CHAT_TIMEOUT_MS;
}

function createClientRegistry(
	modelProvider: string,
	modelName: string,
): ClientRegistry {
	const cr = new ClientRegistry();

	// Map model names to their actual provider model names
	const modelMapping: Record<string, string> = {
		// OpenRouter models
		"gemini-3-pro": "google/gemini-3-pro-preview",
		"claude-sonnet-4.5": "anthropic/claude-sonnet-4.5",
		"minimax-m2": "minimax/minimax-m2",
		"glm-4.6": "z-ai/glm-4.6",
		"gpt-5": "openai/gpt-5",
		"gpt-oss-120b": "openai/gpt-oss-120b",
		// OpenAI models
		"gpt-4o": "gpt-4o",
		"gpt-4o-mini": "gpt-4o-mini",
		// Anthropic models
		"claude-3.5-sonnet": "claude-3.5-sonnet",
		"claude-3-haiku": "claude-3-haiku",
		// LM Studio
		"lmstudio-local": "lmstudio-local",
		// Ollama models
		"qwen2.5:0.5b": "qwen2.5:0.5b",
		"llama3.2:3b": "llama3.2:3b",
		"mixtral:8x7b": "mixtral:8x7b",
		// Apple Foundation
		foundation: "foundation",
	};

	const actualModelName = modelMapping[modelName] || modelName;

	// Configure based on provider
	switch (modelProvider) {
		case "openrouter":
			cr.addLlmClient("DynamicClient", "openai", {
				model: actualModelName,
				api_key: process.env.OPENROUTER_API_KEY,
				base_url: "https://openrouter.ai/api/v1",
				headers: {
					"HTTP-Referer": "http://localhost:5173",
					"X-Title": "AngstromSCD",
				},
			});
			break;
		case "lmstudio":
			cr.addLlmClient("DynamicClient", "openai", {
				model: actualModelName,
				base_url: process.env.LMSTUDIO_BASE_URL || "http://localhost:1234/v1",
			});
			break;
		case "ollama":
			cr.addLlmClient("DynamicClient", "ollama", {
				model: actualModelName,
				base_url: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
			});
			break;
		case "openai":
			cr.addLlmClient("DynamicClient", "openai", {
				model: actualModelName,
				api_key: process.env.OPENAI_API_KEY || "your_openai_key",
			});
			break;
		case "anthropic":
			cr.addLlmClient("DynamicClient", "anthropic", {
				model: actualModelName,
				api_key: process.env.ANTHROPIC_API_KEY || "your_anthropic_key",
			});
			break;
		case "apple":
			cr.addLlmClient("DynamicClient", "openai", {
				model: actualModelName,
				base_url: process.env.APPLE_BRIDGE_URL || "http://localhost:3004",
			});
			break;
		default:
			// Default to OpenRouter
			cr.addLlmClient("DynamicClient", "openai", {
				model: actualModelName,
				api_key: process.env.OPENROUTER_API_KEY,
				base_url: "https://openrouter.ai/api/v1",
				headers: {
					"HTTP-Referer": "http://localhost:5173",
					"X-Title": "AngstromSCD",
				},
			});
	}

	cr.setPrimary("DynamicClient");
	return cr;
}

/**
 * Main medical research assistance function using BAML
 */
export async function getMedicalResearchAssistance(
	query: string,
	modelProvider = "openai",
	modelName = "gpt-4o-mini",
): Promise<MedicalInsight> {
	// Create a ClientRegistry for dynamic model selection
	const clientRegistry = createClientRegistry(modelProvider, modelName);

	// Call the BAML function with the client registry
	return await b.MedicalResearcher(query, {
		clientRegistry,
	});
}

/**
 * Generate a conversational response for medical queries
 */
export async function generateConversationalResponse(
	query: string,
	conversationHistory: Array<{ role: string; content: string }>,
	modelProvider = "openai",
	modelName = "gpt-4o-mini",
): Promise<string> {
	const timeoutMs = getProviderTimeout(modelProvider);
	// Format conversation history for context
	const context = conversationHistory
		.map((msg) => `${msg.role}: ${msg.content}`)
		.join("\n");

	const fullQuery = context ? `${context}\nUser: ${query}` : query;

	// Create a ClientRegistry for dynamic model selection
	const clientRegistry = createClientRegistry(modelProvider, modelName);

	const requestMeta = {
		provider: modelProvider,
		model: modelName,
		historyMessages: conversationHistory.length,
		queryLength: query.length,
		timeoutMs,
	};
	const startTime = Date.now();
	console.info("[BAML] SimpleChat request started", requestMeta);

	// Use SimpleChat for conversational responses (returns string directly)
	try {
		const response = await withTimeout(
			() =>
				b.SimpleChat(fullQuery, {
					clientRegistry,
				}),
			{
				timeoutMs,
				timeoutMessage: `SimpleChat timed out after ${timeoutMs}ms for provider ${modelProvider}`,
				onTimeout: () => {
					console.error("[BAML] SimpleChat timeout", requestMeta);
				},
			},
		);
		const durationMs = Date.now() - startTime;
		console.info("[BAML] SimpleChat request completed", {
			...requestMeta,
			durationMs,
		});
		return response;
	} catch (error) {
		const durationMs = Date.now() - startTime;
		console.error("[BAML] SimpleChat error", {
			...requestMeta,
			durationMs,
			error: error instanceof Error ? error.message : String(error),
		});
		// Fallback to MedicalResearcher if SimpleChat fails
		const response = await getMedicalResearchAssistance(
			fullQuery,
			modelProvider,
			modelName,
		);
		return (
			response.summary || "I couldn't generate a response. Please try again."
		);
	}
}

// Legacy chat functions for compatibility
export async function runOpenAIChat(message: string): Promise<string> {
	return generateConversationalResponse(message, [], "openai", "gpt-4o-mini");
}

export async function runAnthropicChat(message: string): Promise<string> {
	return generateConversationalResponse(
		message,
		[],
		"anthropic",
		"claude-3-haiku",
	);
}

export async function runOllamaChat(
	message: string,
	model = "qwen2.5:0.5b",
): Promise<string> {
	return generateConversationalResponse(message, [], "ollama", model);
}

export async function runAppleFoundationChat(message: string): Promise<string> {
	return generateConversationalResponse(message, [], "apple", "foundation");
}

export async function runOpenRouterChat(
	message: string,
	model = "claude-sonnet-4.5",
): Promise<string> {
	return generateConversationalResponse(message, [], "openrouter", model);
}

export async function runLMStudioChat(message: string): Promise<string> {
	return generateConversationalResponse(
		message,
		[],
		"lmstudio",
		"lmstudio-local",
	);
}

// Types
export interface InsightRequest {
	data: Record<string, unknown>;
	context?: string;
}

export async function generateInsight(
	request: InsightRequest,
): Promise<string> {
	const query = `Generate insights for the following data: ${JSON.stringify(request.data)}${request.context ? ` Context: ${request.context}` : ""}`;
	const response = await getMedicalResearchAssistance(query);
	return response.content || "Unable to generate insights.";
}
