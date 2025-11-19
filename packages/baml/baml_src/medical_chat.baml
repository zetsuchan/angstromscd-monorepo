// Unified medical chat function that combines tool detection with medical expertise

class MedicalChatResponse {
  message string @description("The main response to the user")
  requires_tools bool @description("Whether tools are needed")
  tool_calls ToolCall[] @description("List of tools to call")
  medical_context MedicalContext? @description("Medical context if relevant")
  suggestions string[] @description("Follow-up suggestions or questions")
}

class MedicalContext {
  condition string? @description("Medical condition being discussed")
  severity string? @description("Severity level if applicable")
  treatment_options string[] @description("Relevant treatment options")
  key_considerations string[] @description("Important medical considerations")
  requires_literature bool @description("Whether medical literature search would be helpful")
}

// Main medical chat function that routes to appropriate model
function MedicalChat(query: string, model: string, context: string?) -> MedicalChatResponse {
  client OpenRouterGemini3Pro
  prompt #"
    You are a medical AI assistant specializing in Sickle Cell Disease (SCD) and related conditions.
    
    User Query: {{ query }}
    Selected Model: {{ model }}
    Context: {{ context }}
    
    Analyze the query and determine:
    1. If any tools are needed (visualization, PubMed search, etc.)
    2. The medical context and relevance
    3. Appropriate response considering SCD expertise
    
    Available tools:
    - E2B_CODE_INTERPRETER: For creating visualizations, charts, or data analysis
    - PUBMED_SEARCH: For searching medical literature
    
    Provide a comprehensive response that includes:
    - A helpful answer to the user's question
    - Whether tools should be used
    - Medical context if relevant
    - Suggestions for follow-up
    
    Always remind users to consult healthcare providers for personal medical decisions.
  "#
}

// Ollama-compatible version for local models
function MedicalChatOllama(query: string, model: string, context: string?) -> MedicalChatResponse {
  client OllamaMeditronLatest
  prompt #"
    You are Meditron, a medical AI assistant specializing in Sickle Cell Disease (SCD).
    
    User Query: {{ query }}
    Context: {{ context }}
    
    Analyze the query and provide:
    1. A helpful medical response
    2. Whether visualization or literature search would help
    3. Medical context and considerations
    4. Follow-up suggestions
    
    Tools available:
    - E2B_CODE_INTERPRETER: For charts and visualizations
    - PUBMED_SEARCH: For medical literature
    
    For E2B_CODE_INTERPRETER, format arguments as:
    {
      "code": "Python code here",
      "description": "What this does",
      "packages": ["matplotlib", "pandas"],
      "expected_output": "chart"
    }
    
    Always remind users to consult healthcare providers for personal medical decisions.
  "#
}

// Function to process medical responses with appropriate model
function ProcessMedicalQuery(query: string, model: string) -> MedicalChatResponse {
  client CustomGPT4o
  prompt #"
    Route this medical query to the appropriate handler based on the model.
    
    Query: {{ query }}
    Model: {{ model }}
    
    If model is "meditron:latest" or starts with "llama", "qwen", or "mixtral", use Ollama.
    Otherwise use cloud models (GPT-4, Claude).
    
    Process the query with appropriate medical expertise.
  "#
}

// Test cases for medical chat
test medical_chat_visualization {
  functions [MedicalChat]
  args {
    query "Show me a chart of VOE frequency patterns over 12 months"
    model "gpt-4o"
  }
}

test medical_chat_literature {
  functions [MedicalChat]
  args {
    query "What are the latest treatments for pediatric SCD patients?"
    model "meditron:latest"
  }
}

test medical_chat_general {
  functions [MedicalChatOllama]
  args {
    query "Explain hydroxyurea dosing for SCD"
    model "meditron:latest"
  }
}