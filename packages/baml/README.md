# MedLab Chat BAML Pipeline

AI prompt engineering and model management service for MedLab Chat by Angstrom AI - providing intelligent, context-aware responses for sickle cell disease research conversations.

## Overview

The BAML Pipeline service handles all AI prompt engineering and language model interactions for MedLab Chat, enabling:

- **Medical Research AI**: Specialized prompts for sickle cell disease research contexts
- **Multi-Modal Chat**: Context-aware responses based on chat modes (Research, Create, Analyze, Plan, Learn)
- **Citation Integration**: AI-powered literature analysis and citation generation
- **Tone Adaptation**: Dynamic response styling (Formal, Bullet Points, Lay Summary)
- **Clinical Context**: Medical terminology and research methodology awareness

## Architecture Role

Specialized AI processing service in the microservices ecosystem:

```
API Service → BAML Pipeline → OpenAI/Anthropic APIs
                           → Structured Medical Prompts
                           → Context-Aware Responses
```

## Core BAML Features

### Medical Research Prompts
- **Literature Analysis**: Synthesize research papers and clinical studies
- **Data Interpretation**: Statistical analysis and clinical significance assessment
- **Treatment Planning**: Evidence-based therapeutic recommendations
- **Risk Assessment**: VOE prediction and clinical alert generation
- **Educational Content**: Medical concept explanations for different audiences

### Chat Mode Specialization
- **Research Mode**: Literature review, hypothesis generation, study design
- **Create Mode**: Document drafting, report generation, protocol writing
- **Analyze Mode**: Data analysis, pattern recognition, clinical insights
- **Plan Mode**: Treatment protocols, research roadmaps, project planning
- **Learn Mode**: Educational explanations, concept clarification, training content

### Medical Domain Expertise
- **SCD Terminology**: Specialized vocabulary for sickle cell disease
- **Clinical Guidelines**: Evidence-based treatment protocols
- **Research Methods**: Study design and statistical analysis guidance
- **Literature Standards**: PMID/DOI citation formatting and validation
- **FHIR Integration**: Clinical data structure awareness

## Technology Stack

- **Runtime**: Bun.js for optimal performance with AI workloads
- **Framework**: @boundaryml/baml for structured prompt engineering
- **API Layer**: Hono.js for lightweight HTTP service endpoints
- **AI Providers**: OpenAI GPT-4, Anthropic Claude integration
- **Code Quality**: Biome.js for consistent TypeScript development

## Development

### Prerequisites
- Bun runtime installed
- OpenAI and/or Anthropic API keys
- BAML CLI tools for prompt development

### Quick Start

```bash
# Install dependencies
bun install

# Copy environment template
cp .env.example .env

# Configure AI API keys
# OPENAI_API_KEY, ANTHROPIC_API_KEY

# Start BAML development server (port 3002)
bun run src/index.ts

# Generate BAML types
bunx baml-cli generate

# Run code quality checks
bun run lint
```

### Environment Configuration

Required environment variables:
- `OPENAI_API_KEY` - OpenAI API access key
- `ANTHROPIC_API_KEY` - Anthropic Claude API key
- `BAML_LOG_LEVEL` - Logging verbosity (default: info)

## BAML Configuration

### Prompt Templates (`baml_src/`)

**Research Prompts**
- `literature_analysis.baml` - Academic paper synthesis
- `hypothesis_generation.baml` - Research question formulation
- `study_design.baml` - Clinical trial methodology

**Clinical Prompts**
- `voe_risk_assessment.baml` - Crisis prediction modeling
- `treatment_recommendation.baml` - Therapeutic guidance
- `clinical_alert_generation.baml` - Warning system prompts

**Educational Prompts**
- `lay_summary.baml` - Patient-friendly explanations
- `formal_response.baml` - Academic and clinical formatting
- `bullet_point.baml` - Structured information delivery
- `basic_prompts.baml` - Minimal chat completions for connectivity tests

### Model Configuration (`baml_src/clients.baml`)

```baml
client GPT4Medical {
  provider openai
  options {
    model gpt-4-turbo
    temperature 0.3
    max_tokens 2000
    system_message "You are a medical research assistant specializing in sickle cell disease..."
  }
}

client ClaudeResearch {
  provider anthropic
  options {
    model claude-3-sonnet
    temperature 0.2
    max_tokens 4000
    system_message "You are an expert in hematology and sickle cell disease research..."
  }
}
```

## API Endpoints

### Core Generation
- `POST /generate` - Process chat messages with context-aware prompts
- `POST /analyze` - Literature analysis and data interpretation
- `POST /summarize` - Document and conversation summarization

### Specialized Functions
- `POST /cite` - Generate and validate literature citations
- `POST /assess-risk` - VOE risk evaluation and alerting
- `POST /explain` - Educational content generation with tone adaptation

### Template Management
- `GET /templates` - List available prompt templates
- `POST /templates/validate` - Validate custom prompts
- `GET /health/openai` - Check OpenAI API connectivity
- `GET /health/anthropic` - Check Anthropic API connectivity
- `POST /chat/openai` - Basic OpenAI prompt completion
- `POST /chat/anthropic` - Basic Anthropic prompt completion

## Prompt Engineering Patterns

### Medical Context Injection
```baml
template MedicalResponse {
  input {
    query: string
    chat_mode: ChatMode
    patient_context?: PatientData
    literature_refs?: Citation[]
  }
  
  prompt {
    "As a specialist in sickle cell disease research, considering the {{ chat_mode }} context..."
    "Patient background: {{ patient_context }}"
    "Relevant literature: {{ literature_refs }}"
    "Query: {{ query }}"
  }
}
```

### Citation Integration
```baml
template CitationAnalysis {
  input {
    papers: Paper[]
    research_question: string
  }
  
  prompt {
    "Analyze the following papers for insights related to: {{ research_question }}"
    "For each citation, provide PMID reference and key findings..."
  }
  
  output_format {
    citations: Citation[]
    synthesis: string
    confidence_score: float
  }
}
```

## Service Integration

### API Service Communication
Receives structured requests from the main API service:
- Chat message processing with medical context
- Literature synthesis and analysis requests
- Risk assessment and alert generation
- Educational content adaptation

### Response Processing
Returns structured medical responses:
- Context-appropriate medical information
- Properly formatted citations and references
- Tone-adapted content for different audiences
- Confidence scores for clinical recommendations

This BAML pipeline ensures that MedLab Chat delivers accurate, contextually appropriate, and professionally formatted medical research assistance to healthcare professionals and researchers.