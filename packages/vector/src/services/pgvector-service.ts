import postgres from 'postgres'
import OpenAI from 'openai'

export class VectorService {
  private sql: postgres.Sql
  private openai: OpenAI

  constructor() {
    const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/angstromscd'
    const openAiKey = process.env.OPENAI_API_KEY
    
    if (!openAiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not defined")
    }

    this.sql = postgres(dbUrl)
    this.openai = new OpenAI({ apiKey: openAiKey })
  }

  async createCollection(name: string, dimension: number = 1536) {
    const result = await this.sql`
      INSERT INTO vector_collections (name, dimension) 
      VALUES (${name}, ${dimension})
      ON CONFLICT (name) DO UPDATE SET dimension = ${dimension}
      RETURNING *
    `
    return result[0]
  }

  async getCollection(name: string) {
    const result = await this.sql`
      SELECT * FROM vector_collections WHERE name = ${name}
    `
    if (result.length === 0) {
      throw new Error(`Collection '${name}' not found`)
    }
    return result[0]
  }

  async listCollections() {
    return await this.sql`
      SELECT id, name, dimension, created_at, updated_at 
      FROM vector_collections 
      ORDER BY created_at DESC
    `
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    })
    return response.data[0].embedding
  }

  async addDocuments(options: {
    collection: string
    documents: string[]
    ids: string[]
    metadatas?: Array<Record<string, unknown>>
  }) {
    const collection = await this.getCollection(options.collection)
    
    // Generate embeddings for all documents
    const embeddings = await Promise.all(
      options.documents.map(doc => this.generateEmbedding(doc))
    )

    // Insert documents with embeddings
    const values = options.documents.map((doc, index) => ({
      collection_id: collection.id,
      document_id: options.ids[index],
      content: doc,
      embedding: `[${embeddings[index].join(',')}]`,
      metadata: JSON.stringify(options.metadatas?.[index] || {})
    }))

    await this.sql`
      INSERT INTO vector_documents (collection_id, document_id, content, embedding, metadata)
      SELECT * FROM ${this.sql(values)}
      ON CONFLICT (collection_id, document_id) 
      DO UPDATE SET 
        content = EXCLUDED.content,
        embedding = EXCLUDED.embedding,
        metadata = EXCLUDED.metadata,
        updated_at = CURRENT_TIMESTAMP
    `
  }

  async query(options: {
    collection: string
    query: string
    nResults?: number
  }) {
    const collection = await this.getCollection(options.collection)
    const queryEmbedding = await this.generateEmbedding(options.query)
    const nResults = options.nResults || 5

    const results = await this.sql`
      SELECT 
        document_id,
        content,
        metadata,
        1 - (embedding <=> ${`[${queryEmbedding.join(',')}]`}) as similarity
      FROM vector_documents 
      WHERE collection_id = ${collection.id}
      ORDER BY embedding <=> ${`[${queryEmbedding.join(',')}]`}
      LIMIT ${nResults}
    `

    return {
      ids: [results.map(r => r.document_id)],
      documents: [results.map(r => r.content)],
      metadatas: [results.map(r => r.metadata)],
      distances: [results.map(r => 1 - r.similarity)]
    }
  }

  async similar(options: {
    collection: string
    document: string
    nResults?: number
  }) {
    // For similarity search, we use the same query method
    return this.query({
      collection: options.collection,
      query: options.document,
      nResults: options.nResults
    })
  }

  async deleteCollection(name: string) {
    await this.sql`
      DELETE FROM vector_collections WHERE name = ${name}
    `
  }

  async deleteDocument(collection: string, documentId: string) {
    const collectionRecord = await this.getCollection(collection)
    await this.sql`
      DELETE FROM vector_documents 
      WHERE collection_id = ${collectionRecord.id} AND document_id = ${documentId}
    `
  }

  async close() {
    await this.sql.end()
  }
}