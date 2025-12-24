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

// Valid provider types
const VALID_PROVIDERS = ["chroma", "qdrant", "pgvector"] as const;
type ValidProvider = (typeof VALID_PROVIDERS)[number];

/**
 * Validate and get the vector provider from environment
 */
function getValidatedProvider(): ValidProvider {
	const envProvider = process.env.VECTOR_PROVIDER;

	// Default to chroma if not specified
	if (!envProvider) {
		return "chroma";
	}

	// Validate against allowed providers
	if (VALID_PROVIDERS.includes(envProvider as ValidProvider)) {
		return envProvider as ValidProvider;
	}

	// Invalid provider - throw descriptive error
	throw new Error(
		`Invalid VECTOR_PROVIDER: "${envProvider}". Must be one of: ${VALID_PROVIDERS.join(", ")}`,
	);
}

/**
 * Get vector provider configuration from environment variables
 */
export function getVectorProviderFromEnv(): VectorProviderConfig {
	const provider = getValidatedProvider();

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
