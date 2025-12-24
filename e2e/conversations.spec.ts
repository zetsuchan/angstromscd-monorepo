import { expect, test } from "@playwright/test";
import { API_URL, createAuthenticatedUser, isSupabaseAvailable } from "./test-utils";

test.describe("Conversation CRUD Operations", () => {
	test.describe("API Endpoints", () => {
		test("list conversations returns empty array for new user", async ({
			request,
		}) => {
			const supabaseAvailable = await isSupabaseAvailable(request);
			if (!supabaseAvailable) {
				console.log("Skipping test - Supabase not available");
				test.skip();
				return;
			}

			try {
				const { token } = await createAuthenticatedUser(request);

				const response = await request.get(`${API_URL}/api/conversations`, {
					headers: { Authorization: `Bearer ${token}` },
				});

				expect(response.ok()).toBe(true);
				const data = await response.json();
				expect(data.success).toBe(true);
				expect(data.data.conversations).toEqual([]);
				expect(data.data.total).toBe(0);
			} catch (error: any) {
				if (error.message === "SUPABASE_UNAVAILABLE") {
					test.skip();
					return;
				}
				throw error;
			}
		});

		test("create conversation", async ({ request }) => {
			const supabaseAvailable = await isSupabaseAvailable(request);
			if (!supabaseAvailable) {
				console.log("Skipping test - Supabase not available");
				test.skip();
				return;
			}

			try {
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
			} catch (error: any) {
				if (error.message === "SUPABASE_UNAVAILABLE") {
					test.skip();
					return;
				}
				throw error;
			}
		});

		test("create conversation requires title", async ({ request }) => {
			const supabaseAvailable = await isSupabaseAvailable(request);
			if (!supabaseAvailable) {
				console.log("Skipping test - Supabase not available");
				test.skip();
				return;
			}

			try {
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
			} catch (error: any) {
				if (error.message === "SUPABASE_UNAVAILABLE") {
					test.skip();
					return;
				}
				throw error;
			}
		});

		test("get conversation with messages", async ({ request }) => {
			const supabaseAvailable = await isSupabaseAvailable(request);
			if (!supabaseAvailable) {
				console.log("Skipping test - Supabase not available");
				test.skip();
				return;
			}

			try {
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
			} catch (error: any) {
				if (error.message === "SUPABASE_UNAVAILABLE") {
					test.skip();
					return;
				}
				throw error;
			}
		});

		test("add message to conversation", async ({ request }) => {
			const supabaseAvailable = await isSupabaseAvailable(request);
			if (!supabaseAvailable) {
				console.log("Skipping test - Supabase not available");
				test.skip();
				return;
			}

			try {
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
			} catch (error: any) {
				if (error.message === "SUPABASE_UNAVAILABLE") {
					test.skip();
					return;
				}
				throw error;
			}
		});

		test("add assistant message to conversation", async ({ request }) => {
			const supabaseAvailable = await isSupabaseAvailable(request);
			if (!supabaseAvailable) {
				console.log("Skipping test - Supabase not available");
				test.skip();
				return;
			}

			try {
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
			} catch (error: any) {
				if (error.message === "SUPABASE_UNAVAILABLE") {
					test.skip();
					return;
				}
				throw error;
			}
		});

		test("delete conversation", async ({ request }) => {
			const supabaseAvailable = await isSupabaseAvailable(request);
			if (!supabaseAvailable) {
				console.log("Skipping test - Supabase not available");
				test.skip();
				return;
			}

			try {
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
			} catch (error: any) {
				if (error.message === "SUPABASE_UNAVAILABLE") {
					test.skip();
					return;
				}
				throw error;
			}
		});

		test("cannot access other user's conversation", async ({ request }) => {
			const supabaseAvailable = await isSupabaseAvailable(request);
			if (!supabaseAvailable) {
				console.log("Skipping test - Supabase not available");
				test.skip();
				return;
			}

			try {
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
			} catch (error: any) {
				if (error.message === "SUPABASE_UNAVAILABLE") {
					test.skip();
					return;
				}
				throw error;
			}
		});

		test("list conversations with pagination", async ({ request }) => {
			const supabaseAvailable = await isSupabaseAvailable(request);
			if (!supabaseAvailable) {
				console.log("Skipping test - Supabase not available");
				test.skip();
				return;
			}

			try {
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
			} catch (error: any) {
				if (error.message === "SUPABASE_UNAVAILABLE") {
					test.skip();
					return;
				}
				throw error;
			}
		});
	});
});
