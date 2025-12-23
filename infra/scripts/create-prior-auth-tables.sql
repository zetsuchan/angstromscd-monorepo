-- Prior Authorization Tables for SCD Drugs
-- Run this in Supabase SQL Editor after migrate-all.sql

-- ============================================
-- 1. SCD Drugs Reference Table
-- ============================================
CREATE TABLE IF NOT EXISTS scd_drugs (
    id TEXT PRIMARY KEY,
    brand_name TEXT NOT NULL,
    generic_name TEXT NOT NULL,
    manufacturer TEXT,
    ndc_codes TEXT[] DEFAULT '{}',
    mechanism_of_action TEXT,
    indication TEXT,
    dosing_info JSONB,
    clinical_criteria JSONB,
    common_denial_reasons TEXT[] DEFAULT '{}',
    supporting_literature JSONB DEFAULT '[]',
    fhir_medication_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. Payers Reference Table
-- ============================================
CREATE TABLE IF NOT EXISTS payers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    payer_type TEXT CHECK (payer_type IN ('commercial', 'medicare', 'medicaid', 'other')),
    pa_requirements JSONB DEFAULT '{}',
    submission_portal_url TEXT,
    phone_number TEXT,
    fax_number TEXT,
    average_response_days INTEGER,
    appeal_process JSONB,
    fhir_endpoint TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. Prior Auth Requests Table
-- ============================================
CREATE TABLE IF NOT EXISTS prior_auth_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    patient_id UUID,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_info', 'ready_to_submit', 'submitted',
        'approved', 'denied', 'appeal', 'expired'
    )),
    drug_id TEXT NOT NULL REFERENCES scd_drugs(id),
    payer_id TEXT NOT NULL REFERENCES payers(id),
    diagnosis_codes TEXT[] DEFAULT '{}',
    urgency TEXT DEFAULT 'standard' CHECK (urgency IN ('standard', 'urgent', 'expedited')),
    clinical_justification TEXT,
    supporting_documents JSONB DEFAULT '[]',
    submission_date TIMESTAMP WITH TIME ZONE,
    decision_date TIMESTAMP WITH TIME ZONE,
    denial_reason TEXT,
    appeal_deadline TIMESTAMP WITH TIME ZONE,
    payer_reference_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- ============================================
-- 4. PA Clinical Data Table
-- ============================================
CREATE TABLE IF NOT EXISTS pa_clinical_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pa_request_id UUID NOT NULL REFERENCES prior_auth_requests(id) ON DELETE CASCADE,
    scd_genotype TEXT,
    voe_history JSONB,
    current_therapies TEXT[] DEFAULT '{}',
    lab_results JSONB,
    transfusion_history JSONB,
    hospitalizations_past_year INTEGER,
    failed_therapies TEXT[] DEFAULT '{}',
    contraindications TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_pa_requests_user_id ON prior_auth_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_pa_requests_status ON prior_auth_requests(status);
CREATE INDEX IF NOT EXISTS idx_pa_requests_drug_id ON prior_auth_requests(drug_id);
CREATE INDEX IF NOT EXISTS idx_pa_requests_payer_id ON prior_auth_requests(payer_id);
CREATE INDEX IF NOT EXISTS idx_pa_requests_created_at ON prior_auth_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pa_clinical_data_request_id ON pa_clinical_data(pa_request_id);

-- ============================================
-- 6. Timestamp Update Triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_pa_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_pa_requests_timestamp ON prior_auth_requests;
CREATE TRIGGER update_pa_requests_timestamp
BEFORE UPDATE ON prior_auth_requests
FOR EACH ROW
EXECUTE FUNCTION update_pa_requests_updated_at();

CREATE OR REPLACE FUNCTION update_pa_clinical_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_pa_clinical_data_timestamp ON pa_clinical_data;
CREATE TRIGGER update_pa_clinical_data_timestamp
BEFORE UPDATE ON pa_clinical_data
FOR EACH ROW
EXECUTE FUNCTION update_pa_clinical_data_updated_at();

-- ============================================
-- 7. Row Level Security
-- ============================================
ALTER TABLE prior_auth_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pa_clinical_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own PA requests" ON prior_auth_requests;
DROP POLICY IF EXISTS "Users can create own PA requests" ON prior_auth_requests;
DROP POLICY IF EXISTS "Users can update own PA requests" ON prior_auth_requests;
DROP POLICY IF EXISTS "Users can delete own PA requests" ON prior_auth_requests;
DROP POLICY IF EXISTS "Users can view clinical data for own PA requests" ON pa_clinical_data;
DROP POLICY IF EXISTS "Users can add clinical data to own PA requests" ON pa_clinical_data;
DROP POLICY IF EXISTS "Users can update clinical data for own PA requests" ON pa_clinical_data;

-- PA Requests policies
CREATE POLICY "Users can view own PA requests" ON prior_auth_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own PA requests" ON prior_auth_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own PA requests" ON prior_auth_requests
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own PA requests" ON prior_auth_requests
  FOR DELETE USING (auth.uid() = user_id);

-- Clinical Data policies (based on PA request ownership)
CREATE POLICY "Users can view clinical data for own PA requests" ON pa_clinical_data
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM prior_auth_requests WHERE id = pa_request_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can add clinical data to own PA requests" ON pa_clinical_data
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM prior_auth_requests WHERE id = pa_request_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update clinical data for own PA requests" ON pa_clinical_data
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM prior_auth_requests WHERE id = pa_request_id AND user_id = auth.uid())
  );

-- ============================================
-- 8. Seed SCD Drugs Reference Data
-- ============================================
INSERT INTO scd_drugs (id, brand_name, generic_name, manufacturer, indication, mechanism_of_action, clinical_criteria, common_denial_reasons, supporting_literature) VALUES
('adakveo', 'Adakveo', 'crizanlizumab-tmca', 'Novartis',
  'Reduce frequency of vaso-occlusive crises (VOC) in patients aged 16 years and older with sickle cell disease',
  'P-selectin inhibitor that blocks interactions between endothelial cells, platelets, red blood cells, and leukocytes',
  '{"age_requirement": "16+", "genotype_requirement": ["HbSS", "HbSC", "HbSβ+", "HbSβ0"], "voe_frequency": "2+ VOC requiring medical attention in past 12 months", "lab_requirements": [{"test": "CBC", "timeframe": "within 30 days"}]}',
  ARRAY['Insufficient VOC documentation', 'Age requirement not met', 'Step therapy not completed (hydroxyurea trial required)', 'Missing lab values'],
  '[{"pmid": "31199090", "title": "Crizanlizumab for the Prevention of Pain Crises in Sickle Cell Disease (SUSTAIN)", "summary": "Crizanlizumab reduced annual rate of VOC by 45.3% compared to placebo (p=0.01). Median time to first VOC was 4.07 months longer with crizanlizumab."}]'
),
('endari', 'Endari', 'L-glutamine oral powder', 'Emmaus Medical',
  'Reduce acute complications of sickle cell disease in patients aged 5 years and older',
  'Increases NAD redox potential in sickle cell erythrocytes, reducing oxidative stress',
  '{"age_requirement": "5+", "genotype_requirement": ["HbSS", "HbSβ0"], "indication": "2+ sickle cell crises in past 12 months"}',
  ARRAY['Medical necessity not established', 'Insufficient trial of hydroxyurea', 'Age under 5 years', 'Genotype not documented'],
  '[{"pmid": "28249464", "title": "A Randomized, Placebo-Controlled Study of L-Glutamine in Sickle Cell Disease", "summary": "L-glutamine reduced frequency of sickle cell crises by 25% and hospitalizations by 33% over 48 weeks."}]'
),
('oxbryta', 'Oxbryta', 'voxelotor', 'Global Blood Therapeutics/Pfizer',
  'Treatment of sickle cell disease in adults and pediatric patients aged 4 years and older',
  'HbS polymerization inhibitor that increases hemoglobin oxygen affinity, reducing sickling',
  '{"age_requirement": "4+", "hemoglobin_requirement": "Hemoglobin ≤10.5 g/dL", "lab_requirements": [{"test": "Hemoglobin", "threshold": "≤10.5 g/dL", "timeframe": "within 30 days"}]}',
  ARRAY['Hemoglobin not sufficiently low', 'Concurrent hydroxyurea not documented', 'Age under 4 years', 'Recent transfusion affecting baseline Hb'],
  '[{"pmid": "31199089", "title": "Voxelotor in Sickle Cell Disease (HOPE)", "summary": "Voxelotor 1500mg increased hemoglobin by ≥1.0 g/dL in 51% of patients vs 7% placebo (p<0.001). Markers of hemolysis also improved."}]'
),
('hydroxyurea', 'Droxia/Siklos/Hydroxyurea', 'hydroxyurea', 'Various',
  'Reduce frequency of painful crises and reduce need for blood transfusions in patients with sickle cell anemia',
  'Increases fetal hemoglobin (HbF) production, reduces neutrophil and platelet counts',
  '{"age_requirement": "2+", "indication": "Recurrent moderate to severe painful crises", "monitoring": ["CBC every 2 weeks during dose adjustment", "CBC monthly once stable"]}',
  ARRAY['Prior adequate trial not documented', 'Missing baseline labs', 'Monitoring schedule not established'],
  '[{"pmid": "7715639", "title": "Effect of Hydroxyurea on the Frequency of Painful Crises in Sickle Cell Anemia (MSH Study)", "summary": "Hydroxyurea reduced rate of painful crises by 44% and acute chest syndrome by 50%."}]'
)
ON CONFLICT (id) DO UPDATE SET
  brand_name = EXCLUDED.brand_name,
  generic_name = EXCLUDED.generic_name,
  manufacturer = EXCLUDED.manufacturer,
  indication = EXCLUDED.indication,
  mechanism_of_action = EXCLUDED.mechanism_of_action,
  clinical_criteria = EXCLUDED.clinical_criteria,
  common_denial_reasons = EXCLUDED.common_denial_reasons,
  supporting_literature = EXCLUDED.supporting_literature,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 9. Seed Payers Reference Data
-- ============================================
INSERT INTO payers (id, name, payer_type, pa_requirements, average_response_days, appeal_process) VALUES
('aetna', 'Aetna', 'commercial',
  '{"drugs": {"adakveo": {"required": true, "step_therapy": ["hydroxyurea for 6+ months OR documented contraindication"], "documentation_required": ["SCD diagnosis (ICD-10)", "VOC history (2+ in 12 months)", "CBC within 30 days", "Current medication list"], "quantity_limits": "1 vial per 28 days", "renewal_frequency": "12 months"}, "endari": {"required": true, "step_therapy": [], "documentation_required": ["SCD diagnosis", "VOC history", "Current medication list"], "renewal_frequency": "12 months"}, "oxbryta": {"required": true, "step_therapy": [], "documentation_required": ["SCD diagnosis", "Hemoglobin level ≤10.5 g/dL", "CBC within 30 days"], "renewal_frequency": "12 months"}, "hydroxyurea": {"required": false, "documentation_required": ["SCD diagnosis"]}}}',
  5,
  '{"levels": 2, "timeframe_days": 30, "required_documents": ["Denial letter", "Additional clinical documentation", "Peer-to-peer request form"]}'
),
('bcbs', 'Blue Cross Blue Shield', 'commercial',
  '{"drugs": {"adakveo": {"required": true, "step_therapy": ["hydroxyurea trial for 6+ months with documented inadequate response OR contraindication"], "documentation_required": ["SCD diagnosis confirmed by hemoglobin electrophoresis", "2+ VOC requiring medical attention in past 12 months", "CBC and reticulocyte count within 30 days", "Hematology consult note"], "quantity_limits": "1 vial per 28 days", "renewal_frequency": "12 months"}, "endari": {"required": true, "step_therapy": [], "documentation_required": ["SCD diagnosis", "History of acute complications", "Trial of hydroxyurea (preferred)"], "renewal_frequency": "12 months"}, "oxbryta": {"required": true, "step_therapy": [], "documentation_required": ["SCD diagnosis", "Baseline hemoglobin ≤10.5 g/dL within 30 days", "No transfusion within 30 days of baseline Hb"], "renewal_frequency": "12 months"}, "hydroxyurea": {"required": false, "documentation_required": ["SCD diagnosis", "CBC at baseline"]}}}',
  7,
  '{"levels": 3, "timeframe_days": 45, "required_documents": ["Denial letter", "Letter of medical necessity", "Supporting literature", "Peer-to-peer available"]}'
),
('unitedhealth', 'UnitedHealthcare', 'commercial',
  '{"drugs": {"adakveo": {"required": true, "step_therapy": ["hydroxyurea for 6+ months unless contraindicated"], "documentation_required": ["SCD diagnosis with genotype", "2+ VOC in past 12 months with dates and treatment locations", "Current CBC", "Documentation of hydroxyurea trial or contraindication"], "quantity_limits": "1 vial per 28 days", "renewal_frequency": "12 months"}, "endari": {"required": true, "step_therapy": [], "documentation_required": ["SCD diagnosis", "Acute complication history", "Current therapy documentation"], "renewal_frequency": "12 months"}, "oxbryta": {"required": true, "step_therapy": [], "documentation_required": ["SCD diagnosis", "Hemoglobin ≤10.5 g/dL", "Baseline CBC"], "renewal_frequency": "12 months"}, "hydroxyurea": {"required": false, "documentation_required": ["SCD diagnosis"]}}}',
  5,
  '{"levels": 2, "timeframe_days": 30, "required_documents": ["Denial letter", "Clinical rationale", "Supporting documentation"]}'
),
('cigna', 'Cigna', 'commercial',
  '{"drugs": {"adakveo": {"required": true, "step_therapy": ["hydroxyurea for 6+ months OR contraindication documented"], "documentation_required": ["SCD diagnosis", "2+ VOC in past 12 months", "Lab values within 30 days", "Specialist involvement"], "renewal_frequency": "12 months"}, "endari": {"required": true, "step_therapy": [], "documentation_required": ["SCD diagnosis", "Crisis history"], "renewal_frequency": "12 months"}, "oxbryta": {"required": true, "step_therapy": [], "documentation_required": ["SCD diagnosis", "Hemoglobin levels", "Not post-transfusion"], "renewal_frequency": "12 months"}, "hydroxyurea": {"required": false, "documentation_required": ["SCD diagnosis"]}}}',
  7,
  '{"levels": 2, "timeframe_days": 30, "required_documents": ["Appeal form", "Medical records", "Letter of necessity"]}'
),
('medicare', 'Medicare Part D', 'medicare',
  '{"drugs": {"adakveo": {"required": true, "step_therapy": ["varies by plan"], "documentation_required": ["SCD diagnosis", "VOC history", "Labs"], "renewal_frequency": "12 months"}, "endari": {"required": true, "step_therapy": [], "documentation_required": ["SCD diagnosis", "Indication documentation"], "renewal_frequency": "12 months"}, "oxbryta": {"required": true, "step_therapy": [], "documentation_required": ["SCD diagnosis", "Hemoglobin documentation"], "renewal_frequency": "12 months"}, "hydroxyurea": {"required": false, "documentation_required": ["SCD diagnosis"]}}}',
  14,
  '{"levels": 5, "timeframe_days": 60, "required_documents": ["Coverage determination request", "Medical records", "Prescriber statement"]}'
),
('medicaid', 'Medicaid (State Varies)', 'medicaid',
  '{"drugs": {"adakveo": {"required": true, "step_therapy": ["varies by state"], "documentation_required": ["SCD diagnosis", "VOC documentation", "State-specific forms"], "renewal_frequency": "varies"}, "endari": {"required": true, "step_therapy": [], "documentation_required": ["SCD diagnosis", "State-specific requirements"], "renewal_frequency": "varies"}, "oxbryta": {"required": true, "step_therapy": [], "documentation_required": ["SCD diagnosis", "Hemoglobin levels"], "renewal_frequency": "varies"}, "hydroxyurea": {"required": false, "documentation_required": ["SCD diagnosis"]}}}',
  14,
  '{"levels": 2, "timeframe_days": 45, "required_documents": ["State appeal form", "Medical documentation"]}'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  payer_type = EXCLUDED.payer_type,
  pa_requirements = EXCLUDED.pa_requirements,
  average_response_days = EXCLUDED.average_response_days,
  appeal_process = EXCLUDED.appeal_process,
  updated_at = CURRENT_TIMESTAMP;

-- Done!
SELECT 'Prior Auth tables created and seeded successfully!' as status;
