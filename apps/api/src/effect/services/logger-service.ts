/**
 * Logger Service - Structured logging with Effect
 */

import { Context, Effect, Layer, LogLevel, Logger } from "effect";

/**
 * Logger service context tag
 * Wraps Effect's built-in Logger with custom formatting
 */
export class LoggerService extends Context.Tag("LoggerService")<
	LoggerService,
	{
		readonly log: (
			message: string,
			metadata?: Record<string, unknown>,
		) => Effect.Effect<void>;
		readonly info: (
			message: string,
			metadata?: Record<string, unknown>,
		) => Effect.Effect<void>;
		readonly warn: (
			message: string,
			metadata?: Record<string, unknown>,
		) => Effect.Effect<void>;
		readonly error: (
			message: string,
			error?: unknown,
			metadata?: Record<string, unknown>,
		) => Effect.Effect<void>;
		readonly debug: (
			message: string,
			metadata?: Record<string, unknown>,
		) => Effect.Effect<void>;
	}
>() {}

/**
 * Live implementation of Logger service
 * Uses Effect's built-in structured logging
 */
export const LoggerServiceLive = Layer.succeed(LoggerService, {
	log: (message: string, metadata?: Record<string, unknown>) =>
		Effect.log(message, metadata || {}),

	info: (message: string, metadata?: Record<string, unknown>) =>
		Effect.logInfo(message, metadata || {}),

	warn: (message: string, metadata?: Record<string, unknown>) =>
		Effect.logWarning(message, metadata || {}),

	error: (
		message: string,
		error?: unknown,
		metadata?: Record<string, unknown>,
	) =>
		Effect.logError(message, {
			...metadata,
			error: error instanceof Error ? error.message : String(error),
		}),

	debug: (message: string, metadata?: Record<string, unknown>) =>
		Effect.logDebug(message, metadata || {}),
});

/**
 * Test implementation of Logger service
 * Silent logger for tests
 */
export const LoggerServiceTest = Layer.succeed(LoggerService, {
	log: () => Effect.void,
	info: () => Effect.void,
	warn: () => Effect.void,
	error: () => Effect.void,
	debug: () => Effect.void,
});

/**
 * Production logger with minimum log level
 */
export const LoggerServiceProduction = Layer.succeed(LoggerService, {
	log: (message: string, metadata?: Record<string, unknown>) =>
		Effect.log(message, metadata || {}).pipe(
			Logger.withMinimumLogLevel(LogLevel.Info),
		),

	info: (message: string, metadata?: Record<string, unknown>) =>
		Effect.logInfo(message, metadata || {}),

	warn: (message: string, metadata?: Record<string, unknown>) =>
		Effect.logWarning(message, metadata || {}),

	error: (
		message: string,
		error?: unknown,
		metadata?: Record<string, unknown>,
	) =>
		Effect.logError(message, {
			...metadata,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		}),

	debug: (message: string, metadata?: Record<string, unknown>) =>
		Effect.logDebug(message, metadata || {}),
});
