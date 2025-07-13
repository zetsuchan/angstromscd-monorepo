// Tool definitions for medical research assistant

enum ToolType {
  E2B_CODE_INTERPRETER
  PUBMED_SEARCH
  PERPLEXITY_SEARCH
  EXA_SEARCH
}

class Tool {
  type ToolType
  name string
  description string
}

class ToolCall {
  tool ToolType
  arguments string @description("JSON string of tool arguments")
  reasoning string @description("Why this tool is being called")
}

class E2BCodeRequest {
  code string @description("Python code to execute")
  description string @description("What the code does")
  packages string[] @description("Python packages to install")
  expected_output string @description("What output format is expected")
}

class ChatResponseWithTools {
  message string @description("Natural language response to the user")
  requires_tools bool @description("Whether tools are needed to answer")
  tool_calls ToolCall[] @description("List of tools to call")
  citations Citation[]
}

function DetermineToolUsage(query: string, context: string?) -> ChatResponseWithTools {
  client CustomGPT4o
  prompt #"
    You are a medical research assistant that can use various tools to provide comprehensive answers.
    
    Available tools:
    1. E2B_CODE_INTERPRETER - For creating visualizations, charts, graphs, or running data analysis
    2. PUBMED_SEARCH - For searching medical literature  
    3. PERPLEXITY_SEARCH - For current medical news and web search
    4. EXA_SEARCH - For deep medical research papers
    
    Query: {{ query }}
    Context: {{ context }}
    
    Analyze if the query requires any tools, especially:
    - If the user asks for charts, graphs, plots, visualizations, or data analysis -> use E2B_CODE_INTERPRETER
    - If the user asks about medical literature or research -> use PUBMED_SEARCH
    - If the user asks about recent news or current information -> use PERPLEXITY_SEARCH
    - If the user needs deep research analysis -> use EXA_SEARCH
    
    For E2B_CODE_INTERPRETER, the arguments should be a JSON string containing:
    {
      "code": "Python code here",
      "description": "What this code does",
      "packages": ["matplotlib", "pandas", etc],
      "expected_output": "chart" or "data" or "analysis"
    }
    
    Provide:
    1. A natural language message to the user
    2. Whether tools are required
    3. Which tools to call with their arguments
    4. Any immediate citations if available
  "#
}

function GenerateVisualizationCode(request: string, data_context: string?) -> E2BCodeRequest {
  client CustomGPT4o
  prompt #"
    You are an expert at creating medical data visualizations using Python.
    
    User request: {{ request }}
    Data context: {{ data_context }}
    
    Generate Python code that:
    1. Creates the requested visualization
    2. Uses matplotlib, seaborn, or plotly as appropriate
    3. Includes proper labels, titles, and legends
    4. Handles medical data appropriately
    5. Saves the plot as output
    
    Focus on medical accuracy and clarity. Use appropriate color schemes for accessibility.
    Include any necessary data generation if no specific data is provided.
    
    Always end with plt.show() or fig.show() to display the visualization.
  "#
}

// Test for tool detection
test tool_detection {
  functions [DetermineToolUsage]
  args {
    query "Create a bar chart showing the effectiveness of different SCD treatments"
  }
}

// Test for visualization generation
test visualization_generation {
  functions [GenerateVisualizationCode]
  args {
    request "Create a line graph showing VOE frequency over 12 months"
    data_context "Patient has 3-5 VOE episodes per month on average"
  }
}

// Ollama-compatible visualization code generator
function GenerateVisualizationCodeOllama(request: string, data_context: string?) -> E2BCodeRequest {
  client OllamaQwen05B
  prompt #"
    You are an expert at creating medical data visualizations using Python.
    
    User request: {{ request }}
    Data context: {{ data_context }}
    
    Generate Python code that:
    1. Creates the requested visualization
    2. Uses matplotlib, seaborn, or plotly as appropriate
    3. Includes proper labels, titles, and legends
    4. Handles medical data appropriately
    5. Saves the plot as output
    
    Focus on medical accuracy and clarity. Use appropriate color schemes for accessibility.
    Include any necessary data generation if no specific data is provided.
    
    Always end with plt.show() or fig.show() to display the visualization.
  "#
}

// Ollama-compatible tool detection function
function DetermineToolUsageOllama(query: string, context: string?) -> ChatResponseWithTools {
  client OllamaMeditronLatest
  prompt #"
    You are a medical research assistant that can use various tools to provide comprehensive answers.
    
    Available tools:
    1. E2B_CODE_INTERPRETER - For creating visualizations, charts, graphs, or running data analysis
    2. PUBMED_SEARCH - For searching medical literature  
    3. PERPLEXITY_SEARCH - For current medical news and web search
    4. EXA_SEARCH - For deep medical research papers
    
    Query: {{ query }}
    Context: {{ context }}
    
    Analyze if the query requires any tools, especially:
    - If the user asks for charts, graphs, plots, visualizations, or data analysis -> use E2B_CODE_INTERPRETER
    - If the user asks about medical literature or research -> use PUBMED_SEARCH
    - If the user asks about recent news or current information -> use PERPLEXITY_SEARCH
    - If the user needs deep research analysis -> use EXA_SEARCH
    
    For E2B_CODE_INTERPRETER, the arguments should be a JSON string containing:
    {
      "code": "Python code here",
      "description": "What this code does",
      "packages": ["matplotlib", "pandas", etc],
      "expected_output": "chart" or "data" or "analysis"
    }
    
    Provide:
    1. A natural language message to the user
    2. Whether tools are required
    3. Which tools to call with their arguments
    4. Any immediate citations if available
  "#
}