// Learn more about clients at https://docs.boundaryml.com/docs/snippets/clients/overview

client<llm> CustomGPT4o {
  provider openai
  options {
    model "gpt-4o"
    api_key env.OPENAI_API_KEY
  }
}

client<llm> CustomGPT4oMini {
  provider openai
  retry_policy Exponential
  options {
    model "gpt-4o-mini"
    api_key env.OPENAI_API_KEY
  }
}

client<llm> CustomSonnet {
  provider anthropic
  options {
    model "claude-sonnet-4-5-20250929"
    api_key env.ANTHROPIC_API_KEY
  }
}

client<llm> CustomHaiku {
  provider anthropic
  retry_policy Constant
  options {
    model "claude-haiku-4-5-20251001"
    api_key env.ANTHROPIC_API_KEY
  }
}

client<llm> CustomOpus {
  provider anthropic
  options {
    model "claude-opus-4-5-20251101"
    api_key env.ANTHROPIC_API_KEY
  }
}

client<llm> LocalOllama {
  provider "openai-generic"
  options {
    base_url "http://localhost:11434/v1"
    model "llama3.2"
    api_key env.OLLAMA_API_KEY
  }
}

// Ollama Local Models
client<llm> OllamaQwen05B {
  provider "openai-generic"
  options {
    model "qwen2.5:0.5b"
    base_url "http://localhost:11434/v1"
    api_key "unused"
  }
}

client<llm> OllamaLlama32B {
  provider "openai-generic"
  options {
    model "llama3.3:70b-instruct-q4_K_M"
    base_url env.OLLAMA_BASE_URL
    api_key "unused"
  }
}

client<llm> OllamaLlama70B {
  provider "openai-generic"
  options {
    model "llama3.3:70b-instruct-q4_K_M"
    base_url env.OLLAMA_BASE_URL
    api_key "unused"
  }
}

client<llm> OllamaMixtral {
  provider "openai-generic"
  options {
    model "mixtral:8x7b"
    base_url env.OLLAMA_BASE_URL
    api_key "unused"
  }
}

// Apple Foundation Models (via Swift bridge)
client<llm> AppleFoundation3B {
  provider "openai-generic"
  options {
    model "apple-foundation-3b"
    api_key "local"
    base_url env.APPLE_BRIDGE_URL
  }
}

// OpenRouter Models
client<llm> OpenRouterGemini3Pro {
  provider "openai-generic"
  options {
    model "google/gemini-3-pro-preview"
    api_key env.OPENROUTER_API_KEY
    base_url "https://openrouter.ai/api/v1"
    headers {
      "HTTP-Referer" "http://localhost:5173"
      "X-Title" "AngstromSCD"
    }
  }
}

client<llm> OpenRouterClaudeSonnet45 {
  provider "openai-generic"
  options {
    model "anthropic/claude-sonnet-4.5"
    api_key env.OPENROUTER_API_KEY
    base_url "https://openrouter.ai/api/v1"
    headers {
      "HTTP-Referer" "http://localhost:5173"
      "X-Title" "AngstromSCD"
    }
  }
}

client<llm> OpenRouterMiniMaxM2 {
  provider "openai-generic"
  options {
    model "minimax/minimax-m2"
    api_key env.OPENROUTER_API_KEY
    base_url "https://openrouter.ai/api/v1"
    headers {
      "HTTP-Referer" "http://localhost:5173"
      "X-Title" "AngstromSCD"
    }
  }
}

client<llm> OpenRouterGLM46 {
  provider "openai-generic"
  options {
    model "z-ai/glm-4.6"
    api_key env.OPENROUTER_API_KEY
    base_url "https://openrouter.ai/api/v1"
    headers {
      "HTTP-Referer" "http://localhost:5173"
      "X-Title" "AngstromSCD"
    }
  }
}

client<llm> OpenRouterGPT5 {
  provider "openai-generic"
  options {
    model "openai/gpt-5"
    api_key env.OPENROUTER_API_KEY
    base_url "https://openrouter.ai/api/v1"
    headers {
      "HTTP-Referer" "http://localhost:5173"
      "X-Title" "AngstromSCD"
    }
  }
}

client<llm> OpenRouterGPTOSS120B {
  provider "openai-generic"
  options {
    model "openai/gpt-oss-120b"
    api_key env.OPENROUTER_API_KEY
    base_url "https://openrouter.ai/api/v1"
    headers {
      "HTTP-Referer" "http://localhost:5173"
      "X-Title" "AngstromSCD"
    }
  }
}

// LM Studio Local Models
client<llm> LMStudioLocal {
  provider "openai-generic"
  options {
    model "local-model"  // This will be replaced with actual model loaded in LM Studio
    api_key "lm-studio"
    base_url "http://localhost:1234/v1"
  }
}

// Medical-specific Ollama Models
client<llm> OllamaMeditron7B {
  provider "openai-generic"
  options {
    model "meditron"
    base_url "http://localhost:11434/v1"
    api_key "unused"
  }
}

client<llm> OllamaMeditronLatest {
  provider "openai-generic"
  options {
    model "meditron:latest"
    base_url "http://localhost:11434/v1"
    api_key "unused"
  }
}

// https://docs.boundaryml.com/docs/snippets/clients/round-robin
client<llm> CustomFast {
  provider round-robin
  options {
    // This will alternate between the two clients
    strategy [CustomGPT4oMini, CustomHaiku]
  }
}

// https://docs.boundaryml.com/docs/snippets/clients/fallback
client<llm> OpenaiFallback {
  provider fallback
  options {
    // This will try the clients in order until one succeeds
    strategy [CustomGPT4oMini, CustomGPT4oMini]
  }
}

// https://docs.boundaryml.com/docs/snippets/clients/retry
retry_policy Constant {
  max_retries 3
  // Strategy is optional
  strategy {
    type constant_delay
    delay_ms 200
  }
}

retry_policy Exponential {
  max_retries 2
  // Strategy is optional
  strategy {
    type exponential_backoff
    delay_ms 300
    multiplier 1.5
    max_delay_ms 10000
  }
}