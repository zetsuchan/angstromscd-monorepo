import { test } from "@playwright/test";

const API_URL = "http://localhost:3001";

/**
 * Check if Supabase authentication is available by attempting a test signup.
 * Returns true if Supabase is reachable and working, false otherwise.
 */
export async function isSupabaseAvailable(request: any): Promise<boolean> {
	try {
		const response = await request.post(`${API_URL}/auth/signup`, {
			data: {
				email: `connectivity-test-${Date.now()}@testmail.dev`,
				password: "TestPassword123!",
			},
			timeout: 5000,
		});

		const data = await response.json();

		// If we get a proper response (success or validation error), Supabase is working
		// Connection errors will throw or return specific error messages
		if (data.error?.message?.includes("Unable to connect")) {
			return false;
		}
		if (data.error?.message?.includes("typo in the url")) {
			return false;
		}
		if (data.error?.code === "ConnectionRefused") {
			return false;
		}
		if (data.error?.code === "FailedToOpenSocket") {
			return false;
		}

		// Any other response means Supabase is reachable
		return true;
	} catch (error) {
		console.log("Supabase connectivity check failed:", error);
		return false;
	}
}

/**
 * Helper to create authenticated user and get token.
 * Throws if Supabase is not available.
 */
export async function createAuthenticatedUser(request: any) {
	const email = `testuser${Date.now()}@testmail.dev`;
	const password = "TestPassword123!";

	const signupRes = await request.post(`${API_URL}/auth/signup`, {
		data: { email, password },
	});
	const signupData = await signupRes.json();

	// Check for connection errors
	if (signupData.error?.message?.includes("Unable to connect") ||
		signupData.error?.message?.includes("typo in the url") ||
		signupData.error?.code === "ConnectionRefused" ||
		signupData.error?.code === "FailedToOpenSocket") {
		throw new Error("SUPABASE_UNAVAILABLE");
	}

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
		throw new Error(
			"No auth token - Supabase may require email confirmation.",
		);
	}

	return { email, password, token };
}

/**
 * Wrapper for tests that require Supabase authentication.
 * Automatically skips if Supabase is not available.
 */
export function testWithAuth(
	title: string,
	testFn: (args: { request: any; token: string; email: string }) => Promise<void>,
) {
	test(title, async ({ request }) => {
		try {
			const { token, email } = await createAuthenticatedUser(request);
			await testFn({ request, token, email });
		} catch (error: any) {
			if (error.message === "SUPABASE_UNAVAILABLE" ||
				error.message?.includes("Unable to connect") ||
				error.message?.includes("typo in the url")) {
				console.log(`Skipping "${title}" - Supabase not available`);
				test.skip();
				return;
			}
			throw error;
		}
	});
}

export { API_URL };
