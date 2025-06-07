# AngstromSCD Monorepo

This repository houses the microservices and shared packages that power **MedLab Chat**, a research platform focused on sickle cell disease. It uses Bun's workspace system to manage multiple applications within one repository.

## Repository structure

```
apps/
  api/       - Hono.js backend service
  frontend/  - React 18 chat interface
packages/
  baml/      - BAML prompt pipeline
  vector/    - ChromaDB search service
infra/       - Docker services (PostgreSQL, ChromaDB)
dev.sh       - Start all services with hot reload
```

## Setup

1. Install dependencies for all workspaces:

```bash
bun run setup
```

2. Copy `.env.example` files to `.env` in each service and provide credentials:
   - **API** (`apps/api`): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DATABASE_URL`, `BAML_SERVICE_URL`, `VECTOR_SERVICE_URL`
   - **BAML** (`packages/baml`): `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
   - **Vector** (`packages/vector`): `CHROMA_URL`, `OPENAI_API_KEY`
   - **Infrastructure** (`infra`): connection URLs for Docker services

3. Start the databases with Docker:

```bash
cd infra
docker-compose up -d
```

4. Launch the full development stack:

```bash
./dev.sh
```

### Running individual services

- `bun run dev:api` – API service on port **3001**
- `bun run dev:frontend` – React UI on port **5173**
- `bun run dev:baml` – BAML service on port **3002**
- `bun run dev:vector` – Vector service on port **3003**

## Production builds

Generate optimized builds for all apps and packages:

```bash
bun run build
```

## Security and compliance

Handling medical data requires strict precautions:

- Never log patient identifiers or protected health information.
- Validate all inputs with Zod schemas in the API service.
- Use HTTPS and environment variables for secrets in production.
- Maintain audit trails and follow data retention policies.

---

This project was created using `bun init` in bun v1.2.14. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
