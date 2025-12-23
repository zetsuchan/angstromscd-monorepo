// Prior Authorization Clinical Justification Generator for SCD Drugs

class PAJustificationResult {
  justification string @description("Full clinical justification letter text")
  citations Citation[]
  confidence_level string @description("high, medium, or low")
  key_points string[] @description("Bulleted key supporting points")
  warnings string[] @description("Any concerns or missing documentation")
}

class PAPatientData {
  genotype string?
  voe_count_past_year int
  hospitalization_count int
  current_therapies string[]
  failed_therapies string[]
  hemoglobin float?
  hemoglobin_f_percentage float?
  age int?
}

class PADrugInfo {
  drug_name string
  generic_name string
  indication string
  mechanism string
}

class PAPayerRequirements {
  required_documentation string[]
  step_therapy string[]?
  clinical_criteria string[]
}

class PAExtractionResult {
  genotype string?
  voe_count_past_year int?
  hospitalization_count int?
  current_therapies string[]
  failed_therapies string[]
  hemoglobin float?
  hemoglobin_f_percentage float?
  extraction_notes string[]
}

// Main function to generate PA clinical justification letter
function GeneratePAClinicalJustification(
  patient_data: PAPatientData,
  drug_info: PADrugInfo,
  payer_requirements: PAPayerRequirements,
  diagnosis_codes: string[]
) -> PAJustificationResult {
  client CustomGPT4o
  prompt #"
    You are a medical documentation specialist creating a clinical justification letter
    for a Prior Authorization request for a Sickle Cell Disease medication.

    ## Drug Information
    - Drug: {{ drug_info.drug_name }} ({{ drug_info.generic_name }})
    - Indication: {{ drug_info.indication }}
    - Mechanism: {{ drug_info.mechanism }}

    ## Patient Clinical Data
    - SCD Genotype: {% if patient_data.genotype %}{{ patient_data.genotype }}{% else %}Not specified{% endif %}
    {% if patient_data.age %}
    - Age: {{ patient_data.age }} years
    {% endif %}
    - VOE Episodes (Past 12 months): {{ patient_data.voe_count_past_year }}
    - Hospitalizations (Past 12 months): {{ patient_data.hospitalization_count }}
    - Current Therapies: {{ patient_data.current_therapies }}
    - Previous Failed/Inadequate Therapies: {{ patient_data.failed_therapies }}
    {% if patient_data.hemoglobin %}
    - Hemoglobin: {{ patient_data.hemoglobin }} g/dL
    {% endif %}
    {% if patient_data.hemoglobin_f_percentage %}
    - HbF%: {{ patient_data.hemoglobin_f_percentage }}%
    {% endif %}

    ## Diagnosis Codes
    {{ diagnosis_codes }}

    ## Payer Requirements to Address
    - Required Documentation: {{ payer_requirements.required_documentation }}
    {% if payer_requirements.step_therapy %}
    - Step Therapy Requirements: {{ payer_requirements.step_therapy }}
    {% endif %}
    - Clinical Criteria: {{ payer_requirements.clinical_criteria }}

    ## Instructions
    Generate a comprehensive clinical justification letter that:

    1. Opens with clear statement of medical necessity
    2. Establishes SCD diagnosis and severity
    3. Documents the patient's disease burden (VOE frequency, hospitalizations, complications)
    4. Explicitly addresses ALL payer-specific criteria listed above
    5. If step therapy is required, clearly documents previous therapy attempts and outcomes
    6. References relevant clinical trial data and guidelines
    7. Explains mechanism of action and why this drug is appropriate
    8. Proactively addresses common denial reasons
    9. Concludes with clear request for approval

    Use professional medical terminology. The letter should be structured for easy review
    by payer medical directors. Include specific dates, numbers, and clinical values where available.

    Also provide:
    - Key supporting points that strengthen this request
    - Any warnings about missing documentation or weak points
    - Your confidence level (high/medium/low) based on how well the data supports the request
  "#
}

// Extract clinical data from medical records text
function ExtractPAClinicalData(medical_record: string, drug_name: string) -> PAExtractionResult {
  client CustomGPT4o
  prompt #"
    You are a medical data extraction specialist. Extract relevant clinical data
    from the provided medical record that would support a Prior Authorization
    request for {{ drug_name }} (a Sickle Cell Disease medication).

    ## Medical Record
    {{ medical_record }}

    ## Extraction Instructions
    Extract the following information if available:
    - SCD Genotype (HbSS, HbSC, HbSβ+, HbSβ0, etc.)
    - Number of VOE (Vaso-Occlusive Episodes/Crises) in past 12 months
    - Number of hospitalizations in past 12 months
    - Current medications/therapies for SCD
    - Previously failed or inadequate therapies (and reason for failure)
    - Most recent hemoglobin level (g/dL)
    - Most recent HbF (fetal hemoglobin) percentage

    For each field:
    - Return null if the information is not present
    - Be conservative - only extract clearly stated values
    - Note any ambiguities or uncertainties in extraction_notes

    In extraction_notes, list:
    - What was successfully extracted
    - What was missing but needed
    - Any ambiguous or conflicting information
  "#
}

// Analyze denial and suggest appeal strategy
function AnalyzePADenialForAppeal(
  denial_reason: string,
  original_justification: string,
  patient_data: PAPatientData,
  drug_info: PADrugInfo
) -> PAAppealStrategy {
  client CustomGPT4o
  prompt #"
    You are a prior authorization appeal specialist for Sickle Cell Disease medications.

    A PA request for {{ drug_info.drug_name }} was denied. Analyze the denial and recommend
    an appeal strategy.

    ## Denial Reason
    {{ denial_reason }}

    ## Original Justification Submitted
    {{ original_justification }}

    ## Patient Data
    - Genotype: {% if patient_data.genotype %}{{ patient_data.genotype }}{% else %}Not specified{% endif %}
    - VOE Past Year: {{ patient_data.voe_count_past_year }}
    - Hospitalizations: {{ patient_data.hospitalization_count }}
    - Current Therapies: {{ patient_data.current_therapies }}
    - Failed Therapies: {{ patient_data.failed_therapies }}
    {% if patient_data.hemoglobin %}
    - Hemoglobin: {{ patient_data.hemoglobin }} g/dL
    {% endif %}

    ## Instructions
    Analyze the denial and provide:
    1. Root cause analysis - why was this denied?
    2. Specific documentation gaps that need to be addressed
    3. Additional clinical evidence that could strengthen the appeal
    4. Recommended appeal strategy (what to emphasize, what to add)
    5. Whether a peer-to-peer review would be beneficial
    6. Timeline recommendations for the appeal

    Be specific and actionable in your recommendations.
  "#
}

class PAAppealStrategy {
  denial_root_cause string
  documentation_gaps string[]
  additional_evidence_needed string[]
  appeal_strategy string
  recommend_peer_to_peer bool
  peer_to_peer_talking_points string[]?
  timeline_recommendation string
  success_likelihood string @description("high, medium, or low")
}

// Test functions
test pa_justification_adakveo {
  functions [GeneratePAClinicalJustification]
  args {
    patient_data {
      genotype "HbSS"
      voe_count_past_year 6
      hospitalization_count 3
      current_therapies ["Hydroxyurea 1000mg daily", "Folic acid 1mg daily"]
      failed_therapies ["Hydroxyurea - maximum tolerated dose (1500mg) for 8 months with inadequate response (5+ VOC despite 90% compliance)"]
      hemoglobin 7.2
      hemoglobin_f_percentage 12.5
      age 28
    }
    drug_info {
      drug_name "Adakveo"
      generic_name "crizanlizumab-tmca"
      indication "Reduce frequency of vaso-occlusive crises in patients aged 16 years and older with sickle cell disease"
      mechanism "P-selectin inhibitor that blocks interactions between endothelial cells, platelets, red blood cells, and leukocytes, preventing vaso-occlusion"
    }
    payer_requirements {
      required_documentation ["SCD diagnosis (ICD-10)", "VOC history (2+ in 12 months)", "CBC within 30 days", "Current medication list"]
      step_therapy ["Must have tried hydroxyurea for 6+ months OR have documented contraindication"]
      clinical_criteria ["2+ VOC in past 12 months requiring medical attention", "Age 16 years or older", "Documentation of hydroxyurea trial or contraindication"]
    }
    diagnosis_codes ["D57.1", "D57.00"]
  }
}

test pa_justification_oxbryta {
  functions [GeneratePAClinicalJustification]
  args {
    patient_data {
      genotype "HbSS"
      voe_count_past_year 3
      hospitalization_count 2
      current_therapies ["Hydroxyurea 500mg daily"]
      failed_therapies []
      hemoglobin 6.8
      hemoglobin_f_percentage 8.0
      age 22
    }
    drug_info {
      drug_name "Oxbryta"
      generic_name "voxelotor"
      indication "Treatment of sickle cell disease in adults and pediatric patients aged 4 years and older"
      mechanism "Hemoglobin S polymerization inhibitor that increases hemoglobin oxygen affinity, reducing sickling and hemolysis"
    }
    payer_requirements {
      required_documentation ["SCD diagnosis", "Hemoglobin level ≤10.5 g/dL", "CBC within 30 days"]
      step_therapy null
      clinical_criteria ["Hemoglobin ≤10.5 g/dL", "Age 4 years or older", "No recent transfusion affecting baseline Hb"]
    }
    diagnosis_codes ["D57.1"]
  }
}

test pa_data_extraction {
  functions [ExtractPAClinicalData]
  args {
    medical_record #"
      PROGRESS NOTE - Hematology Clinic
      Date: 2024-01-15

      Patient is a 28-year-old male with known sickle cell disease (HbSS genotype, confirmed by
      hemoglobin electrophoresis 2019). He presents for routine follow-up.

      INTERVAL HISTORY:
      Since last visit 3 months ago, patient has had 2 additional VOC episodes requiring ED visits
      (December 2023 and January 2024). Total of 5 VOC episodes in the past 12 months, with 2
      requiring hospitalization (August 2023 - 4 days, December 2023 - 3 days).

      CURRENT MEDICATIONS:
      - Hydroxyurea 1000mg PO daily (on since 2021, increased from 500mg)
      - Folic acid 1mg PO daily
      - Oxycodone 5mg PRN for pain

      LABS (01/10/2024):
      - Hemoglobin: 7.4 g/dL
      - HbF: 14.2%
      - Reticulocyte count: 12.5%
      - WBC: 9.2
      - Platelets: 389

      ASSESSMENT:
      Sickle cell disease with recurrent VOC despite maximally tolerated hydroxyurea.
      Patient is compliant with medication regimen.

      PLAN:
      Consider adding crizanlizumab (Adakveo) given ongoing VOC frequency despite hydroxyurea.
      Will initiate prior authorization process.
    "#
    drug_name "Adakveo"
  }
}
