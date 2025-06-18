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

The Apple Foundation Models framework is available in iOS 18.1+, iPadOS 18.1+, and macOS 15.1+. It provides access to Apple's ~3B parameter on-device language model with support for adapter-based fine-tuning.

When integrating with the actual framework:

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

- This is a mock implementation that will be updated when full FoundationModels API documentation is available
- The service provides an OpenAI-compatible API to simplify integration
- All processing happens on-device for privacy preservation
- Optimized for Apple Silicon performance with ~0.6ms per prompt token latency
- The ~3B parameter model uses 3.7 bits-per-weight quantization for efficiency
- Supports dynamic adapter loading for task-specific fine-tuning