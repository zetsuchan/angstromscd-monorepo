// Import BAML client
import { b } from "../../baml_client";
import { fetchWithRetry } from "../utils/retry";

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
 * Main medical research assistance function using BAML
 */
export async function getMedicalResearchAssistance(
	query: string,
	modelProvider: string = "openai",
	modelName: string = "gpt-4o-mini"
): Promise<any> {
	// Call the BAML function
	return await b.MedicalResearcher(query, {
		clientName: `${modelProvider}_${modelName}`,
	});
}

/**
 * Generate a conversational response for medical queries
 */
export async function generateConversationalResponse(
	query: string,
	conversationHistory: Array<{ role: string; content: string }>,
	modelProvider: string = "openai",
	modelName: string = "gpt-4o-mini"
): Promise<string> {
	// Format conversation history for context
	const context = conversationHistory
		.map(msg => `${msg.role}: ${msg.content}`)
		.join("\n");
	
	const fullQuery = context ? `${context}\nUser: ${query}` : query;
	
	// Use BAML to generate response
	const response = await getMedicalResearchAssistance(fullQuery, modelProvider, modelName);
	
	return response.content || "I couldn't generate a response. Please try again.";
}

// Legacy chat functions for compatibility
export async function runOpenAIChat(message: string): Promise<string> {
	return generateConversationalResponse(message, [], "openai", "gpt-4o-mini");
}

export async function runAnthropicChat(message: string): Promise<string> {
	return generateConversationalResponse(message, [], "anthropic", "claude-3-haiku");
}

export async function runOllamaChat(message: string, model: string = "qwen2.5:0.5b"): Promise<string> {
	return generateConversationalResponse(message, [], "ollama", model);
}

export async function runAppleFoundationChat(message: string): Promise<string> {
	return generateConversationalResponse(message, [], "apple", "foundation");
}

// Types
export interface InsightRequest {
	data: any;
	context?: string;
}

export async function generateInsight(request: InsightRequest): Promise<string> {
	const query = `Generate insights for the following data: ${JSON.stringify(request.data)}${request.context ? ` Context: ${request.context}` : ''}`;
	const response = await getMedicalResearchAssistance(query);
	return response.content || "Unable to generate insights.";
}