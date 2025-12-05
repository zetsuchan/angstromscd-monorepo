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

	// Debug: log the full response if signup failed
	if (!signupRes.ok() || !signupData.success) {
		console.log("Signup response:", JSON.stringify(signupData, null, 2));
		throw new Error(
			`Signup failed: ${signupData.error?.message || "Unknown error"}`,
		);
	}

	const token = signupData.data?.session?.token;

	if (!token) {
		console.log(
			"Signup succeeded but no session token - email confirmation may be required",
		);
		console.log("Signup data:", JSON.stringify(signupData.data, null, 2));
		throw new Error(
			"No auth token - Supabase may require email confirmation. Disable in Supabase Auth settings for testing.",
		);
	}

	return { email, token };
}

test.describe("Conversation CRUD Operations", () => {
	test.describe("API Endpoints", () => {
		test("list conversations returns empty array for new user", async ({
			request,
		}) => {
			const { token } = await createAuthenticatedUser(request);

			const response = await request.get(`${API_URL}/api/conversations`, {
				headers: { Authorization: `Bearer ${token}` },
			});

			expect(response.ok()).toBe(true);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.conversations).toEqual([]);
			expect(data.data.total).toBe(0);
		});

		test("create conversation", async ({ request }) => {
			const { token } = await createAuthenticatedUser(request);

			const response = await request.post(`${API_URL}/api/conversations`, {
				headers: { Authorization: `Bearer ${token}` },
				data: {
					title: "Test Conversation",
				},
			});

			expect(response.ok()).toBe(true);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.conversation.title).toBe("Test Conversation");
			expect(data.data.conversation.id).toBeDefined();
		});

		test("create conversation requires title", async ({ request }) => {
			const { token } = await createAuthenticatedUser(request);

			const response = await request.post(`${API_URL}/api/conversations`, {
				headers: { Authorization: `Bearer ${token}` },
				data: {
					title: "",
				},
			});

			expect(response.ok()).toBe(false);
			const data = await response.json();
			expect(data.success).toBe(false);
		});

		test("get conversation with messages", async ({ request }) => {
			const { token } = await createAuthenticatedUser(request);

			// Create conversation
			const createRes = await request.post(`${API_URL}/api/conversations`, {
				headers: { Authorization: `Bearer ${token}` },
				data: { title: "Test Conversation" },
			});
			const createData = await createRes.json();
			const conversationId = createData.data.conversation.id;

			// Get conversation
			const response = await request.get(
				`${API_URL}/api/conversations/${conversationId}`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);

			expect(response.ok()).toBe(true);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.conversation.id).toBe(conversationId);
			expect(data.data.messages).toEqual([]);
		});

		test("add message to conversation", async ({ request }) => {
			const { token } = await createAuthenticatedUser(request);

			// Create conversation
			const createRes = await request.post(`${API_URL}/api/conversations`, {
				headers: { Authorization: `Bearer ${token}` },
				data: { title: "Test Conversation" },
			});
			const createData = await createRes.json();
			const conversationId = createData.data.conversation.id;

			// Add message
			const response = await request.post(
				`${API_URL}/api/conversations/${conversationId}/messages`,
				{
					headers: { Authorization: `Bearer ${token}` },
					data: {
						role: "user",
						content: "Hello, this is a test message",
					},
				},
			);

			expect(response.ok()).toBe(true);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.message.content).toBe("Hello, this is a test message");
			expect(data.data.message.role).toBe("user");
		});

		test("add assistant message to conversation", async ({ request }) => {
			const { token } = await createAuthenticatedUser(request);

			// Create conversation
			const createRes = await request.post(`${API_URL}/api/conversations`, {
				headers: { Authorization: `Bearer ${token}` },
				data: { title: "Test Conversation" },
			});
			const createData = await createRes.json();
			const conversationId = createData.data.conversation.id;

			// Add assistant message
			const response = await request.post(
				`${API_URL}/api/conversations/${conversationId}/messages`,
				{
					headers: { Authorization: `Bearer ${token}` },
					data: {
						role: "assistant",
						content: "I am an AI assistant response",
						model: "gpt-4o-mini",
					},
				},
			);

			expect(response.ok()).toBe(true);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.message.role).toBe("assistant");
		});

		test("delete conversation", async ({ request }) => {
			const { token } = await createAuthenticatedUser(request);

			// Create conversation
			const createRes = await request.post(`${API_URL}/api/conversations`, {
				headers: { Authorization: `Bearer ${token}` },
				data: { title: "Test Conversation" },
			});
			const createData = await createRes.json();
			const conversationId = createData.data.conversation.id;

			// Delete conversation
			const response = await request.delete(
				`${API_URL}/api/conversations/${conversationId}`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);

			expect(response.ok()).toBe(true);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.deleted).toBe(true);

			// Verify it's gone
			const getRes = await request.get(
				`${API_URL}/api/conversations/${conversationId}`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);
			expect(getRes.ok()).toBe(false);
		});

		test("cannot access other user's conversation", async ({ request }) => {
			// Create first user and conversation
			const user1 = await createAuthenticatedUser(request);
			const createRes = await request.post(`${API_URL}/api/conversations`, {
				headers: { Authorization: `Bearer ${user1.token}` },
				data: { title: "User 1 Conversation" },
			});
			const createData = await createRes.json();
			const conversationId = createData.data.conversation.id;

			// Create second user
			const user2 = await createAuthenticatedUser(request);

			// Try to access user1's conversation as user2
			const response = await request.get(
				`${API_URL}/api/conversations/${conversationId}`,
				{
					headers: { Authorization: `Bearer ${user2.token}` },
				},
			);

			// Should fail - either 404 or 403
			expect(response.ok()).toBe(false);
		});

		test("list conversations with pagination", async ({ request }) => {
			const { token } = await createAuthenticatedUser(request);

			// Create multiple conversations
			for (let i = 0; i < 3; i++) {
				await request.post(`${API_URL}/api/conversations`, {
					headers: { Authorization: `Bearer ${token}` },
					data: { title: `Conversation ${i + 1}` },
				});
			}

			// List with pagination
			const response = await request.get(
				`${API_URL}/api/conversations?page=1&limit=2`,
				{
					headers: { Authorization: `Bearer ${token}` },
				},
			);

			expect(response.ok()).toBe(true);
			const data = await response.json();
			expect(data.success).toBe(true);
			expect(data.data.conversations.length).toBe(2);
			expect(data.data.total).toBe(3);
		});
	});
});
