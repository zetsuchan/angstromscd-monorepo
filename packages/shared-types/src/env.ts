/**
 * Type-safe environment variable access
 */

import { z } from "zod";

/**
 * Environment variable schema
 */
const envSchema = z.object({
	// Node environment
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),

	// API Configuration
	PORT: z.string().default("3001").transform(Number),
	API_BASE_URL: z.string().url().optional(),

	// Database
	SUPABASE_URL: z.string().url(),
	SUPABASE_ANON_KEY: z.string().min(1),
	DATABASE_URL: z.string().url().optional(),

	// AI/ML Services
	OPENAI_API_KEY: z.string().min(1).optional(),
	ANTHROPIC_API_KEY: z.string().min(1).optional(),
	OLLAMA_BASE_URL: z.string().url().default("http://localhost:11434"),
	APPLE_BRIDGE_URL: z.string().url().default("http://localhost:3004"),

	// Vector Database
	VECTOR_PROVIDER: z.enum(["chroma", "qdrant", "pgvector"]).default("chroma"),
	CHROMA_URL: z.string().url().default("http://localhost:8000"),
	QDRANT_URL: z.string().url().default("http://localhost:6333"),

	// Security
	JWT_SECRET: z.string().min(32).optional(),
	CORS_ORIGIN: z.string().default("*"),

	// Feature Flags
	ENABLE_TELEMETRY: z
		.string()
		.transform((v) => v === "true")
		.default("false"),
	ENABLE_DEBUG_LOGGING: z
		.string()
		.transform((v) => v === "true")
		.default("false"),

	// External Services
	PUBMED_API_KEY: z.string().optional(),
	CROSSREF_API_KEY: z.string().optional(),
});

/**
 * Validated environment variables type
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 */
export function parseEnv(env: NodeJS.ProcessEnv = process.env): Env {
	const parsed = envSchema.safeParse(env);

	if (!parsed.success) {
		console.error("❌ Invalid environment variables:");
		console.error(parsed.error.flatten().fieldErrors);
		throw new Error("Invalid environment variables");
	}

	return parsed.data;
}

/**
 * Get validated environment variables (singleton)
 */
let cachedEnv: Env | undefined;

export function getEnv(): Env {
	if (!cachedEnv) {
		cachedEnv = parseEnv();
	}
	return cachedEnv;
}

/**
 * Type-safe environment variable getter
 */
export function env<K extends keyof Env>(key: K): Env[K] {
	return getEnv()[key];
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
	return env("NODE_ENV") === "production";
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
	return env("NODE_ENV") === "development";
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
	return env("NODE_ENV") === "test";
}

/**
 * Get AI provider configuration
 */
export function getAIConfig() {
	const config = getEnv();

	return {
		openai: {
			enabled: !!config.OPENAI_API_KEY,
			apiKey: config.OPENAI_API_KEY,
		},
		anthropic: {
			enabled: !!config.ANTHROPIC_API_KEY,
			apiKey: config.ANTHROPIC_API_KEY,
		},
		ollama: {
			enabled: true, // Always enabled if running locally
			baseUrl: config.OLLAMA_BASE_URL,
		},
		apple: {
			enabled: true, // Always enabled if running locally
			baseUrl: config.APPLE_BRIDGE_URL,
		},
	};
}

/**
 * Get database configuration
 */
export function getDatabaseConfig() {
	const config = getEnv();

	return {
		supabase: {
			url: config.SUPABASE_URL,
			anonKey: config.SUPABASE_ANON_KEY,
		},
		postgres: config.DATABASE_URL
			? {
					connectionString: config.DATABASE_URL,
				}
			: undefined,
	};
}

/**
 * Get vector database configuration
 */
export function getVectorConfig() {
	const config = getEnv();

	return {
		provider: config.VECTOR_PROVIDER,
		providers: {
			chroma: {
				url: config.CHROMA_URL,
			},
			qdrant: {
				url: config.QDRANT_URL,
			},
			pgvector: {
				enabled: !!config.DATABASE_URL,
			},
		},
	};
}

/**
 * Validate required environment variables for specific features
 */
export function validateFeatureEnv(
	feature: "ai" | "database" | "vector",
): void {
	const config = getEnv();

	switch (feature) {
		case "ai":
			if (!config.OPENAI_API_KEY && !config.ANTHROPIC_API_KEY) {
				throw new Error("At least one AI provider API key is required");
			}
			break;

		case "database":
			if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
				throw new Error("Supabase configuration is required");
			}
			break;

		case "vector":
			if (config.VECTOR_PROVIDER === "pgvector" && !config.DATABASE_URL) {
				throw new Error("DATABASE_URL is required for pgvector provider");
			}
			break;
	}
}

/**
 * Environment variable documentation
 */
export const ENV_DOCS = {
	NODE_ENV: "Node environment (development, test, production)",
	PORT: "Server port number",
	API_BASE_URL: "Base URL for the API server",
	SUPABASE_URL: "Supabase project URL",
	SUPABASE_ANON_KEY: "Supabase anonymous key",
	DATABASE_URL: "PostgreSQL connection string (optional)",
	OPENAI_API_KEY: "OpenAI API key for GPT models",
	ANTHROPIC_API_KEY: "Anthropic API key for Claude models",
	OLLAMA_BASE_URL: "Ollama local server URL",
	APPLE_BRIDGE_URL: "Apple Foundation Bridge service URL",
	VECTOR_PROVIDER: "Vector database provider (chroma, qdrant, pgvector)",
	CHROMA_URL: "ChromaDB server URL",
	QDRANT_URL: "Qdrant server URL",
	JWT_SECRET: "Secret key for JWT token signing",
	CORS_ORIGIN: "CORS allowed origin",
	ENABLE_TELEMETRY: "Enable telemetry collection",
	ENABLE_DEBUG_LOGGING: "Enable debug logging",
	PUBMED_API_KEY: "PubMed API key for literature search",
	CROSSREF_API_KEY: "Crossref API key for DOI lookup",
} as const;
