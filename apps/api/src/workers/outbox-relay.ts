import {
	type GatewayServerEnvelope,
	type MessageOutboxEntry,
	REALTIME_PROTOCOL_VERSION,
} from "@angstromscd/shared-types";
import { publishToStream } from "../lib/messaging/nats-client";
import { OutboxService } from "../services/outbox-service";

const POLL_INTERVAL_MS = Number.parseInt(
	process.env.OUTBOX_POLL_INTERVAL_MS ?? "250",
	10,
);
const BATCH_SIZE = Number.parseInt(process.env.OUTBOX_BATCH_SIZE ?? "25", 10);

export class OutboxRelayWorker {
	private readonly outboxService = new OutboxService();
	private timer: ReturnType<typeof setTimeout> | undefined;
	private running = false;

	start() {
		if (this.running) return;
		this.running = true;
		this.schedule();
	}

	stop() {
		this.running = false;
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = undefined;
		}
	}

	private schedule() {
		if (!this.running) return;
		this.timer = setTimeout(() => {
			void this.tick().finally(() => this.schedule());
		}, POLL_INTERVAL_MS);
	}

	private async tick() {
		let entries: MessageOutboxEntry[] = [];

		try {
			entries = await this.outboxService.getPending(BATCH_SIZE);
		} catch (error) {
			console.error("Failed to fetch outbox entries", error);
			return;
		}

		for (const entry of entries) {
			await this.dispatchEntry(entry);
		}
	}

	private async dispatchEntry(entry: MessageOutboxEntry) {
		const envelope: GatewayServerEnvelope = {
			version: REALTIME_PROTOCOL_VERSION,
			conversationId: entry.conversation_id,
			sequence: entry.sequence,
			issuedAt: new Date().toISOString(),
			event: entry.payload,
			contract: {
				guarantee: "at-least-once",
				dedupeKey: entry.dedupe_id,
			},
			deliveryTag: entry.id,
		};

		try {
			await publishToStream(entry.conversation_id, envelope, entry.dedupe_id);
			await this.outboxService.markDispatched(entry.id);
		} catch (error) {
			const reason = error instanceof Error ? error.message : "unknown error";
			console.error("Failed to publish outbox entry", {
				id: entry.id,
				reason,
				error,
			});
			try {
				await this.outboxService.markFailed(entry.id, reason);
			} catch (persistError) {
				console.error("Failed to mark outbox entry as failed", persistError);
			}
		}
	}
}

export const outboxRelayWorker = new OutboxRelayWorker();
