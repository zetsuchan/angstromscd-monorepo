# Development Commands
bun run lint:fix          # Fix code with Biome linter/formatter
bun run build             # Build all packages and apps
bun run dev               # Start all services concurrently
bun run test              # (No test suite yet - add when needed)

# Code Style Guidelines
- **Runtime**: Use Bun for all JS/TS execution
- **Linting**: Biome handles formatting, imports, and linting
- **Types**: Strict TypeScript with verbatimModuleSyntax
- **Imports**: Use ES modules (import/export), no CommonJS
- **Naming**: camelCase for variables/functions, PascalCase for types/interfaces
- **Error Handling**: Use try/catch with proper error types, log securely (no PHI)
- **Medical Data**: Never log patient data, use Zod schemas for validation
- **Components**: Use React functional components with TypeScript interfaces