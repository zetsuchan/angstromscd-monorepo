import { Hono } from "hono";
import { serve } from "@hono/node-server";
import {
  runOpenAIChat,
  runAnthropicChat,
  testOpenAIConnection,
  testAnthropicConnection,
  testOllamaConnection,
  generateInsight,
  type InsightRequest,
} from "./services/baml-service";
import { success, failure } from "./utils/response";

const app = new Hono();

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
    const request = await c.req.json() as InsightRequest;
    const insight = await generateInsight(request);
    return c.json(success({ insight }));
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
