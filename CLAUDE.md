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

## Environment Setup

**Required Environment Variables**:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key

**Prerequisites**:
- Docker (for PostgreSQL and ChromaDB)
- Bun runtime installed

**Port Configuration**:
- Frontend: Vite dev server (typically 5173)
- API: 3001
- ChromaDB: 8000
- PostgreSQL: 5432