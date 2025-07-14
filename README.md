# AngstromSCD Monorepo

[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-v1.0+-black?logo=bun&logoColor=white)](https://bun.sh)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Hono](https://img.shields.io/badge/Hono-4.7-E36002?logo=hono&logoColor=white)](https://hono.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-with%20pgvector-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![E2B](https://img.shields.io/badge/E2B-Sandboxed%20Execution-00D084)](https://e2b.dev)

### AI Models
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-412991?logo=openai&logoColor=white)](https://openai.com/)
[![Anthropic](https://img.shields.io/badge/Anthropic-Claude-6B46C1)](https://www.anthropic.com/)
[![Ollama](https://img.shields.io/badge/Ollama-Local%20Models-000000)](https://ollama.com/)
[![Meditron](https://img.shields.io/badge/Meditron-Medical%20LLM-DC143C)](https://github.com/epfLLM/meditron)

### Medical Research
[![Medical Research](https://img.shields.io/badge/Focus-Sickle%20Cell%20Disease-DC143C)](https://www.cdc.gov/ncbddd/sicklecell/index.html)
[![FHIR Compatible](https://img.shields.io/badge/FHIR-Compatible-FF6B6B)](https://www.hl7.org/fhir/)
[![Biome](https://img.shields.io/badge/Code%20Style-Biome-60A5FA?logo=biome)](https://biomejs.dev/)
[![Monorepo](https://img.shields.io/badge/Monorepo-Bun%20Workspaces-000000)](https://bun.sh/docs/install/workspaces)

This repository houses the microservices and shared packages that power **AngstromSCD**, an AI-powered medical research platform focused on sickle cell disease (SCD). It features advanced conversational AI with data visualization capabilities, medical literature search, and clinical decision support.

## Key Features

- 🤖 **Multi-Model AI Support**: Integrates OpenAI, Anthropic, and local models (via Ollama)
- 📊 **Interactive Data Visualizations**: Generate charts and graphs inline using E2B sandboxed execution
- 📚 **Medical Literature Search**: PubMed integration for evidence-based responses
- 💾 **Conversation Persistence**: Full conversation history with PostgreSQL storage
- 🔒 **Secure Code Execution**: E2B sandboxes for safe Python code execution
- 🏥 **Medical-Specific Models**: Support for Meditron and other medical LLMs

## Repository structure

```
apps/
  api/         - Hono.js backend service with medical AI integration
  frontend/    - React 18 chat interface with visualization support
packages/
  baml/        - BAML (Boundary ML) for structured AI prompts
  vector/      - Vector search service using pgvector
  shared-types - TypeScript types shared across services
infra/         - Docker services (PostgreSQL with pgvector, Qdrant)
docs/          - Architecture and API documentation
dev.sh         - Quick start script for development
```

## Setup

1. Install dependencies for all workspaces:

```bash
bun run setup
```

2. Set up environment variables:

   Create `.env` files in the following locations:

   **API** (`apps/api/.env`):
   ```bash
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_key
   E2B_API_KEY=your_e2b_api_key  # Required for visualizations
   ```

   **BAML** (`packages/baml/.env`):
   ```bash
   OPENAI_API_KEY=your_openai_key      # Optional
   ANTHROPIC_API_KEY=your_anthropic_key # Optional
   OLLAMA_BASE_URL=http://localhost:11434
   ```

3. Start the databases with Docker:

```bash
cd infra
docker-compose up -d
```

4. Launch the full development stack:

```bash
./dev.sh
```

### Local Model Support (Ollama)

For local LLM inference, install [Ollama](https://ollama.com) and pull models:

```bash
# Medical-specific model
ollama pull meditron:latest

# General-purpose models
ollama pull qwen2.5:0.5b
ollama pull llama3.2:latest
```

### Running individual services

- `bun run dev:api` – API service on port **3001**
- `bun run dev:frontend` – React UI on port **5173**
- `bun run dev:baml` – BAML service on port **3002**
- `bun run dev:vector` – Vector service on port **3003**
- `bun run dev:infra` – Start Docker infrastructure

## Production builds

Generate optimized builds for all apps and packages:

```bash
bun run build
```

## Using Data Visualizations

AngstromSCD can generate inline visualizations similar to Perplexity AI. Simply ask for charts or graphs:

```
"Create a bar chart showing effectiveness of SCD treatments"
"Plot VOE frequency over 12 months"
"Show correlation between hydroxyurea dosage and HbF levels"
```

Visualizations are generated using Python code executed in secure E2B sandboxes and displayed inline in the chat.

## API Documentation

### Chat Endpoint
```bash
POST /api/chat
{
  "message": "Your medical query",
  "model": "meditron:latest"  # optional, defaults to meditron
}
```

### Conversation Management
```bash
# Create conversation
POST /api/conversations

# List conversations
GET /api/conversations

# Get conversation with messages
GET /api/conversations/:id

# Add message to conversation
POST /api/conversations/:id/messages
```

## Architecture

- **Frontend**: React 18 with TypeScript, Tailwind CSS, and Vite
- **Backend**: Hono.js on Bun runtime with PostgreSQL
- **AI/ML**: BAML for prompt engineering, multiple model providers
- **Visualization**: E2B sandboxed Python execution
- **Search**: pgvector for semantic search, PubMed API integration
- **Infrastructure**: Docker Compose for local development

## Security and Compliance

Handling medical data requires strict precautions:

- 🔒 All code execution happens in isolated E2B sandboxes
- 🔐 API keys and secrets managed through environment variables
- ✅ Input validation with Zod schemas
- 🚫 Never log patient identifiers or PHI
- 📝 Maintain audit trails for compliance
- 🔥 Use HTTPS in production

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Bun](https://bun.sh) - Fast all-in-one JavaScript runtime
- Powered by [E2B](https://e2b.dev) - Secure code execution infrastructure
- Medical AI by [Meditron](https://github.com/epfLLM/meditron) - Open medical LLM

---

Created with ❤️ for advancing sickle cell disease research and treatment.
