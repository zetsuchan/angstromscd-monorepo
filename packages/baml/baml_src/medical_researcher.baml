// Medical Research Assistant for Sickle Cell Disease

class MedicalInsight {
  summary string
  key_findings string[]
  citations Citation[]
  recommendations string[]
  confidence_level string @description("high, medium, or low")
}

class Citation {
  title string
  authors string[]
  journal string
  year int
  pmid string?
  doi string?
  relevance_score float @description("0.0 to 1.0")
}

function MedicalResearcher(query: string) -> MedicalInsight {
  client "openai/gpt-4o"
  prompt #"
    You are a medical research assistant specializing in Sickle Cell Disease (SCD). 
    Analyze the following query and provide comprehensive medical insights.

    Query: {{ query }}

    Provide a response with:
    1. A concise summary of the medical information
    2. Key findings relevant to the query
    3. Relevant citations from medical literature (if applicable)
    4. Clinical recommendations based on current guidelines
    5. Your confidence level in the response (high, medium, or low)

    Focus on evidence-based information and clearly distinguish between established facts 
    and areas requiring further research.
  "#
}

// Test function for the playground
test medical_query {
  functions [MedicalResearcher]
  args {
    query "What are the latest treatments for VOE in pediatric SCD patients?"
  }
}