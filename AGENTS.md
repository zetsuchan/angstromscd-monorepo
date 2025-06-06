# AGENTS.md

This file provides guidance for AI agents working on async coding tasks in the AngstromSCD monorepo.

## Project Context

AngstromSCD is a **Sickle Cell Disease (SCD)** medical research platform with microservices architecture. Focus on medical accuracy, data privacy, and clinical workflow integration when implementing features.

## Async Task Guidelines

### Code Quality Standards
- **Runtime**: Use Bun for all JavaScript/TypeScript execution
- **Linting**: Run `bun run lint:fix` before completing tasks
- **Type Safety**: Ensure full TypeScript compliance across all packages
- **Medical Data**: Never log or expose patient data, PHI, or medical records

### Task Completion Workflow
1. Run relevant tests if they exist (check package.json scripts)
2. Execute `bun run lint:fix` to ensure code quality
3. Verify builds pass with `bun run build`
4. Test integration points between services
5. Ensure medical domain accuracy and clinical workflow compatibility

## Service-Specific Guidelines

### Frontend (`apps/frontend/`)
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Use Tailwind CSS classes, follow existing component patterns
- **State**: Leverage ChatContext for medical conversation state
- **Icons**: Use Lucide React icons consistently
- **Medical UI**: Maintain clinical workflow patterns from existing components

### Backend API (`apps/api/`)
- **Framework**: Hono.js with Bun runtime
- **Database**: Use Supabase client from `src/lib/db.ts`
- **Validation**: Implement Zod schemas for medical data validation
- **CORS**: Already configured for cross-origin requests
- **Medical Data**: Ensure HIPAA-compliant data handling

### AI/ML Service (`packages/baml/`)
- **Framework**: BoundaryML (BAML) for structured AI prompts
- **Medical Accuracy**: Validate medical information against clinical guidelines
- **Prompts**: Use structured templates for consistent medical research queries
- **Integration**: Connect with vector database for context-aware responses

### Vector Database (`packages/vector/`)
- **Database**: ChromaDB for medical literature embeddings
- **Collections**: `medical_papers`, `clinical_datasets`, `conversation_context`
- **Embeddings**: Ensure medical terminology is properly vectorized
- **Search**: Implement semantic search for clinical research queries

## Medical Domain Requirements

### Clinical Data Handling
- **Patient Data**: Use structured schemas for SCD patient records
- **VOE Episodes**: Track vaso-occlusive episodes with clinical timestamps
- **Literature**: Maintain PMID/DOI references for medical citations
- **Hydroxyurea**: Follow dosing guidelines for therapy recommendations

### FHIR Compliance
- Structure clinical data according to FHIR standards
- Use appropriate resource types for medical entities
- Maintain interoperability with clinical systems

### Research Workflows
- **Workspaces**: Support Global, Project X, and My Papers organization
- **Citations**: Implement proper medical literature referencing
- **Conversations**: Maintain context for ongoing medical research discussions
- **Alerts**: Handle VOE warnings and literature notifications appropriately

## Development Environment

### Quick Setup
```bash
./dev.sh  # Starts all services with hot reload
```

### Service Dependencies
- **Database**: PostgreSQL + ChromaDB must be running (Docker)
- **Environment**: Supabase credentials required
- **Ports**: API (3001), ChromaDB (8000), PostgreSQL (5432)

### Testing Medical Features
- Use mock data from `apps/frontend/src/data/mockData.ts`
- Test with realistic SCD patient scenarios
- Validate medical calculations and recommendations
- Ensure proper handling of clinical terminology

## Security and Compliance

### Medical Data Privacy
- Never log patient identifiers or PHI
- Use proper anonymization for development data
- Implement audit trails for clinical data access
- Follow medical data retention policies

### API Security
- Validate all medical data inputs with Zod schemas
- Implement proper authentication for clinical endpoints
- Use HTTPS for all medical data transmission
- Log security events without exposing sensitive data

## Integration Points

### Service Communication
- API communicates with Supabase for structured medical data
- Vector service provides semantic search for medical literature
- BAML service generates context-aware medical research assistance
- Frontend maintains real-time chat context for clinical conversations

### External Systems
- **Supabase**: Primary database for clinical and research data
- **ChromaDB**: Vector embeddings for medical literature search
- **FHIR**: Potential integration points for clinical systems
- **Medical APIs**: PubMed, clinical guidelines, drug databases

## Common Async Task Patterns

### Feature Implementation
1. Update relevant TypeScript types in `src/types/`
2. Implement backend API endpoints with proper medical validation
3. Add frontend components following medical UI patterns
4. Update database schemas for clinical data requirements
5. Test with realistic medical scenarios

### Bug Fixes
1. Identify medical accuracy issues or clinical workflow problems
2. Implement fixes with proper medical validation
3. Ensure compliance with healthcare data standards
4. Test with edge cases relevant to SCD clinical scenarios

### Performance Optimization
1. Focus on medical literature search performance
2. Optimize vector database queries for clinical research
3. Ensure real-time chat responsiveness for clinical workflows
4. Monitor AI/ML service performance for medical query accuracy