import { Hono } from "hono";
import { serve } from "@hono/node-server";
import {
  runOpenAIChat,
  runAnthropicChat,
  testOpenAIConnection,
  testAnthropicConnection,
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

const port = 3002;
console.log(`BAML service running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
