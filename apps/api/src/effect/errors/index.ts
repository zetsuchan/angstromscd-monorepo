/**
 * Typed Errors for Effect.ts
 *
 * All errors extend Data.TaggedError for proper type tracking
 * and pattern matching with Effect.catchTag
 */

import { Data } from "effect";

/**
 * Database operation errors
 * Used for Supabase queries, Convex operations, etc.
 */
export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  operation: string;
  cause: unknown;
  table?: string;
  query?: string;
}> {}

/**
 * Validation errors for request data
 * Used with Effect Schema validation
 */
export class ValidationError extends Data.TaggedError("ValidationError")<{
  message: string;
  details?: unknown;
  field?: string;
}> {}

/**
 * Authentication/Authorization errors
 * Used for access control violations
 */
export class AuthenticationError extends Data.TaggedError("AuthenticationError")<{
  message: string;
  userId?: string;
}> {}

export class AuthorizationError extends Data.TaggedError("AuthorizationError")<{
  message: string;
  userId?: string;
  resource?: string;
  requiredRole?: string;
}> {}

/**
 * NATS messaging errors
 * Used for pub/sub operations
 */
export class NatsError extends Data.TaggedError("NatsError")<{
  operation: string;
  cause: unknown;
  subject?: string;
}> {}

/**
 * AI/ML service errors
 * Used for BAML, Vercel AI SDK, model provider errors
 */
export class AIServiceError extends Data.TaggedError("AIServiceError")<{
  provider: string;
  model?: string;
  cause: unknown;
  message: string;
}> {}

/**
 * Convex operation errors
 * Used for Convex mutations, queries, actions
 */
export class ConvexError extends Data.TaggedError("ConvexError")<{
  operation: string;
  cause: unknown;
  collection?: string;
}> {}

/**
 * Resource not found errors
 * Generic 404-style errors
 */
export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  resource: string;
  id: string;
}> {}

/**
 * Configuration errors
 * Missing or invalid environment variables
 */
export class ConfigError extends Data.TaggedError("ConfigError")<{
  message: string;
  key?: string;
}> {}

/**
 * Unknown/unexpected errors
 * Catch-all for unexpected failures
 */
export class UnknownError extends Data.TaggedError("UnknownError")<{
  cause: unknown;
  context?: string;
}> {}

/**
 * Medical/HIPAA compliance errors
 * PHI protection violations, audit failures
 */
export class ComplianceError extends Data.TaggedError("ComplianceError")<{
  message: string;
  violation: string;
  severity: "low" | "medium" | "high" | "critical";
}> {}

/**
 * Type guard to check if error is an AppError
 */
export type AppError =
  | DatabaseError
  | ValidationError
  | AuthenticationError
  | AuthorizationError
  | NatsError
  | AIServiceError
  | ConvexError
  | NotFoundError
  | ConfigError
  | UnknownError
  | ComplianceError;

/**
 * Map AppError to HTTP status code
 */
export function errorToStatusCode(error: AppError): number {
  switch (error._tag) {
    case "ValidationError":
      return 400;
    case "AuthenticationError":
      return 401;
    case "AuthorizationError":
      return 403;
    case "NotFoundError":
      return 404;
    case "ComplianceError":
      return 451; // Unavailable For Legal Reasons
    case "DatabaseError":
    case "NatsError":
    case "AIServiceError":
    case "ConvexError":
    case "ConfigError":
    case "UnknownError":
      return 500;
    default:
      return 500;
  }
}

/**
 * Convert AppError to API response format
 */
export function errorToResponse(error: AppError): {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
} {
  return {
    error: error._tag,
    message: getErrorMessage(error),
    statusCode: errorToStatusCode(error),
    details: getErrorDetails(error),
  };
}

/**
 * Extract human-readable message from error
 */
function getErrorMessage(error: AppError): string {
  switch (error._tag) {
    case "DatabaseError":
      return `Database operation failed: ${error.operation}`;
    case "ValidationError":
      return error.message;
    case "AuthenticationError":
    case "AuthorizationError":
      return error.message;
    case "NatsError":
      return `Messaging operation failed: ${error.operation}`;
    case "AIServiceError":
      return error.message;
    case "ConvexError":
      return `Convex operation failed: ${error.operation}`;
    case "NotFoundError":
      return `${error.resource} not found: ${error.id}`;
    case "ConfigError":
      return error.message;
    case "ComplianceError":
      return `Compliance violation: ${error.violation}`;
    case "UnknownError":
      return "An unexpected error occurred";
    default:
      return "Unknown error";
  }
}

/**
 * Extract error details (for debugging, not exposed to clients in production)
 */
function getErrorDetails(error: AppError): unknown {
  if (process.env.NODE_ENV === "production") {
    // Don't expose internal details in production
    return undefined;
  }

  switch (error._tag) {
    case "DatabaseError":
      return { table: error.table, query: error.query, cause: error.cause };
    case "ValidationError":
      return { field: error.field, details: error.details };
    case "NatsError":
      return { subject: error.subject, cause: error.cause };
    case "AIServiceError":
      return { provider: error.provider, model: error.model, cause: error.cause };
    case "ConvexError":
      return { collection: error.collection, cause: error.cause };
    case "ComplianceError":
      return { severity: error.severity };
    default:
      return undefined;
  }
}
