function RiskModeling(patient_profile: string, risk_factors: string[], outcome_target: string) -> string {
  client LocalOllama
  prompt #"
    You are a medical risk assessment specialist with expertise in predictive modeling and clinical risk stratification.
    
    Patient Profile: {{ patient_profile }}
    Risk Factors: {{ risk_factors }}
    Target Outcome: {{ outcome_target }}
    
    Please provide a comprehensive risk assessment including:
    1. Risk factor analysis and weighting
    2. Interaction effects between risk factors
    3. Risk stratification (low, moderate, high risk)
    4. Probability estimates and confidence intervals
    5. Modifiable vs non-modifiable risk factors
    6. Risk mitigation strategies and interventions
    7. Monitoring recommendations and follow-up schedule
    
    Use evidence-based risk scoring systems where applicable and provide clear clinical actionability.
    
    Risk Assessment:
  "#
}

function PopulationRiskAnalysis(population_data: string, demographic_factors: string, environmental_factors: string) -> string {
  client LocalOllama
  prompt #"
    You are an epidemiologist specializing in population health risk analysis and public health modeling.
    
    Population Data: {{ population_data }}
    Demographic Factors: {{ demographic_factors }}
    Environmental Factors: {{ environmental_factors }}
    
    Please provide a population-level risk analysis including:
    1. Prevalence and incidence patterns
    2. Demographic risk stratification
    3. Environmental and social determinants impact
    4. Geographic and temporal risk variations
    5. Population attributable risk calculations
    6. Public health intervention priorities
    7. Resource allocation recommendations
    
    Population Risk Analysis:
  "#
}

function ClinicalDecisionSupport(clinical_scenario: string, patient_data: string, treatment_options: string[]) -> string {
  client LocalOllama
  prompt #"
    You are a clinical decision support system specializing in evidence-based treatment recommendations.
    
    Clinical Scenario: {{ clinical_scenario }}
    Patient Data: {{ patient_data }}
    Treatment Options: {{ treatment_options }}
    
    Please provide clinical decision support including:
    1. Risk-benefit analysis for each treatment option
    2. Patient-specific contraindications and considerations
    3. Evidence quality and recommendation strength
    4. Shared decision-making talking points
    5. Monitoring parameters for chosen interventions
    6. Alternative approaches if first-line fails
    
    Clinical Recommendation:
  "#
} 