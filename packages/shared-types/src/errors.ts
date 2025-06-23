/**
 * Error type hierarchy for robust error handling
 */

/**
 * Base error class for all application errors
 */
export class AppError extends Error {
	public readonly code: string;
	public readonly statusCode: number;
	public readonly isOperational: boolean;
	public readonly timestamp: string;
	public readonly details?: unknown;

	constructor(
		message: string,
		code: string,
		statusCode: number,
		isOperational = true,
		details?: unknown,
	) {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
		this.statusCode = statusCode;
		this.isOperational = isOperational;
		this.timestamp = new Date().toISOString();
		this.details = details;

		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}

	/**
	 * Convert error to JSON-serializable object
	 */
	toJSON(): Record<string, unknown> {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			statusCode: this.statusCode,
			timestamp: this.timestamp,
			details: this.details,
			stack: this.stack,
		};
	}
}

/**
 * Validation error for invalid input data
 */
export class ValidationError extends AppError {
	public readonly validationErrors: ValidationErrorDetail[];

	constructor(message: string, validationErrors: ValidationErrorDetail[]) {
		super(message, "VALIDATION_ERROR", 400, true, validationErrors);
		this.validationErrors = validationErrors;
	}
}

/**
 * Validation error details
 */
export interface ValidationErrorDetail {
	field: string;
	message: string;
	value?: unknown;
	constraint?: string;
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
	constructor(message = "Authentication required") {
		super(message, "AUTHENTICATION_ERROR", 401);
	}
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
	constructor(message = "Insufficient permissions") {
		super(message, "AUTHORIZATION_ERROR", 403);
	}
}

/**
 * Resource not found error
 */
export class NotFoundError extends AppError {
	public readonly resourceType?: string;
	public readonly resourceId?: string;

	constructor(resourceType?: string, resourceId?: string) {
		const message = resourceType
			? `${resourceType} with ID ${resourceId} not found`
			: "Resource not found";
		super(message, "NOT_FOUND", 404);
		this.resourceType = resourceType;
		this.resourceId = resourceId;
	}
}

/**
 * Conflict error (e.g., duplicate resource)
 */
export class ConflictError extends AppError {
	constructor(message: string, details?: unknown) {
		super(message, "CONFLICT", 409, true, details);
	}
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
	public readonly retryAfter?: number;

	constructor(retryAfter?: number) {
		super("Rate limit exceeded", "RATE_LIMIT_EXCEEDED", 429);
		this.retryAfter = retryAfter;
	}
}

/**
 * External service error
 */
export class ExternalServiceError extends AppError {
	public readonly service: string;
	public readonly originalError?: unknown;

	constructor(service: string, message: string, originalError?: unknown) {
		super(message, "EXTERNAL_SERVICE_ERROR", 503, false, originalError);
		this.service = service;
		this.originalError = originalError;
	}
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
	public readonly query?: string;
	public readonly originalError?: unknown;

	constructor(message: string, query?: string, originalError?: unknown) {
		super(message, "DATABASE_ERROR", 500, false, { query, originalError });
		this.query = query;
		this.originalError = originalError;
	}
}

/**
 * Medical data validation error
 */
export class MedicalDataError extends ValidationError {
	constructor(message: string, validationErrors: ValidationErrorDetail[]) {
		super(message, validationErrors);
		// Override code in parent constructor call
	}
}

/**
 * FHIR compliance error
 */
export class FHIRComplianceError extends AppError {
	public readonly resourceType: string;
	public readonly complianceIssues: string[];

	constructor(resourceType: string, complianceIssues: string[]) {
		super(
			`FHIR compliance error for ${resourceType}`,
			"FHIR_COMPLIANCE_ERROR",
			400,
			true,
			{ resourceType, complianceIssues },
		);
		this.resourceType = resourceType;
		this.complianceIssues = complianceIssues;
	}
}

/**
 * AI model error
 */
export class AIModelError extends AppError {
	public readonly provider: string;
	public readonly model?: string;

	constructor(provider: string, message: string, model?: string) {
		super(message, "AI_MODEL_ERROR", 500, false, { provider, model });
		this.provider = provider;
		this.model = model;
	}
}

/**
 * Vector database error
 */
export class VectorDatabaseError extends DatabaseError {
	public readonly collection?: string;
	public readonly operation?: string;

	constructor(
		message: string,
		collection?: string,
		operation?: string,
		originalError?: unknown,
	) {
		super(message, undefined, originalError);
		this.collection = collection;
		this.operation = operation;
	}
}

/**
 * Network error
 */
export class NetworkError extends AppError {
	constructor(message: string, details?: unknown) {
		super(message, "NETWORK_ERROR", 502, true, details);
	}
}

/**
 * Error utility functions
 */
export const ErrorUtils = {
	/**
	 * Check if error is operational (expected)
	 */
	isOperationalError(error: unknown): boolean {
		if (error instanceof AppError) {
			return error.isOperational;
		}
		return false;
	},

	/**
	 * Create error from unknown thrown value
	 */
	fromUnknown(error: unknown): AppError {
		if (error instanceof AppError) {
			return error;
		}

		if (error instanceof Error) {
			return new AppError(error.message, "INTERNAL_ERROR", 500, false, {
				originalError: error.name,
				stack: error.stack,
			});
		}

		return new AppError(
			"An unexpected error occurred",
			"UNKNOWN_ERROR",
			500,
			false,
			error,
		);
	},

	/**
	 * Create API error response
	 */
	toApiError(error: AppError): {
		code: string;
		message: string;
		details?: unknown;
		timestamp: string;
	} {
		return {
			code: error.code,
			message: error.message,
			details: error.details,
			timestamp: error.timestamp,
		};
	},

	/**
	 * Log error with appropriate severity
	 */
	logError(error: AppError, context?: Record<string, unknown>): void {
		const errorData = {
			...error.toJSON(),
			context,
		};

		if (error.isOperational) {
			console.warn("Operational error:", errorData);
		} else {
			console.error("System error:", errorData);
		}
	},
};

/**
 * Type guard for AppError
 */
export function isAppError(error: unknown): error is AppError {
	return error instanceof AppError;
}

/**
 * Type guard for specific error types
 */
export function isValidationError(error: unknown): error is ValidationError {
	return error instanceof ValidationError;
}

export function isAuthenticationError(
	error: unknown,
): error is AuthenticationError {
	return error instanceof AuthenticationError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
	return error instanceof NotFoundError;
}

/**
 * Convert any error to an API error format
 */
export function errorToApiError(error: unknown): import("./api").ApiError {
	if (isAppError(error)) {
		return {
			code: error.code,
			message: error.message,
			details: error.details,
			timestamp: error.timestamp,
		};
	}

	if (error instanceof Error) {
		return {
			code: "INTERNAL_ERROR",
			message: error.message,
			details: { stack: error.stack },
			timestamp: new Date().toISOString(),
		};
	}

	return {
		code: "UNKNOWN_ERROR",
		message: "An unknown error occurred",
		details: error,
		timestamp: new Date().toISOString(),
	};
}
