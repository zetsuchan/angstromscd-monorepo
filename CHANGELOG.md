# Changelog

All notable changes to the AngstromSCD project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2025-12-24

### Added

#### VOC Prediction System (Monarch)
- **Database Schema**: Complete schema for VOC prediction system (`infra/scripts/voc-prediction-schema.sql`)
  - `symptom_logs` - Daily patient-reported symptoms (pain, fatigue, mood, sleep, hydration)
  - `wearable_readings` - Data from Apple Watch, Fitbit, Oura, Garmin devices
  - `voc_predictions` - AI-generated risk predictions with explanations
  - `patient_learning_profiles` - Personalized models that improve over time
  - `prediction_feedback` - Actual outcomes for model training
  - `voc_alerts` - Alert history and deduplication
  - Materialized views for 7-day rolling features (`patient_daily_summary`, `patient_rolling_7d_features`)

- **API Endpoints**: 11 new endpoints for VOC prediction (`apps/api/src/routes/voc-prediction.ts`)
  - `POST /api/voc/patients/:id/symptoms` - Log daily symptoms
  - `GET /api/voc/patients/:id/symptoms` - Get symptom history with pagination
  - `POST /api/voc/patients/:id/wearables/sync` - Sync wearable device data
  - `POST /api/voc/patients/:id/predictions/generate` - Generate VOC risk prediction
  - `GET /api/voc/patients/:id/predictions` - Get prediction history
  - `POST /api/voc/patients/:id/feedback` - Submit prediction outcome feedback
  - `GET /api/voc/patients/:id/profile` - Get patient learning profile
  - `GET /api/voc/patients/:id/dashboard` - Get dashboard aggregate data

- **Rule-Based V1 Prediction Model**: Initial prediction algorithm analyzing:
  - Pain scores and trends
  - Fever presence (weighted heavily)
  - Chest pain (weighted heavily)
  - Sleep quality decline
  - Fatigue levels
  - Returns risk score (0-1), risk level (low/moderate/high/critical), contributing factors, and recommended actions

- **Frontend Components**: VOC Monitor dashboard (`apps/frontend/src/components/voc/`)
  - `SymptomLogger.tsx` - Daily symptom logging form with sliders, checkboxes, warning banners
  - `VOCDashboard.tsx` - Risk gauge visualization, contributing factors, recommendations, learning profile progress
  - View toggle between VOC Monitor and Research Chat (VOC is default)

- **E2E Tests**: Comprehensive Playwright tests for VOC system (`e2e/voc-prediction.spec.ts`)
  - API endpoint tests (symptom logging, prediction generation, dashboard data)
  - Validation tests (score ranges, enum values)
  - Frontend UI tests (tab switching, form visibility, warning banners)

- **TypeScript Types**: Full type definitions (`packages/shared-types/src/voc-prediction.ts`)
  - SymptomLog, WearableReading, VOCPrediction, PatientLearningProfile, PredictionFeedback, VOCAlert

#### Dependencies
- `@hono/zod-validator` - Request validation for VOC API endpoints

### Changed
- **Auth Middleware**: Added `/api/voc/*` to public routes for development
- **Frontend Default View**: VOC Monitor is now the default tab (was Research Chat)
- **Card Styling**: Improved opacity for glass morphism cards (`bg-slate-800/70` instead of `bg-white/5`)

### Technical Details
- VOC routes use `supabaseAdmin` client to bypass RLS for server-side operations
- Zod schemas use `.nullish()` to accept both `null` and `undefined` from frontend
- Demo patient seeded with UUID `00000000-0000-0000-0000-000000000001`
- RLS policies conditionally applied only when running on Supabase (skipped for local PostgreSQL)

---

## [0.4.0] - 2025-09-16

### Added

#### Real-time Messaging Gateway & WebSocket Infrastructure
- **Gateway Service**: New dedicated real-time gateway service (`apps/gateway/`)
  - WebSocket server for real-time client connections
  - Message routing and broadcasting capabilities
  - Client connection management and authentication
- **NATS Message Broker Integration**: Added NATS.js client for distributed messaging
  - Reliable pub/sub messaging between services
  - Topic-based message routing
  - Connection management and auto-reconnection
- **Outbox Pattern Implementation**: Reliable message delivery system
  - Database-backed message queuing for guaranteed delivery
  - Worker-based message relay to NATS
  - Transaction-safe message publishing
- **Token Streaming Protocol**: Real-time streaming of chat responses
  - WebSocket-based token delivery for live chat updates
  - Message chunking and reassembly
  - Error handling and connection recovery

#### Frontend Real-time Client
- **Gateway Client**: WebSocket client for real-time communication
  - Automatic connection management
  - Message type handling and routing
  - Reconnection logic and error recovery
- **Token Stream Handler**: Real-time chat response processing
  - Live token reception and display
  - Message assembly and completion detection
  - Integration with existing ChatContext
- **Enhanced Chat Context**: Updated chat system for real-time features
  - WebSocket integration for live responses
  - Streaming message state management
  - Backward compatibility with existing chat flows

#### Infrastructure Enhancements
- **NATS Docker Integration**: Added NATS server to docker-compose
  - Pre-configured NATS streaming server
  - Bootstrap scripts for topic and stream setup
  - Development environment integration
- **Database Migrations**: Outbox table creation and management
  - SQL schema for reliable message queuing
  - Database setup script integration
  - Message status tracking and cleanup
- **Protocol Documentation**: Comprehensive real-time protocol specification
  - WebSocket message format definitions
  - Authentication and connection flow
  - Error handling and recovery procedures

### Changed

#### API Service Architecture
- **Streaming Endpoints**: New routes for real-time communication
  - `/api/stream` endpoints for WebSocket upgrade
  - Message publishing integration
  - Outbox service integration for reliable delivery
- **Service Layer**: Enhanced with real-time messaging capabilities
  - Outbox service for transactional message publishing
  - NATS client integration
  - Background worker for message relay

#### Development Environment
- **Enhanced Docker Compose**: Updated with NATS and gateway services
  - Multi-service orchestration
  - Environment variable management
  - Service dependency configuration
- **Package Structure**: New gateway service in monorepo
  - Independent gateway application
  - Shared types for real-time messaging
  - Cross-service type safety

### Technical Details

#### New Services & Packages
- **apps/gateway/**: Dedicated WebSocket gateway service
  - TypeScript implementation with Bun runtime
  - WebSocket server with connection management
  - NATS integration for message distribution
- **packages/shared-types/**: Enhanced with real-time types
  - WebSocket message type definitions
  - Token streaming interfaces
  - Protocol specification types

#### Dependencies Added
- **@nats-io/nats**: NATS client for distributed messaging
- **ws**: WebSocket library for gateway service
- Enhanced TypeScript types for real-time features

#### Architecture Improvements
- **Microservice Communication**: NATS-based service mesh
- **Event-Driven Architecture**: Pub/sub messaging patterns
- **Real-time Data Flow**: WebSocket to NATS bridge
- **Reliable Messaging**: Outbox pattern with PostgreSQL backing

### Security & Reliability
- **Connection Authentication**: Secure WebSocket connection establishment
- **Message Integrity**: Transactional outbox pattern prevents message loss
- **Error Recovery**: Comprehensive error handling and reconnection logic
- **Resource Management**: Proper cleanup and connection lifecycle management

### Performance Optimizations
- **Efficient Message Routing**: NATS-based pub/sub for scalable messaging
- **Connection Pooling**: Optimized database and NATS connections
- **Memory Management**: Proper cleanup of WebSocket connections and message buffers
- **Streaming Architecture**: Non-blocking real-time data delivery

## [0.3.0] - 2025-07-15

### Added

#### PostgreSQL Message Queue (PGMQ) Integration
- **Medical Alert Queue System**: Integrated PGMQ for reliable medical alert processing
  - VOE (Vaso-Occlusive Episode) alert queues
  - Medication reminder scheduling
  - Lab result notifications
  - Clinical trial update notifications
- **Custom PostgreSQL Docker Image**: Built custom image with both pgvector and PGMQ extensions
- **Type-safe Queue Client**: Created `@angstromscd/queue` package with TypeScript wrapper
  - Generic PGMQ operations (send, read, delete, archive)
  - Medical-specific convenience methods
  - Connection pooling and error handling
- **API Endpoints**: Added REST endpoints for queue operations
  - `POST /api/queue/voe-alert` - Send VOE alerts
  - `POST /api/queue/medication-reminder` - Schedule medication reminders
  - `POST /api/queue/lab-result` - Send lab result notifications
  - `GET /api/queue/alerts/:type` - Retrieve pending alerts by type
- **Background Worker Pattern**: Example alert worker for processing queued messages
  - Automatic alert processing and notifications
  - Message archiving for audit trails
  - Graceful error handling and retry logic
- **Database Setup**: Automated queue creation during database initialization
  - Extension installation scripts
  - Pre-configured medical queues
  - Integration with existing setup process

#### Queue Architecture Features
- **Exactly-once Delivery**: Guaranteed message processing with PGMQ
- **Visibility Timeout**: Messages become invisible while being processed
- **Message Archiving**: Processed messages archived for compliance and audit
- **Medical Data Security**: Queue operations designed for PHI compliance

### Changed

#### Infrastructure
- **Docker Compose**: Updated PostgreSQL service to use custom PGMQ-enabled image
- **Database Setup**: Enhanced setup scripts to include PGMQ extension and queue creation
- **Package Dependencies**: Added queue package to API service dependencies

#### API Service
- **Enhanced Routes**: Integrated queue routes into main API router
- **Service Layer**: Added queue service wrapper for medical alert operations
- **Error Handling**: Extended error handling for queue operations

### Technical Details

#### Package Structure
- **packages/queue/**: New PGMQ client package
  - `src/index.ts`: Main client and medical service classes
  - `examples/`: Working examples for alerts and worker patterns
  - `README.md`: Comprehensive usage documentation
- **infra/Dockerfile.postgres**: Custom PostgreSQL image with pgvector + PGMQ
- **infra/scripts/init-pgmq.sql**: Queue initialization script

#### Dependencies
- **postgres**: ^3.4.0 - PostgreSQL client for queue operations
- **@angstromscd/queue**: workspace package for queue functionality

## [0.2.0] - 2025-07-08

### Added

#### E2B Code Interpreter Integration
- **Sandboxed Code Execution**: Integrated E2B SDK for secure Python code execution in isolated cloud containers
- **Data Visualization Generation**: Users can now request charts, graphs, and plots that render inline in chat
  - Supports matplotlib, seaborn, plotly visualizations
  - Automatic detection of visualization requests
  - Fallback code generation for common chart types
- **Multi-format Output Support**: Handles PNG, SVG, and HTML visualization outputs
- **Intelligent Visualization Detection**: 
  - Keyword-based detection for Ollama models
  - BAML-structured tool detection for GPT/Claude models
- **Frontend Visualization Display**: 
  - Inline image rendering in chat bubbles
  - Support for multiple visualizations per message
  - Responsive design for various chart sizes

#### Conversation History & Persistence
- **Database Schema**: Created PostgreSQL tables for conversations and messages
- **API Endpoints**: 
  - POST `/api/conversations` - Create new conversation
  - GET `/api/conversations` - List all conversations
  - GET `/api/conversations/:id` - Get specific conversation
  - POST `/api/conversations/:id/messages` - Add message to conversation
- **Automatic Message Saving**: All chat messages are now persisted to database
- **Conversation Management**: Support for multiple conversation threads

#### Enhanced Chat Service
- **Unified Message Processing**: Single service handles all chat operations
- **Model-specific Code Generation**: Different strategies for Ollama vs GPT/Claude
- **Error Recovery**: Graceful handling of code execution failures
- **PubMed Integration**: Maintained existing medical literature search

#### BAML Tool System
- **Tool Definitions**: Created structured tool definitions in `tools.baml`
- **Tool Types**: E2B_CODE_INTERPRETER, PUBMED_SEARCH, PERPLEXITY_SEARCH, EXA_SEARCH
- **Context-aware Processing**: Tools selected based on user query analysis

### Changed

#### API Service
- **Environment Loading**: Added dotenv for proper environment variable management
- **Response Structure**: Extended chat response to include visualizations and execution code
- **Error Handling**: Improved error messages for better debugging

#### Frontend Components
- **Message Type**: Extended to support visualizations and execution code
- **ChatBubble Component**: Enhanced to render inline visualizations
- **Composer Component**: Updated to handle extended API responses
- **Context Provider**: Modified addMessage to accept additional message data

#### Model Configuration
- **Meditron Model**: Fixed model name mismatch (meditron:7b → meditron:latest)
- **Default Model**: Updated to use meditron:latest consistently

#### Vector Service
- **Server Pattern**: Updated to use Bun's expected export pattern
- **Database**: Switched from ChromaDB to pgvector for better integration

### Fixed

#### Service Stability
- **E2B SDK Compatibility**: Updated from deprecated `close()` to `kill()` method
- **Import Issues**: Fixed E2B import from CodeInterpreter to Sandbox
- **BAML Version**: Updated to 0.201.0 from 0.89.0
- **Package.json Corruption**: Cleaned up corrupted package.json files

#### Network Configuration
- **Vite Host Binding**: Added explicit host configuration for network accessibility
- **Port Management**: Improved service port conflict resolution

#### Database Issues
- **pgvector Dimensions**: Fixed vector column dimension specification
- **Connection Pooling**: Improved database connection management

### Technical Details

#### Dependencies Added
- `@e2b/code-interpreter@^1.5.1` - E2B SDK for code execution
- `dotenv@^17.1.0` - Environment variable management

#### Database Migrations
```sql
-- Conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Conversation messages table  
CREATE TABLE conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    model TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);
```

#### Configuration Updates
- E2B_API_KEY environment variable required
- Updated vite.config.ts with host binding
- Enhanced TypeScript types for visualization support

### Security Improvements
- All code execution happens in isolated E2B sandboxes
- API keys managed through environment variables
- No direct code execution on host system

### Known Issues
- Meditron model generates inconsistent code requiring fallback templates
- Some Ollama models struggle with structured code generation
- Visualization loading can be slow on first request (sandbox cold start)

### Upcoming Features
- Perplexity API integration for web search
- Exa.ai API integration for deep search
- User authentication system
- Model fine-tuning for better medical responses
- Interactive visualizations with Plotly.js
- Export functionality for generated charts

## [0.1.0] - 2025-07-01

### Added
- Initial project setup with Bun monorepo
- Basic chat interface with medical AI models
- Ollama integration for local models
- PubMed literature search
- Docker infrastructure with PostgreSQL and Qdrant
- Frontend with React and Tailwind CSS
- API with Hono.js framework
- BAML integration for structured AI responses

## [0.3.0] - 2025-07-13

### Added

#### BAML Pipeline Integration
- **Full BAML Integration**: Enabled BAML pipelines for all chat interactions
  - Uncommented and fixed BAML tool detection code in enhanced-chat-service.ts
  - All model calls now route through BAML's structured pipeline
  - Better error handling with fallback to direct calls
- **Meditron BAML Support**: Added Meditron model configuration to BAML clients
  - Created `OllamaMeditronLatest` client for meditron:latest model
  - Updated tool detection to use appropriate Ollama client
- **Unified Medical Chat Function**: Created comprehensive BAML medical chat system
  - New `MedicalChat` function for cloud models (GPT-4, Claude)
  - New `MedicalChatOllama` function for local models (Meditron, Llama, etc.)
  - Structured responses with medical context and suggestions
  - Automatic tool detection and usage recommendations
- **Enhanced Logging**: Added detailed logging for BAML pipeline execution
  - Tool detection logging
  - Medical chat response logging
  - Error tracking with fallback indicators

### Changed

#### Chat Service Architecture
- **BAML-First Approach**: Replaced direct Ollama calls with BAML functions
  - All responses now go through MedicalChat/MedicalChatOllama
  - Consistent response format across all models
  - Better medical context handling
- **Tool Detection Flow**: Improved tool analysis workflow
  - Model-specific tool detection (Ollama vs Cloud)
  - Better integration with E2B code interpreter
  - Enhanced PubMed search triggering

#### Response Structure
- **Medical Context**: Added structured medical information to responses
  - Key considerations for medical decisions
  - Follow-up suggestions
  - Treatment options when relevant
- **Tool Integration**: Seamless tool usage through BAML
  - Automatic visualization detection
  - Smart PubMed search triggering
  - Structured tool call arguments

### Fixed

#### BAML Integration Issues
- **Client Generation**: Fixed BAML client generation process
  - Proper handling of new functions and types
  - Correct TypeScript type exports
- **Model Routing**: Fixed model-specific routing logic
  - Proper detection of Ollama vs cloud models
  - Correct client selection for each model type
- **Error Handling**: Improved error recovery in BAML calls
  - Graceful fallback to direct calls
  - Better error logging and debugging

### Technical Details

#### New BAML Files
- `packages/baml/baml_src/medical_chat.baml` - Unified medical chat functions
- Updated `packages/baml/baml_src/clients.baml` - Added Meditron support
- Updated `packages/baml/baml_src/tools.baml` - Fixed tool detection client

#### Testing
- Created `test-baml-integration.js` for integration testing
- Test cases for visualization, literature search, and general queries
- Verification of BAML pipeline execution

#### Documentation
- Created `BAML_INTEGRATION_SUMMARY.md` with detailed integration guide
- Updated inline documentation for BAML usage
- Added debugging tips and environment setup

### Known Issues
- BAML generation requires manual `bunx @boundaryml/baml generate` command
- Some Ollama models may have inconsistent BAML responses
- Tool detection accuracy varies by model

### Upcoming Features
- Dynamic model client selection in BAML
- Enhanced medical context extraction
- Improved visualization code generation
- Real-time streaming responses through BAML

### Contributors
- @zetsuchan - Initial implementation
- @danchou - E2B integration, conversation history, and BAML pipeline integration