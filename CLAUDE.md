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
- **Apple Foundation Bridge**: `cd packages/apple-bridge && swift run` (port 3004, requires macOS 15+)

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

**ChromaDB** (Vector Database):
- Collections: `medical_papers`, `user_documents`, `clinical_datasets`, `conversation_context`
- Used for semantic search of medical literature
- Service runs on port 8000

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

### Apple Foundation Models (macOS 15+)
- **On-Device**: ~3B parameter model with 3.7 bits-per-weight quantization
- **Features**: Adapter-based fine-tuning, ~0.6ms per prompt token latency
- **Privacy**: All processing on-device, no cloud dependency

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
- Swift 6.1+ and macOS 15+ (optional, for Apple models)

**Port Configuration**:
- Frontend: Vite dev server (typically 5173)
- API: 3001
- BAML: 3002
- Apple Bridge: 3004
- ChromaDB: 8000
- Ollama: 11434
- PostgreSQL: 5432