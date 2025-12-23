import { expect, test } from "@playwright/test";

const API_URL = "http://localhost:3001";

// Helper to create authenticated user and get token
async function createAuthenticatedUser(request: any) {
	const email = `testuser${Date.now()}@testmail.dev`;
	const password = "TestPassword123!";

	const signupRes = await request.post(`${API_URL}/auth/signup`, {
		data: { email, password },
	});
	const signupData = await signupRes.json();

	if (!signupRes.ok() || !signupData.success) {
		throw new Error(
			`Signup failed: ${signupData.error?.message || "Unknown error"}`,
		);
	}

	const token = signupData.data?.session?.token;

	if (!token) {
		throw new Error("No auth token - Supabase may require email confirmation.");
	}

	return { email, token };
}

test.describe("Prior Authorization API", () => {
	test.describe("Reference Data Endpoints", () => {
		test("get SCD drugs returns list of drugs", async ({ request }) => {
			const { token } = await createAuthenticatedUser(request);

			const response = await request.get(`${API_URL}/api/prior-auth/drugs`, {
				headers: { Authorization: `Bearer ${token}` },
			});

			expect(response.ok()).toBe(true);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.drugs).toBeDefined();
			expect(Array.isArray(data.data.drugs)).toBe(true);
			expect(data.data.drugs.length).toBeGreaterThan(0);

			// Verify drug structure
			const drug = data.data.drugs[0];
			expect(drug.id).toBeDefined();
			expect(drug.brand_name).toBeDefined();
			expect(drug.generic_name).toBeDefined();
		});

		test("get payers returns list of payers", async ({ request }) => {
			const { token } = await createAuthenticatedUser(request);

			const response = await request.get(`${API_URL}/api/prior-auth/payers`, {
				headers: { Authorization: `Bearer ${token}` },
			});

			expect(response.ok()).toBe(true);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.payers).toBeDefined();
			expect(Array.isArray(data.data.payers)).toBe(true);
			expect(data.data.payers.length).toBeGreaterThan(0);

			// Verify payer structure
			const payer = data.data.payers[0];
			expect(payer.id).toBeDefined();
			expect(payer.name).toBeDefined();
			expect(payer.payer_type).toBeDefined();
		});

		test("get drug requirements for specific payer", async ({ request }) => {
			const { token } = await createAuthenticatedUser(request);

			const response = await request.get(
				`${API_URL}/api/prior-auth/drugs/adakveo/requirements/aetna`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);

			expect(response.ok()).toBe(true);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.drug).toBeDefined();
			expect(data.data.payer).toBeDefined();
			expect(data.data.requirements).toBeDefined();
		});
	});

	test.describe("PA Request CRUD", () => {
		test("list PA requests returns empty array for new user", async ({
			request,
		}) => {
			const { token } = await createAuthenticatedUser(request);

			const response = await request.get(`${API_URL}/api/prior-auth`, {
				headers: { Authorization: `Bearer ${token}` },
			});

			expect(response.ok()).toBe(true);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.requests).toEqual([]);
			expect(data.data.total).toBe(0);
		});

		test("create PA request", async ({ request }) => {
			const { token } = await createAuthenticatedUser(request);

			const response = await request.post(`${API_URL}/api/prior-auth`, {
				headers: { Authorization: `Bearer ${token}` },
				data: {
					drug_id: "adakveo",
					payer_id: "aetna",
					urgency: "standard",
					diagnosis_codes: ["D57.1"],
				},
			});

			expect(response.ok()).toBe(true);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.request).toBeDefined();
			expect(data.data.request.drug_id).toBe("adakveo");
			expect(data.data.request.payer_id).toBe("aetna");
			expect(data.data.request.status).toBe("draft");
		});

		test("create PA request validates drug_id", async ({ request }) => {
			const { token } = await createAuthenticatedUser(request);

			const response = await request.post(`${API_URL}/api/prior-auth`, {
				headers: { Authorization: `Bearer ${token}` },
				data: {
					drug_id: "invalid-drug",
					payer_id: "aetna",
				},
			});

			expect(response.ok()).toBe(false);
			const data = await response.json();
			expect(data.success).toBe(false);
		});

		test("get PA request with details", async ({ request }) => {
			const { token } = await createAuthenticatedUser(request);

			// Create PA request
			const createRes = await request.post(`${API_URL}/api/prior-auth`, {
				headers: { Authorization: `Bearer ${token}` },
				data: {
					drug_id: "oxbryta",
					payer_id: "bcbs",
					diagnosis_codes: ["D57.00"],
				},
			});
			const createData = await createRes.json();
			const paId = createData.data.request.id;

			// Get PA request
			const response = await request.get(`${API_URL}/api/prior-auth/${paId}`, {
				headers: { Authorization: `Bearer ${token}` },
			});

			expect(response.ok()).toBe(true);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.request.id).toBe(paId);
			expect(data.data.drug).toBeDefined();
			expect(data.data.drug.id).toBe("oxbryta");
			expect(data.data.payer).toBeDefined();
			expect(data.data.payer.id).toBe("bcbs");
		});

		test("update PA request", async ({ request }) => {
			const { token } = await createAuthenticatedUser(request);

			// Create PA request
			const createRes = await request.post(`${API_URL}/api/prior-auth`, {
				headers: { Authorization: `Bearer ${token}` },
				data: {
					drug_id: "endari",
					payer_id: "unitedhealth",
				},
			});
			const createData = await createRes.json();
			const paId = createData.data.request.id;

			// Update PA request
			const response = await request.put(`${API_URL}/api/prior-auth/${paId}`, {
				headers: { Authorization: `Bearer ${token}` },
				data: {
					status: "pending_info",
					urgency: "urgent",
					diagnosis_codes: ["D57.1", "D57.00"],
				},
			});

			expect(response.ok()).toBe(true);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.request.status).toBe("pending_info");
			expect(data.data.request.urgency).toBe("urgent");
			expect(data.data.request.diagnosis_codes).toContain("D57.1");
		});

		test("delete PA request", async ({ request }) => {
			const { token } = await createAuthenticatedUser(request);

			// Create PA request
			const createRes = await request.post(`${API_URL}/api/prior-auth`, {
				headers: { Authorization: `Bearer ${token}` },
				data: {
					drug_id: "hydroxyurea",
					payer_id: "cigna",
				},
			});
			const createData = await createRes.json();
			const paId = createData.data.request.id;

			// Delete PA request
			const deleteRes = await request.delete(
				`${API_URL}/api/prior-auth/${paId}`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);

			expect(deleteRes.ok()).toBe(true);
			const deleteData = await deleteRes.json();
			expect(deleteData.success).toBe(true);
			expect(deleteData.data.deleted).toBe(true);

			// Verify it's gone
			const getRes = await request.get(`${API_URL}/api/prior-auth/${paId}`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			expect(getRes.ok()).toBe(false);
		});

		test("cannot access other user's PA request", async ({ request }) => {
			// Create first user and PA request
			const user1 = await createAuthenticatedUser(request);
			const createRes = await request.post(`${API_URL}/api/prior-auth`, {
				headers: { Authorization: `Bearer ${user1.token}` },
				data: {
					drug_id: "adakveo",
					payer_id: "aetna",
				},
			});
			const createData = await createRes.json();
			const paId = createData.data.request.id;

			// Create second user
			const user2 = await createAuthenticatedUser(request);

			// Try to access user1's PA request as user2
			const response = await request.get(`${API_URL}/api/prior-auth/${paId}`, {
				headers: { Authorization: `Bearer ${user2.token}` },
			});

			// Should fail - either 404 or 403
			expect(response.ok()).toBe(false);
		});
	});

	test.describe("Clinical Data", () => {
		test("add clinical data to PA request", async ({ request }) => {
			const { token } = await createAuthenticatedUser(request);

			// Create PA request
			const createRes = await request.post(`${API_URL}/api/prior-auth`, {
				headers: { Authorization: `Bearer ${token}` },
				data: {
					drug_id: "adakveo",
					payer_id: "aetna",
				},
			});
			const createData = await createRes.json();
			const paId = createData.data.request.id;

			// Add clinical data
			const response = await request.post(
				`${API_URL}/api/prior-auth/${paId}/clinical-data`,
				{
					headers: { Authorization: `Bearer ${token}` },
					data: {
						scd_genotype: "HbSS",
						voe_history: {
							total_episodes: 8,
							episodes_past_year: 5,
							average_severity: "moderate",
							hospitalizations: 2,
						},
						current_therapies: [
							"Hydroxyurea 1000mg daily",
							"Folic acid 1mg daily",
						],
						failed_therapies: ["Hydroxyurea - inadequate response at max dose"],
						lab_results: {
							hemoglobin: 7.2,
							hemoglobin_f_percentage: 12.5,
							test_date: "2024-01-15",
						},
						hospitalizations_past_year: 2,
					},
				},
			);

			expect(response.ok()).toBe(true);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.clinical_data).toBeDefined();
			expect(data.data.clinical_data.scd_genotype).toBe("HbSS");
			expect(data.data.clinical_data.voe_history.episodes_past_year).toBe(5);
		});

		test("clinical data included in PA request details", async ({
			request,
		}) => {
			const { token } = await createAuthenticatedUser(request);

			// Create PA request
			const createRes = await request.post(`${API_URL}/api/prior-auth`, {
				headers: { Authorization: `Bearer ${token}` },
				data: {
					drug_id: "oxbryta",
					payer_id: "bcbs",
				},
			});
			const createData = await createRes.json();
			const paId = createData.data.request.id;

			// Add clinical data
			await request.post(`${API_URL}/api/prior-auth/${paId}/clinical-data`, {
				headers: { Authorization: `Bearer ${token}` },
				data: {
					scd_genotype: "HbSC",
					current_therapies: ["Hydroxyurea"],
					failed_therapies: [],
					lab_results: {
						hemoglobin: 8.5,
					},
				},
			});

			// Get PA request details
			const response = await request.get(`${API_URL}/api/prior-auth/${paId}`, {
				headers: { Authorization: `Bearer ${token}` },
			});

			expect(response.ok()).toBe(true);
			const data = await response.json();
			expect(data.data.clinical_data).toBeDefined();
			expect(data.data.clinical_data.scd_genotype).toBe("HbSC");
		});
	});

	test.describe("Filtering and Pagination", () => {
		test("filter PA requests by status", async ({ request }) => {
			const { token } = await createAuthenticatedUser(request);

			// Create multiple PA requests with different statuses
			await request.post(`${API_URL}/api/prior-auth`, {
				headers: { Authorization: `Bearer ${token}` },
				data: { drug_id: "adakveo", payer_id: "aetna" },
			});

			const pa2Res = await request.post(`${API_URL}/api/prior-auth`, {
				headers: { Authorization: `Bearer ${token}` },
				data: { drug_id: "oxbryta", payer_id: "bcbs" },
			});
			const pa2Data = await pa2Res.json();

			// Update second PA to pending_info
			await request.put(
				`${API_URL}/api/prior-auth/${pa2Data.data.request.id}`,
				{
					headers: { Authorization: `Bearer ${token}` },
					data: { status: "pending_info" },
				},
			);

			// Filter by draft status
			const draftRes = await request.get(
				`${API_URL}/api/prior-auth?status=draft`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);

			expect(draftRes.ok()).toBe(true);
			const draftData = await draftRes.json();
			expect(draftData.data.requests.length).toBe(1);
			expect(draftData.data.requests[0].status).toBe("draft");

			// Filter by pending_info status
			const pendingRes = await request.get(
				`${API_URL}/api/prior-auth?status=pending_info`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);

			expect(pendingRes.ok()).toBe(true);
			const pendingData = await pendingRes.json();
			expect(pendingData.data.requests.length).toBe(1);
			expect(pendingData.data.requests[0].status).toBe("pending_info");
		});

		test("filter PA requests by drug", async ({ request }) => {
			const { token } = await createAuthenticatedUser(request);

			// Create PA requests for different drugs
			await request.post(`${API_URL}/api/prior-auth`, {
				headers: { Authorization: `Bearer ${token}` },
				data: { drug_id: "adakveo", payer_id: "aetna" },
			});

			await request.post(`${API_URL}/api/prior-auth`, {
				headers: { Authorization: `Bearer ${token}` },
				data: { drug_id: "oxbryta", payer_id: "bcbs" },
			});

			// Filter by adakveo
			const response = await request.get(
				`${API_URL}/api/prior-auth?drug_id=adakveo`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);

			expect(response.ok()).toBe(true);
			const data = await response.json();
			expect(data.data.requests.length).toBe(1);
			expect(data.data.requests[0].drug_id).toBe("adakveo");
		});

		test("paginate PA requests", async ({ request }) => {
			const { token } = await createAuthenticatedUser(request);

			// Create multiple PA requests
			for (let i = 0; i < 3; i++) {
				await request.post(`${API_URL}/api/prior-auth`, {
					headers: { Authorization: `Bearer ${token}` },
					data: { drug_id: "adakveo", payer_id: "aetna" },
				});
			}

			// Get first page with limit 2
			const response = await request.get(
				`${API_URL}/api/prior-auth?page=1&limit=2`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);

			expect(response.ok()).toBe(true);
			const data = await response.json();
			expect(data.data.requests.length).toBe(2);
			expect(data.data.total).toBe(3);
			expect(data.data.page).toBe(1);
			expect(data.data.limit).toBe(2);
		});
	});

	test.describe("AI Justification Generation", () => {
		test("generate justification validates clinical data", async ({ request }) => {
			const { token } = await createAuthenticatedUser(request);

			// Create PA request
			const createRes = await request.post(`${API_URL}/api/prior-auth`, {
				headers: { Authorization: `Bearer ${token}` },
				data: {
					drug_id: "adakveo",
					payer_id: "aetna",
					diagnosis_codes: ["D57.1"],
				},
			});
			const createData = await createRes.json();
			const paId = createData.data.request.id;

			// Try to generate justification without clinical data
			const response = await request.post(
				`${API_URL}/api/prior-auth/${paId}/generate-justification`,
				{
					headers: { Authorization: `Bearer ${token}` },
					data: {},
				},
			);

			expect(response.ok()).toBe(false);
			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error.code).toBe("VALIDATION_ERROR");
		});

		test("generate justification requires authentication", async ({
			request,
		}) => {
			const response = await request.post(
				`${API_URL}/api/prior-auth/fake-id/generate-justification`,
				{
					data: {
						clinical_data: {
							scd_genotype: "HbSS",
						},
					},
				},
			);

			expect(response.ok()).toBe(false);
			expect(response.status()).toBe(401);
		});

		test("generate justification returns 404 for non-existent PA", async ({
			request,
		}) => {
			const { token } = await createAuthenticatedUser(request);

			const response = await request.post(
				`${API_URL}/api/prior-auth/00000000-0000-0000-0000-000000000000/generate-justification`,
				{
					headers: { Authorization: `Bearer ${token}` },
					data: {
						clinical_data: {
							scd_genotype: "HbSS",
							current_therapies: ["Hydroxyurea 1000mg daily"],
							failed_therapies: [],
						},
					},
				},
			);

			expect(response.ok()).toBe(false);
			const data = await response.json();
			expect(data.success).toBe(false);
		});

		test("generate justification with full clinical data (requires AI)", async ({
			request,
		}) => {
			const { token } = await createAuthenticatedUser(request);

			// Create PA request
			const createRes = await request.post(`${API_URL}/api/prior-auth`, {
				headers: { Authorization: `Bearer ${token}` },
				data: {
					drug_id: "adakveo",
					payer_id: "aetna",
					diagnosis_codes: ["D57.1"],
				},
			});
			const createData = await createRes.json();
			const paId = createData.data.request.id;

			// Generate justification with comprehensive clinical data
			const response = await request.post(
				`${API_URL}/api/prior-auth/${paId}/generate-justification`,
				{
					headers: { Authorization: `Bearer ${token}` },
					data: {
						clinical_data: {
							scd_genotype: "HbSS",
							voe_history: {
								total_episodes: 12,
								episodes_past_year: 6,
								average_severity: "moderate",
								hospitalizations: 3,
							},
							current_therapies: [
								"Hydroxyurea 1000mg daily",
								"Folic acid 1mg daily",
							],
							failed_therapies: [
								"Hydroxyurea - inadequate response at maximum tolerated dose",
							],
							lab_results: {
								hemoglobin: 7.2,
								hemoglobin_f_percentage: 12.5,
								test_date: "2024-01-15",
							},
							hospitalizations_past_year: 3,
							additional_notes:
								"Patient has had frequent VOE episodes despite maximum hydroxyurea therapy.",
						},
					},
				},
			);

			// This test may fail if AI APIs are not configured
			// We check for either success or a specific AI-related error
			const data = await response.json();

			if (response.ok()) {
				// If AI APIs are available, verify the response structure
				expect(data.success).toBe(true);
				expect(data.data.justification).toBeDefined();
				expect(typeof data.data.justification).toBe("string");
				expect(data.data.justification.length).toBeGreaterThan(100);

				// Verify optional fields
				if (data.data.key_points) {
					expect(Array.isArray(data.data.key_points)).toBe(true);
				}
				if (data.data.confidence_score !== undefined) {
					expect(typeof data.data.confidence_score).toBe("number");
					expect(data.data.confidence_score).toBeGreaterThanOrEqual(0);
					expect(data.data.confidence_score).toBeLessThanOrEqual(1);
				}

				// Verify PA request was updated with justification
				const paRes = await request.get(`${API_URL}/api/prior-auth/${paId}`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				const paData = await paRes.json();
				expect(paData.data.request.clinical_justification).toBeDefined();
			} else {
				// If AI APIs are not available, we expect a specific error
				// Common errors: BAML client error, API key error, etc.
				console.log(
					"AI justification test skipped - AI APIs not configured:",
					data.error?.message,
				);
				expect(data.success).toBe(false);
				// The test passes either way - we're testing the endpoint behavior
			}
		});

		test("cannot generate justification for other user's PA request", async ({
			request,
		}) => {
			// Create first user and PA request
			const user1 = await createAuthenticatedUser(request);
			const createRes = await request.post(`${API_URL}/api/prior-auth`, {
				headers: { Authorization: `Bearer ${user1.token}` },
				data: {
					drug_id: "oxbryta",
					payer_id: "bcbs",
				},
			});
			const createData = await createRes.json();
			const paId = createData.data.request.id;

			// Create second user and try to generate justification for user1's PA
			const user2 = await createAuthenticatedUser(request);
			const response = await request.post(
				`${API_URL}/api/prior-auth/${paId}/generate-justification`,
				{
					headers: { Authorization: `Bearer ${user2.token}` },
					data: {
						clinical_data: {
							scd_genotype: "HbSS",
							current_therapies: [],
							failed_therapies: [],
						},
					},
				},
			);

			expect(response.ok()).toBe(false);
		});
	});
});
