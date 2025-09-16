import {
	AckPolicy,
	DiscardPolicy,
	type JetStreamManager,
	RetentionPolicy,
	StorageType,
	connect,
} from "nats";

const NATS_URL = process.env.NATS_URL ?? "nats://127.0.0.1:4222";
const STREAM_NAME = process.env.NATS_STREAM ?? "CHAT_EVENTS";

async function ensureStream(jsm: JetStreamManager) {
	try {
		await jsm.streams.info(STREAM_NAME);
		return;
	} catch (error) {
		if ((error as { code?: number }).code !== 404) {
			throw error;
		}
	}

	await jsm.streams.add({
		name: STREAM_NAME,
		subjects: ["chat.events.*", "chat.tokens.*", "chat.presence.*"],
		storage: StorageType.File,
		retention: RetentionPolicy.Limits,
		num_replicas: 1,
		max_msgs_per_subject: 10000,
		discard: DiscardPolicy.Old,
		description: "Realtime chat events for AngstromSCD",
	});
}

async function ensureConsumer(
	jsm: JetStreamManager,
	durableName: string,
	description: string,
) {
	try {
		await jsm.consumers.info(STREAM_NAME, durableName);
		return;
	} catch (error) {
		if ((error as { code?: number }).code !== 404) {
			throw error;
		}
	}

	await jsm.consumers.add(STREAM_NAME, {
		durable_name: durableName,
		description,
		ack_policy: AckPolicy.Explicit,
		deliver_policy: "all",
		max_deliver: -1,
		replay_policy: "instant",
		filter_subject: "chat.events.*",
	});
}

async function ensureTokenConsumer(jsm: JetStreamManager) {
	const durableName = "SSE_TOKEN_FANOUT";
	try {
		await jsm.consumers.info(STREAM_NAME, durableName);
		return;
	} catch (error) {
		if ((error as { code?: number }).code !== 404) {
			throw error;
		}
	}

	await jsm.consumers.add(STREAM_NAME, {
		durable_name: durableName,
		description: "SSE token streaming consumer",
		ack_policy: AckPolicy.None,
		deliver_policy: "last_per_subject",
		filter_subject: "chat.tokens.*",
	});
}

async function main() {
	const connection = await connect({ servers: NATS_URL });
	const jsm = await connection.jetstreamManager();

	await ensureStream(jsm);
	await ensureConsumer(jsm, "GATEWAY_FANOUT", "Gateway websocket fanout");
	await ensureTokenConsumer(jsm);

	await connection.close();
}

main().catch((error) => {
	console.error("Failed to bootstrap NATS", error);
	process.exit(1);
});
