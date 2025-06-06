# MedLab Chat API Service

The central backend API service for MedLab Chat by Angstrom AI - a research-centric chat application designed for sickle cell disease medical professionals and researchers.

## Overview

This API service orchestrates the core functionality of MedLab Chat, providing REST endpoints for:

- **Thread Management**: Multi-threaded conversation branching and workspace organization
- **Citation System**: Medical literature integration with PMID/DOI reference handling
- **Research Tools**: Literature search, PDF/CSV upload, and claims matrix processing
- **Workspace Context**: Global, project-specific, and personal paper collections
- **Alert System**: VOE risk monitoring and new literature notifications
- **Service Orchestration**: Coordinates AI prompts (BAML) and vector search operations

## Architecture Role

Acts as the main backend orchestrator in the microservices architecture:

```
Frontend (React) → API Service → BAML Service (AI prompts)
                               → Vector Service (Literature search)
                               → Supabase (Data persistence)
```

## Core Features

### Medical Research Integration
- **Literature Citations**: Expandable source snippets with PMID/DOI references
- **Research Modes**: Context-aware chat modes (Research, Create, Analyze, Plan, Learn)
- **Clinical Alerts**: VOE risk warnings and PubMed notification system
- **Workspace Management**: Project-based conversation and paper organization

### Chat Functionality
- **Thread Branching**: "Fork this thread as..." capability for conversation management
- **Message Tones**: Formal, Bullet Points, Lay Summary options
- **Real-time Status**: Vector database sync and FHIR connectivity indicators
- **File Handling**: PDF, CSV, and image attachment processing

## Technology Stack

- **Runtime**: Bun.js for high-performance JavaScript execution
- **Framework**: Hono.js for lightweight, fast HTTP API development
- **Database**: Supabase PostgreSQL for structured data persistence
- **Validation**: Zod for request/response schema validation
- **CORS**: Configured for frontend integration
- **Code Quality**: Biome.js for consistent linting and formatting

## Development

### Prerequisites
- Bun runtime installed
- PostgreSQL database (via Docker or Supabase)
- Environment variables configured

### Quick Start

```bash
# Install dependencies
bun install

# Copy environment template
cp .env.example .env

# Configure environment variables
# SUPABASE_URL, SUPABASE_ANON_KEY, etc.

# Start development server (port 3001)
bun run src/index.ts

# Run code quality checks
bun run lint
```

### Environment Configuration

Required environment variables:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `DATABASE_URL` - PostgreSQL connection string
- `BAML_SERVICE_URL` - BAML service endpoint (default: http://localhost:3002)
- `VECTOR_SERVICE_URL` - Vector service endpoint (default: http://localhost:3003)

## API Endpoints

### Core Routes
- `GET /health` - Service health check
- `POST /api/threads` - Create new conversation thread
- `GET /api/threads/:id` - Retrieve thread with messages
- `POST /api/messages` - Send message to thread
- `POST /api/citations` - Process literature citations
- `GET /api/workspaces` - List available workspaces

### Integration Routes
- `POST /api/search` - Trigger literature search via Vector service
- `POST /api/generate` - Process AI prompts via BAML service
- `POST /api/upload` - Handle file uploads (PDF, CSV, images)
- `GET /api/alerts` - Retrieve recent alerts and notifications

## Database Schema

Key tables managed through Supabase:
- `threads` - Conversation threads with workspace context
- `messages` - Individual chat messages with citations
- `citations` - Medical literature references (PMID/DOI)
- `workspaces` - Project and paper organization
- `alerts` - System notifications and warnings
- `files` - Uploaded document metadata

## Service Integration

### BAML Service Communication
Sends structured prompts for AI processing based on chat mode context:
- Research mode: Literature analysis and synthesis
- Create mode: Document and report generation
- Analyze mode: Data interpretation and insights
- Plan mode: Treatment and research planning
- Learn mode: Educational content delivery

### Vector Service Communication
Coordinates medical literature search and similarity operations:
- Citation expansion and source retrieval
- Literature search with medical terminology
- Document embedding for uploaded PDFs
- Related paper discovery and recommendations

This service forms the backbone of MedLab Chat's research-focused functionality, enabling seamless integration between conversational AI and medical literature discovery.