import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	// Limit workers to avoid Supabase rate limits on user creation
	// Use 1 worker locally to prevent rate limiting, CI already uses 1
	workers: 1,
	reporter: [
		["html", { open: "never" }],
		["list"],
	],
	use: {
		baseURL: "http://localhost:5173",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
	},
	// Only run chromium for faster local testing. CI can add more browsers if needed.
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: [
		{
			command: "bun run dev:api",
			url: "http://localhost:3001/health",
			reuseExistingServer: !process.env.CI,
			timeout: 30000,
		},
		{
			command: "bun run dev:frontend",
			url: "http://localhost:5173",
			reuseExistingServer: !process.env.CI,
			timeout: 30000,
		},
	],
});
