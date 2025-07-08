# E2B Sandbox Architecture

## Overview

AngstromSCD integrates E2B (Execute to Build) code interpreter to provide secure, sandboxed code execution for data visualizations. This enables users to generate medical charts, graphs, and data analysis visualizations directly within the chat interface, similar to Perplexity AI's approach.

## Architecture Components

### 1. Visualization Detection Layer

The system uses a two-tier approach to detect when users request visualizations:

```
User Request → Keyword Detection → Code Generation → E2B Execution → Image Display
```

#### Keyword Detection (`enhanced-chat-service.ts`)
- Scans messages for visualization keywords: "chart", "graph", "plot", "visualize", etc.
- Triggers visualization pipeline when detected

#### BAML Tool Detection (`tools.baml`)
- Structured tool detection using BAML functions
- Supports multiple tools: E2B_CODE_INTERPRETER, PUBMED_SEARCH, PERPLEXITY_SEARCH, EXA_SEARCH
- Provides context-aware code generation

### 2. Code Generation

#### For Ollama Models (Qwen, Llama, Meditron)
- Direct prompt engineering approach
- Fallback code generation for common visualization types
- Handles inconsistent model outputs gracefully

#### For GPT/Claude Models
- BAML-structured code generation
- More reliable output formatting
- Better parameter extraction

### 3. E2B Sandbox Execution

#### Sandbox Environment
- **Isolated VM**: Each code execution runs in a secure, isolated container
- **Fast Startup**: ~150ms sandbox initialization
- **Python Environment**: Pre-configured with data science libraries
  - matplotlib
  - numpy
  - pandas
  - seaborn
  - plotly

#### Execution Flow
```typescript
1. Create Sandbox → 2. Install Packages → 3. Execute Code → 4. Capture Output → 5. Kill Sandbox
```

#### File Output Handling
- Supports multiple output formats: PNG, SVG, HTML
- Base64 encodes images for inline display
- Handles partial execution (files generated even if code errors)

### 4. Frontend Display

#### Message Enhancement
```typescript
interface Visualization {
  type: string;
  data: string; // base64 encoded
  format: 'png' | 'html' | 'svg';
}
```

#### Rendering Strategy
- PNG: Direct `<img>` tag with base64 data URI
- SVG: Inline SVG rendering with `dangerouslySetInnerHTML`
- HTML: Iframe with sandboxed content

## Security Considerations

### Sandbox Isolation
- Code runs in ephemeral containers
- No access to host system
- Network isolation
- Resource limits enforced

### API Key Management
- E2B API key stored in environment variables
- Never exposed to client
- Loaded via dotenv in API service

### Code Validation
- No user code is trusted
- All execution happens server-side
- Output sanitization before display

## Configuration

### Environment Variables
```bash
E2B_API_KEY=your_api_key_here
```

### Service Configuration
```typescript
// apps/api/src/services/code-executor.ts
const config = {
  apiKey: process.env.E2B_API_KEY,
  timeoutMs: 30000,  // 30 second timeout
  maxSandboxes: 10,   // Concurrent sandbox limit
}
```

## Common Visualization Examples

### 1. Bar Chart
```python
import matplotlib.pyplot as plt
import numpy as np

treatments = ['Hydroxyurea', 'Voxelotor', 'Crizanlizumab']
effectiveness = [85, 70, 75]
plt.bar(treatments, effectiveness)
plt.ylabel('Effectiveness (%)')
plt.title('SCD Treatment Effectiveness')
plt.show()
```

### 2. Time Series
```python
import matplotlib.pyplot as plt
import numpy as np

months = np.arange(1, 13)
voe_episodes = [3, 2, 4, 1, 2, 3, 2, 1, 2, 3, 4, 2]
plt.plot(months, voe_episodes, marker='o')
plt.xlabel('Month')
plt.ylabel('VOE Episodes')
plt.title('VOE Frequency Over Time')
plt.grid(True)
plt.show()
```

### 3. Correlation Analysis
```python
import matplotlib.pyplot as plt
import numpy as np

dosage = np.random.uniform(10, 30, 50)
hbf_levels = dosage * 0.6 + np.random.normal(0, 2, 50)
plt.scatter(dosage, hbf_levels, alpha=0.6)
plt.xlabel('Hydroxyurea Dosage (mg/kg)')
plt.ylabel('HbF Level (%)')
plt.title('Dosage vs HbF Correlation')
plt.show()
```

## Error Handling

### Graceful Degradation
1. If E2B fails → Show error message with text response
2. If code has errors → Still return generated files if any
3. If model generates invalid code → Use fallback templates

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Sandbox timeout | Increase timeout in config |
| Invalid matplotlib code | Fallback to template code |
| Missing packages | Pre-install in sandbox request |
| API key not found | Check .env file loading |

## Performance Optimization

### Caching Strategy
- Cache common visualization templates
- Reuse sandbox instances when possible
- Pre-warm sandboxes for faster response

### Concurrent Execution
- Support multiple sandbox executions
- Queue management for high load
- Resource pooling

## Future Enhancements

1. **Interactive Visualizations**
   - Plotly.js integration
   - D3.js support
   - Real-time data updates

2. **Data Pipeline Integration**
   - Direct database queries
   - CSV/Excel file uploads
   - FHIR data visualization

3. **Advanced Analytics**
   - Statistical analysis
   - Machine learning visualizations
   - Predictive modeling outputs

4. **Collaboration Features**
   - Share visualizations
   - Export to various formats
   - Embed in reports

## Monitoring and Debugging

### Logging
```typescript
console.log("E2B execution result:", {
  success: result.success,
  hasFiles: !!result.files,
  filesCount: result.files?.length || 0,
  error: result.error
});
```

### Metrics to Track
- Sandbox creation time
- Code execution duration
- Success/failure rates
- Most requested visualization types

## API Reference

### Execute Code
```typescript
const result = await codeExecutor.executeCode({
  language: "python",
  code: pythonCode,
  packages: ["matplotlib", "numpy"],
  timeout: 30  // seconds
});
```

### Response Structure
```typescript
interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  files?: Array<{
    name: string;
    content: string;  // base64
    type: string;     // MIME type
  }>;
  executionTime: number;
  sandboxId: string;
}
```

## Best Practices

1. **Always validate user input** - Even though code runs in sandbox
2. **Set appropriate timeouts** - Prevent resource exhaustion
3. **Handle errors gracefully** - Provide meaningful feedback
4. **Optimize for common cases** - Pre-generate templates
5. **Monitor usage** - Track API costs and performance

## Troubleshooting

### E2B Not Triggering
1. Check E2B_API_KEY is set
2. Verify keyword detection is working
3. Check API logs for errors
4. Ensure frontend is passing model parameter

### Visualizations Not Displaying
1. Check browser console for errors
2. Verify base64 encoding is correct
3. Check Content Security Policy settings
4. Ensure visualization component is rendering

### Performance Issues
1. Monitor sandbox creation time
2. Check for memory leaks
3. Optimize code generation prompts
4. Consider caching strategies