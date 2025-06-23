# AngstromSCD Desktop (Swift)

Native macOS desktop application for AngstromSCD medical research platform, built with Swift and SwiftUI.

## Features

- **Native macOS Experience**: Built with SwiftUI for seamless integration with macOS
- **Apple Foundation Models**: Direct integration with on-device AI for privacy-preserving medical research
- **Liquid Glass Design**: Modern macOS aesthetic with translucent materials and smooth animations
- **Multi-Model Support**: Seamlessly switch between local (Apple, Ollama) and cloud (OpenAI, Anthropic) models
- **Medical Domain Focus**: Specialized for Sickle Cell Disease research and clinical decision support
- **Real-time Streaming**: Stream AI responses with minimal latency
- **Native Features**: Spotlight integration, Quick Look, Share Sheet, and more

## Requirements

- macOS 15.0+ (Sequoia or later)
- Xcode 16.0+
- Swift 6.1+
- For Apple Foundation Models: macOS 26+ (when available)

## Building

1. Open the project in Xcode:
```bash
cd apps/desktop-swift
open .
```

2. Or build from command line:
```bash
swift build
```

3. Run the app:
```bash
swift run
```

## Architecture

```
Sources/AngstromSCD/
├── AngstromSCDApp.swift       # Main app entry point
├── Models/                    # Data models and state management
│   ├── AppState.swift        # App state using TCA
│   └── DataModels.swift      # Core data structures
├── Views/                     # SwiftUI views
│   ├── ContentView.swift     # Main window layout
│   ├── ConversationView.swift # Chat interface
│   ├── SidebarView.swift     # Conversation list
│   ├── DetailPaneView.swift  # Research details
│   └── SettingsView.swift    # Preferences
├── Services/                  # Backend integrations
│   ├── AppleFoundationService.swift # Direct Apple AI integration
│   ├── APIClient.swift       # REST API client
│   └── ChatService.swift     # Unified chat interface
└── Utils/                     # Utilities and extensions
```

## Key Technologies

- **SwiftUI**: Modern declarative UI framework
- **The Composable Architecture**: State management and side effects
- **Apple Foundation Models**: On-device language models (macOS 26+)
- **Alamofire**: Networking for API communication
- **Swift Concurrency**: Async/await for responsive UI

## AI Model Integration

The app supports multiple AI providers:

1. **Apple Foundation Models** (Preferred for privacy)
   - ~3B parameter on-device model
   - No data leaves the device
   - ~0.6ms per token latency

2. **Ollama** (Local models)
   - Qwen 2.5, Llama 3.2/3.3, Mixtral
   - Runs on localhost:11434

3. **Cloud Models**
   - OpenAI: GPT-4o, GPT-4o-mini
   - Anthropic: Claude 3.5 Sonnet, Claude 3 Haiku

## Development

### Running Tests
```bash
swift test
```

### Code Organization
- Follow MVVM pattern with TCA for state management
- Use `@MainActor` for UI-related code
- Leverage Swift concurrency for async operations
- Implement proper error handling with typed errors

### Contributing
- Ensure code compiles without warnings
- Add unit tests for new features
- Follow Swift API design guidelines
- Document public APIs

## Privacy & Security

- Medical data processed locally when using Apple Foundation Models
- API keys stored securely in macOS Keychain
- No telemetry or analytics by default
- HIPAA-compliant data handling practices

## License

See main repository LICENSE file.