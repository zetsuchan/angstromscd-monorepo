import { REALTIME_PROTOCOL_VERSION } from "@angstromscd/shared-types";
import { Effect, Stream } from "effect";
import { Hono } from "hono";
import { DeliverPolicy, StringCodec } from "nats";
import { useEffectForRoute } from "../config/features";
import { AppLive, NatsService } from "../effect";
import { getJetStream } from "../lib/messaging/nats-client";

const encoder = new TextEncoder();
const decoder = StringCodec();

const TOKENS_PREFIX = process.env.NATS_TOKENS_PREFIX ?? "chat.tokens";
const EVENTS_PREFIX = process.env.NATS_EVENTS_PREFIX ?? "chat.events";

export const streamRouter = new Hono();

/**
 * SSE event formatter
 */
function formatSSE(event: string, data: string, id?: number): string {
	const idStr = id !== undefined ? `id: ${id}\n` : "";
	return `event: ${event}\ndata: ${data}\n${idStr}\n`;
}

/**
 * Effect.ts implementation - with automatic resource cleanup
 */
const createStreamEffect = (conversationId: string) =>
	Effect.gen(function* () {
		const nats = yield* NatsService;

		// Subscribe to both token and event subjects
		const tokenStream = yield* nats.subscribe({
			subject: `${TOKENS_PREFIX}.${conversationId}`,
			orderedConsumer: true,
			deliverPolicy: DeliverPolicy.LastPerSubject,
		});

		const eventStream = yield* nats.subscribe({
			subject: `${EVENTS_PREFIX}.${conversationId}`,
			orderedConsumer: true,
			deliverPolicy: DeliverPolicy.All,
		});

		// Merge both streams with event labels
		const combinedStream = Stream.merge(
			tokenStream.pipe(
				Stream.map((msg) => ({
					event: "token",
					data: msg.data,
					id: msg.streamSequence,
				})),
			),
			eventStream.pipe(
				Stream.map((msg) => ({
					event: "event",
					data: msg.data,
					id: msg.streamSequence,
				})),
			),
		);

		// Format as SSE
		const sseStream = combinedStream.pipe(
			Stream.map(({ event, data, id }) => formatSSE(event, data, id)),
			// Prepend protocol version
			Stream.prepend(formatSSE("protocol", REALTIME_PROTOCOL_VERSION)),
		);

		return sseStream;
	});

/**
 * Effect-based route handler
 */
async function handleStreamEffect(conversationId: string) {
	const headers = new Headers({
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
		Connection: "keep-alive",
	});

	// Create Effect program
	const program = createStreamEffect(conversationId).pipe(
		Effect.provide(AppLive),
		Effect.catchAll((error) =>
			Effect.sync(() => {
				// Log error and return error stream
				console.error("SSE stream error:", error);
				return Stream.make(
					formatSSE(
						"error",
						JSON.stringify({
							message:
								error._tag === "NatsError"
									? "Subscription failure"
									: "Stream error",
						}),
					),
				);
			}),
		),
	);

	// Run Effect and get the stream
	const sseStream = await Effect.runPromise(program);

	// Convert Effect Stream to Web ReadableStream
	const webStream = new ReadableStream<Uint8Array>({
		async start(controller) {
			try {
				// Run the Effect stream and push to controller
				await Stream.runForEach(sseStream, (chunk) =>
					Effect.sync(() => {
						controller.enqueue(encoder.encode(chunk));
					}),
				).pipe(
					Effect.catchAll((error) =>
						Effect.sync(() => {
							console.error("Stream processing error:", error);
							controller.enqueue(
								encoder.encode(
									formatSSE(
										"error",
										JSON.stringify({ message: "Stream processing failure" }),
									),
								),
							);
						}),
					),
					Effect.ensuring(
						Effect.sync(() => {
							controller.close();
						}),
					),
					Effect.runPromise,
				);
			} catch (error) {
				console.error("ReadableStream start error:", error);
				controller.close();
			}
		},
		cancel() {
			// Effect's acquireRelease will automatically cleanup NATS subscriptions
			// when the stream is cancelled/interrupted
		},
	});

	return new Response(webStream, { headers });
}

streamRouter.get("/stream/:conversationId", async (c) => {
	const conversationId = c.req.param("conversationId");

	// Use Effect.ts implementation if enabled
	if (useEffectForRoute("STREAM")) {
		return handleStreamEffect(conversationId);
	}

	// Legacy implementation
	const tokenSubject = `${TOKENS_PREFIX}.${conversationId}`;
	const eventSubject = `${EVENTS_PREFIX}.${conversationId}`;
	const js = await getJetStream();

	const headers = new Headers({
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
		Connection: "keep-alive",
	});

	let tokenSub: Awaited<ReturnType<typeof js.subscribe>> | undefined;
	let eventSub: Awaited<ReturnType<typeof js.subscribe>> | undefined;

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			controller.enqueue(
				encoder.encode(
					`event: protocol\ndata: ${REALTIME_PROTOCOL_VERSION}\n\n`,
				),
			);

			void (async () => {
				try {
					tokenSub = await js.subscribe(tokenSubject, {
						ordered_consumer: true,
						config: {
							deliver_policy: DeliverPolicy.LastPerSubject,
						},
					});

					eventSub = await js.subscribe(eventSubject, {
						ordered_consumer: true,
						config: {
							deliver_policy: DeliverPolicy.All,
						},
					});

					const forward = async (
						sub: NonNullable<typeof tokenSub>,
						eventName: string,
					) => {
						for await (const msg of sub) {
							const data = decoder.decode(msg.data);
							controller.enqueue(
								encoder.encode(
									`event: ${eventName}\ndata: ${data}\nid: ${msg.info?.streamSequence ?? ""}\n\n`,
								),
							);
						}
					};

					void Promise.all([
						forward(tokenSub as NonNullable<typeof tokenSub>, "token"),
						forward(eventSub as NonNullable<typeof eventSub>, "event"),
					]);
				} catch (error) {
					console.error("Failed to start SSE subscriptions", error);
					controller.enqueue(
						encoder.encode(
							`event: error\ndata: ${JSON.stringify({ message: "subscription failure" })}\n\n`,
						),
					);
				}
			})();
		},
		cancel() {
			tokenSub?.unsubscribe();
			eventSub?.unsubscribe();
		},
	});

	return new Response(stream, { headers });
});
