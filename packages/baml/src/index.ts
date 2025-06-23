import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import {
	type InsightRequest,
	generateInsight,
	runAnthropicChat,
	runAppleFoundationChat,
	runOllamaChat,
	runOpenAIChat,
	testAnthropicConnection,
	testAppleBridgeConnection,
	testOllamaConnection,
	testOpenAIConnection,
} from "./services/baml-service";
import {
	checkAllProviders,
	getAvailableModels,
	routeModelChat,
} from "./services/model-router";
import type { ChatRequest } from "./types";
import { failure, success } from "./utils/response";

const app = new Hono();

// Enable CORS
app.use("/*", cors());

app.get("/", (c) => c.json(success({ message: "AngstromSCD BAML Service" })));

app.get("/health/openai", async (c) => {
	const ok = await testOpenAIConnection();
	return c.json(success({ openai: ok }));
});

app.get("/health/anthropic", async (c) => {
	const ok = await testAnthropicConnection();
	return c.json(success({ anthropic: ok }));
});

app.get("/health/ollama", async (c) => {
	const ok = await testOllamaConnection();
	return c.json(success({ ollama: ok }));
});

app.post("/chat/openai", async (c) => {
	try {
		const { message } = await c.req.json();
		const reply = await runOpenAIChat(message);
		return c.json(success({ reply }));
	} catch (err) {
		return c.json(failure((err as Error).message), 500);
	}
});

app.post("/chat/anthropic", async (c) => {
	try {
		const { message } = await c.req.json();
		const reply = await runAnthropicChat(message);
		return c.json(success({ reply }));
	} catch (err) {
		return c.json(failure((err as Error).message), 500);
	}
});

app.post("/generate-insight", async (c) => {
	try {
		const request = (await c.req.json()) as InsightRequest;
		const insight = await generateInsight(request);
		return c.json(success({ insight }));
	} catch (err) {
		return c.json(failure((err as Error).message), 500);
	}
});

app.get("/health/apple", async (c) => {
	const ok = await testAppleBridgeConnection();
	return c.json(success({ apple: ok }));
});

app.get("/health", async (c) => {
	const status = await checkAllProviders();
	return c.json(success(status));
});

app.get("/models", (c) => {
	const models = getAvailableModels();
	return c.json(success({ models }));
});

app.post("/chat/ollama", async (c) => {
	try {
		const { message, model } = await c.req.json();
		const reply = await runOllamaChat(message, model);
		return c.json(success({ reply }));
	} catch (err) {
		return c.json(failure((err as Error).message), 500);
	}
});

app.post("/chat/apple", async (c) => {
	try {
		const { message } = await c.req.json();
		const reply = await runAppleFoundationChat(message);
		return c.json(success({ reply }));
	} catch (err) {
		return c.json(failure((err as Error).message), 500);
	}
});

// Unified chat endpoint with model routing
app.post("/chat", async (c) => {
	try {
		const request = await c.req.json<ChatRequest>();
		const reply = await routeModelChat(request);
		return c.json(
			success({
				reply,
				model: request.model,
				provider: request.provider,
			}),
		);
	} catch (err) {
		return c.json(failure((err as Error).message), 500);
	}
});

const port = 3002;
console.log(`BAML service running on port ${port}`);

serve({
	fetch: app.fetch,
	port,
});
