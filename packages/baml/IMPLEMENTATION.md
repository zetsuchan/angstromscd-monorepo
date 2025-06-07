# BAML Service with Local Ollama Implementation

This implementation provides a comprehensive BAML service that integrates with local Ollama for medical AI insights.

## Features Implemented

### 1. Ollama Client Configuration
- **File**: `baml_src/clients.baml`
- **Client**: `LocalOllama` pointing to `localhost:11434`
- **Model**: `llama3.2` (configurable)

### 2. Medical Analysis Templates

#### Medical Analysis (`templates/medical-analysis.baml`)
- **Function**: `MedicalAnalysis`
- **Purpose**: Analyze patient data, symptoms, and medical history
- **Output**: Comprehensive medical analysis with risk factors and recommendations

#### Literature Search (`templates/literature-search.baml`)
- **Functions**: `LiteratureSearch`, `ResearchSynthesis`
- **Purpose**: Research analysis and literature review
- **Output**: Evidence-based research insights and systematic synthesis

#### Risk Modeling (`templates/risk-modeling.baml`)
- **Functions**: `RiskModeling`, `PopulationRiskAnalysis`, `ClinicalDecisionSupport`
- **Purpose**: Medical risk assessment and clinical decision support
- **Output**: Risk stratification, population analysis, and treatment recommendations

### 3. BAML Service Handler
- **File**: `src/services/baml-service.ts`
- **Features**:
  - Ollama connection testing
  - Unified insight generation interface
  - Type-safe request/response handling
  - Error handling and validation

### 4. API Endpoints

#### Health Check Endpoints
- `GET /health/ollama` - Test Ollama connection
- `GET /health/openai` - Test OpenAI connection  
- `GET /health/anthropic` - Test Anthropic connection

#### Insight Generation Endpoint
- `POST /generate-insight` - Generate medical insights using BAML templates

## API Usage Examples

### Medical Analysis
```json
POST /generate-insight
{
  "type": "medical-analysis",
  "data": {
    "patient_data": "65-year-old male, BMI 28, hypertension",
    "symptoms": "Chest pain, shortness of breath, fatigue",
    "medical_history": "Diabetes type 2, family history of CAD"
  }
}
```

### Literature Search
```json
POST /generate-insight
{
  "type": "literature-search",
  "data": {
    "research_query": "SGLT2 inhibitors cardiovascular outcomes",
    "medical_domain": "Cardiology",
    "time_period": "2020-2024"
  }
}
```

### Risk Modeling
```json
POST /generate-insight
{
  "type": "risk-modeling",
  "data": {
    "patient_profile": "65-year-old male with diabetes and hypertension",
    "risk_factors": ["age", "diabetes", "hypertension", "smoking"],
    "outcome_target": "cardiovascular events"
  }
}
```

### Population Risk Analysis
```json
POST /generate-insight
{
  "type": "population-risk",
  "data": {
    "population_data": "Urban population, 50,000 residents",
    "demographic_factors": "Age 45-65, mixed socioeconomic status",
    "environmental_factors": "Air pollution, limited green spaces"
  }
}
```

### Clinical Decision Support
```json
POST /generate-insight
{
  "type": "clinical-decision",
  "data": {
    "clinical_scenario": "Type 2 diabetes with cardiovascular risk",
    "patient_data": "HbA1c 8.2%, eGFR 45, no heart failure",
    "treatment_options": ["Metformin + SGLT2i", "Metformin + GLP1-RA", "Triple therapy"]
  }
}
```

### Research Synthesis
```json
POST /generate-insight
{
  "type": "research-synthesis",
  "data": {
    "papers": ["Study 1: SGLT2i outcomes", "Study 2: GLP1-RA benefits"],
    "research_question": "Comparative effectiveness of SGLT2i vs GLP1-RA"
  }
}
```

## Prerequisites

1. **Ollama Installation**: Ensure Ollama is running on `localhost:11434`
2. **Model**: Have `llama3.2` model available (or update the model in `clients.baml`)
3. **Dependencies**: All npm dependencies installed

## Running the Service

```bash
# Install dependencies
npm install

# Generate BAML client
npx baml-cli generate

# Start the service
npm start
```

The service will run on port 3002 by default.

## Response Format

All endpoints return responses in the format:
```json
{
  "success": true,
  "data": {
    "insight": "Generated insight text..."
  }
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Configuration

- **Ollama URL**: Modify `base_url` in `baml_src/clients.baml`
- **Model**: Change `model` parameter in the LocalOllama client
- **Port**: Update port in `src/index.ts`

## Integration Notes

This BAML service is designed to integrate with the broader AngstromSCD monorepo architecture, providing AI-powered medical insights through a standardized API interface. 