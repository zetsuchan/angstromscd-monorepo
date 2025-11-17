/**
 * Database Service - Supabase operations with Effect
 */

import { Context, Effect, Layer } from "effect";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { DatabaseError } from "../errors";
import { ConfigService } from "./config-service";
import { LoggerService } from "./logger-service";

/**
 * Database service context tag
 */
export class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService,
  {
    readonly client: SupabaseClient;
    readonly query: <T>(
      table: string,
      operation: (client: SupabaseClient) => Promise<{ data: T | null; error: unknown }>
    ) => Effect.Effect<T, DatabaseError>;
  }
>() {}

/**
 * Live implementation of Database service
 */
export const DatabaseServiceLive = Layer.effect(
  DatabaseService,
  Effect.gen(function* () {
    const config = yield* ConfigService;
    const logger = yield* LoggerService;
    const appConfig = config.get();

    // Create Supabase client
    const client = createClient(appConfig.supabase.url, appConfig.supabase.anonKey);

    yield* logger.info("Database service initialized", {
      supabaseUrl: appConfig.supabase.url,
    });

    return {
      client,
      query: <T>(
        table: string,
        operation: (client: SupabaseClient) => Promise<{ data: T | null; error: unknown }>
      ) =>
        Effect.gen(function* () {
          yield* Effect.logDebug("Database query", { table });

          const result = yield* Effect.tryPromise({
            try: () => operation(client),
            catch: (error) =>
              new DatabaseError({
                operation: "query",
                table,
                cause: error,
              }),
          });

          if (result.error) {
            // Check if this is a "not found" error from Supabase
            const errorStr = String(result.error);
            const isNotFound =
              errorStr.includes("PGRST116") || // Supabase "no rows" error
              errorStr.includes("not found") ||
              errorStr.includes("No rows found");

            return yield* Effect.fail(
              new DatabaseError({
                operation: "query",
                table,
                cause: isNotFound ? "No data returned" : result.error,
              })
            );
          }

          if (result.data === null) {
            return yield* Effect.fail(
              new DatabaseError({
                operation: "query",
                table,
                cause: "No data returned",
              })
            );
          }

          return result.data;
        }).pipe(Effect.withSpan("database.query", { attributes: { table } })),
    };
  })
);

/**
 * Test implementation of Database service
 */
export const DatabaseServiceTest = Layer.succeed(DatabaseService, {
  client: null as unknown as SupabaseClient, // Mock client
  query: <T>(
    _table: string,
    _operation: (client: SupabaseClient) => Promise<{ data: T | null; error: unknown }>
  ) => Effect.succeed({} as T),
});
