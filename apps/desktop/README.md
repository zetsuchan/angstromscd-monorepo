# AngstromSCD Desktop App

Native macOS desktop application for AngstromSCD Medical Research Assistant, built with Tauri v2 and featuring macOS 26 Liquid Glass design.

## Features

- **Native macOS Experience**: Built with Tauri for optimal performance and small bundle size
- **Liquid Glass Design**: Implements macOS 26's new design language with transparent materials and dynamic morphing effects
- **Medical Research Assistant**: Full access to SCD research capabilities, literature search, and VOE risk assessment
- **Local AI Models**: Supports both cloud and local models via Ollama and Apple Foundation Models
- **Secure & Private**: All data stays local with optional cloud sync

## Prerequisites

- macOS 14.0 or later (macOS 26 recommended for full Liquid Glass support)
- Xcode Command Line Tools
- Rust (installed automatically by Tauri)
- Bun runtime
- Backend services running (API, BAML, Vector DB)

## Installation

```bash
# Install dependencies
cd apps/desktop
bun install

# Install Rust dependencies
cd src-tauri
cargo build
```

## Development

```bash
# Start the desktop app in development mode
bun run tauri:dev

# Or from the monorepo root
bun run dev:desktop
```

Make sure the backend services are running:
```bash
# From monorepo root
bun run dev:services
```

## Building

```bash
# Create production build
bun run tauri:build

# Or from the monorepo root
bun run build:desktop
```

The built app will be in `src-tauri/target/release/bundle/`.

## Architecture

### Frontend (React + TypeScript)
- **Components**: Modular UI components with Liquid Glass styling
- **Context**: Global state management for chat, workspaces, and alerts
- **Hooks**: Custom hooks for Tauri integration and Liquid Glass effects
- **Tailwind CSS**: Utility-first styling with custom Liquid Glass utilities

### Backend (Rust + Tauri)
- **Commands**: IPC handlers for frontend-backend communication
- **API Integration**: Connects to existing Node.js API services
- **Native Features**: macOS-specific functionality and optimizations
- **Security**: Secure storage and HIPAA-compliant data handling

## Liquid Glass Implementation

The app implements several Liquid Glass design patterns:

1. **Transparent Window Chrome**: Custom titlebar with vibrancy effects
2. **Dynamic Materials**: Controls that morph during interaction
3. **Glass Morphism**: Layered transparency with blur and saturation
4. **Shimmer Effects**: Subtle animations for enhanced visual appeal

## API Integration

The desktop app connects to the following services:
- **API Server** (port 3001): Main backend API
- **BAML Service** (port 3002): AI/ML processing
- **Vector DB** (port 8000): Semantic search
- **Apple Bridge** (port 3004): Apple Foundation Models

## Keyboard Shortcuts

- `Cmd+N`: New thread
- `Cmd+K`: Quick search
- `Cmd+,`: Settings
- `Cmd+Shift+F`: Fork current thread
- `Cmd+Enter`: Send message

## Contributing

When adding new features:
1. Follow the existing component structure
2. Maintain Liquid Glass design consistency
3. Test on both Intel and Apple Silicon Macs
4. Ensure HIPAA compliance for medical data

## License

Part of the AngstromSCD monorepo. See root LICENSE file.