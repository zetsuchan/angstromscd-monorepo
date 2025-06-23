# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AngstromSCD is a medical research application focused on **Sickle Cell Disease (SCD)** research and clinical decision support. It's built as a microservices monorepo using **Bun** as the primary JavaScript runtime.

### Architecture

**Monorepo Structure**:
- `apps/api/` - Backend API service using Hono.js
- `apps/frontend/` - React frontend with Tailwind CSS
- `packages/baml/` - AI/ML service using BoundaryML for medical research assistance
- `packages/vector/` - Vector database service using ChromaDB for semantic search
- `packages/apple-bridge/` - Swift service bridging Apple Foundation Models
- `infra/` - Docker infrastructure with PostgreSQL and ChromaDB

**Key Technologies**:
- **Runtime**: Bun (package manager and JavaScript runtime)
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Hono.js web framework
- **Database**: Supabase (PostgreSQL) + ChromaDB (vector embeddings)
- **AI/ML**: BoundaryML (BAML) for structured AI prompts
- **Code Quality**: Biome for linting and formatting

## Development Commands

### Primary Development Workflow
```bash
# Quick start entire development environment
./dev.sh

# Or manually:
bun run setup     # Install all dependencies
bun run dev       # Start all services concurrently
```

### Individual Services
```bash
bun run dev:frontend    # React frontend (Vite dev server)
bun run dev:api        # Hono.js API (port 3001)
bun run dev:baml       # BAML AI service
bun run dev:vector     # ChromaDB vector service
bun run dev:infra      # Docker infrastructure
```

### Build and Quality
```bash
bun run build         # Build all packages and apps
bun run lint          # Check code with Biome
bun run lint:fix      # Fix linting issues
```

### Local AI Services
- **Ollama**: Install from https://ollama.com, runs on port 11434
  - Pull models: `ollama pull qwen2.5:0.5b`, `ollama pull llama3.2:3b`, `ollama pull mixtral:8x7b`
- **Apple Foundation Bridge**: `cd packages/apple-bridge && swift run` (port 3004, requires macOS 26+)

### Infrastructure Setup
```bash
# Start databases (Docker required)
cd infra
docker-compose up -d

# Initialize database schema
./scripts/setup-database.sh

# Verify all services are running
./scripts/verify-services.sh
```

## Database Architecture

**PostgreSQL** (Structured Data):
- Database: `angstromscd`
- Tables: `scd_patients`, `voe_episodes`, `literature_citations`
- Access via Supabase client in `apps/api/src/lib/db.ts`

**Vector Databases** (Multiple Provider Support):
- **ChromaDB**: Default provider, runs on port 8000
- **Qdrant**: Alternative provider, runs on port 6333
- **PostgreSQL + pgvector**: Uses existing PostgreSQL with vector extension
- Collections: `medical_papers`, `user_documents`, `clinical_datasets`, `conversation_context`
- Used for semantic search of medical literature
- Provider selection via `VECTOR_PROVIDER` environment variable

## Medical Domain Context

This application specifically handles:
- **Sickle Cell Disease (SCD)** research and clinical support
- **Vaso-Occlusive Episodes (VOE)** risk assessment
- Medical literature search with semantic embeddings
- Citation management (PMID/DOI references)
- Hydroxyurea therapy dosing guidance
- FHIR-compatible clinical data structures

## Key State Management

**Frontend**: Uses React Context (`src/context/ChatContext.tsx`) for:
- Chat conversations and message history
- Workspace management (Global, Project X, My Papers)
- Medical literature references and citations
- VOE alerts and notifications

**Mock Data**: `apps/frontend/src/data/mockData.ts` contains sample medical conversations and research threads for development.

## Supported AI Models

### Cloud Models
- **OpenAI**: GPT-4o, GPT-4o-mini
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Haiku

### Local Models (via Ollama)
- **Small**: Qwen 2.5 (0.5B parameters) - Fast, lightweight
- **Medium**: Llama 3.2 (3B), Llama 3.3 (32B quantized)
- **Large**: Llama 3.3 (70B quantized), Mixtral 8x7B
- **Specialized**: CodeLlama (70B) for code generation

### Apple Foundation Models (macOS 26+)
- **On-Device**: ~3B parameter model with 3.7 bits-per-weight quantization
- **Features**: Adapter-based fine-tuning, ~0.6ms per prompt token latency
- **Privacy**: All processing on-device, no cloud dependency

## Testing

Currently, the codebase does not have a comprehensive test suite. When implementing tests:
- Check package.json for available test scripts before creating new ones
- Consider the medical domain requirements when writing test cases
- Ensure PHI (Protected Health Information) is properly mocked in tests

## API Endpoints

Key API routes are defined in `apps/api/src/index.ts`:
- `/api/health` - Health check endpoint
- `/api/chat` - Main chat interface for medical queries
- `/api/literature` - Medical literature search
- `/api/patients` - Patient data management (requires authentication)
- `/api/voe` - VOE risk assessment endpoints

## Environment Setup

**Required Environment Variables**:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key

**BAML Service Variables**:
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key
- `OLLAMA_BASE_URL` - Ollama base URL (default: http://localhost:11434)
- `APPLE_BRIDGE_URL` - Apple Foundation Bridge URL (default: http://localhost:3004)

**Prerequisites**:
- Docker (for PostgreSQL and ChromaDB)
- Bun runtime installed
- Ollama (optional, for local models)
- Swift 6.1+ and macOS 26+ (optional, for Apple models)

**Port Configuration**:
- Frontend: Vite dev server (typically 5173)
- API: 3001
- BAML: 3002
- Apple Bridge: 3004
- ChromaDB: 8000
- Ollama: 11434
- PostgreSQL: 5432

## Common Development Patterns

### Adding New AI Models
To add a new AI model provider:
1. Update `packages/baml/baml_src/clients.baml` with the new client configuration
2. Add the model to `packages/baml/src/services/model-service.ts`
3. Update frontend model selector in `apps/frontend/src/components/ModelSelector.tsx`

### Database Migrations
When modifying the database schema:
1. Update SQL scripts in `infra/scripts/`
2. Run `./scripts/setup-database.sh` to apply changes
3. Update TypeScript types in `apps/api/src/types/`

### BAML Prompt Engineering
BAML files in `packages/baml/baml_src/` define structured AI prompts:
- `medical_researcher.baml` - Medical research assistant prompts
- `clients.baml` - AI model client configurations
- Use `bun run baml:generate` after modifying BAML files

### Frontend State Updates
When adding new features that require state:
1. Update context in `apps/frontend/src/context/ChatContext.tsx`
2. Add corresponding types in `apps/frontend/src/types/`
3. Update mock data in `apps/frontend/src/data/mockData.ts` for development

## Debugging Tips

### Service Connection Issues
- Check all services are running: `bun run dev`
- Verify Docker containers: `docker ps`
- Check service logs: `docker logs infra-postgres-1` or `docker logs infra-chromadb-1`
- Ensure environment variables are set in `.env` files

### CORS Issues
- API CORS configuration is in `apps/api/src/index.ts`
- Frontend proxy configuration is in `apps/frontend/vite.config.ts`

### AI Model Errors
- Check API keys in environment variables
- Verify Ollama is running: `curl http://localhost:11434/api/tags`
- Check Apple Bridge: `curl http://localhost:3004/health`
- Review BAML service logs for detailed error messages