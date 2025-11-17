/**
 * Config Service - Environment variable management with Effect
 */

import { Context, Effect, Layer } from "effect";
import { ConfigError } from "../errors";

/**
 * Application configuration interface
 */
export interface AppConfig {
  readonly supabase: {
    readonly url: string;
    readonly anonKey: string;
  };
  readonly database: {
    readonly url: string;
  };
  readonly ai: {
    readonly openaiApiKey?: string;
    readonly anthropicApiKey?: string;
    readonly ollamaBaseUrl: string;
    readonly appleBridgeUrl: string;
  };
  readonly services: {
    readonly bamlUrl: string;
    readonly vectorUrl: string;
  };
  readonly convex?: {
    readonly url: string;
  };
  readonly features: {
    readonly useEffect: boolean;
    readonly useVercelAI: boolean;
    readonly useConvex: boolean;
  };
}

/**
 * Config service context tag
 */
export class ConfigService extends Context.Tag("ConfigService")<
  ConfigService,
  {
    readonly get: () => AppConfig;
    readonly getRequired: (key: string) => Effect.Effect<string, ConfigError>;
    readonly getOptional: (key: string) => Effect.Effect<string | undefined, never>;
  }
>() {}

/**
 * Load config from environment variables
 */
function loadConfig(): Effect.Effect<AppConfig, ConfigError> {
  return Effect.gen(function* () {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return yield* Effect.fail(
        new ConfigError({
          message: "Missing required Supabase configuration",
          key: !supabaseUrl ? "SUPABASE_URL" : "SUPABASE_ANON_KEY",
        })
      );
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return yield* Effect.fail(
        new ConfigError({
          message: "Missing required DATABASE_URL",
          key: "DATABASE_URL",
        })
      );
    }

    return {
      supabase: {
        url: supabaseUrl,
        anonKey: supabaseKey,
      },
      database: {
        url: databaseUrl,
      },
      ai: {
        openaiApiKey: process.env.OPENAI_API_KEY,
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
        appleBridgeUrl: process.env.APPLE_BRIDGE_URL || "http://localhost:3004",
      },
      services: {
        bamlUrl: process.env.BAML_SERVICE_URL || "http://localhost:3002",
        vectorUrl: process.env.VECTOR_SERVICE_URL || "http://localhost:3003",
      },
      convex: process.env.CONVEX_URL
        ? {
            url: process.env.CONVEX_URL,
          }
        : undefined,
      features: {
        useEffect: process.env.USE_EFFECT === "true",
        useVercelAI: process.env.USE_VERCEL_AI === "true",
        useConvex: process.env.USE_CONVEX_REALTIME === "true",
      },
    };
  });
}

/**
 * Live implementation of Config service
 */
export const ConfigServiceLive = Layer.effect(
  ConfigService,
  Effect.gen(function* () {
    const config = yield* loadConfig();

    return {
      get: () => config,
      getRequired: (key: string) =>
        Effect.gen(function* () {
          const value = process.env[key];
          if (!value) {
            return yield* Effect.fail(
              new ConfigError({
                message: `Missing required environment variable: ${key}`,
                key,
              })
            );
          }
          return value;
        }),
      getOptional: (key: string) => Effect.succeed(process.env[key]),
    };
  })
);

/**
 * Test implementation of Config service
 */
export const ConfigServiceTest = Layer.succeed(ConfigService, {
  get: () => ({
    supabase: {
      url: "http://test-supabase-url",
      anonKey: "test-anon-key",
    },
    database: {
      url: "postgresql://test:test@localhost:5432/test",
    },
    ai: {
      openaiApiKey: "test-openai-key",
      anthropicApiKey: "test-anthropic-key",
      ollamaBaseUrl: "http://localhost:11434",
      appleBridgeUrl: "http://localhost:3004",
    },
    services: {
      bamlUrl: "http://localhost:3002",
      vectorUrl: "http://localhost:3003",
    },
    convex: {
      url: "http://test-convex-url",
    },
    features: {
      useEffect: false,
      useVercelAI: false,
      useConvex: false,
    },
  }),
  getRequired: (key: string) => Effect.succeed(`test-${key}`),
  getOptional: (key: string) => Effect.succeed(`test-${key}`),
});
