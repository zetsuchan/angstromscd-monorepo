import { OpenAI } from "openai";
import { Pool, type PoolClient } from "pg";
import type {
	CollectionInfo,
	QueryResult,
	VectorProvider,
	VectorProviderConfig,
} from "../interfaces/vector-provider.interface";

export class PgVectorProvider implements VectorProvider {
	private pool: Pool;
	private openai: OpenAI;
	private dimension = 1536; // Default OpenAI embedding dimension

	constructor(private config: VectorProviderConfig) {
		this.pool = new Pool({
			connectionString: config.connectionUrl,
		});

		this.openai = new OpenAI({
			apiKey: config.openaiApiKey,
		});
	}

	async initialize(): Promise<void> {
		const client = await this.pool.connect();
		try {
			// Ensure pgvector extension is enabled
			await client.query("CREATE EXTENSION IF NOT EXISTS vector");

			// Create collections table if not exists
			await client.query(`
        CREATE TABLE IF NOT EXISTS vector_collections (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          dimension INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

			// Create documents table if not exists
			await client.query(`
        CREATE TABLE IF NOT EXISTS vector_documents (
          id TEXT NOT NULL,
          collection_id INTEGER NOT NULL REFERENCES vector_collections(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          embedding vector(1536),
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id, collection_id)
        )
      `);

			// Create index for vector similarity search
			await client.query(`
        CREATE INDEX IF NOT EXISTS idx_vector_documents_embedding 
        ON vector_documents USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
      `);
		} catch (error) {
			throw new Error(`Failed to initialize pgvector: ${error}`);
		} finally {
			client.release();
		}
	}

	async createCollection(name: string, dimension?: number): Promise<void> {
		const dim = dimension || this.dimension;
		const client = await this.pool.connect();

		try {
			await client.query(
				"INSERT INTO vector_collections (name, dimension) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING",
				[name, dim],
			);
		} finally {
			client.release();
		}
	}

	async deleteCollection(name: string): Promise<void> {
		const client = await this.pool.connect();

		try {
			await client.query("DELETE FROM vector_collections WHERE name = $1", [
				name,
			]);
		} finally {
			client.release();
		}
	}

	async listCollections(): Promise<CollectionInfo[]> {
		const client = await this.pool.connect();

		try {
			const result = await client.query(`
        SELECT c.name, c.dimension, COUNT(d.id) as count
        FROM vector_collections c
        LEFT JOIN vector_documents d ON c.id = d.collection_id
        GROUP BY c.id, c.name, c.dimension
      `);

			return result.rows.map((row) => ({
				name: row.name,
				dimension: row.dimension,
				count: Number.parseInt(row.count),
			}));
		} finally {
			client.release();
		}
	}

	async addDocuments(options: {
		collection: string;
		documents: string[];
		ids: string[];
		metadatas?: Array<Record<string, unknown>>;
	}): Promise<void> {
		const client = await this.pool.connect();

		try {
			// Get or create collection
			const collectionId = await this.getOrCreateCollectionId(
				client,
				options.collection,
			);

			// Generate embeddings
			const embeddings = await this.generateEmbeddings(options.documents);

			// Prepare values for bulk insert
			const values: any[] = [];
			const placeholders: string[] = [];
			let paramIndex = 1;

			for (let i = 0; i < options.ids.length; i++) {
				placeholders.push(
					`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4})`,
				);
				values.push(
					options.ids[i],
					collectionId,
					options.documents[i],
					`[${embeddings[i].join(",")}]`,
					JSON.stringify(options.metadatas?.[i] || {}),
				);
				paramIndex += 5;
			}

			// Bulk insert with ON CONFLICT to handle duplicates
			await client.query(
				`
        INSERT INTO vector_documents (id, collection_id, content, embedding, metadata)
        VALUES ${placeholders.join(", ")}
        ON CONFLICT (id, collection_id) 
        DO UPDATE SET 
          content = EXCLUDED.content,
          embedding = EXCLUDED.embedding,
          metadata = EXCLUDED.metadata
      `,
				values,
			);
		} finally {
			client.release();
		}
	}

	async query(options: {
		collection: string;
		query: string;
		nResults?: number;
	}): Promise<QueryResult> {
		const client = await this.pool.connect();

		try {
			// Get collection ID
			const collectionId = await this.getCollectionId(
				client,
				options.collection,
			);
			if (!collectionId) {
				return {
					ids: [[]],
					documents: [[]],
					metadatas: [[]],
					distances: [[]],
				};
			}

			// Generate embedding for query
			const [queryEmbedding] = await this.generateEmbeddings([options.query]);

			// Perform similarity search
			const result = await client.query(
				`
        SELECT 
          id,
          content,
          metadata,
          1 - (embedding <=> $1::vector) as similarity,
          embedding <=> $1::vector as distance
        FROM vector_documents
        WHERE collection_id = $2
        ORDER BY embedding <=> $1::vector
        LIMIT $3
      `,
				[`[${queryEmbedding.join(",")}]`, collectionId, options.nResults || 5],
			);

			return this.formatResults(result.rows);
		} finally {
			client.release();
		}
	}

	async similar(options: {
		collection: string;
		document: string;
		nResults?: number;
	}): Promise<QueryResult> {
		// Similar search is the same as query
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
		const client = await this.pool.connect();

		try {
			const collectionId = await this.getCollectionId(
				client,
				options.collection,
			);
			if (!collectionId) return;

			await client.query(
				"DELETE FROM vector_documents WHERE collection_id = $1 AND id = ANY($2)",
				[collectionId, options.ids],
			);
		} finally {
			client.release();
		}
	}

	private async getCollectionId(
		client: PoolClient,
		name: string,
	): Promise<number | null> {
		const result = await client.query(
			"SELECT id FROM vector_collections WHERE name = $1",
			[name],
		);
		return result.rows[0]?.id || null;
	}

	private async getOrCreateCollectionId(
		client: PoolClient,
		name: string,
	): Promise<number> {
		let id = await this.getCollectionId(client, name);

		if (!id) {
			const result = await client.query(
				"INSERT INTO vector_collections (name, dimension) VALUES ($1, $2) RETURNING id",
				[name, this.dimension],
			);
			id = result.rows[0].id;
		}

		return id;
	}

	private async generateEmbeddings(texts: string[]): Promise<number[][]> {
		const response = await this.openai.embeddings.create({
			model: "text-embedding-ada-002",
			input: texts,
		});

		return response.data.map((item) => item.embedding);
	}

	private formatResults(rows: any[]): QueryResult {
		const ids: string[][] = [[]];
		const documents: (string | null)[][] = [[]];
		const metadatas: (Record<string, unknown> | null)[][] = [[]];
		const distances: number[][] = [[]];

		for (const row of rows) {
			ids[0].push(row.id);
			documents[0].push(row.content);
			metadatas[0].push(row.metadata);
			distances[0].push(row.distance);
		}

		return {
			ids,
			documents,
			metadatas,
			distances,
		};
	}
}
