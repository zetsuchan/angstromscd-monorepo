-- VOC Prediction Schema
-- Phase 1: Foundation tables for Monarch VOC prediction system

-- ============================================================================
-- PREREQUISITE TABLES (from init-db.sql)
-- ============================================================================

-- Core patient table (required for foreign keys)
CREATE TABLE IF NOT EXISTS scd_patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medical_record_number VARCHAR(50),
    demographics JSONB,
    clinical_history JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- VOE episodes history
CREATE TABLE IF NOT EXISTS voe_episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES scd_patients(id) ON DELETE CASCADE,
    episode_date TIMESTAMP,
    severity VARCHAR(20),
    risk_factors JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Literature citations for research
CREATE TABLE IF NOT EXISTS literature_citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pmid VARCHAR(20),
    doi VARCHAR(100),
    title TEXT,
    authors TEXT[],
    journal VARCHAR(200),
    publication_date DATE,
    medical_subjects TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SYMPTOM LOGGING
-- ============================================================================

-- Daily symptom logs from patients
CREATE TABLE IF NOT EXISTS symptom_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES scd_patients(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Core PRO metrics (Patient-Reported Outcomes)
    pain_score SMALLINT CHECK (pain_score >= 0 AND pain_score <= 10),
    fatigue_score SMALLINT CHECK (fatigue_score >= 0 AND fatigue_score <= 10),
    mood_score SMALLINT CHECK (mood_score >= 0 AND mood_score <= 10),

    -- Additional symptoms
    hydration_level VARCHAR(20) CHECK (hydration_level IN ('poor', 'fair', 'good', 'excellent')),
    sleep_quality SMALLINT CHECK (sleep_quality >= 0 AND sleep_quality <= 10),
    sleep_hours DECIMAL(3,1) CHECK (sleep_hours >= 0 AND sleep_hours <= 24),

    -- Symptom flags
    has_fever BOOLEAN DEFAULT FALSE,
    has_headache BOOLEAN DEFAULT FALSE,
    has_shortness_of_breath BOOLEAN DEFAULT FALSE,
    has_chest_pain BOOLEAN DEFAULT FALSE,
    has_joint_pain BOOLEAN DEFAULT FALSE,
    has_abdominal_pain BOOLEAN DEFAULT FALSE,

    -- Free-form notes
    notes TEXT,

    -- Metadata
    source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'wearable', 'api'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for time-series queries
CREATE INDEX IF NOT EXISTS idx_symptom_logs_patient_time
    ON symptom_logs(patient_id, recorded_at DESC);

-- Index for recent lookups (no partial index - NOW() is not immutable)
CREATE INDEX IF NOT EXISTS idx_symptom_logs_recent
    ON symptom_logs(recorded_at DESC);

-- ============================================================================
-- WEARABLE DATA
-- ============================================================================

-- Wearable device readings (Apple Watch, Fitbit, Oura, etc.)
CREATE TABLE IF NOT EXISTS wearable_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES scd_patients(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL,

    -- Device info
    device_type VARCHAR(50) NOT NULL, -- 'apple_watch', 'fitbit', 'oura', 'garmin'
    device_id VARCHAR(100),

    -- Heart rate metrics
    heart_rate_resting INTEGER,
    heart_rate_avg INTEGER,
    heart_rate_max INTEGER,
    heart_rate_variability DECIMAL(6,2), -- ms (SDNN)

    -- Activity metrics
    steps INTEGER,
    active_minutes INTEGER,
    calories_burned INTEGER,
    distance_meters INTEGER,

    -- Sleep metrics
    sleep_duration_minutes INTEGER,
    sleep_deep_minutes INTEGER,
    sleep_rem_minutes INTEGER,
    sleep_light_minutes INTEGER,
    sleep_awake_minutes INTEGER,

    -- Blood oxygen (if available)
    spo2_avg DECIMAL(4,1),
    spo2_min DECIMAL(4,1),

    -- Raw data blob for future analysis
    raw_data JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for time-series queries
CREATE INDEX IF NOT EXISTS idx_wearable_readings_patient_time
    ON wearable_readings(patient_id, recorded_at DESC);

-- Composite index for device-specific queries
CREATE INDEX IF NOT EXISTS idx_wearable_readings_device
    ON wearable_readings(patient_id, device_type, recorded_at DESC);

-- ============================================================================
-- VOC PREDICTIONS
-- ============================================================================

-- Prediction results with explanations
CREATE TABLE IF NOT EXISTS voc_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES scd_patients(id) ON DELETE CASCADE,
    predicted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Prediction output
    risk_score DECIMAL(5,4) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'moderate', 'high', 'critical')),
    confidence DECIMAL(5,4) CHECK (confidence >= 0 AND confidence <= 1),

    -- Contributing factors (ordered by importance)
    contributing_factors JSONB NOT NULL DEFAULT '[]',
    -- Example: [{"factor": "sleep_decline_3d", "weight": 0.35}, {"factor": "cold_weather", "weight": 0.25}]

    -- AI-generated explanation
    explanation TEXT,

    -- Recommended actions
    recommended_actions JSONB DEFAULT '[]',
    -- Example: ["hydrate", "rest", "avoid cold exposure", "contact clinic if symptoms worsen"]

    -- Model metadata
    model_version VARCHAR(50),
    features_used JSONB, -- Snapshot of input features for debugging

    -- Prediction window
    prediction_horizon_hours INTEGER DEFAULT 24, -- Predicting risk within next X hours

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for patient predictions over time
CREATE INDEX IF NOT EXISTS idx_voc_predictions_patient_time
    ON voc_predictions(patient_id, predicted_at DESC);

-- Index for high-risk predictions
CREATE INDEX IF NOT EXISTS idx_voc_predictions_high_risk
    ON voc_predictions(risk_level, predicted_at DESC)
    WHERE risk_level IN ('high', 'critical');

-- ============================================================================
-- PATIENT LEARNING PROFILES
-- ============================================================================

-- Personalized learning profile that improves over time
CREATE TABLE IF NOT EXISTS patient_learning_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES scd_patients(id) ON DELETE CASCADE,

    -- Baseline statistics
    baseline_voe_frequency DECIMAL(5,2), -- Average VOEs per month
    baseline_pain_score DECIMAL(4,2),
    baseline_sleep_hours DECIMAL(4,2),
    baseline_heart_rate DECIMAL(5,1),
    baseline_hrv DECIMAL(6,2),
    baseline_steps INTEGER,

    -- Personal trigger weights (learned over time)
    trigger_weights JSONB DEFAULT '{}',
    -- Example: {"cold_weather": 0.85, "stress": 0.65, "dehydration": 0.55, "poor_sleep": 0.70}

    -- Prodromal signal patterns (symptoms that precede VOC)
    prodrome_signals JSONB DEFAULT '{}',
    -- Example: {"fatigue_increase_48h": 0.75, "mild_pain_24h": 0.82}

    -- Treatment response patterns
    treatment_responses JSONB DEFAULT '{}',
    -- Example: {"hydroxyurea": {"improvement": 0.35, "confidence": 0.8}}

    -- Model confidence (improves with more data)
    model_confidence DECIMAL(5,4) DEFAULT 0.3,
    data_points_count INTEGER DEFAULT 0,
    last_voc_date DATE,

    -- Profile metadata
    profile_version INTEGER DEFAULT 1,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(patient_id)
);

-- ============================================================================
-- PREDICTION FEEDBACK
-- ============================================================================

-- Feedback on prediction accuracy (for model improvement)
CREATE TABLE IF NOT EXISTS prediction_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID NOT NULL REFERENCES voc_predictions(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES scd_patients(id) ON DELETE CASCADE,

    -- Actual outcome
    voc_occurred BOOLEAN,
    voc_severity VARCHAR(20) CHECK (voc_severity IN ('mild', 'moderate', 'severe', 'hospitalized')),
    voc_occurred_at TIMESTAMPTZ,

    -- Feedback metadata
    feedback_source VARCHAR(50) DEFAULT 'patient', -- 'patient', 'clinician', 'ehr'
    feedback_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for joining predictions with feedback
CREATE INDEX IF NOT EXISTS idx_prediction_feedback_prediction
    ON prediction_feedback(prediction_id);

-- ============================================================================
-- ALERTS
-- ============================================================================

-- Alert history for deduplication and tracking
CREATE TABLE IF NOT EXISTS voc_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES scd_patients(id) ON DELETE CASCADE,
    prediction_id UUID REFERENCES voc_predictions(id) ON DELETE SET NULL,

    -- Alert details
    alert_type VARCHAR(50) NOT NULL, -- 'high_risk', 'critical_risk', 'symptom_spike'
    alert_level VARCHAR(20) NOT NULL CHECK (alert_level IN ('info', 'warning', 'urgent', 'critical')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,

    -- Delivery tracking
    delivery_channels JSONB DEFAULT '[]', -- ["push", "sms", "email"]
    delivered_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,

    -- Deduplication
    cooldown_until TIMESTAMPTZ, -- Don't send similar alerts until this time

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for recent alerts (deduplication check)
CREATE INDEX IF NOT EXISTS idx_voc_alerts_patient_recent
    ON voc_alerts(patient_id, created_at DESC);

-- ============================================================================
-- MATERIALIZED VIEWS FOR FEATURE ENGINEERING
-- ============================================================================

-- Daily summary for each patient (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS patient_daily_summary AS
SELECT
    s.patient_id,
    DATE(s.recorded_at) as summary_date,

    -- Symptom averages
    AVG(s.pain_score) as avg_pain,
    MAX(s.pain_score) as max_pain,
    AVG(s.fatigue_score) as avg_fatigue,
    AVG(s.mood_score) as avg_mood,
    AVG(s.sleep_quality) as avg_sleep_quality,
    AVG(s.sleep_hours) as avg_sleep_hours,

    -- Symptom flags
    BOOL_OR(s.has_fever) as had_fever,
    BOOL_OR(s.has_chest_pain) as had_chest_pain,
    BOOL_OR(s.has_shortness_of_breath) as had_sob,

    -- Entry count
    COUNT(*) as log_count

FROM symptom_logs s
WHERE s.recorded_at > NOW() - INTERVAL '90 days'
GROUP BY s.patient_id, DATE(s.recorded_at);

-- Unique index for efficient refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_daily_summary_pk
    ON patient_daily_summary(patient_id, summary_date);

-- 7-day rolling features for prediction
CREATE MATERIALIZED VIEW IF NOT EXISTS patient_rolling_7d_features AS
SELECT
    patient_id,

    -- Pain metrics
    AVG(avg_pain) as pain_avg_7d,
    MAX(max_pain) as pain_max_7d,
    STDDEV(avg_pain) as pain_stddev_7d,

    -- Sleep metrics
    AVG(avg_sleep_hours) as sleep_hours_avg_7d,
    AVG(avg_sleep_quality) as sleep_quality_avg_7d,

    -- Trend calculation (simple slope)
    REGR_SLOPE(avg_pain, EXTRACT(EPOCH FROM summary_date)) as pain_trend_7d,
    REGR_SLOPE(avg_fatigue, EXTRACT(EPOCH FROM summary_date)) as fatigue_trend_7d,

    -- Activity metrics
    COUNT(*) as days_logged_7d,
    SUM(CASE WHEN had_fever THEN 1 ELSE 0 END) as fever_days_7d,

    MAX(summary_date) as as_of_date

FROM patient_daily_summary
WHERE summary_date > CURRENT_DATE - INTERVAL '7 days'
GROUP BY patient_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_rolling_7d_pk
    ON patient_rolling_7d_features(patient_id);

-- ============================================================================
-- RLS POLICIES (Supabase-specific, skip if running locally)
-- ============================================================================

-- Only enable RLS if running in Supabase (auth schema exists)
DO $$
BEGIN
    -- Check if auth schema exists (Supabase)
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
        -- Enable RLS on all tables
        ALTER TABLE symptom_logs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE wearable_readings ENABLE ROW LEVEL SECURITY;
        ALTER TABLE voc_predictions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE patient_learning_profiles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE prediction_feedback ENABLE ROW LEVEL SECURITY;
        ALTER TABLE voc_alerts ENABLE ROW LEVEL SECURITY;

        -- Patients can only see their own data
        DROP POLICY IF EXISTS symptom_logs_patient_policy ON symptom_logs;
        CREATE POLICY symptom_logs_patient_policy ON symptom_logs
            FOR ALL USING (patient_id = auth.uid());

        DROP POLICY IF EXISTS wearable_readings_patient_policy ON wearable_readings;
        CREATE POLICY wearable_readings_patient_policy ON wearable_readings
            FOR ALL USING (patient_id = auth.uid());

        DROP POLICY IF EXISTS voc_predictions_patient_policy ON voc_predictions;
        CREATE POLICY voc_predictions_patient_policy ON voc_predictions
            FOR ALL USING (patient_id = auth.uid());

        DROP POLICY IF EXISTS patient_learning_profiles_patient_policy ON patient_learning_profiles;
        CREATE POLICY patient_learning_profiles_patient_policy ON patient_learning_profiles
            FOR ALL USING (patient_id = auth.uid());

        DROP POLICY IF EXISTS prediction_feedback_patient_policy ON prediction_feedback;
        CREATE POLICY prediction_feedback_patient_policy ON prediction_feedback
            FOR ALL USING (patient_id = auth.uid());

        DROP POLICY IF EXISTS voc_alerts_patient_policy ON voc_alerts;
        CREATE POLICY voc_alerts_patient_policy ON voc_alerts
            FOR ALL USING (patient_id = auth.uid());

        RAISE NOTICE 'RLS policies created (Supabase detected)';
    ELSE
        RAISE NOTICE 'Skipping RLS policies (local PostgreSQL detected)';
    END IF;
END $$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update learning profile data points count on new symptom log
CREATE OR REPLACE FUNCTION update_learning_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO patient_learning_profiles (patient_id, data_points_count, last_updated_at)
    VALUES (NEW.patient_id, 1, NOW())
    ON CONFLICT (patient_id)
    DO UPDATE SET
        data_points_count = patient_learning_profiles.data_points_count + 1,
        last_updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_learning_profile ON symptom_logs;
CREATE TRIGGER trigger_update_learning_profile
    AFTER INSERT ON symptom_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_learning_profile_stats();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_symptom_logs_updated_at ON symptom_logs;
CREATE TRIGGER trigger_symptom_logs_updated_at
    BEFORE UPDATE ON symptom_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE symptom_logs IS 'Daily patient-reported symptoms for VOC prediction';
COMMENT ON TABLE wearable_readings IS 'Data from wearable devices (Apple Watch, Fitbit, etc.)';
COMMENT ON TABLE voc_predictions IS 'AI-generated VOC risk predictions with explanations';
COMMENT ON TABLE patient_learning_profiles IS 'Personalized models that learn patient-specific patterns';
COMMENT ON TABLE prediction_feedback IS 'Actual outcomes used to improve predictions';
COMMENT ON TABLE voc_alerts IS 'Alert history for patient notifications';
COMMENT ON MATERIALIZED VIEW patient_daily_summary IS 'Aggregated daily symptom data (refresh periodically)';
COMMENT ON MATERIALIZED VIEW patient_rolling_7d_features IS '7-day rolling features for ML predictions';

-- ============================================================================
-- DEMO DATA
-- ============================================================================

-- Insert demo patient for testing (matches frontend hardcoded ID)
INSERT INTO scd_patients (id, medical_record_number, demographics, clinical_history)
VALUES (
    '00000000-0000-0000-0000-000000000001'::UUID,
    'MRN-DEMO-001',
    '{"name": "Demo Patient", "age": 28, "gender": "female"}'::JSONB,
    '{"diagnosis": "HbSS", "diagnosed_at": "2010-01-15", "complications": ["acute_chest_syndrome", "avascular_necrosis"]}'::JSONB
)
ON CONFLICT (id) DO NOTHING;

-- Insert sample learning profile for demo patient
INSERT INTO patient_learning_profiles (
    patient_id,
    baseline_voe_frequency,
    baseline_pain_score,
    baseline_sleep_hours,
    model_confidence,
    data_points_count,
    trigger_weights,
    prodrome_signals
)
VALUES (
    '00000000-0000-0000-0000-000000000001'::UUID,
    2.5,
    3.2,
    7.5,
    0.45,
    47,
    '{"cold_weather": 0.82, "stress": 0.68, "dehydration": 0.55, "poor_sleep": 0.72}'::JSONB,
    '{"fatigue_increase_48h": 0.75, "mild_pain_24h": 0.82}'::JSONB
)
ON CONFLICT (patient_id) DO NOTHING;
