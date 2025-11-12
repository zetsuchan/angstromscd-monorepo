import { serve } from "@hono/node-server";
import { config } from "dotenv";
import { Hono } from "hono";
import { cors } from "hono/cors";

// Load environment variables
config();

import { shutdownNats } from "./lib/messaging/nats-client";
import { router } from "./routes/index";
import { outboxRelayWorker } from "./workers/outbox-relay";

const app = new Hono();

// global middleware
app.use("/*", cors());

// root route
app.get("/", (c) => c.json({ message: "AngstromSCD API" }));

// register routes
app.route("/", router);

const port = Number(process.env.PORT ?? 3001);
console.log(`Server is running on port ${port}`);

serve({
	fetch: app.fetch,
	port,
});

outboxRelayWorker.start();

const gracefulShutdown = async () => {
	outboxRelayWorker.stop();
	await shutdownNats();
};

process.on("SIGTERM", () => {
	void gracefulShutdown().then(() => process.exit(0));
});

process.on("SIGINT", () => {
	void gracefulShutdown().then(() => process.exit(0));
});
