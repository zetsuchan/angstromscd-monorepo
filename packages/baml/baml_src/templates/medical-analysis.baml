function MedicalAnalysis(patient_data: string, symptoms: string, medical_history: string) -> string {
  client LocalOllama
  prompt #"
    You are a medical AI assistant specialized in analyzing patient data and symptoms.
    
    Patient Data: {{ patient_data }}
    Current Symptoms: {{ symptoms }}
    Medical History: {{ medical_history }}
    
    Please provide a comprehensive medical analysis including:
    1. Symptom assessment and potential correlations
    2. Risk factors based on medical history
    3. Recommended diagnostic tests or procedures
    4. Potential differential diagnoses to consider
    5. Suggested monitoring parameters
    
    Important: This analysis is for informational purposes only and should not replace professional medical consultation.
    
    Analysis:
  "#
} 