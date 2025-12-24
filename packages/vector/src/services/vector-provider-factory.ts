import type {
	VectorProvider,
	VectorProviderConfig,
} from "../interfaces/vector-provider.interface";

/**
 * Create a vector provider instance based on configuration
 */
export async function createVectorProvider(
	config: VectorProviderConfig,
): Promise<VectorProvider> {
	switch (config.provider) {
		case "chroma": {
			const { ChromaProvider } = await import("./chroma-provider");
			return new ChromaProvider(config);
		}

		case "qdrant": {
			const { QdrantProvider } = await import("./qdrant-provider");
			return new QdrantProvider(config);
		}

		case "pgvector": {
			const { PgVectorProvider } = await import("./pgvector-provider");
			return new PgVectorProvider(config);
		}

		default:
			throw new Error(`Unsupported vector provider: ${config.provider}`);
	}
}

/**
 * Get vector provider configuration from environment variables
 */
export function getVectorProviderFromEnv(): VectorProviderConfig {
	const provider = (process.env.VECTOR_PROVIDER || "chroma") as
		| "chroma"
		| "qdrant"
		| "pgvector";

	const baseConfig: VectorProviderConfig = {
		provider,
		openaiApiKey: process.env.OPENAI_API_KEY,
	};

	switch (provider) {
		case "chroma":
			return {
				...baseConfig,
				connectionUrl: process.env.CHROMA_URL || "http://localhost:8000",
			};

		case "qdrant":
			return {
				...baseConfig,
				connectionUrl: process.env.QDRANT_URL || "http://localhost:6333",
				apiKey: process.env.QDRANT_API_KEY,
			};

		case "pgvector":
			if (!process.env.DATABASE_URL) {
				throw new Error(
					"DATABASE_URL environment variable is required for pgvector provider",
				);
			}
			return {
				...baseConfig,
				connectionUrl: process.env.DATABASE_URL,
			};

		default:
			return baseConfig;
	}
}

// Backwards-compatible exports
export const VectorProviderFactory = {
	create: createVectorProvider,
	getProviderFromEnv: getVectorProviderFromEnv,
};
