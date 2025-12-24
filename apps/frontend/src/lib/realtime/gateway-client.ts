import type {
	GatewayClientFrame,
	GatewayServerEnvelope,
	PresenceEvent,
} from "@angstromscd/shared-types";

export interface GatewayClientOptions {
	url: string;
	onEnvelope: (
		envelope: GatewayServerEnvelope,
		context: { replay: boolean },
	) => void;
	onControl?: (payload: unknown) => void;
	onOpen?: () => void;
	onClose?: (event: CloseEvent) => void;
	onError?: (event: Event) => void;
	reconnectDelayMs?: number;
}

export class RealtimeGatewayClient {
	private socket: WebSocket | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private readonly joinedRooms = new Map<string, number | undefined>();
	private readonly options: Required<
		Pick<GatewayClientOptions, "reconnectDelayMs">
	> &
		GatewayClientOptions;

	constructor(options: GatewayClientOptions) {
		this.options = { reconnectDelayMs: 2000, ...options };
	}

	connect() {
		if (
			this.socket &&
			(this.socket.readyState === WebSocket.OPEN ||
				this.socket.readyState === WebSocket.CONNECTING)
		) {
			return;
		}

		this.socket = new WebSocket(this.options.url);
		this.socket.addEventListener("open", () => {
			this.options.onOpen?.();
			for (const [conversationId, lastSequence] of this.joinedRooms.entries()) {
				this.send({
					type: "join_room",
					conversationId,
					resumeFromSeq: lastSequence,
				});
			}
		});

		this.socket.addEventListener("message", (event) => {
			if (typeof event.data !== "string") return;
			this.handleMessage(event.data);
		});

		this.socket.addEventListener("close", (event) => {
			this.options.onClose?.(event);
			this.socket = null;
			this.scheduleReconnect();
		});

		this.socket.addEventListener("error", (event) => {
			this.options.onError?.(event);
		});
	}

	joinRoom(conversationId: string, resumeFromSeq?: number) {
		this.joinedRooms.set(conversationId, resumeFromSeq);
		this.send({
			type: "join_room",
			conversationId,
			resumeFromSeq,
		});
	}

	resume(conversationId: string, sequence: number) {
		this.send({
			type: "resume_from_seq",
			conversationId,
			sequence,
		});
	}

	ack(conversationId: string, sequence: number, ids?: string[]) {
		this.joinedRooms.set(conversationId, sequence);
		this.send({
			type: "ack",
			conversationId,
			sequence,
			receivedMessageIds: ids,
		});
	}

	updatePresence(
		conversationId: string,
		presence: PresenceEvent["state"],
		metadata?: Record<string, unknown>,
	) {
		this.send({
			type: "presence",
			conversationId,
			state: presence,
			metadata,
		});
	}

	heartbeat() {
		this.send({ type: "heartbeat", ts: Date.now() });
	}

	close() {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		this.socket?.close();
		this.socket = null;
	}

	private handleMessage(payload: string) {
		const frame = safeParse(payload);
		if (!frame) return;

		if (frame.control) {
			this.options.onControl?.(frame.control);
			return;
		}

		if (frame.sequence && frame.conversationId) {
			const envelope = frame as GatewayServerEnvelope & { replay?: boolean };
			this.options.onEnvelope(envelope, { replay: envelope.replay ?? false });
			this.joinedRooms.set(envelope.conversationId, envelope.sequence);
			this.ack(envelope.conversationId, envelope.sequence, [
				envelope.event.type,
			]);
			return;
		}
	}

	private send(frame: GatewayClientFrame) {
		if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
			return;
		}
		this.socket.send(JSON.stringify(frame));
	}

	private scheduleReconnect() {
		if (this.reconnectTimer) return;
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			this.connect();
		}, this.options.reconnectDelayMs);
	}
}

function safeParse(payload: string): Record<string, unknown> | undefined {
	try {
		return JSON.parse(payload) as Record<string, unknown>;
	} catch (error) {
		console.error("Failed to parse gateway payload", { payload, error });
		return undefined;
	}
}
