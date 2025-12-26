/**
 * VOC (Vaso-Occlusive Crisis) Prediction Types
 * Part of the Monarch prediction system
 */

// ============================================================================
// SYMPTOM LOGGING
// ============================================================================

export type HydrationLevel = "poor" | "fair" | "good" | "excellent";
export type SymptomSource = "manual" | "wearable" | "api";

export interface SymptomLog {
	id: string;
	patientId: string;
	recordedAt: string; // ISO date string

	// Core PRO metrics (0-10 scale)
	painScore?: number;
	fatigueScore?: number;
	moodScore?: number;

	// Additional symptoms
	hydrationLevel?: HydrationLevel;
	sleepQuality?: number; // 0-10
	sleepHours?: number;

	// Symptom flags
	hasFever?: boolean;
	hasHeadache?: boolean;
	hasShortnessOfBreath?: boolean;
	hasChestPain?: boolean;
	hasJointPain?: boolean;
	hasAbdominalPain?: boolean;

	// Free-form notes
	notes?: string;

	// Metadata
	source: SymptomSource;
	createdAt: string;
	updatedAt: string;
}

export interface CreateSymptomLogRequest {
	recordedAt?: string; // Defaults to now
	painScore?: number;
	fatigueScore?: number;
	moodScore?: number;
	hydrationLevel?: HydrationLevel;
	sleepQuality?: number;
	sleepHours?: number;
	hasFever?: boolean;
	hasHeadache?: boolean;
	hasShortnessOfBreath?: boolean;
	hasChestPain?: boolean;
	hasJointPain?: boolean;
	hasAbdominalPain?: boolean;
	notes?: string;
	source?: SymptomSource;
}

// ============================================================================
// WEARABLE DATA
// ============================================================================

export type WearableDeviceType =
	| "apple_watch"
	| "fitbit"
	| "oura"
	| "garmin"
	| "other";

export interface WearableReading {
	id: string;
	patientId: string;
	recordedAt: string;

	// Device info
	deviceType: WearableDeviceType;
	deviceId?: string;

	// Heart rate metrics
	heartRateResting?: number;
	heartRateAvg?: number;
	heartRateMax?: number;
	heartRateVariability?: number; // ms (SDNN)

	// Activity metrics
	steps?: number;
	activeMinutes?: number;
	caloriesBurned?: number;
	distanceMeters?: number;

	// Sleep metrics
	sleepDurationMinutes?: number;
	sleepDeepMinutes?: number;
	sleepRemMinutes?: number;
	sleepLightMinutes?: number;
	sleepAwakeMinutes?: number;

	// Blood oxygen
	spo2Avg?: number;
	spo2Min?: number;

	// Raw data
	rawData?: Record<string, unknown>;

	createdAt: string;
}

export interface SyncWearableDataRequest {
	deviceType: WearableDeviceType;
	deviceId?: string;
	readings: Array<{
		recordedAt: string;
		heartRateResting?: number;
		heartRateAvg?: number;
		heartRateMax?: number;
		heartRateVariability?: number;
		steps?: number;
		activeMinutes?: number;
		caloriesBurned?: number;
		distanceMeters?: number;
		sleepDurationMinutes?: number;
		sleepDeepMinutes?: number;
		sleepRemMinutes?: number;
		sleepLightMinutes?: number;
		sleepAwakeMinutes?: number;
		spo2Avg?: number;
		spo2Min?: number;
		rawData?: Record<string, unknown>;
	}>;
}

// ============================================================================
// PREDICTIONS
// ============================================================================

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export interface ContributingFactor {
	factor: string;
	weight: number; // 0-1, importance in prediction
	description?: string;
}

export interface VOCPrediction {
	id: string;
	patientId: string;
	predictedAt: string;

	// Prediction output
	riskScore: number; // 0-1
	riskLevel: RiskLevel;
	confidence: number; // 0-1

	// Contributing factors (ordered by importance)
	contributingFactors: ContributingFactor[];

	// AI-generated explanation
	explanation: string;

	// Recommended actions
	recommendedActions: string[];

	// Model metadata
	modelVersion?: string;
	featuresUsed?: Record<string, unknown>;

	// Prediction window
	predictionHorizonHours: number;

	createdAt: string;
}

export interface PredictionRequest {
	patientId: string;
	predictionHorizonHours?: number; // Default 24
	includeExplanation?: boolean;
}

export interface PredictionResponse {
	prediction: VOCPrediction;
	patientProfile?: PatientLearningProfile;
}

// ============================================================================
// PATIENT LEARNING PROFILES
// ============================================================================

export interface TriggerWeight {
	[trigger: string]: number; // e.g., { "cold_weather": 0.85, "stress": 0.65 }
}

export interface ProdromeSignal {
	signal: string;
	hoursBeforeVOC: number;
	weight: number;
}

export interface TreatmentResponse {
	treatment: string;
	improvement: number; // 0-1
	confidence: number; // 0-1
}

export interface PatientLearningProfile {
	id: string;
	patientId: string;

	// Baseline statistics
	baselineVoeFrequency?: number; // VOEs per month
	baselinePainScore?: number;
	baselineSleepHours?: number;
	baselineHeartRate?: number;
	baselineHrv?: number;
	baselineSteps?: number;

	// Learned patterns
	triggerWeights: TriggerWeight;
	prodromeSignals: ProdromeSignal[];
	treatmentResponses: TreatmentResponse[];

	// Model confidence
	modelConfidence: number; // 0-1, improves with more data
	dataPointsCount: number;
	lastVocDate?: string;

	// Metadata
	profileVersion: number;
	lastUpdatedAt: string;
	createdAt: string;
}

export interface PatientProfileSummary {
	confidence: number;
	dataPointsCount: number;
	daysTracking: number;
	topTriggers: Array<{ trigger: string; weight: number }>;
	prodromeWarnings: string[];
	personalizedInsights: string[];
}

// ============================================================================
// PREDICTION FEEDBACK
// ============================================================================

export type VOCSeverity = "mild" | "moderate" | "severe" | "hospitalized";
export type FeedbackSource = "patient" | "clinician" | "ehr";

export interface PredictionFeedback {
	id: string;
	predictionId: string;
	patientId: string;

	// Actual outcome
	vocOccurred: boolean;
	vocSeverity?: VOCSeverity;
	vocOccurredAt?: string;

	// Metadata
	feedbackSource: FeedbackSource;
	feedbackAt: string;
	notes?: string;

	createdAt: string;
}

export interface SubmitFeedbackRequest {
	predictionId: string;
	vocOccurred: boolean;
	vocSeverity?: VOCSeverity;
	vocOccurredAt?: string;
	notes?: string;
}

// ============================================================================
// ALERTS
// ============================================================================

export type AlertType = "high_risk" | "critical_risk" | "symptom_spike";
export type AlertLevel = "info" | "warning" | "urgent" | "critical";
export type DeliveryChannel = "push" | "sms" | "email" | "in_app";

export interface VOCAlert {
	id: string;
	patientId: string;
	predictionId?: string;

	alertType: AlertType;
	alertLevel: AlertLevel;
	title: string;
	message: string;

	deliveryChannels: DeliveryChannel[];
	deliveredAt?: string;
	acknowledgedAt?: string;
	dismissedAt?: string;

	cooldownUntil?: string;

	createdAt: string;
}

// ============================================================================
// DASHBOARD & ANALYTICS
// ============================================================================

export interface DailySummary {
	date: string;
	avgPain: number | null;
	maxPain: number | null;
	avgFatigue: number | null;
	avgMood: number | null;
	avgSleepQuality: number | null;
	avgSleepHours: number | null;
	hadFever: boolean;
	hadChestPain: boolean;
	hadSob: boolean;
	logCount: number;
}

export interface Rolling7DayFeatures {
	patientId: string;
	painAvg7d: number | null;
	painMax7d: number | null;
	painStddev7d: number | null;
	sleepHoursAvg7d: number | null;
	sleepQualityAvg7d: number | null;
	painTrend7d: number | null; // Positive = increasing
	fatigueTrend7d: number | null;
	daysLogged7d: number;
	feverDays7d: number;
	asOfDate: string;
}

export interface PatientDashboard {
	currentRisk: VOCPrediction | null;
	recentSymptoms: SymptomLog[];
	dailySummaries: DailySummary[];
	rollingFeatures: Rolling7DayFeatures | null;
	profile: PatientProfileSummary | null;
	recentAlerts: VOCAlert[];
}

// ============================================================================
// API RESPONSE WRAPPERS
// ============================================================================

export interface SymptomLogListResponse {
	logs: SymptomLog[];
	total: number;
	page: number;
	limit: number;
}

export interface PredictionHistoryResponse {
	predictions: VOCPrediction[];
	total: number;
	page: number;
	limit: number;
}
