-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create schema for vector operations
CREATE SCHEMA IF NOT EXISTS vector_store;

-- Grant permissions
GRANT ALL ON SCHEMA vector_store TO postgres;

-- Create function to set updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Note: The actual tables will be created by the pgvector-provider.ts during initialization
-- This script just ensures the extension is available when the container starts