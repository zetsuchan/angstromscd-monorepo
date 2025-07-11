# Changelog

All notable changes to the AngstromSCD project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

### Contributors
- @zetsuchan - Initial implementation
- @danchou - E2B integration and conversation history