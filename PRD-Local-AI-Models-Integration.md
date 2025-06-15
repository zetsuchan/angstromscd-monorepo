# Product Requirements Document: Local AI Models Integration

## Executive Summary

This PRD outlines the implementation of local AI model support for AngstromSCD, enabling the use of Ollama models (ranging from 0.5B to 130B parameters) and Apple Foundation Models (~3B on-device) alongside existing cloud providers (OpenAI, Anthropic).

## Goals & Objectives

1. **Enable Local AI Inference**: Support privacy-preserving, offline-capable AI models
2. **Multi-Model Support**: Allow users to choose from various model sizes based on their needs
3. **Unified Interface**: Maintain consistent API across all providers
4. **Platform Optimization**: Leverage Apple Silicon for Foundation Models

## Implementation Details

### 1. BAML Service Updates

#### A. New Dependencies
No new npm dependencies required - uses native fetch API

#### B. Configuration Updates

**File: `angstromscd-baml/baml_src/clients.baml`**

Add after existing client definitions:
```baml
// Ollama Local Models
client<llm> OllamaQwen05B {
  provider ollama
  options {
    model "qwen2.5:0.5b"
    base_url env.OLLAMA_BASE_URL
  }
}

client<llm> OllamaLlama32B {
  provider ollama
  options {
    model "llama3.3:70b-instruct-q4_K_M"
    base_url env.OLLAMA_BASE_URL
  }
}

client<llm> OllamaLlama70B {
  provider ollama
  options {
    model "llama3.3:70b-instruct-q4_K_M"
    base_url env.OLLAMA_BASE_URL
  }
}

client<llm> OllamaMixtral {
  provider ollama
  options {
    model "mixtral:8x7b"
    base_url env.OLLAMA_BASE_URL
  }
}

// Apple Foundation Models (via Swift bridge)
client<llm> AppleFoundation3B {
  provider openai
  options {
    model "apple-foundation-3b"
    api_key "local"
    base_url env.APPLE_BRIDGE_URL
  }
}
```

**File: `angstromscd-baml/.env.example`**

Add:
```env
OLLAMA_BASE_URL=http://localhost:11434
APPLE_BRIDGE_URL=http://localhost:3004
```

#### C. Service Implementation

**File: `angstromscd-baml/src/services/baml-service.ts`**

Add these functions:
```typescript
export async function testOllamaConnection(): Promise<boolean> {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  
  try {
    const res = await fetch(`${baseUrl}/api/tags`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function runOllamaChat(
  message: string, 
  model: string = "llama3.2:3b"
): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: message }],
      stream: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama error: ${res.statusText}`);
  }

  const data = await res.json();
  return data.message?.content ?? "";
}

export async function testAppleFoundationConnection(): Promise<boolean> {
  const bridgeUrl = process.env.APPLE_BRIDGE_URL || "http://localhost:3004";
  
  try {
    const res = await fetch(`${bridgeUrl}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function runAppleFoundationChat(message: string): Promise<string> {
  const bridgeUrl = process.env.APPLE_BRIDGE_URL || "http://localhost:3004";
  
  const res = await fetch(`${bridgeUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "apple-foundation-3b",
      messages: [{ role: "user", content: message }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Apple Foundation Bridge error: ${res.statusText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}
```

#### D. Type Definitions

**File: `angstromscd-baml/src/types/index.ts`** (create new)
```typescript
export interface ChatRequest {
	message: string;
	model?: string;
	provider?: "openai" | "anthropic" | "ollama" | "apple";
	temperature?: number;
	maxTokens?: number;
}

export interface ChatResponse {
	reply: string;
	model?: string;
	provider?: string;
}

export interface HealthCheckResponse {
	[key: string]: boolean;
}

export const ModelProviderMap = {
	// OpenAI models
	"gpt-4o": "openai",
	"gpt-4o-mini": "openai",
	"gpt-3.5-turbo": "openai",
	
	// Anthropic models
	"claude-3-5-sonnet-20241022": "anthropic",
	"claude-3-haiku-20240307": "anthropic",
	"claude-3-opus-20240229": "anthropic",
	
	// Ollama models
	"qwen2.5:0.5b": "ollama",
	"llama3.2:3b": "ollama",
	"llama3.3:70b-instruct-q4_K_M": "ollama",
	"mixtral:8x7b": "ollama",
	"codellama:70b": "ollama",
	
	// Apple Foundation models
	"apple-foundation-3b": "apple",
} as const;

export type ModelName = keyof typeof ModelProviderMap;
export type ProviderName = typeof ModelProviderMap[ModelName];
```

#### E. Model Router

**File: `angstromscd-baml/src/services/model-router.ts`** (create new)
```typescript
import {
	runOpenAIChat,
	runAnthropicChat,
	runOllamaChat,
	runAppleFoundationChat,
} from "./baml-service";
import { ChatRequest, ModelProviderMap, ModelName } from "../types";

export async function routeModelChat(request: ChatRequest): Promise<string> {
	const { message, model, provider, temperature, maxTokens } = request;
	
	// Determine provider from model name or explicit provider
	let selectedProvider = provider;
	if (!selectedProvider && model) {
		selectedProvider = ModelProviderMap[model as ModelName] as typeof provider;
	}
	
	// Default to OpenAI if no provider specified
	if (!selectedProvider) {
		selectedProvider = "openai";
	}
	
	switch (selectedProvider) {
		case "openai":
			return runOpenAIChat(message);
			
		case "anthropic":
			return runAnthropicChat(message);
			
		case "ollama":
			return runOllamaChat(message, model || "llama3.2:3b");
			
		case "apple":
			return runAppleFoundationChat(message);
			
		default:
			throw new Error(`Unsupported provider: ${selectedProvider}`);
	}
}

export function getAvailableModels() {
	return Object.entries(ModelProviderMap).map(([model, provider]) => ({
		model,
		provider,
		available: true, // In production, check actual availability
	}));
}

export async function checkAllProviders() {
	const { 
		testOpenAIConnection,
		testAnthropicConnection,
		testOllamaConnection,
		testAppleFoundationConnection,
	} = await import("./baml-service");
	
	const [openai, anthropic, ollama, apple] = await Promise.all([
		testOpenAIConnection(),
		testAnthropicConnection(),
		testOllamaConnection(),
		testAppleFoundationConnection(),
	]);
	
	return {
		openai,
		anthropic,
		ollama,
		apple,
	};
}
```

#### F. API Endpoints Update

**File: `angstromscd-baml/src/index.ts`**

Add imports:
```typescript
import {
  runOllamaChat,
  runAppleFoundationChat,
  testOllamaConnection,
  testAppleFoundationConnection,
} from "./services/baml-service";
import { routeModelChat, getAvailableModels, checkAllProviders } from "./services/model-router";
import { ChatRequest } from "./types";
```

Add endpoints after existing ones:
```typescript
app.get("/health/ollama", async (c) => {
  const ok = await testOllamaConnection();
  return c.json(success({ ollama: ok }));
});

app.get("/health/apple", async (c) => {
  const ok = await testAppleFoundationConnection();
  return c.json(success({ apple: ok }));
});

app.get("/health", async (c) => {
  const status = await checkAllProviders();
  return c.json(success(status));
});

app.get("/models", (c) => {
  const models = getAvailableModels();
  return c.json(success({ models }));
});

app.post("/chat/ollama", async (c) => {
  try {
    const { message, model } = await c.req.json();
    const reply = await runOllamaChat(message, model);
    return c.json(success({ reply }));
  } catch (err) {
    return c.json(failure((err as Error).message), 500);
  }
});

app.post("/chat/apple", async (c) => {
  try {
    const { message } = await c.req.json();
    const reply = await runAppleFoundationChat(message);
    return c.json(success({ reply }));
  } catch (err) {
    return c.json(failure((err as Error).message), 500);
  }
});

// Unified chat endpoint with model routing
app.post("/chat", async (c) => {
  try {
    const request = await c.req.json<ChatRequest>();
    const reply = await routeModelChat(request);
    return c.json(success({ 
      reply,
      model: request.model,
      provider: request.provider,
    }));
  } catch (err) {
    return c.json(failure((err as Error).message), 500);
  }
});
```

Enable CORS:
```typescript
import { cors } from "hono/cors";

// After creating app
app.use("/*", cors());
```

#### G. Package.json Scripts

Add to `angstromscd-baml/package.json`:
```json
"scripts": {
  "lint": "biome check .",
  "lint:fix": "biome check --write ."
}
```

### 2. Apple Foundation Models Bridge Service

Create new directory: `angstromscd-apple-bridge/`

#### A. Swift Package Setup

**File: `angstromscd-apple-bridge/Package.swift`**
```swift
// swift-tools-version: 6.1
import PackageDescription

let package = Package(
    name: "AppleFoundationBridge",
    platforms: [
        .macOS(.v15)
    ],
    dependencies: [
        .package(url: "https://github.com/vapor/vapor.git", from: "4.102.0"),
    ],
    targets: [
        .executableTarget(
            name: "AppleFoundationBridge",
            dependencies: [
                .product(name: "Vapor", package: "vapor"),
            ]),
    ]
)
```

#### B. Main Service Implementation

**File: `angstromscd-apple-bridge/Sources/main.swift`**
```swift
import Foundation
import Vapor
// Note: FoundationModels would be imported here when available
// import FoundationModels

// Mock implementation until Apple Foundation Models framework is available
struct ChatCompletionRequest: Content {
    let model: String
    let messages: [Message]
    let temperature: Double?
    let maxTokens: Int?
    
    struct Message: Content {
        let role: String
        let content: String
    }
}

struct ChatCompletionResponse: Content {
    let choices: [Choice]
    let model: String
    
    struct Choice: Content {
        let message: Message
        let index: Int
        let finishReason: String?
    }
    
    struct Message: Content {
        let role: String
        let content: String
    }
}

// Mock Apple Foundation Model service
// Replace with actual FoundationModels implementation when available
class AppleFoundationModelService {
    func processChat(request: ChatCompletionRequest) async throws -> String {
        // Mock implementation - replace with actual Foundation Models API
        // let session = LanguageModelSession(instructions: "You are a helpful assistant")
        // let response = try await session.respond(
        //     to: request.messages.last?.content ?? "",
        //     options: GenerationOptions(temperature: request.temperature ?? 1.0)
        // )
        
        // For now, return a mock response
        return "This is a mock response from Apple Foundation Models bridge. " +
               "In production, this would use the actual FoundationModels framework."
    }
}

func routes(_ app: Application) throws {
    let modelService = AppleFoundationModelService()
    
    app.get { req in
        return ["message": "Apple Foundation Models Bridge Service"]
    }
    
    app.get("health") { req in
        return ["status": "ok", "platform": "macOS", "model": "apple-foundation-3b"]
    }
    
    app.post("v1", "chat", "completions") { req async throws -> ChatCompletionResponse in
        let request = try req.content.decode(ChatCompletionRequest.self)
        
        let responseText = try await modelService.processChat(request: request)
        
        return ChatCompletionResponse(
            choices: [
                ChatCompletionResponse.Choice(
                    message: ChatCompletionResponse.Message(
                        role: "assistant",
                        content: responseText
                    ),
                    index: 0,
                    finishReason: "stop"
                )
            ],
            model: request.model
        )
    }
}

@main
struct AppleFoundationBridge {
    static func main() async throws {
        var env = try Environment.detect()
        try LoggingSystem.bootstrap(from: &env)
        
        let app = Application(env)
        defer { app.shutdown() }
        
        app.http.server.configuration.port = 3004
        
        // Configure CORS
        app.middleware.use(CORSMiddleware(
            configuration: CORSMiddleware.Configuration(
                allowedOrigin: .all,
                allowedMethods: [.GET, .POST, .OPTIONS],
                allowedHeaders: [.accept, .authorization, .contentType, .origin]
            )
        ))
        
        try routes(app)
        
        print("Apple Foundation Models Bridge running on port 3004")
        try await app.run()
    }
}
```

#### C. Documentation

**File: `angstromscd-apple-bridge/README.md`**
```markdown
# Apple Foundation Models Bridge

This Swift microservice provides a bridge between the AngstromSCD BAML service and Apple's Foundation Models framework.

## Requirements

- macOS 15.0+ (Sequoia)
- Xcode 16+
- Swift 6.1+
- Apple Silicon Mac (M1/M2/M3/M4)

## Setup

1. Install dependencies:
```bash
swift package resolve
```

2. Build the service:
```bash
swift build
```

3. Run the service:
```bash
swift run
```

The service will start on port 3004.

## API Endpoints

- `GET /` - Service info
- `GET /health` - Health check
- `POST /v1/chat/completions` - Chat completion endpoint (OpenAI-compatible format)

## Integration with FoundationModels

When the Apple Foundation Models framework becomes available:

1. Import the framework in `Package.swift`:
```swift
dependencies: [
    .package(url: "https://github.com/vapor/vapor.git", from: "4.102.0"),
    // Add FoundationModels package when available
]
```

2. Update `main.swift` to use the actual API:
```swift
import FoundationModels

class AppleFoundationModelService {
    let session = LanguageModelSession(
        instructions: "You are a helpful medical research assistant"
    )
    
    func processChat(request: ChatCompletionRequest) async throws -> String {
        return try await session.respond(
            to: request.messages.last?.content ?? "",
            options: GenerationOptions(
                temperature: request.temperature ?? 1.0
            )
        )
    }
}
```

## Environment Variables

None required for the mock implementation. The service runs entirely on-device.

## Development

To add support for additional Apple Foundation Models features:

1. **Guided Generation**: Use `@Generable` macro for structured outputs
2. **Tool Calling**: Implement the `Tool` protocol for custom tools
3. **Streaming**: Add streaming endpoints for real-time responses
4. **Adapters**: Support for loading custom LoRA adapters

## Notes

- This is a mock implementation until the Foundation Models framework is publicly available
- The service provides an OpenAI-compatible API to simplify integration
- All processing happens on-device for privacy
- Optimized for Apple Silicon performance
```

#### D. Git Configuration

**File: `angstromscd-apple-bridge/.gitignore`**
```
.DS_Store
/.build
/Packages
xcuserdata/
DerivedData/
.swiftpm/configuration/registries.json
.swiftpm/xcode/package.xcworkspace/contents.xcworkspacedata
.netrc
```

### 3. Documentation Updates

#### Update CLAUDE.md

Add to Development Commands section:
```markdown
### Local AI Services
- **Ollama**: Install from https://ollama.com, runs on port 11434
  - Pull models: `ollama pull qwen2.5:0.5b`, `ollama pull llama3.2:3b`, `ollama pull mixtral:8x7b`
- **Apple Foundation Bridge**: `cd angstromscd-apple-bridge && swift run` (port 3004, requires macOS 15+)
```

Update BAML Pipeline section:
```markdown
#### BAML Pipeline (`angstromscd-baml/`)
- **Tech**: Bun + @boundaryml/baml + Hono.js
- **Purpose**: AI prompt engineering and model management
- **Key**: BAML configuration in `baml_src/`, unified model routing in `src/services/model-router.ts`
- **Integrations**: OpenAI, Anthropic, Ollama (local), Apple Foundation Models (via Swift bridge)
- **Unified endpoint**: `POST /chat` with model selection support
```

Add new section:
```markdown
### Supported AI Models

#### Cloud Models
- **OpenAI**: GPT-4o, GPT-4o-mini
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Haiku

#### Local Models (via Ollama)
- **Small**: Qwen 2.5 (0.5B parameters) - Fast, lightweight
- **Medium**: Llama 3.2 (3B), Llama 3.3 (32B quantized)
- **Large**: Llama 3.3 (70B quantized), Mixtral 8x7B
- **Specialized**: CodeLlama (70B) for code generation

#### Apple Foundation Models (macOS 15+)
- **On-Device**: ~3B parameter model with 2-bit quantization
- **Features**: Guided generation, tool calling, streaming
- **Privacy**: All processing on-device, no cloud dependency
```

Update environment configuration:
```markdown
#### BAML Service
```
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
OLLAMA_BASE_URL=http://localhost:11434
APPLE_BRIDGE_URL=http://localhost:3004
```
```

Update development workflow:
```markdown
### Development Workflow

1. **Start Infrastructure**: `cd angstromscd-infra && docker-compose up -d`
2. **Start Local AI (optional)**:
   - Ollama: `ollama serve` (if not running as service)
   - Apple Bridge: `cd angstromscd-apple-bridge && swift run`
3. **Install Dependencies**: `bun install` in each service directory
4. **Run Services**:
   - API: `cd angstromscd-api && bun run src/index.ts`
   - BAML: `cd angstromscd-baml && bun run src/index.ts` 
   - Vector: `cd angstromscd-vector && bun run src/index.ts`
   - Frontend: `cd AngstromSCD && bun dev`
```

## API Usage Examples

### 1. Check Provider Health
```bash
# Check all providers
GET /health

# Check specific provider
GET /health/ollama
GET /health/apple
```

### 2. List Available Models
```bash
GET /models
```

### 3. Unified Chat Endpoint
```bash
POST /chat
{
  "message": "What are the latest treatments for sickle cell disease?",
  "model": "llama3.2:3b",  // Auto-routes to Ollama
  "temperature": 0.7
}

# Or specify provider explicitly
{
  "message": "Explain vaso-occlusive crisis",
  "provider": "apple",
  "temperature": 0.5
}
```

### 4. Provider-Specific Endpoints (legacy)
```bash
POST /chat/ollama
{
  "message": "Your question",
  "model": "mixtral:8x7b"
}

POST /chat/apple
{
  "message": "Your question"
}
```

## Testing Strategy

1. **Unit Tests**: Test model router logic
2. **Integration Tests**: Verify provider connections
3. **Load Tests**: Compare performance across model sizes
4. **Prompt Tests**: Optimize prompts for each model type

## Deployment Considerations

1. **Ollama**: Can run on any machine with sufficient RAM
2. **Apple Bridge**: Must run on Apple Silicon Mac with macOS 15+
3. **Model Storage**: Plan for disk space (0.5GB to 100GB+ per model)
4. **Memory Requirements**: Scale with model size (2GB for 0.5B to 64GB+ for 70B)

## Future Enhancements

1. **Streaming Support**: Real-time token generation
2. **Model Caching**: Intelligent model loading/unloading
3. **Prompt Templates**: Model-specific prompt optimization
4. **Performance Metrics**: Track inference speed per model
5. **Hybrid Routing**: Use small models for simple tasks, large for complex
```