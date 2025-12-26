/**
 * VOC Prediction API Routes
 * Part of the Monarch prediction system
 */

import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { supabaseAdmin } from "../lib/db";

const app = new Hono();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createSymptomLogSchema = z.object({
	recordedAt: z.string().datetime().nullish(),
	painScore: z.number().min(0).max(10).nullish(),
	fatigueScore: z.number().min(0).max(10).nullish(),
	moodScore: z.number().min(0).max(10).nullish(),
	hydrationLevel: z.enum(["poor", "fair", "good", "excellent"]).nullish(),
	sleepQuality: z.number().min(0).max(10).nullish(),
	sleepHours: z.number().min(0).max(24).nullish(),
	hasFever: z.boolean().nullish(),
	hasHeadache: z.boolean().nullish(),
	hasShortnessOfBreath: z.boolean().nullish(),
	hasChestPain: z.boolean().nullish(),
	hasJointPain: z.boolean().nullish(),
	hasAbdominalPain: z.boolean().nullish(),
	notes: z.string().max(2000).nullish(),
	source: z.enum(["manual", "wearable", "api"]).nullish(),
});

const syncWearableSchema = z.object({
	deviceType: z.enum(["apple_watch", "fitbit", "oura", "garmin", "other"]),
	deviceId: z.string().optional(),
	readings: z.array(
		z.object({
			recordedAt: z.string().datetime(),
			heartRateResting: z.number().optional(),
			heartRateAvg: z.number().optional(),
			heartRateMax: z.number().optional(),
			heartRateVariability: z.number().optional(),
			steps: z.number().optional(),
			activeMinutes: z.number().optional(),
			caloriesBurned: z.number().optional(),
			distanceMeters: z.number().optional(),
			sleepDurationMinutes: z.number().optional(),
			sleepDeepMinutes: z.number().optional(),
			sleepRemMinutes: z.number().optional(),
			sleepLightMinutes: z.number().optional(),
			sleepAwakeMinutes: z.number().optional(),
			spo2Avg: z.number().optional(),
			spo2Min: z.number().optional(),
			rawData: z.record(z.unknown()).optional(),
		}),
	),
});

const submitFeedbackSchema = z.object({
	predictionId: z.string().uuid(),
	vocOccurred: z.boolean(),
	vocSeverity: z
		.enum(["mild", "moderate", "severe", "hospitalized"])
		.optional(),
	vocOccurredAt: z.string().datetime().optional(),
	notes: z.string().max(2000).optional(),
});

const paginationSchema = z.object({
	page: z.coerce.number().min(1).default(1),
	limit: z.coerce.number().min(1).max(100).default(20),
});

// ============================================================================
// SYMPTOM LOGGING ENDPOINTS
// ============================================================================

// Custom validation error hook
const validationHook = (
	result: { success: boolean; error?: z.ZodError; data?: unknown },
	c: Parameters<Parameters<typeof app.post>[1]>[0],
) => {
	if (!result.success) {
		const errors = result.error?.flatten();
		return c.json(
			{
				error: {
					message: "Validation failed",
					code: "VALIDATION_ERROR",
					details: errors,
				},
			},
			400,
		);
	}
};

/**
 * POST /api/voc/patients/:patientId/symptoms
 * Log symptoms for a patient
 */
app.post(
	"/patients/:patientId/symptoms",
	zValidator("json", createSymptomLogSchema, validationHook),
	async (c) => {
		const patientId = c.req.param("patientId");
		const body = c.req.valid("json");

		const { data, error } = await supabaseAdmin
			.from("symptom_logs")
			.insert({
				patient_id: patientId,
				recorded_at: body.recordedAt || new Date().toISOString(),
				pain_score: body.painScore,
				fatigue_score: body.fatigueScore,
				mood_score: body.moodScore,
				hydration_level: body.hydrationLevel,
				sleep_quality: body.sleepQuality,
				sleep_hours: body.sleepHours,
				has_fever: body.hasFever,
				has_headache: body.hasHeadache,
				has_shortness_of_breath: body.hasShortnessOfBreath,
				has_chest_pain: body.hasChestPain,
				has_joint_pain: body.hasJointPain,
				has_abdominal_pain: body.hasAbdominalPain,
				notes: body.notes,
				source: body.source || "manual",
			})
			.select()
			.single();

		if (error) {
			console.error("Error creating symptom log:", error);
			return c.json(
				{
					error: {
						message: error.message || "Failed to create symptom log",
						code: error.code,
						details: error.details,
					},
				},
				500,
			);
		}

		return c.json({ log: transformSymptomLog(data) }, 201);
	},
);

/**
 * GET /api/voc/patients/:patientId/symptoms
 * Get symptom history for a patient
 */
app.get("/patients/:patientId/symptoms", async (c) => {
	const patientId = c.req.param("patientId");
	const { page, limit } = paginationSchema.parse({
		page: c.req.query("page"),
		limit: c.req.query("limit"),
	});

	const from = (page - 1) * limit;
	const to = from + limit - 1;

	const { data, error, count } = await supabaseAdmin
		.from("symptom_logs")
		.select("*", { count: "exact" })
		.eq("patient_id", patientId)
		.order("recorded_at", { ascending: false })
		.range(from, to);

	if (error) {
		console.error("Error fetching symptom logs:", error);
		return c.json({ error: "Failed to fetch symptom logs" }, 500);
	}

	return c.json({
		logs: (data || []).map(transformSymptomLog),
		total: count || 0,
		page,
		limit,
	});
});

/**
 * GET /api/voc/patients/:patientId/symptoms/:id
 * Get a specific symptom log
 */
app.get("/patients/:patientId/symptoms/:id", async (c) => {
	const patientId = c.req.param("patientId");
	const id = c.req.param("id");

	const { data, error } = await supabaseAdmin
		.from("symptom_logs")
		.select("*")
		.eq("id", id)
		.eq("patient_id", patientId)
		.single();

	if (error || !data) {
		return c.json({ error: "Symptom log not found" }, 404);
	}

	return c.json({ log: transformSymptomLog(data) });
});

/**
 * DELETE /api/voc/patients/:patientId/symptoms/:id
 * Delete a symptom log
 */
app.delete("/patients/:patientId/symptoms/:id", async (c) => {
	const patientId = c.req.param("patientId");
	const id = c.req.param("id");

	const { error } = await supabaseAdmin
		.from("symptom_logs")
		.delete()
		.eq("id", id)
		.eq("patient_id", patientId);

	if (error) {
		console.error("Error deleting symptom log:", error);
		return c.json({ error: "Failed to delete symptom log" }, 500);
	}

	return c.json({ success: true });
});

// ============================================================================
// WEARABLE DATA ENDPOINTS
// ============================================================================

/**
 * POST /api/voc/patients/:patientId/wearable-sync
 * Sync wearable data for a patient
 */
app.post(
	"/patients/:patientId/wearable-sync",
	zValidator("json", syncWearableSchema),
	async (c) => {
		const patientId = c.req.param("patientId");
		const body = c.req.valid("json");

		const readings = body.readings.map((r) => ({
			patient_id: patientId,
			recorded_at: r.recordedAt,
			device_type: body.deviceType,
			device_id: body.deviceId,
			heart_rate_resting: r.heartRateResting,
			heart_rate_avg: r.heartRateAvg,
			heart_rate_max: r.heartRateMax,
			heart_rate_variability: r.heartRateVariability,
			steps: r.steps,
			active_minutes: r.activeMinutes,
			calories_burned: r.caloriesBurned,
			distance_meters: r.distanceMeters,
			sleep_duration_minutes: r.sleepDurationMinutes,
			sleep_deep_minutes: r.sleepDeepMinutes,
			sleep_rem_minutes: r.sleepRemMinutes,
			sleep_light_minutes: r.sleepLightMinutes,
			sleep_awake_minutes: r.sleepAwakeMinutes,
			spo2_avg: r.spo2Avg,
			spo2_min: r.spo2Min,
			raw_data: r.rawData,
		}));

		const { data, error } = await supabaseAdmin
			.from("wearable_readings")
			.upsert(readings, {
				onConflict: "patient_id,recorded_at,device_type",
				ignoreDuplicates: false,
			})
			.select();

		if (error) {
			console.error("Error syncing wearable data:", error);
			return c.json({ error: "Failed to sync wearable data" }, 500);
		}

		return c.json({
			synced: data?.length || 0,
			message: `Successfully synced ${data?.length || 0} readings`,
		});
	},
);

/**
 * GET /api/voc/patients/:patientId/wearable
 * Get wearable data history for a patient
 */
app.get("/patients/:patientId/wearable", async (c) => {
	const patientId = c.req.param("patientId");
	const { page, limit } = paginationSchema.parse({
		page: c.req.query("page"),
		limit: c.req.query("limit"),
	});
	const deviceType = c.req.query("deviceType");

	const from = (page - 1) * limit;
	const to = from + limit - 1;

	let query = supabaseAdmin
		.from("wearable_readings")
		.select("*", { count: "exact" })
		.eq("patient_id", patientId)
		.order("recorded_at", { ascending: false })
		.range(from, to);

	if (deviceType) {
		query = query.eq("device_type", deviceType);
	}

	const { data, error, count } = await query;

	if (error) {
		console.error("Error fetching wearable data:", error);
		return c.json({ error: "Failed to fetch wearable data" }, 500);
	}

	return c.json({
		readings: (data || []).map(transformWearableReading),
		total: count || 0,
		page,
		limit,
	});
});

// ============================================================================
// PREDICTION ENDPOINTS
// ============================================================================

/**
 * POST /api/voc/patients/:patientId/predict
 * Generate a VOC risk prediction for a patient
 */
app.post("/patients/:patientId/predict", async (c) => {
	const patientId = c.req.param("patientId");

	// TODO: Implement full prediction logic with ML model
	// For now, return a simple rule-based prediction

	// Get recent symptoms (last 7 days)
	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

	const { data: recentSymptoms } = await supabaseAdmin
		.from("symptom_logs")
		.select("*")
		.eq("patient_id", patientId)
		.gte("recorded_at", sevenDaysAgo.toISOString())
		.order("recorded_at", { ascending: false });

	// Simple rule-based risk calculation
	const symptoms = recentSymptoms || [];
	let riskScore = 0.2; // Base risk
	const contributingFactors: Array<{
		factor: string;
		weight: number;
		description: string;
	}> = [];

	if (symptoms.length > 0) {
		// Average pain score
		const painScores = symptoms
			.filter((s) => s.pain_score !== null)
			.map((s) => s.pain_score);
		if (painScores.length > 0) {
			const avgPain = painScores.reduce((a, b) => a + b, 0) / painScores.length;
			if (avgPain >= 5) {
				riskScore += 0.15;
				contributingFactors.push({
					factor: "elevated_pain",
					weight: 0.15,
					description: `Average pain score of ${avgPain.toFixed(1)} over past 7 days`,
				});
			}
		}

		// Check for fever
		const hasFever = symptoms.some((s) => s.has_fever);
		if (hasFever) {
			riskScore += 0.2;
			contributingFactors.push({
				factor: "fever_present",
				weight: 0.2,
				description: "Fever reported in past 7 days",
			});
		}

		// Check for chest pain
		const hasChestPain = symptoms.some((s) => s.has_chest_pain);
		if (hasChestPain) {
			riskScore += 0.25;
			contributingFactors.push({
				factor: "chest_pain",
				weight: 0.25,
				description: "Chest pain reported - seek medical attention if severe",
			});
		}

		// Sleep quality
		const sleepScores = symptoms
			.filter((s) => s.sleep_quality !== null)
			.map((s) => s.sleep_quality);
		if (sleepScores.length > 0) {
			const avgSleep =
				sleepScores.reduce((a, b) => a + b, 0) / sleepScores.length;
			if (avgSleep <= 4) {
				riskScore += 0.1;
				contributingFactors.push({
					factor: "poor_sleep",
					weight: 0.1,
					description: `Poor sleep quality (avg ${avgSleep.toFixed(1)}/10)`,
				});
			}
		}

		// Fatigue
		const fatigueScores = symptoms
			.filter((s) => s.fatigue_score !== null)
			.map((s) => s.fatigue_score);
		if (fatigueScores.length > 0) {
			const avgFatigue =
				fatigueScores.reduce((a, b) => a + b, 0) / fatigueScores.length;
			if (avgFatigue >= 6) {
				riskScore += 0.1;
				contributingFactors.push({
					factor: "high_fatigue",
					weight: 0.1,
					description: `High fatigue levels (avg ${avgFatigue.toFixed(1)}/10)`,
				});
			}
		}
	} else {
		contributingFactors.push({
			factor: "insufficient_data",
			weight: 0,
			description: "No symptom data in past 7 days - predictions less accurate",
		});
	}

	// Cap risk score at 1.0
	riskScore = Math.min(riskScore, 1.0);

	// Determine risk level
	let riskLevel: "low" | "moderate" | "high" | "critical";
	if (riskScore >= 0.75) riskLevel = "critical";
	else if (riskScore >= 0.5) riskLevel = "high";
	else if (riskScore >= 0.3) riskLevel = "moderate";
	else riskLevel = "low";

	// Generate recommended actions
	const recommendedActions: string[] = [];
	if (riskLevel === "critical" || riskLevel === "high") {
		recommendedActions.push("Contact your healthcare provider");
		recommendedActions.push("Stay well hydrated");
		recommendedActions.push("Rest and avoid strenuous activity");
	}
	if (contributingFactors.some((f) => f.factor === "poor_sleep")) {
		recommendedActions.push("Prioritize sleep and rest");
	}
	if (contributingFactors.some((f) => f.factor === "chest_pain")) {
		recommendedActions.push(
			"Seek immediate medical attention if chest pain worsens",
		);
	}
	if (recommendedActions.length === 0) {
		recommendedActions.push("Continue monitoring symptoms daily");
		recommendedActions.push("Stay hydrated");
	}

	// Generate explanation
	const explanation =
		contributingFactors.length > 0
			? `Based on your recent symptom logs, your VOC risk is ${riskLevel}. Key factors: ${contributingFactors.map((f) => f.description).join("; ")}.`
			: "Unable to generate prediction - please log symptoms regularly for accurate predictions.";

	// Save prediction to database
	const { data: prediction, error } = await supabaseAdmin
		.from("voc_predictions")
		.insert({
			patient_id: patientId,
			risk_score: riskScore,
			risk_level: riskLevel,
			confidence: symptoms.length >= 7 ? 0.7 : 0.4, // Higher confidence with more data
			contributing_factors: contributingFactors,
			explanation,
			recommended_actions: recommendedActions,
			model_version: "rule-based-v1",
			prediction_horizon_hours: 24,
		})
		.select()
		.single();

	if (error) {
		console.error("Error saving prediction:", error);
		return c.json({ error: "Failed to save prediction" }, 500);
	}

	return c.json({ prediction: transformPrediction(prediction) });
});

/**
 * GET /api/voc/patients/:patientId/predictions
 * Get prediction history for a patient
 */
app.get("/patients/:patientId/predictions", async (c) => {
	const patientId = c.req.param("patientId");
	const { page, limit } = paginationSchema.parse({
		page: c.req.query("page"),
		limit: c.req.query("limit"),
	});

	const from = (page - 1) * limit;
	const to = from + limit - 1;

	const { data, error, count } = await supabaseAdmin
		.from("voc_predictions")
		.select("*", { count: "exact" })
		.eq("patient_id", patientId)
		.order("predicted_at", { ascending: false })
		.range(from, to);

	if (error) {
		console.error("Error fetching predictions:", error);
		return c.json({ error: "Failed to fetch predictions" }, 500);
	}

	return c.json({
		predictions: (data || []).map(transformPrediction),
		total: count || 0,
		page,
		limit,
	});
});

/**
 * GET /api/voc/patients/:patientId/predictions/latest
 * Get the latest prediction for a patient
 */
app.get("/patients/:patientId/predictions/latest", async (c) => {
	const patientId = c.req.param("patientId");

	const { data, error } = await supabaseAdmin
		.from("voc_predictions")
		.select("*")
		.eq("patient_id", patientId)
		.order("predicted_at", { ascending: false })
		.limit(1)
		.single();

	if (error || !data) {
		return c.json({ prediction: null });
	}

	return c.json({ prediction: transformPrediction(data) });
});

// ============================================================================
// FEEDBACK ENDPOINTS
// ============================================================================

/**
 * POST /api/voc/patients/:patientId/feedback
 * Submit feedback on a prediction
 */
app.post(
	"/patients/:patientId/feedback",
	zValidator("json", submitFeedbackSchema),
	async (c) => {
		const patientId = c.req.param("patientId");
		const body = c.req.valid("json");

		const { data, error } = await supabaseAdmin
			.from("prediction_feedback")
			.insert({
				prediction_id: body.predictionId,
				patient_id: patientId,
				voc_occurred: body.vocOccurred,
				voc_severity: body.vocSeverity,
				voc_occurred_at: body.vocOccurredAt,
				notes: body.notes,
				feedback_source: "patient",
			})
			.select()
			.single();

		if (error) {
			console.error("Error submitting feedback:", error);
			return c.json({ error: "Failed to submit feedback" }, 500);
		}

		// If VOC occurred, update the patient's learning profile
		if (body.vocOccurred) {
			await supabaseAdmin.from("patient_learning_profiles").upsert(
				{
					patient_id: patientId,
					last_voc_date: body.vocOccurredAt || new Date().toISOString(),
					last_updated_at: new Date().toISOString(),
				},
				{ onConflict: "patient_id" },
			);
		}

		return c.json({ feedback: data }, 201);
	},
);

// ============================================================================
// PATIENT PROFILE ENDPOINTS
// ============================================================================

/**
 * GET /api/voc/patients/:patientId/profile
 * Get the patient's learning profile
 */
app.get("/patients/:patientId/profile", async (c) => {
	const patientId = c.req.param("patientId");

	const { data, error } = await supabaseAdmin
		.from("patient_learning_profiles")
		.select("*")
		.eq("patient_id", patientId)
		.single();

	if (error || !data) {
		// Return empty profile if none exists
		return c.json({
			profile: {
				patientId,
				modelConfidence: 0,
				dataPointsCount: 0,
				triggerWeights: {},
				prodromeSignals: [],
				treatmentResponses: [],
				insights: [
					"Start logging symptoms daily to build your personalized profile",
				],
			},
		});
	}

	return c.json({ profile: transformProfile(data) });
});

// ============================================================================
// DASHBOARD ENDPOINT
// ============================================================================

/**
 * GET /api/voc/patients/:patientId/dashboard
 * Get dashboard data for a patient
 */
app.get("/patients/:patientId/dashboard", async (c) => {
	const patientId = c.req.param("patientId");

	// Fetch all data in parallel
	const [symptomsResult, predictionResult, profileResult, alertsResult] =
		await Promise.all([
			// Recent symptoms (last 14 days)
			supabaseAdmin
				.from("symptom_logs")
				.select("*")
				.eq("patient_id", patientId)
				.gte(
					"recorded_at",
					new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
				)
				.order("recorded_at", { ascending: false })
				.limit(50),

			// Latest prediction
			supabaseAdmin
				.from("voc_predictions")
				.select("*")
				.eq("patient_id", patientId)
				.order("predicted_at", { ascending: false })
				.limit(1)
				.single(),

			// Patient profile
			supabaseAdmin
				.from("patient_learning_profiles")
				.select("*")
				.eq("patient_id", patientId)
				.single(),

			// Recent alerts (last 7 days)
			supabaseAdmin
				.from("voc_alerts")
				.select("*")
				.eq("patient_id", patientId)
				.gte(
					"created_at",
					new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
				)
				.order("created_at", { ascending: false })
				.limit(10),
		]);

	return c.json({
		currentRisk: predictionResult.data
			? transformPrediction(predictionResult.data)
			: null,
		recentSymptoms: (symptomsResult.data || []).map(transformSymptomLog),
		profile: profileResult.data ? transformProfile(profileResult.data) : null,
		recentAlerts: (alertsResult.data || []).map(transformAlert),
	});
});

// ============================================================================
// TRANSFORM HELPERS
// ============================================================================

interface SymptomLogRow {
	id: string;
	patient_id: string;
	recorded_at: string;
	pain_score: number | null;
	fatigue_score: number | null;
	mood_score: number | null;
	hydration_level: string | null;
	sleep_quality: number | null;
	sleep_hours: number | null;
	has_fever: boolean | null;
	has_headache: boolean | null;
	has_shortness_of_breath: boolean | null;
	has_chest_pain: boolean | null;
	has_joint_pain: boolean | null;
	has_abdominal_pain: boolean | null;
	notes: string | null;
	source: string;
	created_at: string;
	updated_at: string;
}

function transformSymptomLog(row: SymptomLogRow) {
	return {
		id: row.id,
		patientId: row.patient_id,
		recordedAt: row.recorded_at,
		painScore: row.pain_score,
		fatigueScore: row.fatigue_score,
		moodScore: row.mood_score,
		hydrationLevel: row.hydration_level,
		sleepQuality: row.sleep_quality,
		sleepHours: row.sleep_hours,
		hasFever: row.has_fever,
		hasHeadache: row.has_headache,
		hasShortnessOfBreath: row.has_shortness_of_breath,
		hasChestPain: row.has_chest_pain,
		hasJointPain: row.has_joint_pain,
		hasAbdominalPain: row.has_abdominal_pain,
		notes: row.notes,
		source: row.source,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

interface WearableReadingRow {
	id: string;
	patient_id: string;
	recorded_at: string;
	device_type: string;
	device_id: string | null;
	heart_rate_resting: number | null;
	heart_rate_avg: number | null;
	heart_rate_max: number | null;
	heart_rate_variability: number | null;
	steps: number | null;
	active_minutes: number | null;
	calories_burned: number | null;
	distance_meters: number | null;
	sleep_duration_minutes: number | null;
	sleep_deep_minutes: number | null;
	sleep_rem_minutes: number | null;
	sleep_light_minutes: number | null;
	sleep_awake_minutes: number | null;
	spo2_avg: number | null;
	spo2_min: number | null;
	raw_data: Record<string, unknown> | null;
	created_at: string;
}

function transformWearableReading(row: WearableReadingRow) {
	return {
		id: row.id,
		patientId: row.patient_id,
		recordedAt: row.recorded_at,
		deviceType: row.device_type,
		deviceId: row.device_id,
		heartRateResting: row.heart_rate_resting,
		heartRateAvg: row.heart_rate_avg,
		heartRateMax: row.heart_rate_max,
		heartRateVariability: row.heart_rate_variability,
		steps: row.steps,
		activeMinutes: row.active_minutes,
		caloriesBurned: row.calories_burned,
		distanceMeters: row.distance_meters,
		sleepDurationMinutes: row.sleep_duration_minutes,
		sleepDeepMinutes: row.sleep_deep_minutes,
		sleepRemMinutes: row.sleep_rem_minutes,
		sleepLightMinutes: row.sleep_light_minutes,
		sleepAwakeMinutes: row.sleep_awake_minutes,
		spo2Avg: row.spo2_avg,
		spo2Min: row.spo2_min,
		rawData: row.raw_data,
		createdAt: row.created_at,
	};
}

interface PredictionRow {
	id: string;
	patient_id: string;
	predicted_at: string;
	risk_score: number;
	risk_level: string;
	confidence: number | null;
	contributing_factors: Array<{
		factor: string;
		weight: number;
		description?: string;
	}>;
	explanation: string | null;
	recommended_actions: string[];
	model_version: string | null;
	features_used: Record<string, unknown> | null;
	prediction_horizon_hours: number;
	created_at: string;
}

function transformPrediction(row: PredictionRow) {
	return {
		id: row.id,
		patientId: row.patient_id,
		predictedAt: row.predicted_at,
		riskScore: row.risk_score,
		riskLevel: row.risk_level,
		confidence: row.confidence,
		contributingFactors: row.contributing_factors,
		explanation: row.explanation,
		recommendedActions: row.recommended_actions,
		modelVersion: row.model_version,
		featuresUsed: row.features_used,
		predictionHorizonHours: row.prediction_horizon_hours,
		createdAt: row.created_at,
	};
}

interface ProfileRow {
	id: string;
	patient_id: string;
	baseline_voe_frequency: number | null;
	baseline_pain_score: number | null;
	baseline_sleep_hours: number | null;
	baseline_heart_rate: number | null;
	baseline_hrv: number | null;
	baseline_steps: number | null;
	trigger_weights: Record<string, number>;
	prodrome_signals: Array<{
		signal: string;
		hoursBeforeVOC: number;
		weight: number;
	}>;
	treatment_responses: Array<{
		treatment: string;
		improvement: number;
		confidence: number;
	}>;
	model_confidence: number;
	data_points_count: number;
	last_voc_date: string | null;
	profile_version: number;
	last_updated_at: string;
	created_at: string;
}

function transformProfile(row: ProfileRow) {
	return {
		id: row.id,
		patientId: row.patient_id,
		baselineVoeFrequency: row.baseline_voe_frequency,
		baselinePainScore: row.baseline_pain_score,
		baselineSleepHours: row.baseline_sleep_hours,
		baselineHeartRate: row.baseline_heart_rate,
		baselineHrv: row.baseline_hrv,
		baselineSteps: row.baseline_steps,
		triggerWeights: row.trigger_weights,
		prodromeSignals: row.prodrome_signals,
		treatmentResponses: row.treatment_responses,
		modelConfidence: row.model_confidence,
		dataPointsCount: row.data_points_count,
		lastVocDate: row.last_voc_date,
		profileVersion: row.profile_version,
		lastUpdatedAt: row.last_updated_at,
		createdAt: row.created_at,
	};
}

interface AlertRow {
	id: string;
	patient_id: string;
	prediction_id: string | null;
	alert_type: string;
	alert_level: string;
	title: string;
	message: string;
	delivery_channels: string[];
	delivered_at: string | null;
	acknowledged_at: string | null;
	dismissed_at: string | null;
	cooldown_until: string | null;
	created_at: string;
}

function transformAlert(row: AlertRow) {
	return {
		id: row.id,
		patientId: row.patient_id,
		predictionId: row.prediction_id,
		alertType: row.alert_type,
		alertLevel: row.alert_level,
		title: row.title,
		message: row.message,
		deliveryChannels: row.delivery_channels,
		deliveredAt: row.delivered_at,
		acknowledgedAt: row.acknowledged_at,
		dismissedAt: row.dismissed_at,
		cooldownUntil: row.cooldown_until,
		createdAt: row.created_at,
	};
}

export default app;
