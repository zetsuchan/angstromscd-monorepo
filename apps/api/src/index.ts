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

const defaultOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
const configuredOrigins =
	process.env.CORS_ORIGINS?.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean) ?? defaultOrigins;

// global middleware
app.use(
	"/*",
	cors({
		origin: (origin) => {
			if (!origin) {
				return configuredOrigins[0] ?? "*";
			}
			return configuredOrigins.includes(origin) ? origin : null;
		},
		credentials: true,
		allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
	}),
);

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
