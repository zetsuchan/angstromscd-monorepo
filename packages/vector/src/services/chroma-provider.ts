import {
	ChromaClient,
	type Collection,
	OpenAIEmbeddingFunction,
} from "chromadb";
import type {
	CollectionInfo,
	QueryResult,
	VectorProvider,
	VectorProviderConfig,
} from "../interfaces/vector-provider.interface";

export class ChromaProvider implements VectorProvider {
	private client: ChromaClient;
	private embedder: OpenAIEmbeddingFunction;

	constructor(private config: VectorProviderConfig) {
		this.client = new ChromaClient({
			path: config.connectionUrl || "http://localhost:8000",
		});

		this.embedder = new OpenAIEmbeddingFunction({
			openai_api_key: config.openaiApiKey || "",
		});
	}

	async initialize(): Promise<void> {
		// ChromaDB doesn't require explicit initialization
		// but we can verify connection here if needed
		try {
			await this.client.listCollections();
		} catch (error) {
			throw new Error(`Failed to connect to ChromaDB: ${error}`);
		}
	}

	async createCollection(name: string, dimension?: number): Promise<void> {
		try {
			await this.client.createCollection({
				name,
				embeddingFunction: this.embedder,
			});
		} catch (error) {
			if (error instanceof Error && error.message?.includes("already exists")) {
				// Collection already exists, which is fine
				return;
			}
			throw error;
		}
	}

	async deleteCollection(name: string): Promise<void> {
		await this.client.deleteCollection({ name });
	}

	async listCollections(): Promise<CollectionInfo[]> {
		const collections = await this.client.listCollections();
		return collections.map((col) => ({
			name: col.name,
			// ChromaDB doesn't provide count or dimension info in list
		}));
	}

	async addDocuments(options: {
		collection: string;
		documents: string[];
		ids: string[];
		metadatas?: Array<Record<string, unknown>>;
	}): Promise<void> {
		const collection = await this.getCollection(options.collection);
		await collection.add({
			documents: options.documents,
			ids: options.ids,
			metadatas: options.metadatas,
		});
	}

	async query(options: {
		collection: string;
		query: string;
		nResults?: number;
	}): Promise<QueryResult> {
		const collection = await this.getCollection(options.collection);
		return await collection.query({
			queryTexts: [options.query],
			nResults: options.nResults || 5,
			include: ["documents", "metadatas", "distances"],
		});
	}

	async similar(options: {
		collection: string;
		document: string;
		nResults?: number;
	}): Promise<QueryResult> {
		const collection = await this.getCollection(options.collection);
		return await collection.query({
			queryTexts: [options.document],
			nResults: options.nResults || 5,
			include: ["documents", "metadatas", "distances"],
		});
	}

	async deleteDocuments(options: {
		collection: string;
		ids: string[];
	}): Promise<void> {
		const collection = await this.getCollection(options.collection);
		await collection.delete({
			ids: options.ids,
		});
	}

	private async getCollection(name: string): Promise<Collection> {
		try {
			return await this.client.getCollection({
				name,
				embeddingFunction: this.embedder,
			});
		} catch (error) {
			if (error instanceof Error && error.message?.includes("does not exist")) {
				// Auto-create collection if it doesn't exist
				await this.createCollection(name);
				return await this.client.getCollection({
					name,
					embeddingFunction: this.embedder,
				});
			}
			throw error;
		}
	}
}
