# Apple Foundation Models Bridge

This Swift microservice provides a bridge between the AngstromSCD BAML service and Apple's Foundation Models framework.

## Requirements

- macOS 26.0+
- Xcode 16+
- Swift 6.1+
- Apple Silicon Mac (M1/M2/M3/M4)

## Features

- ✅ On-device language model (~3B parameters)
- ✅ OpenAI-compatible API for easy integration
- ✅ Streaming support for real-time responses
- ✅ Session management for conversational context
- ✅ Medical research tools integration
- ✅ Guided generation support
- ✅ Privacy-first: all processing on-device

## Setup

1. Install dependencies:
```bash
swift package resolve
```

2. Build the service:
```bash
swift build -c release
```

3. Run the service:
```bash
swift run
```

The service will start on port 3004.

## API Endpoints

### Health Check
```bash
GET /health
```

Returns model availability and capabilities:
```json
{
  "status": "ok",
  "platform": "macOS",
  "model": "apple-foundation-3b",
  "available": true,
  "version": "1.0.0",
  "capabilities": [
    "chat_completion",
    "streaming",
    "guided_generation",
    "tool_calling"
  ]
}
```

### Chat Completions
```bash
POST /v1/chat/completions
```

OpenAI-compatible chat endpoint:
```json
{
  "model": "apple-foundation-3b",
  "messages": [
    {"role": "system", "content": "You are a medical research assistant"},
    {"role": "user", "content": "Explain VOE pathophysiology"}
  ],
  "temperature": 0.7,
  "max_tokens": 2048,
  "stream": false,
  "session_id": "optional-session-id"
}
```

### Streaming Chat
Same endpoint with `"stream": true` for real-time responses:
```bash
curl -X POST http://localhost:3004/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "apple-foundation-3b",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

### Model Information
```bash
GET /v1/models
```

Returns available models and their capabilities:
```json
{
  "object": "list",
  "data": [{
    "id": "apple-foundation-3b",
    "object": "model",
    "owned_by": "apple",
    "capabilities": {
      "max_tokens": 4096,
      "supports_streaming": true,
      "supports_tools": true,
      "supports_guided_generation": true,
      "context_window": 65536
    }
  }]
}
```

### Session Management
```bash
DELETE /v1/sessions/{sessionId}
DELETE /v1/sessions  # Clear all sessions
```

## Integration with FoundationModels

The Apple Foundation Models framework is available in iOS 18.1+, iPadOS 18.1+, and macOS 26.0+. It provides access to Apple's ~3B parameter on-device language model with support for adapter-based fine-tuning.

### Key Features

1. **SystemLanguageModel**: Checks model availability
2. **LanguageModelSession**: Manages conversations with context
3. **Guided Generation**: Structured outputs using Swift macros
4. **Tool Calling**: Custom tools for specialized tasks
5. **Medical Domain Adaptation**: Pre-configured for SCD research

### Medical Research Tools

The service includes specialized tools for medical research:

1. **Literature Search Tool**
   - Search medical databases
   - Filter by publication type
   - Focus on SCD research

2. **Clinical Calculator Tool**
   - VOE risk assessment
   - Stroke risk calculation
   - Hydroxyurea dosing
   - Pain score evaluation

3. **Drug Interaction Checker**
   - SCD-specific interactions
   - Hydroxyurea considerations
   - Patient factor adjustments

4. **Clinical Guidelines Tool**
   - Access current guidelines
   - Organization-specific recommendations
   - Evidence-based protocols

## Environment Variables

- `APPLE_BRIDGE_URL`: Base URL for the service (default: http://localhost:3004)

## Performance Characteristics

- **Model Size**: ~3B parameters
- **Quantization**: 2 bits per weight (from 3.7 bits in earlier versions)
- **Context Window**: Up to 65K tokens
- **Latency**: ~0.6ms per prompt token
- **Memory Usage**: Optimized for Apple Silicon

## Development

### Building for Production
```bash
swift build -c release
```

### Running Tests
```bash
swift test
```

### Debugging
Enable verbose logging:
```bash
LOG_LEVEL=debug swift run
```

## Error Handling

The service provides detailed error responses:

- **503 Service Unavailable**: Model not available on device
- **400 Bad Request**: Invalid input format
- **500 Internal Server Error**: Model generation failure

Example error response:
```json
{
  "error": {
    "message": "Apple Foundation Models are not available on this device",
    "type": "model_not_available",
    "code": "MODEL_UNAVAILABLE"
  }
}
```

## Integration with BAML

The service is designed to work seamlessly with the BAML service. Configure the Apple Foundation client in `clients.baml`:

```baml
client<llm> AppleFoundation3B {
  provider openai
  options {
    model "apple-foundation-3b"
    api_key "local"
    base_url env.APPLE_BRIDGE_URL
  }
}
```

## Troubleshooting

### Model Not Available
- Ensure you're running macOS 26.0+
- Verify Apple Silicon Mac (M1 or later)
- Check if Apple Intelligence is enabled in System Settings

### Build Errors
- Update Xcode to version 16+
- Ensure Swift 6.1+ is installed
- Run `swift package clean` and rebuild

### Performance Issues
- Monitor memory usage with Activity Monitor
- Consider reducing context window for faster responses
- Use streaming for better perceived performance

## Future Enhancements

- [ ] Support for visual understanding (image inputs)
- [ ] Custom medical domain adapters
- [ ] Multi-turn conversation optimization
- [ ] Integration with Core ML models
- [ ] Batch processing support

## License

This service is part of the AngstromSCD project and follows the same licensing terms.