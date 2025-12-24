/**
 * Utility types for better type safety and developer experience
 */

/**
 * Make specific properties required
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific properties optional
 */
export type PartialFields<T, K extends keyof T> = Omit<T, K> &
	Partial<Pick<T, K>>;

/**
 * Exclude null and undefined from type
 */
export type NonNullableFields<T> = {
	[K in keyof T]: NonNullable<T[K]>;
};

/**
 * Deep partial type
 */
export type DeepPartial<T> = T extends object
	? {
			[P in keyof T]?: DeepPartial<T[P]>;
		}
	: T;

/**
 * Deep readonly type
 */
export type DeepReadonly<T> = T extends object
	? {
			readonly [P in keyof T]: DeepReadonly<T[P]>;
		}
	: T;

/**
 * Extract keys of specific type
 */
export type KeysOfType<T, U> = {
	[K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

/**
 * Branded types for type-safe IDs
 */
export type Brand<K, T> = K & { __brand: T };

export type PatientId = Brand<string, "PatientId">;
export type VOEEpisodeId = Brand<string, "VOEEpisodeId">;
export type CitationId = Brand<string, "CitationId">;
export type UserId = Brand<string, "UserId">;
export type ConversationId = Brand<string, "ConversationId">;

/**
 * Create branded ID
 */
export function createBrandedId<T extends string>(
	id: string,
): Brand<string, T> {
	return id as Brand<string, T>;
}

/**
 * ISO date string type
 */
export type ISODateString = Brand<string, "ISODate">;

/**
 * Create ISO date string
 */
export function createISODateString(date: Date | string): ISODateString {
	const dateObj = typeof date === "string" ? new Date(date) : date;
	return dateObj.toISOString() as ISODateString;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
	page?: number;
	limit?: number;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
	data: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNext: boolean;
		hasPrev: boolean;
	};
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> =
	| { success: true; data: T }
	| { success: false; error: E };

/**
 * Create success result
 */
export function ok<T>(data: T): Result<T, never> {
	return { success: true, data };
}

/**
 * Create error result
 */
export function err<E>(error: E): Result<never, E> {
	return { success: false, error };
}

/**
 * Type-safe object entries
 */
export function typedEntries<T extends object>(
	obj: T,
): Array<[keyof T, T[keyof T]]> {
	return Object.entries(obj) as Array<[keyof T, T[keyof T]]>;
}

/**
 * Type-safe object keys
 */
export function typedKeys<T extends object>(obj: T): Array<keyof T> {
	return Object.keys(obj) as Array<keyof T>;
}

/**
 * Type-safe object from entries
 */
export function typedFromEntries<K extends PropertyKey, V>(
	entries: Array<[K, V]>,
): Record<K, V> {
	return Object.fromEntries(entries) as Record<K, V>;
}

/**
 * Exhaustive check for discriminated unions
 */
export function exhaustiveCheck(value: never): never {
	throw new Error(`Unhandled value: ${JSON.stringify(value)}`);
}

/**
 * Assert condition with TypeScript narrowing
 */
export function assert(
	condition: unknown,
	message = "Assertion failed",
): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

/**
 * Assert value is defined (not null or undefined)
 */
export function assertDefined<T>(
	value: T | null | undefined,
	message = "Value is not defined",
): asserts value is T {
	if (value === null || value === undefined) {
		throw new Error(message);
	}
}

/**
 * Type predicate for non-nullable values
 */
export function isDefined<T>(value: T | null | undefined): value is T {
	return value !== null && value !== undefined;
}

/**
 * Filter out null/undefined values from array
 */
export function filterDefined<T>(array: Array<T | null | undefined>): T[] {
	return array.filter(isDefined);
}

/**
 * Pick specific keys from object
 */
export function pick<T extends object, K extends keyof T>(
	obj: T,
	keys: K[],
): Pick<T, K> {
	const result = {} as Pick<T, K>;
	for (const key of keys) {
		if (key in obj) {
			result[key] = obj[key];
		}
	}
	return result;
}

/**
 * Omit specific keys from object
 */
export function omit<T extends object, K extends keyof T>(
	obj: T,
	keys: K[],
): Omit<T, K> {
	const result = { ...obj };
	for (const key of keys) {
		delete result[key];
	}
	return result as Omit<T, K>;
}

/**
 * Sleep/delay utility
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry operation with exponential backoff
 */
export async function retry<T>(
	fn: () => Promise<T>,
	options: {
		maxAttempts?: number;
		delay?: number;
		backoffFactor?: number;
		onError?: (error: unknown, attempt: number) => void;
	} = {},
): Promise<T> {
	const { maxAttempts = 3, delay = 1000, backoffFactor = 2, onError } = options;

	let lastError: unknown;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;
			onError?.(error, attempt);

			if (attempt < maxAttempts) {
				const waitTime = delay * backoffFactor ** (attempt - 1);
				await sleep(waitTime);
			}
		}
	}

	throw lastError;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
	fn: T,
	delay: number,
): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout>;

	return (...args: Parameters<T>) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(...args), delay);
	};
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
	fn: T,
	limit: number,
): (...args: Parameters<T>) => void {
	let inThrottle = false;

	return (...args: Parameters<T>) => {
		if (!inThrottle) {
			fn(...args);
			inThrottle = true;
			setTimeout(() => {
				inThrottle = false;
			}, limit);
		}
	};
}

/**
 * Memoize function results
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
	fn: T,
	keyFn?: (...args: Parameters<T>) => string,
): T {
	const cache = new Map<string, ReturnType<T>>();

	return ((...args: Parameters<T>) => {
		const key = keyFn ? keyFn(...args) : JSON.stringify(args);

		const cached = cache.get(key);
		if (cached !== undefined) {
			return cached;
		}

		const result = fn(...args) as ReturnType<T>;
		cache.set(key, result);
		return result;
	}) as T;
}
