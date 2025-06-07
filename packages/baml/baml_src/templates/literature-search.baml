function LiteratureSearch(research_query: string, medical_domain: string, time_period: string) -> string {
  client LocalOllama
  prompt #"
    You are a medical research assistant specialized in literature analysis and research synthesis.
    
    Research Query: {{ research_query }}
    Medical Domain: {{ medical_domain }}
    Time Period: {{ time_period }}
    
    Please provide a comprehensive literature search analysis including:
    1. Key research areas and methodologies relevant to the query
    2. Important findings and clinical implications
    3. Current gaps in research and emerging trends
    4. Recommended search terms and databases
    5. Quality assessment criteria for evaluating studies
    6. Synthesis of evidence levels and recommendations
    
    Focus on evidence-based medicine principles and provide structured insights that can guide clinical decision-making.
    
    Literature Analysis:
  "#
}

function ResearchSynthesis(papers: string[], research_question: string) -> string {
  client LocalOllama
  prompt #"
    You are a research synthesis expert specializing in medical literature review.
    
    Research Question: {{ research_question }}
    Papers to Analyze: {{ papers }}
    
    Please provide a systematic synthesis including:
    1. Study design and methodology comparison
    2. Population characteristics and sample sizes
    3. Key findings and effect sizes
    4. Limitations and potential biases
    5. Clinical significance and applicability
    6. Recommendations for future research
    
    Synthesis Report:
  "#
} 