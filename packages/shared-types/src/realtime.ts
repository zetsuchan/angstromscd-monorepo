export const REALTIME_PROTOCOL_VERSION = "2024-12-01" as const;

export type DeliveryGuarantee = "at-least-once" | "exactly-once-emulated";

export interface DeliveryContract {
	guarantee: DeliveryGuarantee;
	dedupeKey?: string;
}

export interface RealtimeEnvelope<T extends RealtimeEvent> {
	version: typeof REALTIME_PROTOCOL_VERSION;
	conversationId: string;
	sequence: number;
	issuedAt: string;
	event: T;
	contract: DeliveryContract;
}

export type RealtimeEvent =
	| ChatMessageCreatedEvent
	| TokenStreamEvent
	| StreamLifecycleEvent
	| PresenceEvent
	| AckRequiredEvent;

export interface ChatMessageCreatedEvent {
	type: "chat.message.created";
	messageId: string;
	dedupeId: string;
	role: "user" | "assistant" | "system";
	content: string;
	model?: string;
	citations?: unknown;
	metadata?: Record<string, unknown>;
}

export interface TokenStreamEvent {
	type: "chat.token.chunk";
	messageId: string;
	chunkId: string;
	token: string;
	isFinal?: boolean;
	metadata?: Record<string, unknown>;
}

export interface StreamLifecycleEvent {
	type: "chat.stream.lifecycle";
	messageId: string;
	status: "started" | "blocked" | "completed" | "errored";
	detail?: string;
}

export interface PresenceEvent {
	type: "chat.presence";
	userId: string;
	state: "online" | "offline" | "typing" | "idle";
	metadata?: Record<string, unknown>;
}

export interface AckRequiredEvent {
	type: "chat.ack.requested";
	upToSequence: number;
}

export type GatewayClientFrame =
	| JoinRoomFrame
	| AckFrame
	| PresenceFrame
	| ResumeFrame
	| HeartbeatFrame;

export interface JoinRoomFrame {
	type: "join_room";
	conversationId: string;
	resumeFromSeq?: number;
	presenceState?: PresenceEvent["state"];
}

export interface AckFrame {
	type: "ack";
	conversationId: string;
	sequence: number;
	receivedMessageIds?: string[];
}

export interface ResumeFrame {
	type: "resume_from_seq";
	conversationId: string;
	sequence: number;
}

export interface PresenceFrame {
	type: "presence";
	conversationId: string;
	state: PresenceEvent["state"];
	metadata?: Record<string, unknown>;
}

export interface HeartbeatFrame {
	type: "heartbeat";
	ts: number;
}

export type GatewayServerEnvelope = RealtimeEnvelope<RealtimeEvent> & {
	deliveryTag?: string;
};

export type OutboxStatus = "pending" | "dispatched" | "failed";

export interface MessageOutboxEntry {
	id: string;
	message_id: string;
	conversation_id: string;
	event_type: RealtimeEvent["type"];
	sequence: number;
	payload: RealtimeEnvelope<RealtimeEvent>["event"];
	status: OutboxStatus;
	dedupe_id: string;
	created_at: string;
	updated_at: string;
	error_message?: string | null;
	dispatched_at?: string | null;
}

export const REALTIME_STREAM_SUBJECT = "chat.events" as const;
