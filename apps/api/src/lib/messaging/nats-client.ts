import {
	type JetStreamClient,
	type NatsConnection,
	StringCodec,
	connect,
} from "nats";

const NATS_URL = process.env.NATS_URL ?? "nats://127.0.0.1:4222";
const STREAM_SUBJECT_PREFIX =
	process.env.NATS_STREAM_SUBJECT_PREFIX ?? "chat.events";

let connectionPromise: Promise<NatsConnection> | null = null;
let jetStreamPromise: Promise<JetStreamClient> | null = null;

const encoder = StringCodec();

async function createConnection(): Promise<NatsConnection> {
	if (!connectionPromise) {
		connectionPromise = connect({ servers: NATS_URL });
	}
	return connectionPromise;
}

export async function getJetStream(): Promise<JetStreamClient> {
	if (!jetStreamPromise) {
		jetStreamPromise = createConnection().then((conn) => conn.jetstream());
	}
	return jetStreamPromise;
}

export async function getConnection(): Promise<NatsConnection> {
	return createConnection();
}

export async function publishToStream<T>(
	topic: string,
	payload: T,
	msgId?: string,
) {
	const jetstream = await getJetStream();
	const subject = `${STREAM_SUBJECT_PREFIX}.${topic}`;
	await jetstream.publish(subject, encoder.encode(JSON.stringify(payload)), {
		msgID: msgId,
	});
}

export async function shutdownNats() {
	if (connectionPromise) {
		const conn = await connectionPromise;
		await conn.drain();
		connectionPromise = null;
		jetStreamPromise = null;
	}
}

process.on("beforeExit", () => {
	void shutdownNats();
});
