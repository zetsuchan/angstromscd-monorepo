import { QdrantClient } from "@qdrant/js-client-rest";
import { OpenAI } from "openai";
import type {
	CollectionInfo,
	QueryResult,
	VectorProvider,
	VectorProviderConfig,
} from "../interfaces/vector-provider.interface";

export class QdrantProvider implements VectorProvider {
	private client: QdrantClient;
	private openai: OpenAI;
	private dimension = 1536; // Default OpenAI embedding dimension

	constructor(private config: VectorProviderConfig) {
		const url = new URL(config.connectionUrl || "http://localhost:6333");

		this.client = new QdrantClient({
			url: url.origin,
			apiKey: config.apiKey as string | undefined,
		});

		this.openai = new OpenAI({
			apiKey: config.openaiApiKey,
		});
	}

	async initialize(): Promise<void> {
		try {
			await this.client.getCollections();
		} catch (error) {
			throw new Error(`Failed to connect to Qdrant: ${error}`);
		}
	}

	async createCollection(name: string, dimension?: number): Promise<void> {
		const dim = dimension || this.dimension;

		try {
			await this.client.createCollection(name, {
				vectors: {
					size: dim,
					distance: "Cosine",
				},
			});
		} catch (error: unknown) {
			if (
				error &&
				typeof error === "object" &&
				"status" in error &&
				error.status === 409
			) {
				// Collection already exists
				return;
			}
			throw error;
		}
	}

	async deleteCollection(name: string): Promise<void> {
		await this.client.deleteCollection(name);
	}

	async listCollections(): Promise<CollectionInfo[]> {
		const response = await this.client.getCollections();

		const collections: CollectionInfo[] = [];
		for (const col of response.collections) {
			try {
				const info = await this.client.getCollection(col.name);
				collections.push({
					name: col.name,
					count: info.points_count || 0,
					dimension: info.config?.params?.vectors?.size as number | undefined,
				});
			} catch {
				collections.push({ name: col.name });
			}
		}

		return collections;
	}

	async addDocuments(options: {
		collection: string;
		documents: string[];
		ids: string[];
		metadatas?: Array<Record<string, unknown>>;
	}): Promise<void> {
		// Ensure collection exists
		await this.ensureCollection(options.collection);

		// Generate embeddings
		const embeddings = await this.generateEmbeddings(options.documents);

		// Prepare points for Qdrant
		const points = options.ids.map((id, index) => ({
			id: id,
			vector: embeddings[index],
			payload: {
				document: options.documents[index],
				...(options.metadatas?.[index] || {}),
			},
		}));

		// Upsert points
		await this.client.upsert(options.collection, {
			wait: true,
			points,
		});
	}

	async query(options: {
		collection: string;
		query: string;
		nResults?: number;
	}): Promise<QueryResult> {
		// Generate embedding for query
		const [queryEmbedding] = await this.generateEmbeddings([options.query]);

		// Search
		const results = await this.client.search(options.collection, {
			vector: queryEmbedding,
			limit: options.nResults || 5,
			with_payload: true,
			with_vector: false,
		});

		// Format results to match ChromaDB format
		return this.formatResults(results);
	}

	async similar(options: {
		collection: string;
		document: string;
		nResults?: number;
	}): Promise<QueryResult> {
		// Similar search is the same as query in Qdrant
		return this.query({
			collection: options.collection,
			query: options.document,
			nResults: options.nResults,
		});
	}

	async deleteDocuments(options: {
		collection: string;
		ids: string[];
	}): Promise<void> {
		await this.client.delete(options.collection, {
			wait: true,
			points: options.ids,
		});
	}

	private async ensureCollection(name: string): Promise<void> {
		try {
			await this.client.getCollection(name);
		} catch (error: unknown) {
			if (
				error &&
				typeof error === "object" &&
				"status" in error &&
				error.status === 404
			) {
				await this.createCollection(name);
			} else {
				throw error;
			}
		}
	}

	private async generateEmbeddings(texts: string[]): Promise<number[][]> {
		const response = await this.openai.embeddings.create({
			model: "text-embedding-ada-002",
			input: texts,
		});

		return response.data.map((item) => item.embedding);
	}

	private formatResults(
		results: Array<{
			id: string;
			payload?: Record<string, unknown>;
			score?: number;
		}>,
	): QueryResult {
		// Format to match ChromaDB's output structure
		const ids: string[][] = [[]];
		const documents: (string | null)[][] = [[]];
		const metadatas: (Record<string, unknown> | null)[][] = [[]];
		const distances: number[][] = [[]];

		for (const result of results) {
			ids[0].push(result.id);
			documents[0].push(result.payload?.document || null);

			// Extract metadata (everything except 'document' field)
			const { document, ...metadata } = result.payload || {};
			metadatas[0].push(Object.keys(metadata).length > 0 ? metadata : null);

			// Qdrant returns score (similarity), convert to distance
			distances[0].push(1 - (result.score || 0));
		}

		return {
			ids,
			documents,
			metadatas,
			distances,
		};
	}
}
