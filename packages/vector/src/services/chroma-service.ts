import { ChromaClient, OpenAIEmbeddingFunction, Collection } from "chromadb"

export class VectorService {
  private client: ChromaClient
  private embedder: OpenAIEmbeddingFunction

  constructor() {
    const chromaUrl = process.env.CHROMA_URL
    if (!chromaUrl) {
      throw new Error("CHROMA_URL environment variable is not defined")
    }

    const openAiKey = process.env.OPENAI_API_KEY
    if (!openAiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not defined")
    }

    this.client = new ChromaClient({
      path: chromaUrl
    })

    this.embedder = new OpenAIEmbeddingFunction({
      openai_api_key: openAiKey
    })
  }

  async createCollection(name: string) {
    return await this.client.createCollection({
      name,
      embeddingFunction: this.embedder,
    })
  }

  async getCollection(name: string): Promise<Collection> {
    return await this.client.getCollection({
      name,
      embeddingFunction: this.embedder,
    })
  }

  async listCollections() {
    return await this.client.listCollections()
  }

  async addDocuments(options: {
    collection: string
    documents: string[]
    ids: string[]
    metadatas?: Array<Record<string, unknown>>
  }) {
    const collection = await this.getCollection(options.collection)
    await collection.add({
      documents: options.documents,
      ids: options.ids,
      metadatas: options.metadatas,
    })
  }

  async query(options: {
    collection: string
    query: string
    nResults?: number
  }) {
    const collection = await this.getCollection(options.collection)
    return await collection.query({
      queryTexts: [options.query],
      nResults: options.nResults || 5,
      include: ["documents", "metadatas", "distances"],
    })
  }

  async similar(options: {
    collection: string
    document: string
    nResults?: number
  }) {
    const collection = await this.getCollection(options.collection)
    return await collection.query({
      queryTexts: [options.document],
      nResults: options.nResults || 5,
      include: ["documents", "metadatas", "distances"],
    })
  }
}
