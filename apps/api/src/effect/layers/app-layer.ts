/**
 * App Layer - Composes all services for the application
 */

import { Layer } from "effect";
import { ConfigServiceLive, ConfigServiceTest } from "../services/config-service";
import { LoggerServiceLive, LoggerServiceTest } from "../services/logger-service";
import { DatabaseServiceLive, DatabaseServiceTest } from "../services/database-service";
import { NatsServiceLive, NatsServiceTest } from "../services/nats-service";
import { ConversationServiceLive, ConversationServiceTest } from "../services/conversation-service";
import { AIServiceLive, AIServiceTest } from "../services/ai-service";

/**
 * Live application layer
 * Composes all production service implementations
 */
export const AppLive = Layer.mergeAll(ConfigServiceLive, LoggerServiceLive).pipe(
  Layer.provideMerge(DatabaseServiceLive),
  Layer.provideMerge(NatsServiceLive),
  Layer.provideMerge(ConversationServiceLive),
  Layer.provideMerge(AIServiceLive)
);

/**
 * Test application layer
 * Composes all test service implementations
 */
export const AppTest = Layer.mergeAll(
  ConfigServiceTest,
  LoggerServiceTest,
  DatabaseServiceTest,
  NatsServiceTest,
  ConversationServiceTest,
  AIServiceTest
);

/**
 * Development application layer
 * Same as live but with debug logging enabled
 */
export const AppDev = AppLive;
