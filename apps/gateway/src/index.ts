import {
	type GatewayClientFrame,
	type GatewayServerEnvelope,
	type PresenceEvent,
	REALTIME_PROTOCOL_VERSION,
} from "@angstromscd/shared-types";
import { serve } from "bun";
import {
	DeliverPolicy,
	type JetStreamClient,
	type JetStreamPullSubscription,
	type JsMsg,
	StringCodec,
	type Subscription,
	connect,
} from "nats";

const NATS_URL = process.env.NATS_URL ?? "nats://127.0.0.1:4222";
const SUBJECT_PREFIX = process.env.NATS_STREAM_SUBJECT_PREFIX ?? "chat.events";
const PRESENCE_SUBJECT_PREFIX =
	process.env.NATS_PRESENCE_PREFIX ?? "chat.presence";
const PORT = Number.parseInt(process.env.GATEWAY_PORT ?? "3005", 10);
const BACKLOG_SIZE = Number.parseInt(
	process.env.GATEWAY_BACKLOG_SIZE ?? "200",
	10,
);

const codec = StringCodec();

const connection = await connect({ servers: NATS_URL });
const jetstream = connection.jetstream();

interface ClientData {
	id: string;
	rooms: Set<string>;
	ackedSequences: Map<string, number>;
}

type GatewaySocket = WebSocket & { data: ClientData };

class RoomContext {
	private readonly clients = new Set<GatewaySocket>();
	private subscription: Subscription | undefined;
	private readonly backlog: GatewayServerEnvelope[] = [];
	private consuming = false;

	constructor(
		private readonly roomId: string,
		private readonly js: JetStreamClient,
	) {}

	addClient(socket: GatewaySocket) {
		this.clients.add(socket);
		if (!this.subscription) {
			void this.start();
		}
	}

	isEmpty() {
		return this.clients.size === 0;
	}

	removeClient(socket: GatewaySocket) {
		this.clients.delete(socket);
		if (this.clients.size === 0) {
			void this.teardown();
		}
	}

	private async start() {
		if (this.subscription) return;
		this.subscription = await this.js.subscribe(
			`${SUBJECT_PREFIX}.${this.roomId}`,
			{
				ordered_consumer: true,
				config: {
					deliver_policy: DeliverPolicy.New,
				},
			},
		);
		if (!this.consuming) {
			this.consuming = true;
			void this.consume(this.subscription);
		}
	}

	private async consume(sub: Subscription) {
		try {
			for await (const msg of sub) {
				this.handleMessage(msg);
			}
		} catch (error) {
			console.error("Room subscription error", { roomId: this.roomId, error });
		} finally {
			this.consuming = false;
		}
	}

	private handleMessage(msg: JsMsg) {
		const payload = codec.decode(msg.data);
		try {
			const envelope = JSON.parse(payload) as GatewayServerEnvelope;
			this.backlog.push(envelope);
			if (this.backlog.length > BACKLOG_SIZE) {
				this.backlog.shift();
			}
			for (const client of this.clients) {
				safeSend(client, envelope);
			}
		} catch (error) {
			console.error("Failed to parse realtime event", { payload, error });
		}
	}

	async replayFrom(sequence: number, socket: GatewaySocket) {
		const backlogEvents = this.backlog.filter(
			(event) => event.sequence > sequence,
		);
		for (const event of backlogEvents) {
			safeSend(socket, event, { replay: true });
		}

		const oldestBacklogSeq = this.backlog[0]?.sequence;
		if (oldestBacklogSeq === undefined || sequence < oldestBacklogSeq - 1) {
			await this.fetchHistorical(sequence + 1, socket);
		}
	}

	private async fetchHistorical(startSequence: number, socket: GatewaySocket) {
		let pullSub: JetStreamPullSubscription | undefined;
		try {
			pullSub = await this.js.pullSubscribe(
				`${SUBJECT_PREFIX}.${this.roomId}`,
				{
					config: {
						deliver_policy: DeliverPolicy.StartSequence,
						opt_start_seq: startSequence,
					},
				},
			);

			let pending = true;
			while (pending) {
				const batch = await pullSub.fetch(50, { expires: 1000 });
				let processed = 0;
				for await (const msg of batch) {
					processed += 1;
					const payload = codec.decode(msg.data);
					const envelope = JSON.parse(payload) as GatewayServerEnvelope;
					this.backlog.push(envelope);
					if (this.backlog.length > BACKLOG_SIZE) {
						this.backlog.shift();
					}
					safeSend(socket, envelope, { replay: true });
					msg.ack();
					if (msg.info?.pending === 0) {
						pending = false;
					}
				}
				if (processed === 0) {
					pending = false;
				}
			}
		} catch (error) {
			console.error("Historical replay failed", { roomId: this.roomId, error });
			safeControl(socket, {
				type: "chat.ack.requested",
				conversationId: this.roomId,
				upToSequence: startSequence,
			});
		} finally {
			await pullSub?.destroy();
		}
	}

	async teardown() {
		try {
			await this.subscription?.drain?.();
		} catch (error) {
			console.error("Failed to drain subscription", {
				roomId: this.roomId,
				error,
			});
		} finally {
			this.subscription = undefined;
			this.backlog.length = 0;
		}
	}
}

class RoomManager {
	private readonly rooms = new Map<string, RoomContext>();

	constructor(private readonly js: JetStreamClient) {}

	ensureRoom(roomId: string): RoomContext {
		let room = this.rooms.get(roomId);
		if (!room) {
			room = new RoomContext(roomId, this.js);
			this.rooms.set(roomId, room);
		}
		return room;
	}

	addClient(roomId: string, socket: GatewaySocket) {
		const room = this.ensureRoom(roomId);
		room.addClient(socket);
	}

	removeClient(roomId: string, socket: GatewaySocket) {
		const room = this.rooms.get(roomId);
		if (!room) return;
		room.removeClient(socket);
		if (room.isEmpty()) {
			this.rooms.delete(roomId);
		}
	}

	async replay(roomId: string, sequence: number, socket: GatewaySocket) {
		const room = this.ensureRoom(roomId);
		await room.replayFrom(sequence, socket);
	}
}

const roomManager = new RoomManager(jetstream);

function safeSend(
	socket: GatewaySocket,
	envelope: GatewayServerEnvelope,
	options?: { replay?: boolean },
) {
	try {
		socket.send(
			JSON.stringify({
				...envelope,
				replay: options?.replay ?? false,
			}),
		);
	} catch (error) {
		console.error("Failed to send realtime frame", { error });
	}
}

function safeControl(socket: GatewaySocket, payload: unknown) {
	try {
		socket.send(JSON.stringify({ control: payload }));
	} catch (error) {
		console.error("Failed to send control frame", { error });
	}
}

async function publishPresence(roomId: string, presence: PresenceEvent) {
	try {
		await jetstream.publish(
			`${PRESENCE_SUBJECT_PREFIX}.${roomId}`,
			codec.encode(
				JSON.stringify({
					version: REALTIME_PROTOCOL_VERSION,
					event: presence,
					emittedAt: new Date().toISOString(),
				}),
			),
		);
	} catch (error) {
		console.error("Failed to publish presence", { roomId, error });
	}
}

function parseFrame(message: string): GatewayClientFrame | undefined {
	try {
		return JSON.parse(message) as GatewayClientFrame;
	} catch (error) {
		console.error("Invalid gateway frame", { message, error });
		return undefined;
	}
}

const server = serve<{ socket: GatewaySocket }>({
	port: PORT,
	fetch(request, server) {
		const { pathname } = new URL(request.url);
		if (pathname === "/health") {
			return new Response(JSON.stringify({ status: "ok" }), {
				headers: { "Content-Type": "application/json" },
			});
		}

		if (
			server.upgrade(request, {
				data: {
					id: crypto.randomUUID(),
					rooms: new Set<string>(),
					ackedSequences: new Map<string, number>(),
				},
			})
		) {
			return undefined;
		}

		return new Response("Not Found", { status: 404 });
	},
	websocket: {
		open(ws) {
			console.log("Gateway connection open", { id: ws.data.id });
			ws.send(
				JSON.stringify({
					type: "hello",
					protocol: REALTIME_PROTOCOL_VERSION,
					id: ws.data.id,
				}),
			);
		},
		async message(ws, message) {
			if (typeof message !== "string") return;
			const frame = parseFrame(message);
			if (!frame) return;

			switch (frame.type) {
				case "join_room": {
					if (!frame.conversationId) return;
					roomManager.addClient(frame.conversationId, ws);
					ws.data.rooms.add(frame.conversationId);
					ws.send(
						JSON.stringify({
							type: "joined",
							conversationId: frame.conversationId,
						}),
					);
					if (frame.resumeFromSeq !== undefined) {
						await roomManager.replay(
							frame.conversationId,
							frame.resumeFromSeq,
							ws,
						);
					}
					break;
				}
				case "resume_from_seq": {
					if (!frame.conversationId) return;
					await roomManager.replay(frame.conversationId, frame.sequence, ws);
					break;
				}
				case "ack": {
					if (!frame.conversationId) return;
					ws.data.ackedSequences.set(frame.conversationId, frame.sequence);
					break;
				}
				case "presence": {
					if (!frame.conversationId) return;
					ws.data.rooms.add(frame.conversationId);
					await publishPresence(frame.conversationId, {
						type: "chat.presence",
						userId: ws.data.id,
						state: frame.state,
						metadata: frame.metadata,
					});
					break;
				}
				case "heartbeat": {
					ws.send(JSON.stringify({ type: "heartbeat", ts: Date.now() }));
					break;
				}
				default:
					console.warn("Unknown frame", frame);
			}
		},
		close(ws) {
			for (const roomId of ws.data.rooms) {
				roomManager.removeClient(roomId, ws);
			}
			console.log("Gateway connection closed", { id: ws.data.id });
		},
	},
});

console.log(`Realtime gateway listening on ws://localhost:${PORT}`);

async function shutdown() {
	server.stop();
	await connection.drain();
}

process.on("SIGTERM", () => {
	void shutdown();
});

process.on("SIGINT", () => {
	void shutdown();
});
