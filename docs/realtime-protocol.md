# Realtime Messaging Protocol

AngstromSCD now uses a transport-agnostic realtime architecture built on NATS JetStream, a stateless gateway, and SSE token streaming. This document captures the on-wire schema, delivery contract, and reconnection behaviour for clients and services.

## Protocol Version

All realtime envelopes include the immutable protocol version string `2024-12-01`. Increment the value when the wire format changes in a backwards-incompatible way.

## Event Envelope

Every event published to JetStream uses the following JSON envelope:

```json
{
  "version": "2024-12-01",
  "conversationId": "uuid",
  "sequence": 42,
  "issuedAt": "2025-01-01T12:00:00.000Z",
  "contract": {
    "guarantee": "at-least-once",
    "dedupeKey": "08ac..."
  },
  "event": {
    "type": "chat.message.created",
    "messageId": "uuid",
    "dedupeId": "08ac...",
    "role": "assistant",
    "content": "Message body",
    "model": "meditron:7b"
  }
}
```

- `sequence` is a monotonic identity column derived from PostgreSQL to support resume and replay semantics.
- Consumers **must** deduplicate by `event.dedupeId` or `sequence` when replaying.
- `contract.guarantee` is currently `at-least-once`. We emulate “exactly once” at the consumer by deduping and tracking acknowledgements.

## Gateway Frames

The websocket gateway speaks a minimal JSON protocol.

### Client → Gateway

| Type | Payload |
| --- | --- |
| `join_room` | `{ "conversationId": "uuid", "resumeFromSeq?": number }` |
| `ack` | `{ "conversationId": "uuid", "sequence": number, "receivedMessageIds?": string[] }` |
| `resume_from_seq` | `{ "conversationId": "uuid", "sequence": number }` |
| `presence` | `{ "conversationId": "uuid", "state": "online" \| "offline" \| "typing" \| "idle", "metadata?": object }` |
| `heartbeat` | `{ "ts": number }` |

### Gateway → Client

The gateway forwards realtime envelopes untouched and adds an optional `replay` boolean when resending historical events. Control frames are wrapped as `{ "control": { ... } }` — currently used to request explicit resume when JetStream history is trimmed.

A minimal hello frame is sent on connect:

```json
{ "type": "hello", "protocol": "2024-12-01", "id": "client-uuid" }
```

### Delivery Guarantees

- **Transport:** JetStream configured with at-least-once delivery.
- **Outbox:** Messages persist to `conversation_messages` and `message_outbox` in a single transaction via `enqueue_conversation_message`.
- **Relay Worker:** Publishes to `chat.events.<conversationId>` and marks the outbox row dispatched when JetStream accepts the message.
- **Gateway:** Maintains a 200-message in-memory backlog per room and uses JetStream pull consumers for deeper replays. If backlog is insufficient, a `control` frame with `chat.ack.requested` prompts the client to fetch via REST and then resume.
- **Client:** Must ack after processing each envelope. The reference client dedupes on `sequence` and `event.messageId` before mutating UI state.

## Token Streaming (SSE)

- Endpoint: `GET /stream/:conversationId`
- Subjects: `chat.tokens.<conversationId>` for token chunks and `chat.events.<conversationId>` for lifecycle notifications.
- Events: `token` (chunk payload as realtime envelope), `event` (lifecycle metadata), `protocol` (initial version broadcast), and `error`.
- Recommended client behaviour: concatenate chunks until `event.isFinal` and then clear the local buffer. When reconnecting, clients should immediately reopen the EventSource; the server automatically resumes with `DeliverPolicy.LastPerSubject` to minimise duplicates.

## Reconnection Workflow

1. Client detects disconnect (WS close or SSE error) and schedules exponential backoff reconnect (default 2s base in the reference client).
2. On reconnect, send `join_room` with `resumeFromSeq` equal to the last acked sequence per conversation.
3. Gateway will replay buffered events, fetch any missing history from JetStream, and then continue streaming live events.
4. If the gateway cannot backfill (history trimmed), it emits `{"control": {"type": "chat.ack.requested", "upToSequence": <number>}}`. The client must fetch authoritative history via REST, update its local log, and issue `resume_from_seq` from the requested value.

## Operational Notes

- JetStream stream: `CHAT_EVENTS` with subjects `chat.events.*`, `chat.tokens.*`, `chat.presence.*`.
- Durable consumers seeded for gateway fanout (`GATEWAY_FANOUT`) and SSE tokens (`SSE_TOKEN_FANOUT`).
- Environment variables:
  - `NATS_URL`, `NATS_STREAM_SUBJECT_PREFIX`, `NATS_TOKENS_PREFIX`, `NATS_EVENTS_PREFIX`
  - `OUTBOX_POLL_INTERVAL_MS`, `OUTBOX_BATCH_SIZE`
  - Gateway uses `GATEWAY_PORT` and `GATEWAY_BACKLOG_SIZE` for tuning.
- Database assets live in `infra/scripts/create-outbox.sql`. Run during migrations to ensure the outbox tables and helper functions exist.

This protocol keeps the API stateless, allows horizontal scaling of the realtime gateway, and aligns with the compliance guidance for handling clinical events.
