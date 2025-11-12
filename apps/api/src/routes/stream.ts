import { REALTIME_PROTOCOL_VERSION } from "@angstromscd/shared-types";
import { Hono } from "hono";
import { DeliverPolicy, StringCodec } from "nats";
import { getJetStream } from "../lib/messaging/nats-client";

const encoder = new TextEncoder();
const decoder = StringCodec();

const TOKENS_PREFIX = process.env.NATS_TOKENS_PREFIX ?? "chat.tokens";
const EVENTS_PREFIX = process.env.NATS_EVENTS_PREFIX ?? "chat.events";

export const streamRouter = new Hono();

streamRouter.get("/stream/:conversationId", async (c) => {
	const conversationId = c.req.param("conversationId");
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
