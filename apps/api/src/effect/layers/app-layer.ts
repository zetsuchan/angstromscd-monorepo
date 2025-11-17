/**
 * App Layer - Composes all services for the application
 */

import { Layer } from "effect";
import { ConfigServiceLive, ConfigServiceTest } from "../services/config-service";
import { LoggerServiceLive, LoggerServiceTest } from "../services/logger-service";
import { DatabaseServiceLive, DatabaseServiceTest } from "../services/database-service";

/**
 * Live application layer
 * Composes all production service implementations
 */
export const AppLive = Layer.mergeAll(ConfigServiceLive, LoggerServiceLive).pipe(
  Layer.provideMerge(DatabaseServiceLive)
);

/**
 * Test application layer
 * Composes all test service implementations
 */
export const AppTest = Layer.mergeAll(ConfigServiceTest, LoggerServiceTest, DatabaseServiceTest);

/**
 * Development application layer
 * Same as live but with debug logging enabled
 */
export const AppDev = AppLive;
