import { expect, test } from "@playwright/test";
import { API_URL, isSupabaseAvailable } from "./test-utils";

// Demo patient ID used for testing (matches database seed)
const DEMO_PATIENT_ID = "00000000-0000-0000-0000-000000000001";

test.describe("VOC Prediction System", () => {
	test.describe("API Endpoints", () => {
		test("VOC endpoints are publicly accessible (no auth required)", async ({
			request,
		}) => {
			// VOC routes are public for demo purposes
			const response = await request.get(
				`${API_URL}/api/voc/patients/${DEMO_PATIENT_ID}/dashboard`,
			);

			// Should not return 401 Unauthorized
			expect(response.status()).not.toBe(401);
		});

		test("can log symptoms for a patient", async ({ request }) => {
			const supabaseAvailable = await isSupabaseAvailable(request);
			if (!supabaseAvailable) {
				console.log("Skipping test - Supabase not available");
				test.skip();
				return;
			}

			const response = await request.post(
				`${API_URL}/api/voc/patients/${DEMO_PATIENT_ID}/symptoms`,
				{
					data: {
						painScore: 5,
						fatigueScore: 6,
						moodScore: 7,
						sleepQuality: 6,
						sleepHours: 7.5,
						hydrationLevel: "good",
						hasFever: false,
						hasHeadache: true,
						hasShortnessOfBreath: false,
						hasChestPain: false,
						hasJointPain: true,
						hasAbdominalPain: false,
						notes: "E2E test symptom log",
						source: "manual",
					},
				},
			);

			if (!response.ok()) {
				const errorData = await response.json();
				console.log("Symptom log failed:", JSON.stringify(errorData, null, 2));
			}

			expect(response.status()).toBe(201);

			const data = await response.json();
			expect(data.log).toBeDefined();
			expect(data.log.painScore).toBe(5);
			expect(data.log.patientId).toBe(DEMO_PATIENT_ID);
		});

		test("can get symptom history for a patient", async ({ request }) => {
			const supabaseAvailable = await isSupabaseAvailable(request);
			if (!supabaseAvailable) {
				console.log("Skipping test - Supabase not available");
				test.skip();
				return;
			}

			const response = await request.get(
				`${API_URL}/api/voc/patients/${DEMO_PATIENT_ID}/symptoms`,
			);

			expect(response.ok()).toBe(true);

			const data = await response.json();
			expect(data.logs).toBeDefined();
			expect(Array.isArray(data.logs)).toBe(true);
			expect(data.pagination).toBeDefined();
		});

		test("can generate VOC prediction", async ({ request }) => {
			const supabaseAvailable = await isSupabaseAvailable(request);
			if (!supabaseAvailable) {
				console.log("Skipping test - Supabase not available");
				test.skip();
				return;
			}

			// First log some symptoms to have data for prediction
			await request.post(
				`${API_URL}/api/voc/patients/${DEMO_PATIENT_ID}/symptoms`,
				{
					data: {
						painScore: 7,
						fatigueScore: 8,
						sleepQuality: 4,
						hasFever: true,
						source: "manual",
					},
				},
			);

			// Generate prediction
			const response = await request.post(
				`${API_URL}/api/voc/patients/${DEMO_PATIENT_ID}/predictions/generate`,
			);

			if (!response.ok()) {
				const errorData = await response.json();
				console.log(
					"Prediction generation failed:",
					JSON.stringify(errorData, null, 2),
				);
			}

			expect(response.ok()).toBe(true);

			const data = await response.json();
			expect(data.prediction).toBeDefined();
			expect(data.prediction.riskScore).toBeGreaterThanOrEqual(0);
			expect(data.prediction.riskScore).toBeLessThanOrEqual(1);
			expect(["low", "moderate", "high", "critical"]).toContain(
				data.prediction.riskLevel,
			);
			expect(data.prediction.contributingFactors).toBeDefined();
			expect(data.prediction.recommendedActions).toBeDefined();
		});

		test("can get prediction history", async ({ request }) => {
			const supabaseAvailable = await isSupabaseAvailable(request);
			if (!supabaseAvailable) {
				console.log("Skipping test - Supabase not available");
				test.skip();
				return;
			}

			const response = await request.get(
				`${API_URL}/api/voc/patients/${DEMO_PATIENT_ID}/predictions`,
			);

			expect(response.ok()).toBe(true);

			const data = await response.json();
			expect(data.predictions).toBeDefined();
			expect(Array.isArray(data.predictions)).toBe(true);
		});

		test("can get patient learning profile", async ({ request }) => {
			const supabaseAvailable = await isSupabaseAvailable(request);
			if (!supabaseAvailable) {
				console.log("Skipping test - Supabase not available");
				test.skip();
				return;
			}

			const response = await request.get(
				`${API_URL}/api/voc/patients/${DEMO_PATIENT_ID}/profile`,
			);

			expect(response.ok()).toBe(true);

			const data = await response.json();
			expect(data.profile).toBeDefined();
			expect(data.profile.patientId).toBe(DEMO_PATIENT_ID);
			expect(data.profile.modelConfidence).toBeDefined();
			expect(data.profile.dataPointsCount).toBeDefined();
		});

		test("can get dashboard data", async ({ request }) => {
			const supabaseAvailable = await isSupabaseAvailable(request);
			if (!supabaseAvailable) {
				console.log("Skipping test - Supabase not available");
				test.skip();
				return;
			}

			const response = await request.get(
				`${API_URL}/api/voc/patients/${DEMO_PATIENT_ID}/dashboard`,
			);

			expect(response.ok()).toBe(true);

			const data = await response.json();
			expect(data.patientId).toBe(DEMO_PATIENT_ID);
			expect(data.latestPrediction).toBeDefined();
			expect(data.recentSymptoms).toBeDefined();
			expect(data.learningProfile).toBeDefined();
		});

		test("can submit prediction feedback", async ({ request }) => {
			const supabaseAvailable = await isSupabaseAvailable(request);
			if (!supabaseAvailable) {
				console.log("Skipping test - Supabase not available");
				test.skip();
				return;
			}

			// First generate a prediction to get an ID
			const predResponse = await request.post(
				`${API_URL}/api/voc/patients/${DEMO_PATIENT_ID}/predictions/generate`,
			);

			if (!predResponse.ok()) {
				console.log("Skipping feedback test - no prediction available");
				test.skip();
				return;
			}

			const predData = await predResponse.json();
			const predictionId = predData.prediction?.id;

			if (!predictionId) {
				console.log("Skipping feedback test - no prediction ID");
				test.skip();
				return;
			}

			// Submit feedback
			const response = await request.post(
				`${API_URL}/api/voc/patients/${DEMO_PATIENT_ID}/feedback`,
				{
					data: {
						predictionId,
						vocOccurred: false,
						notes: "E2E test feedback - no VOC occurred",
					},
				},
			);

			expect(response.ok()).toBe(true);

			const data = await response.json();
			expect(data.feedback).toBeDefined();
			expect(data.feedback.vocOccurred).toBe(false);
		});

		test("validates symptom score ranges", async ({ request }) => {
			const response = await request.post(
				`${API_URL}/api/voc/patients/${DEMO_PATIENT_ID}/symptoms`,
				{
					data: {
						painScore: 15, // Invalid: > 10
						fatigueScore: -1, // Invalid: < 0
					},
				},
			);

			// Should fail validation
			expect(response.ok()).toBe(false);
			expect(response.status()).toBe(400);
		});

		test("validates hydration level enum", async ({ request }) => {
			const response = await request.post(
				`${API_URL}/api/voc/patients/${DEMO_PATIENT_ID}/symptoms`,
				{
					data: {
						hydrationLevel: "invalid_level", // Invalid enum value
					},
				},
			);

			// Should fail validation
			expect(response.ok()).toBe(false);
			expect(response.status()).toBe(400);
		});
	});

	test.describe("Frontend UI", () => {
		test("VOC Monitor tab is visible and default", async ({ page }) => {
			await page.goto("http://localhost:5173");

			// VOC Monitor should be visible and active by default
			const vocButton = page.locator('button:has-text("VOC Monitor")');
			await expect(vocButton).toBeVisible();

			// Should have active styling (purple background)
			await expect(vocButton).toHaveClass(/bg-purple-500/);
		});

		test("can switch between VOC Monitor and Research Chat", async ({
			page,
		}) => {
			await page.goto("http://localhost:5173");

			// Click Research Chat
			await page.click('button:has-text("Research Chat")');

			// Research Chat button should now be active
			const chatButton = page.locator('button:has-text("Research Chat")');
			await expect(chatButton).toHaveClass(/bg-blue-500/);

			// Click back to VOC Monitor
			await page.click('button:has-text("VOC Monitor")');

			const vocButton = page.locator('button:has-text("VOC Monitor")');
			await expect(vocButton).toHaveClass(/bg-purple-500/);
		});

		test("symptom logger form is visible", async ({ page }) => {
			await page.goto("http://localhost:5173");

			// VOC Dashboard is shown by default - click "Log Symptoms" to open the form
			const logSymptomsButton = page.locator('button:has-text("Log Symptoms")');
			await expect(logSymptomsButton.first()).toBeVisible({ timeout: 10000 });
			await logSymptomsButton.first().click();

			// Should see symptom logging form
			await expect(page.locator('text="Log Today\'s Symptoms"')).toBeVisible({
				timeout: 5000,
			});

			// Should see core metric sliders
			await expect(page.locator('text="Pain Level"')).toBeVisible();
			await expect(page.locator('text="Fatigue"')).toBeVisible();
			await expect(page.locator('text="Mood"')).toBeVisible();

			// Should see symptom checkboxes
			await expect(page.locator('text="Fever"')).toBeVisible();
			await expect(page.locator('text="Headache"')).toBeVisible();
		});

		test("risk gauge displays prediction", async ({ page }) => {
			await page.goto("http://localhost:5173");

			// Should see the VOC Risk Monitor header
			await expect(page.locator('text="VOC Risk Monitor"')).toBeVisible({
				timeout: 10000,
			});

			// Should see one of the risk levels (lowercase in the component)
			const riskLevels = ["low", "moderate", "high", "critical"];
			const riskLocator = page.locator(
				riskLevels.map((r) => `text="${r}"`).join(", "),
			);
			await expect(riskLocator.first()).toBeVisible({ timeout: 10000 });
		});

		test("warning banner appears for critical symptoms", async ({ page }) => {
			await page.goto("http://localhost:5173");

			// First open the symptom logger
			const logSymptomsButton = page.locator('button:has-text("Log Symptoms")');
			await expect(logSymptomsButton.first()).toBeVisible({ timeout: 10000 });
			await logSymptomsButton.first().click();

			// Wait for the form to appear
			await expect(page.locator('text="Log Today\'s Symptoms"')).toBeVisible({
				timeout: 5000,
			});

			// Check the Fever checkbox (which has warning=true)
			await page.click('label:has-text("Fever")');

			// Warning banner should appear
			await expect(
				page.locator('text="symptoms that may require medical attention"'),
			).toBeVisible();
		});
	});
});
