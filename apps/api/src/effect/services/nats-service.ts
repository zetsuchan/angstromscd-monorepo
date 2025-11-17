/**
 * NATS Service - JetStream messaging with Effect
 */

import { Context, Effect, Layer, Stream } from "effect";
import { DeliverPolicy, JetStreamClient, StringCodec } from "nats";
import { getJetStream } from "../../lib/messaging/nats-client";
import { NatsError } from "../errors";
import { LoggerService } from "./logger-service";

const decoder = StringCodec();

/**
 * NATS subscription configuration
 */
export interface SubscriptionConfig {
  readonly subject: string;
  readonly orderedConsumer?: boolean;
  readonly deliverPolicy?: DeliverPolicy;
}

/**
 * NATS message
 */
export interface NatsMessage {
  readonly data: string;
  readonly subject: string;
  readonly streamSequence?: number;
}

/**
 * NATS service context tag
 */
export class NatsService extends Context.Tag("NatsService")<
  NatsService,
  {
    readonly getClient: () => Effect.Effect<JetStreamClient, NatsError>;
    readonly subscribe: (
      config: SubscriptionConfig
    ) => Effect.Effect<Stream.Stream<NatsMessage, NatsError>, NatsError>;
    readonly publish: (
      subject: string,
      data: string
    ) => Effect.Effect<void, NatsError>;
  }
>() {}

/**
 * Live implementation of NATS service
 */
export const NatsServiceLive = Layer.effect(
  NatsService,
  Effect.gen(function* () {
    const logger = yield* LoggerService;

    yield* logger.info("NATS service initialized");

    return {
      /**
       * Get JetStream client
       */
      getClient: () =>
        Effect.tryPromise({
          try: () => getJetStream(),
          catch: (error) =>
            new NatsError({
              operation: "getClient",
              cause: error,
            }),
        }),

      /**
       * Subscribe to a NATS subject with automatic cleanup
       * Returns a Stream that can be consumed with Stream.runForEach
       */
      subscribe: (config: SubscriptionConfig) =>
        Effect.gen(function* () {
          const client = yield* Effect.tryPromise({
            try: () => getJetStream(),
            catch: (error) =>
              new NatsError({
                operation: "subscribe",
                subject: config.subject,
                cause: error,
              }),
          });

          yield* Effect.log("Subscribing to NATS", { subject: config.subject });

          // Use acquireRelease for automatic cleanup on interruption
          const subscription = yield* Effect.acquireRelease(
            Effect.tryPromise({
              try: () =>
                client.subscribe(config.subject, {
                  ordered_consumer: config.orderedConsumer ?? true,
                  config: {
                    deliver_policy: config.deliverPolicy ?? DeliverPolicy.All,
                  },
                }),
              catch: (error) =>
                new NatsError({
                  operation: "subscribe",
                  subject: config.subject,
                  cause: error,
                }),
            }),
            // Cleanup: unsubscribe when stream is interrupted/completed
            (sub) =>
              Effect.sync(() => {
                sub.unsubscribe();
              }).pipe(Effect.tap(() => Effect.log("Unsubscribed from NATS", { subject: config.subject })))
          );

          // Convert async iterator to Effect Stream
          const stream = Stream.fromAsyncIterable(
            subscription,
            (error) =>
              new NatsError({
                operation: "stream",
                subject: config.subject,
                cause: error,
              })
          ).pipe(
            Stream.map((msg) => ({
              data: decoder.decode(msg.data),
              subject: msg.subject,
              streamSequence: msg.info?.streamSequence,
            }))
          );

          return stream;
        }).pipe(
          Effect.withSpan("nats.subscribe", {
            attributes: { subject: config.subject },
          })
        ),

      /**
       * Publish a message to a NATS subject
       */
      publish: (subject: string, data: string) =>
        Effect.gen(function* () {
          const client = yield* Effect.tryPromise({
            try: () => getJetStream(),
            catch: (error) =>
              new NatsError({
                operation: "publish",
                subject,
                cause: error,
              }),
          });

          yield* Effect.tryPromise({
            try: () => client.publish(subject, data),
            catch: (error) =>
              new NatsError({
                operation: "publish",
                subject,
                cause: error,
              }),
          });

          yield* Effect.log("Published to NATS", { subject });
        }).pipe(
          Effect.withSpan("nats.publish", {
            attributes: { subject },
          })
        ),
    };
  })
);

/**
 * Test implementation of NATS service
 */
export const NatsServiceTest = Layer.succeed(NatsService, {
  getClient: () => Effect.succeed({} as JetStreamClient),
  subscribe: (_config: SubscriptionConfig) =>
    Effect.succeed(
      Stream.make({
        data: "test-message",
        subject: "test.subject",
        streamSequence: 1,
      })
    ),
  publish: (_subject: string, _data: string) => Effect.void,
});
