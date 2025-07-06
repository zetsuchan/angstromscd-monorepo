# E2B Integration Layer

This document describes the E2B integration implementation for the AngstromSCD API.

## Overview

The E2B integration provides secure code execution capabilities for medical data analysis using isolated cloud sandboxes. This implementation includes:

- **Code Execution Service**: Core interface for running code in E2B sandboxes
- **Medical Analysis Orchestrator**: Specialized tool for medical data analysis workflows
- **API Endpoints**: RESTful endpoints for code execution and medical analysis
- **Type Safety**: Comprehensive TypeScript types for all E2B operations

## Architecture

```
src/
├── services/
│   └── code-executor.ts      # Core E2B sandbox management
├── tools/
│   └── medical-analysis.ts   # Medical analysis orchestration
├── types/
│   └── e2b.ts               # E2B type definitions
└── routes/
    └── e2b.ts               # API endpoints
```

## Environment Setup

Add the following environment variable to your `.env` file:

```bash
E2B_API_KEY=your_e2b_api_key_here
```

## API Endpoints

### Health Check
- **GET** `/e2b/health` - Check E2B service status

### Code Execution
- **POST** `/e2b/execute` - Execute code in sandbox
- **POST** `/e2b/execute/stream` - Execute code with streaming output (SSE)

### Medical Analysis
- **POST** `/e2b/medical/analyze` - Perform medical data analysis
- **POST** `/e2b/medical/analyze/stream` - Streaming medical analysis
- **GET** `/e2b/medical/types` - Get available analysis types

## Usage Examples

### Basic Code Execution

```typescript
const response = await fetch('/e2b/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: 'print("Hello from E2B!")',
    language: 'python',
    timeout: 30
  })
})

const result = await response.json()
console.log(result.output) // "Hello from E2B!"
```

### Medical Data Analysis

```typescript
const response = await fetch('/e2b/medical/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    analysisType: 'data_analysis',
    data: JSON.stringify([
      { patient_id: 1, age: 45, blood_pressure: 120 },
      { patient_id: 2, age: 52, blood_pressure: 140 }
    ]),
    outputFormat: 'json'
  })
})

const result = await response.json()
console.log(result.summary) // Analysis summary
console.log(result.recommendations) // Medical recommendations
```

### Streaming Analysis

```typescript
const eventSource = new EventSource('/e2b/medical/analyze/stream', {
  method: 'POST',
  body: JSON.stringify({
    analysisType: 'visualization',
    data: medicalData
  })
})

eventSource.addEventListener('progress', (event) => {
  const data = JSON.parse(event.data)
  console.log('Progress:', data.progress)
})

eventSource.addEventListener('result', (event) => {
  const result = JSON.parse(event.data)
  console.log('Final result:', result)
  eventSource.close()
})
```

## Analysis Types

### 1. Data Analysis (`data_analysis`)
- Basic data exploration
- Descriptive statistics
- Missing value analysis
- Data type inference

### 2. Visualization (`visualization`)
- Distribution plots
- Correlation heatmaps
- Box plots
- Categorical analysis charts

### 3. Statistical Analysis (`statistical_analysis`)
- Correlation analysis
- Normality tests
- Statistical significance testing
- Hypothesis testing

### 4. ML Modeling (`ml_modeling`)
- Automated model selection
- Feature importance analysis
- Model performance metrics
- Prediction capabilities

### 5. Report Generation (`report_generation`)
- Comprehensive analysis reports
- Executive summaries
- Medical recommendations
- Data quality assessments

## Security Features

- **Isolated Sandboxes**: Each execution runs in a separate, secure environment
- **Timeout Protection**: Configurable execution timeouts prevent runaway processes
- **Resource Limits**: Sandboxes have built-in resource constraints
- **Input Validation**: All inputs are validated using Zod schemas
- **Error Handling**: Comprehensive error handling and logging

## Error Handling

The integration includes robust error handling:

```typescript
{
  "success": false,
  "error": "Execution timeout after 30 seconds",
  "executionTime": 30000,
  "sandboxId": "sandbox_123"
}
```

## Performance Considerations

- **Sandbox Lifecycle**: Sandboxes are created per request and cleaned up automatically
- **Package Caching**: Common packages are pre-installed in custom templates
- **Streaming**: Long-running analyses support streaming for better UX
- **Timeout Management**: Configurable timeouts prevent resource exhaustion

## Monitoring and Logging

- All executions are logged with execution time and sandbox ID
- Error tracking includes detailed error messages and stack traces
- Performance metrics are captured for optimization

## Development

### Adding New Analysis Types

1. Add the new type to the enum in `src/types/e2b.ts`
2. Implement the analysis logic in `src/tools/medical-analysis.ts`
3. Add required packages to `getRequiredPackages()`
4. Update the API documentation

### Custom Sandbox Templates

To use custom E2B templates with pre-installed packages:

```typescript
const config = {
  apiKey: process.env.E2B_API_KEY,
  templateId: 'your-custom-template-id',
  timeoutMs: 60000
}
```

## Testing

Run the test suite:

```bash
bun test
```

Test individual endpoints:

```bash
curl -X POST http://localhost:3001/e2b/health
curl -X POST http://localhost:3001/e2b/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "print(\"test\")", "language": "python"}'
```

## Troubleshooting

### Common Issues

1. **E2B_API_KEY not set**: Ensure the environment variable is configured
2. **Timeout errors**: Increase timeout for long-running analyses
3. **Package installation failures**: Check package names and availability
4. **Memory errors**: Use streaming for large datasets

### Debug Mode

Enable debug logging:

```bash
DEBUG=e2b:* bun run dev
```

## Contributing

When contributing to the E2B integration:

1. Follow the existing code patterns
2. Add comprehensive error handling
3. Include TypeScript types for all new features
4. Update this documentation
5. Add tests for new functionality 