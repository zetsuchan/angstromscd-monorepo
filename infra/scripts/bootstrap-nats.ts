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
		const info = await jsm.streams.info(STREAM_NAME);
		console.log(`Stream ${STREAM_NAME} already exists`);
		return;
	} catch (error: any) {
		// Check for stream not found error
		if (error.code !== '404' && error.api_error?.err_code !== 10059) {
			throw error;
		}
		console.log(`Creating stream ${STREAM_NAME}...`);
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
	console.log(`Stream ${STREAM_NAME} created successfully`);
}

async function ensureConsumer(
	jsm: JetStreamManager,
	durableName: string,
	description: string,
) {
	try {
		await jsm.consumers.info(STREAM_NAME, durableName);
		console.log(`Consumer ${durableName} already exists`);
		return;
	} catch (error: any) {
		if (error.code !== '404' && error.api_error?.err_code !== 10014) {
			throw error;
		}
		console.log(`Creating consumer ${durableName}...`);
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
	console.log(`Consumer ${durableName} created successfully`);
}

async function ensureTokenConsumer(jsm: JetStreamManager) {
	const durableName = "SSE_TOKEN_FANOUT";
	try {
		await jsm.consumers.info(STREAM_NAME, durableName);
		console.log(`Consumer ${durableName} already exists`);
		return;
	} catch (error: any) {
		if (error.code !== '404' && error.api_error?.err_code !== 10014) {
			throw error;
		}
		console.log(`Creating consumer ${durableName}...`);
	}

	await jsm.consumers.add(STREAM_NAME, {
		durable_name: durableName,
		description: "SSE token streaming consumer",
		ack_policy: AckPolicy.None,
		deliver_policy: "last_per_subject",
		filter_subject: "chat.tokens.*",
	});
	console.log(`Consumer ${durableName} created successfully`);
}

async function main() {
	console.log(`Connecting to NATS at ${NATS_URL}...`);
	const connection = await connect({ servers: NATS_URL });
	const jsm = await connection.jetstreamManager();

	await ensureStream(jsm);
	await ensureConsumer(jsm, "GATEWAY_FANOUT", "Gateway websocket fanout");
	await ensureTokenConsumer(jsm);

	console.log("✅ NATS JetStream setup complete");
	await connection.close();
}

main().catch((error) => {
	console.error("Failed to bootstrap NATS", error);
	process.exit(1);
});
