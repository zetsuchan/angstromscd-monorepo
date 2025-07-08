// Re-export shared types
export type {
	ChatRequest,
	ChatResponse,
	AllModelNames as ModelName,
	ProviderName,
	Citation,
	TokenUsage,
} from "@angstromscd/shared-types";

export { MODEL_TO_PROVIDER_MAP as ModelProviderMap } from "@angstromscd/shared-types";

// BAML-specific types
export interface HealthCheckResponse {
	[key: string]: boolean;
}

export interface ModelHealth {
	provider: import("@angstromscd/shared-types").ProviderName;
	available: boolean;
	latency?: number;
	error?: string;
}
