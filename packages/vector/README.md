# MedLab Chat Vector Service

Vector embeddings and semantic search service for MedLab Chat by Angstrom AI - enabling intelligent literature discovery and citation management for sickle cell disease research.

## Overview

The Vector Service provides semantic search capabilities and document embedding functionality for MedLab Chat, powering:

- **Literature Search**: Semantic discovery of relevant medical research papers
- **Citation Expansion**: Source snippet retrieval for inline citation badges
- **Document Processing**: PDF and CSV embedding for uploaded research materials
- **Related Content**: Discovery of similar papers and research connections
- **Medical Knowledge**: Specialized embeddings for sickle cell disease terminology

## Architecture Role

Semantic search and embedding service in the microservices ecosystem:

```
API Service → Vector Service → ChromaDB (Vector Storage)
                            → OpenAI Embeddings API
                            → Medical Literature Collections
```

## Core Capabilities

### Medical Literature Search
- **Semantic Queries**: Natural language search across medical literature
- **PMID/DOI Integration**: Direct reference lookup and validation
- **Citation Clustering**: Related paper discovery and recommendation
- **Medical Terminology**: SCD-specialized vocabulary understanding
- **Context Awareness**: Search results relevant to current conversation thread

### Document Processing Pipeline
- **PDF Extraction**: Research paper content parsing and chunking
- **CSV Analysis**: Clinical data and study result processing
- **Medical Image**: Diagnostic image metadata and description extraction
- **Content Embedding**: Vector representation of medical documents
- **Metadata Enrichment**: Automatic classification and tagging

### Citation Management
- **Source Retrieval**: Expandable snippet generation for citation badges
- **Reference Validation**: PMID/DOI verification and metadata fetching
- **Related Literature**: Automatic discovery of supporting research
- **Impact Analysis**: Citation network and influence mapping

## Technology Stack

- **Runtime**: Bun.js for high-performance vector operations
- **Vector Database**: ChromaDB for scalable similarity search
- **Embeddings**: OpenAI text-embedding-3-large for medical content
- **API Framework**: Hono.js for lightweight HTTP service endpoints
- **Document Processing**: PDF parsing and text extraction utilities
- **Code Quality**: Biome.js for consistent TypeScript development

## Development

### Prerequisites
- Bun runtime installed
- ChromaDB instance running (Docker recommended)
- OpenAI API key for embeddings
- Medical literature datasets (optional)

### Quick Start

```bash
# Install dependencies
bun install

# Copy environment template
cp .env.example .env

# Configure environment variables
# CHROMA_URL, OPENAI_API_KEY

# Start ChromaDB (via Docker)
docker run -p 8000:8000 ghcr.io/chroma-core/chroma:latest

# Start vector service (port 3003)
bun run src/index.ts

# Run code quality checks
bun run lint

# Run sample test script
bun run tests/sample.ts
```

### Environment Configuration

Required environment variables:
- `CHROMA_URL` - ChromaDB server endpoint (default: http://localhost:8000)
- `OPENAI_API_KEY` - OpenAI embeddings API key
- `VECTOR_DIMENSION` - Embedding dimension (default: 3072 for text-embedding-3-large)

## Vector Collections

### Medical Literature (`medical_papers`)
Primary collection for research papers and clinical studies:
- Document embeddings with medical terminology optimization
- Metadata: PMID, DOI, authors, journal, publication date
- Content chunks for citation snippet retrieval
- Medical subject headings (MeSH) for classification

### User Documents (`user_uploads`)
Collection for uploaded PDFs and research materials:
- User-specific document embeddings
- Workspace organization and access control
- File metadata and processing status
- Content extraction and chunking results

### Clinical Data (`clinical_datasets`)
Collection for uploaded CSV data and study results:
- Structured data embeddings for analysis
- Statistical summary and data profiling
- Column metadata and data type inference
- Query optimization for data exploration

## API Endpoints

### Search Operations
- `POST /search` - Semantic search across literature collections
- `POST /similar` - Find similar documents to a given paper
- `GET /cite/:pmid` - Retrieve citation details and snippets
- `POST /recommend` - Get related papers for current conversation

### Document Management
- `POST /embed` - Process and embed uploaded documents
- `GET /documents/:id` - Retrieve document metadata and status
- `DELETE /documents/:id` - Remove document from collection
- `POST /collections/create` - Create new vector collection

### Collection Operations
- `GET /collections` - List available vector collections
- `POST /collections/:name/query` - Query specific collection
- `GET /collections/:name/stats` - Collection statistics and health

## Embedding Pipeline

### Text Processing
```typescript
// Medical text preprocessing
const preprocessMedicalText = (text: string) => {
  // Normalize medical terminology
  // Expand abbreviations (SCD, VOE, HbF, etc.)
  // Handle special characters and formatting
  // Preserve citation references
}

// Chunking strategy for medical papers
const chunkMedicalDocument = (text: string) => {
  // Section-aware chunking (Abstract, Methods, Results, Discussion)
  // Preserve paragraph and sentence boundaries
  // Maintain context for medical concepts
  // Optimize chunk size for retrieval accuracy
}
```

### Vector Operations
```typescript
// Similarity search with medical context
const semanticSearch = async (query: string, filter?: MedicalFilter) => {
  const embedding = await generateEmbedding(preprocessMedicalText(query))
  return await chromaCollection.query({
    queryEmbeddings: [embedding],
    nResults: 10,
    where: filter?.buildWhereClause(),
    include: ['documents', 'metadatas', 'distances']
  })
}
```

## Medical Domain Optimization

### Terminology Handling
- **Abbreviation Expansion**: SCD → Sickle Cell Disease, VOE → Vaso-Occlusive Episode
- **Synonym Mapping**: HbF ↔ Fetal Hemoglobin, Hb ↔ Hemoglobin
- **Context Awareness**: Disease-specific terminology understanding
- **Multi-language**: Medical terminology in multiple languages

### Citation Processing
- **PMID Validation**: PubMed ID verification and metadata retrieval
- **DOI Resolution**: Digital Object Identifier lookup and validation
- **Reference Formatting**: Automatic citation style generation
- **Impact Metrics**: Journal impact factor and citation count integration

### Search Optimization
- **Medical Relevance**: Disease-specific ranking and filtering
- **Recency Weighting**: Preference for recent research publications
- **Clinical Significance**: Prioritization of clinically relevant results
- **Evidence Level**: Systematic reviews and meta-analyses ranking

## Service Integration

### API Service Communication
Receives search and document processing requests:
- Literature search queries from chat interface
- Document upload and processing tasks
- Citation expansion and snippet retrieval
- Related content discovery requests

### Response Processing
Returns structured search results and embeddings:
- Ranked literature search results with relevance scores
- Citation snippets for inline reference expansion
- Document processing status and metadata
- Related paper recommendations and clustering

This vector service enables MedLab Chat to provide intelligent, context-aware literature discovery and seamless integration of medical research into conversational AI interactions.