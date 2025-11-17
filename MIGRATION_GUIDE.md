# Modernization Migration Guide (env-updates)

This guide documents the migration to Effect.ts, Vercel AI SDK, and Convex DB.

## Overview

**Branch:** `env-updates`

**Technologies:**
- **Effect.ts** - Typed error handling, dependency injection, structured concurrency
- **Vercel AI SDK** - Chat streaming, multi-provider management, RAG tools
- **Convex** - Real-time features (NON-PHI data only)

**Strategy:** Progressive rollout with feature flags, dual-running systems

---

## Getting Started

### 1. Environment Setup

Copy the updated `.env.example` to `.env.local` and configure feature flags:

```bash
# Enable Effect.ts foundation
USE_EFFECT=true
EFFECT_STREAM=true  # Start with streaming route

# Enable Vercel AI SDK
USE_VERCEL_AI=true
AI_SDK_STREAMING=true

# Convex (later)
USE_CONVEX_REALTIME=false  # Start disabled
DUAL_WRITE=false
```

### 2. Install Dependencies

All dependencies are already installed via Bun:

```bash
# API
bun add effect @effect/schema @effect/platform-node @hono/effect-validator
bun add ai @ai-sdk/openai @ai-sdk/anthropic ollama-ai-provider
bun add convex

# Frontend
bun add ai
```

---

## Effect.ts Foundation

### Architecture

```
apps/api/src/effect/
├── errors/
│   └── index.ts              # Typed error definitions
├── services/
│   ├── config-service.ts     # Environment config
│   ├── logger-service.ts     # Structured logging
│   └── database-service.ts   # Supabase wrapper
├── layers/
│   └── app-layer.ts          # Service composition
└── index.ts                  # Main exports
```

### Usage Example

```typescript
import { Effect } from "effect";
import { DatabaseService, AppLive, DatabaseError } from "./effect";

// Define an Effect-based route
const getConversationEffect = (id: string, userId: string) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    const logger = yield* LoggerService;

    yield* logger.info("Fetching conversation", { id, userId });

    const conversation = yield* db.query("conversations", (client) =>
      client.from("conversations").select("*").eq("id", id).eq("user_id", userId).single()
    );

    return conversation;
  });

// Use in Hono route
app.get("/conversations/:id", async (c) => {
  const id = c.req.param("id");
  const userId = getUserId(c);

  const program = getConversationEffect(id, userId).pipe(
    Effect.provide(AppLive),
    Effect.catchAll((error) =>
      Effect.sync(() => ({
        error: error._tag,
        statusCode: errorToStatusCode(error),
      }))
    )
  );

  const result = await Effect.runPromise(program);

  if ("error" in result) {
    return c.json({ error: result.error }, result.statusCode);
  }

  return c.json({ success: true, data: result });
});
```

### Key Patterns

**1. Typed Errors**
```typescript
import { DatabaseError, ValidationError } from "./effect/errors";

// Fail with typed error
yield* Effect.fail(new DatabaseError({ operation: "query", cause: error }));

// Handle specific errors
program.pipe(
  Effect.catchTag("DatabaseError", (error) => handleDbError(error)),
  Effect.catchTag("ValidationError", (error) => handleValidationError(error))
)
```

**2. Dependency Injection**
```typescript
// Access services via Context
const db = yield* DatabaseService;
const logger = yield* LoggerService;
const config = yield* ConfigService;

// Provide layers when running
Effect.provide(AppLive)  // Production
Effect.provide(AppTest)  // Testing
```

**3. Resource Management**
```typescript
// Automatic cleanup on interruption
const withConnection = Effect.acquireRelease(
  openConnection,
  (conn) => closeConnection(conn)
);

const result = yield* withConnection.pipe(
  Effect.flatMap((conn) => runQuery(conn))
);
```

---

## Vercel AI SDK Integration

### Provider Registry

```typescript
import { createOllama } from 'ollama-ai-provider';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { createProviderRegistry } from 'ai';

const registry = createProviderRegistry({
  openai: openai,
  anthropic: anthropic,
  ollama: createOllama({ baseURL: 'http://localhost:11434/api' }),
});

// Use with model ID strings
const model = registry.languageModel('openai:gpt-4o');
const model = registry.languageModel('anthropic:claude-3-5-sonnet-20241022');
const model = registry.languageModel('ollama:llama3.2:3b');
```

### Streaming Chat (Backend)

```typescript
import { streamText } from 'ai';

app.post('/api/chat', async (c) => {
  const { messages, modelId } = await c.req.json();

  const result = streamText({
    model: registry.languageModel(modelId),
    messages,
    tools: {
      searchLiterature: {
        description: 'Search medical literature',
        parameters: z.object({ query: z.string() }),
        execute: async ({ query }) => searchPubMed(query),
      },
    },
    maxSteps: 5,
  });

  return result.toUIMessageStreamResponse();
});
```

### React Integration (Frontend)

```typescript
import { useChat } from 'ai/react';

function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: 'http://localhost:3001/api/chat',
    body: {
      modelId: selectedModel,
    },
  });

  return (
    <form onSubmit={handleSubmit}>
      {messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      <input value={input} onChange={handleInputChange} />
      <button disabled={isLoading}>Send</button>
    </form>
  );
}
```

### Hybrid: BAML + Vercel AI SDK

```typescript
// Use BAML for structured medical extraction
const voeData = await baml.ExtractVOEData(clinicalNotes);

// Use Vercel AI SDK for conversational follow-up
const explanation = streamText({
  model: registry.languageModel('openai:gpt-4o-mini'),
  system: `VOE Risk: ${voeData.riskLevel}`,
  messages: conversationHistory,
});
```

---

## Convex Integration

### Setup

```bash
# Initialize Convex
npx convex init

# Define schema
# convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  notes: defineTable({
    content: v.string(),
    author_id: v.string(),
    paper_id: v.string(),  // References Supabase citation
    created_at: v.number(),
  }).index("by_paper", ["paper_id"]),
});
```

### ⚠️ CRITICAL: PHI Data Policy

**DO NOT migrate to Convex:**
- `scd_patients` - Patient records (PHI)
- `voe_episodes` - Clinical episodes (PHI)
- `literature_citations` - Medical records with identifiers
- Any table with Protected Health Information

**OK to migrate to Convex:**
- Collaborative notes (de-identified)
- Chat messages (de-identified)
- Workspace presence
- VOE alerts/notifications (anonymized)

### Dual-Write Pattern

```typescript
import { FEATURES } from "./config/features";

async function createConversation(data) {
  // Always write to Supabase (source of truth)
  const supabaseResult = await supabase.from("conversations").insert(data);

  // Conditionally write to Convex
  if (FEATURES.DUAL_WRITE_MODE) {
    await convex.mutation(api.conversations.create, data);
  }

  return supabaseResult;
}
```

---

## Testing

### Effect.ts Testing

```typescript
import { Effect } from "effect";
import { AppTest } from "./effect";

describe("Conversations Effect", () => {
  it("should fetch conversation", async () => {
    const program = getConversationEffect("123", "user-456").pipe(
      Effect.provide(AppTest)  // Use test layers
    );

    const result = await Effect.runPromise(program);
    expect(result).toBeDefined();
  });
});
```

### Feature Flag Testing

```typescript
describe("Conversations Route", () => {
  beforeAll(() => {
    process.env.USE_EFFECT = "true";
    process.env.EFFECT_CONVERSATIONS = "true";
  });

  it("should use Effect implementation", async () => {
    // Test with Effect enabled
  });
});
```

---

## Migration Checklist

### Effect.ts
- [x] Install dependencies
- [x] Create error definitions
- [x] Create service interfaces
- [x] Create layers
- [ ] Convert `/stream` route
- [ ] Convert `/conversations` route
- [ ] Convert `outboxRelayWorker`
- [ ] Add Effect to all new routes

### Vercel AI SDK
- [x] Install dependencies
- [ ] Create provider registry
- [ ] Convert chat streaming to `streamText`
- [ ] Add `useChat` to frontend
- [ ] Add RAG tool calling
- [ ] Test multi-modal attachments

### Convex
- [x] Install dependencies
- [ ] Initialize Convex project
- [ ] Define schema (non-PHI only)
- [ ] Implement dual-write mode
- [ ] Add collaborative notes
- [ ] Add real-time presence
- [ ] 3-month evaluation period

---

## Troubleshooting

### Effect.ts

**Error: "No service provided"**
- Make sure to call `.pipe(Effect.provide(AppLive))` before `Effect.runPromise`

**Error: "Cannot use await in Effect.gen"**
- Use `yield*` instead of `await` inside `Effect.gen`

### Vercel AI SDK

**Error: "Model not found"**
- Ensure model ID format: `provider:model-name`
- Check provider is registered in `createProviderRegistry`

### Convex

**Error: "HIPAA violation"**
- Never migrate PHI to Convex without BAA confirmation
- Use dual-write mode for testing only

---

## Resources

### Effect.ts
- [Official Docs](https://effect.website/docs)
- [Effect vs Promise](https://effect.website/docs/other/effect-vs-promise)
- [Layers Guide](https://effect.website/docs/requirements-management/layers/)

### Vercel AI SDK
- [Official Docs](https://ai-sdk.dev/docs)
- [Hono Integration](https://ai-sdk.dev/cookbook/api-servers/hono)
- [RAG Patterns](https://ai-sdk.dev/cookbook/guides/rag-chatbot)

### Convex
- [Official Docs](https://docs.convex.dev/)
- [Vector Search](https://docs.convex.dev/vector-search)
- [Migration from PostgreSQL](https://stack.convex.dev/migrate-data-postgres-to-convex)

---

## Support

For issues or questions:
1. Check feature flags in `apps/api/src/config/features.ts`
2. Review error types in `apps/api/src/effect/errors/index.ts`
3. Test with `AppTest` layers
4. Check logs with `DEBUG_EFFECT=true`
