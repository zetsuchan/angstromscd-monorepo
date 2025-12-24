import { expect, test } from "@playwright/test";
import { API_URL, createAuthenticatedUser, isSupabaseAvailable } from "./test-utils";

// Generate unique email for each test run
const generateTestEmail = () => `testuser${Date.now()}@testmail.dev`;
const TEST_PASSWORD = "TestPassword123!";

test.describe("Authentication Flow", () => {
	test.describe("API Auth Endpoints", () => {
		test("health endpoint is accessible without auth", async ({ request }) => {
			const response = await request.get(`${API_URL}/health`);
			expect(response.ok()).toBe(true);

			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.status).toBe("ok");
		});

		test("protected endpoint returns 401 without auth", async ({ request }) => {
			const response = await request.get(`${API_URL}/api/conversations`);
			expect(response.status()).toBe(401);

			const data = await response.json();
			expect(data.success).toBe(false);
			expect(data.error.code).toBe("UNAUTHORIZED");
		});

		test("signup creates new user", async ({ request }) => {
			const supabaseAvailable = await isSupabaseAvailable(request);
			if (!supabaseAvailable) {
				console.log("Skipping test - Supabase not available");
				test.skip();
				return;
			}

			const email = generateTestEmail();

			const response = await request.post(`${API_URL}/auth/signup`, {
				data: {
					email,
					password: TEST_PASSWORD,
				},
			});

			const data = await response.json();

			if (!response.ok()) {
				console.log("Signup failed:", JSON.stringify(data, null, 2));
			}

			expect(response.ok()).toBe(true);
			expect(data.success).toBe(true);
			expect(data.data.user.email).toBe(email);
			expect(data.data.user.role).toBe("viewer");
		});

		test("signup rejects invalid email", async ({ request }) => {
			const response = await request.post(`${API_URL}/auth/signup`, {
				data: {
					email: "not-an-email",
					password: TEST_PASSWORD,
				},
			});

			expect(response.ok()).toBe(false);
			const data = await response.json();
			expect(data.success).toBe(false);
		});

		test("signup rejects short password", async ({ request }) => {
			const response = await request.post(`${API_URL}/auth/signup`, {
				data: {
					email: generateTestEmail(),
					password: "short",
				},
			});

			expect(response.ok()).toBe(false);
			const data = await response.json();
			expect(data.success).toBe(false);
		});

		test("login with valid credentials returns token", async ({ request }) => {
			const supabaseAvailable = await isSupabaseAvailable(request);
			if (!supabaseAvailable) {
				console.log("Skipping test - Supabase not available");
				test.skip();
				return;
			}

			// First create a user
			const email = generateTestEmail();
			await request.post(`${API_URL}/auth/signup`, {
				data: { email, password: TEST_PASSWORD },
			});

			// Then login
			const response = await request.post(`${API_URL}/auth/login`, {
				data: { email, password: TEST_PASSWORD },
			});

			expect(response.ok()).toBe(true);

			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.session?.token).toBeDefined();
			expect(data.data.user.email).toBe(email);
		});

		test("login with wrong password fails", async ({ request }) => {
			const supabaseAvailable = await isSupabaseAvailable(request);
			if (!supabaseAvailable) {
				console.log("Skipping test - Supabase not available");
				test.skip();
				return;
			}

			const email = generateTestEmail();
			await request.post(`${API_URL}/auth/signup`, {
				data: { email, password: TEST_PASSWORD },
			});

			const response = await request.post(`${API_URL}/auth/login`, {
				data: { email, password: "WrongPassword123!" },
			});

			expect(response.ok()).toBe(false);
			const data = await response.json();
			expect(data.success).toBe(false);
		});

		test("authenticated request to protected endpoint succeeds", async ({
			request,
		}) => {
			const supabaseAvailable = await isSupabaseAvailable(request);
			if (!supabaseAvailable) {
				console.log("Skipping test - Supabase not available");
				test.skip();
				return;
			}

			// Create user and get token
			try {
				const { token } = await createAuthenticatedUser(request);

				// Access protected endpoint with token
				const response = await request.get(`${API_URL}/api/conversations`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				expect(response.ok()).toBe(true);
				const data = await response.json();
				expect(data.success).toBe(true);
			} catch (error: any) {
				if (error.message === "SUPABASE_UNAVAILABLE") {
					test.skip();
					return;
				}
				throw error;
			}
		});

		test("invalid token is rejected", async ({ request }) => {
			const response = await request.get(`${API_URL}/api/conversations`, {
				headers: {
					Authorization: "Bearer invalid-token-here",
				},
			});

			expect(response.status()).toBe(401);
		});
	});
});
