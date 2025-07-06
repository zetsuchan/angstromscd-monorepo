-- Initialize pgvector extension and create vector tables
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vector collections table
CREATE TABLE IF NOT EXISTS vector_collections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    dimension INTEGER NOT NULL DEFAULT 1536,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create vector documents table
CREATE TABLE IF NOT EXISTS vector_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id INTEGER REFERENCES vector_collections(id) ON DELETE CASCADE,
    document_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(collection_id, document_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vector_documents_collection_id ON vector_documents(collection_id);
CREATE INDEX IF NOT EXISTS idx_vector_documents_document_id ON vector_documents(document_id);
CREATE INDEX IF NOT EXISTS idx_vector_documents_embedding ON vector_documents USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_vector_documents_metadata ON vector_documents USING gin (metadata);

-- Create default collections mentioned in CLAUDE.md
INSERT INTO vector_collections (name, dimension) VALUES 
    ('medical_papers', 1536),
    ('user_documents', 1536),
    ('clinical_datasets', 1536),
    ('conversation_context', 1536)
ON CONFLICT (name) DO NOTHING;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_vector_collections_updated_at 
    BEFORE UPDATE ON vector_collections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vector_documents_updated_at 
    BEFORE UPDATE ON vector_documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();