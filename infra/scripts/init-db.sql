-- Initial schema for MedLab Chat
CREATE TABLE IF NOT EXISTS scd_patients (
    id UUID PRIMARY KEY,
    medical_record_number VARCHAR(50),
    demographics JSONB,
    clinical_history JSONB
);

CREATE TABLE IF NOT EXISTS voe_episodes (
    id UUID PRIMARY KEY,
    patient_id UUID REFERENCES scd_patients(id),
    episode_date TIMESTAMP,
    severity VARCHAR(20),
    risk_factors JSONB
);

CREATE TABLE IF NOT EXISTS literature_citations (
    id UUID PRIMARY KEY,
    pmid VARCHAR(20),
    doi VARCHAR(100),
    title TEXT,
    authors TEXT[],
    journal VARCHAR(200),
    publication_date DATE,
    medical_subjects TEXT[]
);
