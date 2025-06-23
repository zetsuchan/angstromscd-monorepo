export interface VectorDocument {
  id: string
  content: string
  metadata?: Record<string, unknown>
  embedding?: number[]
}

export interface QueryResult {
  ids: string[][]
  documents: (string | null)[][]
  metadatas: (Record<string, unknown> | null)[][]
  distances?: number[][]
  embeddings?: number[][][] | null
}

export interface CollectionInfo {
  name: string
  count?: number
  dimension?: number
}

export interface VectorProvider {
  initialize(): Promise<void>
  
  createCollection(name: string, dimension?: number): Promise<void>
  
  deleteCollection(name: string): Promise<void>
  
  listCollections(): Promise<CollectionInfo[]>
  
  addDocuments(options: {
    collection: string
    documents: string[]
    ids: string[]
    metadatas?: Array<Record<string, unknown>>
  }): Promise<void>
  
  query(options: {
    collection: string
    query: string
    nResults?: number
  }): Promise<QueryResult>
  
  similar(options: {
    collection: string
    document: string
    nResults?: number
  }): Promise<QueryResult>
  
  deleteDocuments?(options: {
    collection: string
    ids: string[]
  }): Promise<void>
}

export interface VectorProviderConfig {
  provider: 'chroma' | 'qdrant' | 'pgvector'
  openaiApiKey?: string
  connectionUrl?: string
  [key: string]: unknown
}