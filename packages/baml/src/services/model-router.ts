import { type ChatRequest, type ModelName, ModelProviderMap } from "../types";
import {
	runAnthropicChat,
	runAppleFoundationChat,
	runOllamaChat,
	runOpenAIChat,
	testAnthropicConnection,
	testAppleFoundationConnection,
	testOllamaConnection,
	testOpenAIConnection,
} from "./baml-service";

export async function routeModelChat(request: ChatRequest): Promise<string> {
	const { message, model, provider, temperature, maxTokens } = request;

	// Determine provider from model name or explicit provider
	let selectedProvider = provider;
	if (!selectedProvider && model) {
		selectedProvider = ModelProviderMap[model as ModelName] as typeof provider;
	}

	// Default to OpenAI if no provider specified
	if (!selectedProvider) {
		selectedProvider = "openai";
	}

	switch (selectedProvider) {
		case "openai":
			return runOpenAIChat(message);

		case "anthropic":
			return runAnthropicChat(message);

		case "ollama":
			return runOllamaChat(message, model || "llama3.2:3b");

		case "apple":
			return runAppleFoundationChat(message);

		default:
			throw new Error(`Unsupported provider: ${selectedProvider}`);
	}
}

export function getAvailableModels() {
	return Object.entries(ModelProviderMap).map(([model, provider]) => ({
		model,
		provider,
		available: true, // In production, check actual availability
	}));
}

export async function checkAllProviders() {
	const [openai, anthropic, ollama, apple] = await Promise.all([
		testOpenAIConnection(),
		testAnthropicConnection(),
		testOllamaConnection(),
		testAppleFoundationConnection(),
	]);

	return {
		openai,
		anthropic,
		ollama,
		apple,
	};
}
