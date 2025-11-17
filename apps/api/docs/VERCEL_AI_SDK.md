# Vercel AI SDK Integration

This document explains how to use the Vercel AI SDK integration for streaming chat in the AngstromSCD API.

## Overview

The Vercel AI SDK provides a unified interface for streaming chat responses from multiple AI providers (OpenAI, Anthropic, Ollama). It complements BAML by focusing on streaming chat interactions with built-in tool calling support.

### When to Use

- **Vercel AI SDK**: Streaming chat responses, real-time interactions, multi-provider support
- **BAML**: Structured outputs, medical report generation, type-safe AI responses

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Feature Flags                        │
│  USE_VERCEL_AI=true                                 │
│  AI_SDK_STREAMING=true                              │
│  AI_SDK_TOOLS=true (for PubMed search)             │
│  EFFECT_CHAT=true (for Effect.ts implementation)    │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│           Provider Registry                          │
│  - OpenAI (GPT-4o, GPT-4o-mini, etc.)              │
│  - Anthropic (Claude 3.5 Sonnet, Haiku, Opus)      │
│  - Ollama (Llama 3.2, Llama 3.3, Qwen, etc.)       │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              AIService (Effect.ts)                   │
│  - Type-safe error handling                         │
│  - Dependency injection                             │
│  - Stream management                                │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              Chat Routes                             │
│  POST /api/chat/stream - Streaming chat             │
│  GET  /api/chat/models - List available models      │
│  GET  /api/chat/ai-sdk/health - Health check        │
└─────────────────────────────────────────────────────┘
```

## Supported Models

### OpenAI
- `openai:gpt-4o` - Latest GPT-4o model
- `openai:gpt-4o-mini` - Faster, smaller GPT-4o (default)
- `openai:gpt-4-turbo` - GPT-4 Turbo
- `openai:gpt-3.5-turbo` - GPT-3.5 Turbo

### Anthropic
- `anthropic:claude-3-5-sonnet-20241022` - Claude 3.5 Sonnet
- `anthropic:claude-3-5-haiku-20241022` - Claude 3.5 Haiku
- `anthropic:claude-3-opus-20240229` - Claude 3 Opus

### Ollama (Local)
- `ollama:llama3.2:3b` - Llama 3.2 (3B)
- `ollama:llama3.3:32b` - Llama 3.3 (32B quantized)
- `ollama:llama3.3:70b` - Llama 3.3 (70B quantized)
- `ollama:qwen2.5:0.5b` - Qwen 2.5 (0.5B)
- `ollama:mixtral:8x7b` - Mixtral 8x7B
- `ollama:codellama:70b` - CodeLlama 70B
- `ollama:meditron:70b` - Meditron 70B (medical specialist)

## API Endpoints

### POST /api/chat/stream

Stream chat responses with multi-provider support.

**Request:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "What are the latest treatments for sickle cell disease?"
    }
  ],
  "modelId": "openai:gpt-4o-mini",
  "temperature": 0.7,
  "maxTokens": 1000
}
```

**Response:**
Server-Sent Events (SSE) stream with text deltas:

```
event: text-delta
data: {"type":"text-delta","content":"The latest"}

event: text-delta
data: {"type":"text-delta","content":" treatments"}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3001/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What are recent studies on hydroxyurea for SCD?"}
    ],
    "modelId": "openai:gpt-4o-mini"
  }'
```

### GET /api/chat/models

List all available AI models.

**Response:**
```json
{
  "success": true,
  "data": {
    "defaultModel": "openai:gpt-4o-mini",
    "providers": [
      {
        "provider": "openai",
        "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"]
      },
      {
        "provider": "anthropic",
        "models": ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"]
      },
      {
        "provider": "ollama",
        "models": ["llama3.2:3b", "qwen2.5:0.5b", "meditron:70b"]
      }
    ]
  }
}
```

### GET /api/chat/ai-sdk/health

Check AI SDK availability and enabled features.

**Response:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "status": "ready",
    "features": {
      "streaming": true,
      "toolCalling": true,
      "multiModal": false
    }
  }
}
```

## Tool Calling - PubMed Search

When `AI_SDK_TOOLS=true`, the AI can automatically search PubMed for medical literature.

**Example Conversation:**
```
User: What does recent research say about vaso-occlusive crisis management?

AI: [Automatically calls searchLiterature tool]
    Tool Call: searchLiterature({ query: "vaso-occlusive crisis management", limit: 5 })

    Based on recent research from PubMed:

    [1] Smith et al. "Novel approaches to VOC pain management" ...
    [2] Johnson et al. "Hydroxyurea in acute vaso-occlusive episodes" ...

    [AI synthesizes findings from the articles]
```

The tool provides:
- Article count
- Full article metadata (PMID, title, authors, journal, DOI)
- Formatted citations
- Abstracts for context

## Feature Flags

Control AI SDK features with environment variables:

```bash
# Enable Vercel AI SDK
USE_VERCEL_AI=true

# Enable specific features
AI_SDK_STREAMING=true    # Streaming chat endpoint
AI_SDK_TOOLS=true        # PubMed search tool calling
AI_SDK_MULTIMODAL=false  # Multi-modal support (future)

# Enable Effect.ts implementation
USE_EFFECT=true
EFFECT_CHAT=true         # Use Effect.ts for chat routes

# Set default model
DEFAULT_AI_MODEL=openai:gpt-4o-mini
```

## Implementation Variants

### Legacy Implementation (Direct Vercel AI SDK)
- Direct use of `streamText()` from Vercel AI SDK
- Basic error handling
- Enabled when `EFFECT_CHAT=false`

### Effect.ts Implementation
- Type-safe error handling with `AIServiceError`
- Dependency injection via `AIService`
- Automatic resource cleanup
- Better observability with tracing
- Enabled when `EFFECT_CHAT=true`

## Frontend Integration (React)

```typescript
import { useChat } from 'ai/react';

function ChatComponent() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat/stream',
    body: {
      modelId: 'openai:gpt-4o-mini',
      temperature: 0.7,
    },
  });

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>
          <strong>{m.role}:</strong> {m.content}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
}
```

## Testing

### Test Health Check
```bash
curl http://localhost:3001/api/chat/ai-sdk/health
```

### Test Model Listing
```bash
curl http://localhost:3001/api/chat/models
```

### Test Streaming (with jq for formatting)
```bash
curl -N -X POST http://localhost:3001/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "modelId": "openai:gpt-4o-mini"
  }' | while read line; do
    echo "$line" | sed 's/data: //' | jq -r '.content // empty'
  done
```

### Test with Ollama (Local)
```bash
# Make sure Ollama is running
curl http://localhost:11434/api/tags

# Test with local model
curl -N -X POST http://localhost:3001/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Explain sickle cell anemia"}],
    "modelId": "ollama:meditron:70b"
  }'
```

## Error Handling

The API returns standard error responses:

```json
{
  "error": "ValidationError",
  "message": "Unsupported model: invalid-model",
  "statusCode": 400,
  "details": {
    "field": "modelId"
  }
}
```

Error Types:
- `ValidationError` (400) - Invalid request parameters
- `AIServiceError` (500) - AI provider failure, stream error
- `ConfigError` (500) - Missing API keys or configuration

## Performance

- **Ollama (Local)**: Fastest for quick responses, no API costs
- **GPT-4o-mini**: Good balance of quality and speed
- **GPT-4o**: Best quality, slower responses
- **Claude 3.5 Sonnet**: Excellent for medical reasoning
- **Claude 3.5 Haiku**: Fastest Claude model

## Security & Compliance

- All API keys stored in environment variables
- Tool calling can be disabled with `AI_SDK_TOOLS=false`
- PubMed search is read-only, no PHI exposed
- Rate limiting should be implemented for production
- Consider using Ollama for PHI-sensitive conversations (on-device)

## Troubleshooting

### "AI SDK streaming not enabled"
- Set `AI_SDK_STREAMING=true` in environment
- Restart the API server

### "Unsupported model"
- Check model ID format: `provider:model-name`
- Verify model is in the provider registry
- Use `/api/chat/models` to see available models

### Ollama connection failed
- Verify Ollama is running: `curl http://localhost:11434/api/tags`
- Check `OLLAMA_BASE_URL` environment variable
- Pull models: `ollama pull llama3.2:3b`

### Tool calling not working
- Set `AI_SDK_TOOLS=true`
- Some models don't support tool calling (check provider docs)
- Check console logs for tool execution errors

## Future Enhancements

- [ ] Multi-modal support (images, PDFs)
- [ ] Streaming with citations embedded
- [ ] Custom medical knowledge base RAG
- [ ] Fine-tuned models for SCD
- [ ] Conversation history management
- [ ] Rate limiting and usage tracking
- [ ] Prompt caching for repeated queries
