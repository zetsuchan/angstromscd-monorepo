import { test, expect, type Page } from "@playwright/test";

const API_URL = "http://localhost:3001";

// Generate unique email for each test run to avoid conflicts
// Use a more realistic domain since Supabase may reject example.com
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
			const email = generateTestEmail();

			const response = await request.post(`${API_URL}/auth/signup`, {
				data: {
					email,
					password: TEST_PASSWORD,
				},
			});

			const data = await response.json();

			// Log actual response for debugging
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

		test("authenticated request to protected endpoint succeeds", async ({ request }) => {
			// Create user and get token
			const email = generateTestEmail();
			const signupRes = await request.post(`${API_URL}/auth/signup`, {
				data: { email, password: TEST_PASSWORD },
			});
			const signupData = await signupRes.json();
			const token = signupData.data.session?.token;

			// Skip if no token (email confirmation might be required)
			if (!token) {
				test.skip();
				return;
			}

			// Access protected endpoint with token
			const response = await request.get(`${API_URL}/api/conversations`, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			expect(response.ok()).toBe(true);
			const data = await response.json();
			expect(data.success).toBe(true);
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
