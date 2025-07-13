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
    model "claude-3-5-sonnet-20241022"
    api_key env.ANTHROPIC_API_KEY
  }
}


client<llm> CustomHaiku {
  provider anthropic
  retry_policy Constant
  options {
    model "claude-3-haiku-20240307"
    api_key env.ANTHROPIC_API_KEY
  }
}

client<llm> LocalOllama {
  provider openai
  options {
    base_url "http://localhost:11434/v1"
    model "llama3.2"
    api_key env.OLLAMA_API_KEY
  }
}

// Ollama Local Models
client<llm> OllamaQwen05B {
  provider openai
  options {
    model "qwen2.5:0.5b"
    base_url "http://localhost:11434/v1"
    api_key "unused"
  }
}

client<llm> OllamaLlama32B {
  provider openai
  options {
    model "llama3.3:70b-instruct-q4_K_M"
    base_url env.OLLAMA_BASE_URL
    api_key "unused"
  }
}

client<llm> OllamaLlama70B {
  provider openai
  options {
    model "llama3.3:70b-instruct-q4_K_M"
    base_url env.OLLAMA_BASE_URL
    api_key "unused"
  }
}

client<llm> OllamaMixtral {
  provider openai
  options {
    model "mixtral:8x7b"
    base_url env.OLLAMA_BASE_URL
    api_key "unused"
  }
}

// Apple Foundation Models (via Swift bridge)
client<llm> AppleFoundation3B {
  provider openai
  options {
    model "apple-foundation-3b"
    api_key "local"
    base_url env.APPLE_BRIDGE_URL
  }
}

// Medical-specific Ollama Models
client<llm> OllamaMeditron7B {
  provider openai
  options {
    model "meditron"
    base_url "http://localhost:11434/v1"
    api_key "unused"
  }
}

client<llm> OllamaMeditronLatest {
  provider openai
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