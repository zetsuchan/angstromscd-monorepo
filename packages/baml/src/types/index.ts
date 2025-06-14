export interface ChatRequest {
	message: string;
	model?: string;
	provider?: "openai" | "anthropic" | "ollama" | "apple";
	temperature?: number;
	maxTokens?: number;
}

export interface ChatResponse {
	reply: string;
	model?: string;
	provider?: string;
}

export interface HealthCheckResponse {
	[key: string]: boolean;
}

export const ModelProviderMap = {
	// OpenAI models
	"gpt-4o": "openai",
	"gpt-4o-mini": "openai",
	"gpt-3.5-turbo": "openai",

	// Anthropic models
	"claude-3-5-sonnet-20241022": "anthropic",
	"claude-3-haiku-20240307": "anthropic",
	"claude-3-opus-20240229": "anthropic",

	// Ollama models
	"qwen2.5:0.5b": "ollama",
	"llama3.2:3b": "ollama",
	"llama3.3:70b-instruct-q4_K_M": "ollama",
	"mixtral:8x7b": "ollama",
	"codellama:70b": "ollama",

	// Apple Foundation models
	"apple-foundation-3b": "apple",
} as const;

export type ModelName = keyof typeof ModelProviderMap;
export type ProviderName = (typeof ModelProviderMap)[ModelName];
