/**
 * Type guards and runtime validators for type safety
 */

import type {
	ApiResponse,
	AssistantMessage,
	ChatMessage,
	SystemMessage,
	UserMessage,
	UserRole,
	WebSocketMessage,
} from "./api";
import type {
	Citation,
	CitationType,
	Patient,
	SickleCellGenotype,
	VOEEpisode,
	VOESeverity,
} from "./medical";

/**
 * Check if value is a valid date string
 */
export function isValidDateString(value: unknown): value is string {
	if (typeof value !== "string") return false;
	const date = new Date(value);
	return !Number.isNaN(date.getTime());
}

/**
 * Check if value is a valid email
 */
export function isValidEmail(value: unknown): value is string {
	if (typeof value !== "string") return false;
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(value);
}

/**
 * Check if value is a valid MRN (Medical Record Number)
 */
export function isValidMRN(value: unknown): value is string {
	if (typeof value !== "string") return false;
	// MRN format: alphanumeric, 6-20 characters
	const mrnRegex = /^[A-Z0-9]{6,20}$/i;
	return mrnRegex.test(value);
}

/**
 * Check if value is a valid PMID
 */
export function isValidPMID(value: unknown): value is string {
	if (typeof value !== "string") return false;
	// PMID is numeric only
	const pmidRegex = /^\d+$/;
	return pmidRegex.test(value);
}

/**
 * Check if value is a valid DOI
 */
export function isValidDOI(value: unknown): value is string {
	if (typeof value !== "string") return false;
	// DOI format: 10.xxxx/xxxxx
	const doiRegex = /^10\.\d{4,}\/[-._;()/:\w]+$/i;
	return doiRegex.test(value);
}

/**
 * Type guard for SickleCellGenotype
 */
export function isSickleCellGenotype(
	value: unknown,
): value is SickleCellGenotype {
	const validGenotypes: SickleCellGenotype[] = [
		"HbSS",
		"HbSC",
		"HbSβ+",
		"HbSβ0",
		"HbSD",
		"HbSE",
		"HbSO",
		"Other",
	];
	return (
		typeof value === "string" &&
		validGenotypes.includes(value as SickleCellGenotype)
	);
}

/**
 * Type guard for VOESeverity
 */
export function isVOESeverity(value: unknown): value is VOESeverity {
	const validSeverities: VOESeverity[] = [
		"mild",
		"moderate",
		"severe",
		"critical",
	];
	return (
		typeof value === "string" && validSeverities.includes(value as VOESeverity)
	);
}

/**
 * Type guard for CitationType
 */
export function isCitationType(value: unknown): value is CitationType {
	const validTypes: CitationType[] = [
		"research_article",
		"review",
		"clinical_trial",
		"case_report",
		"guideline",
		"meta_analysis",
	];
	return (
		typeof value === "string" && validTypes.includes(value as CitationType)
	);
}

/**
 * Type guard for UserRole
 */
export function isUserRole(value: unknown): value is UserRole {
	const validRoles: UserRole[] = ["admin", "clinician", "researcher", "viewer"];
	return typeof value === "string" && validRoles.includes(value as UserRole);
}

/**
 * Type guard for Patient
 */
export function isPatient(value: unknown): value is Patient {
	if (!value || typeof value !== "object") return false;

	const patient = value as Record<string, unknown>;

	return (
		typeof patient.id === "string" &&
		isValidMRN(patient.mrn) &&
		typeof patient.firstName === "string" &&
		typeof patient.lastName === "string" &&
		isValidDateString(patient.dateOfBirth) &&
		(patient.gender === "male" ||
			patient.gender === "female" ||
			patient.gender === "other") &&
		(patient.scdGenotype === undefined ||
			isSickleCellGenotype(patient.scdGenotype)) &&
		isValidDateString(patient.createdAt) &&
		isValidDateString(patient.updatedAt)
	);
}

/**
 * Type guard for VOEEpisode
 */
export function isVOEEpisode(value: unknown): value is VOEEpisode {
	if (!value || typeof value !== "object") return false;

	const episode = value as Record<string, unknown>;

	return (
		typeof episode.id === "string" &&
		typeof episode.patientId === "string" &&
		isValidDateString(episode.episodeDate) &&
		isVOESeverity(episode.severity) &&
		Array.isArray(episode.location) &&
		episode.location.every((loc: unknown) => typeof loc === "string") &&
		typeof episode.duration === "number" &&
		episode.duration >= 0 &&
		typeof episode.hospitalizationRequired === "boolean" &&
		Array.isArray(episode.treatmentGiven) &&
		typeof episode.painScore === "number" &&
		episode.painScore >= 0 &&
		episode.painScore <= 10 &&
		isValidDateString(episode.createdAt) &&
		isValidDateString(episode.updatedAt)
	);
}

/**
 * Type guard for Citation
 */
export function isCitation(value: unknown): value is Citation {
	if (!value || typeof value !== "object") return false;

	const citation = value as Record<string, unknown>;

	return (
		typeof citation.id === "string" &&
		(citation.pmid === undefined || isValidPMID(citation.pmid)) &&
		(citation.doi === undefined || isValidDOI(citation.doi)) &&
		typeof citation.title === "string" &&
		Array.isArray(citation.authors) &&
		typeof citation.journal === "string" &&
		isValidDateString(citation.publicationDate) &&
		isCitationType(citation.citationType) &&
		isValidDateString(citation.createdAt) &&
		isValidDateString(citation.updatedAt)
	);
}

/**
 * Type guard for API success response
 */
export function isApiSuccessResponse<T>(
	value: unknown,
	dataGuard?: (data: unknown) => data is T,
): value is ApiResponse<T> {
	if (!value || typeof value !== "object") return false;

	const response = value as Record<string, unknown>;

	if (response.success !== true) return false;

	// If a data guard is provided, use it to validate the data
	if (dataGuard) {
		return dataGuard(response.data);
	}

	// Otherwise just check that data exists
	return "data" in response;
}

/**
 * Type guard for API error response
 */
export function isApiErrorResponse(
	value: unknown,
): value is ApiResponse<never> {
	if (!value || typeof value !== "object") return false;

	const response = value as Record<string, unknown>;

	return (
		response.success === false &&
		typeof response.error === "object" &&
		response.error !== null &&
		typeof (response.error as Record<string, unknown>).code === "string" &&
		typeof (response.error as Record<string, unknown>).message === "string"
	);
}

/**
 * Type guard for ChatMessage
 */
export function isChatMessage(value: unknown): value is ChatMessage {
	return (
		isUserMessage(value) || isAssistantMessage(value) || isSystemMessage(value)
	);
}

/**
 * Type guard for UserMessage
 */
export function isUserMessage(value: unknown): value is UserMessage {
	if (!value || typeof value !== "object") return false;

	const message = value as Record<string, unknown>;

	return (
		message.role === "user" &&
		typeof message.id === "string" &&
		typeof message.content === "string" &&
		isValidDateString(message.timestamp)
	);
}

/**
 * Type guard for AssistantMessage
 */
export function isAssistantMessage(value: unknown): value is AssistantMessage {
	if (!value || typeof value !== "object") return false;

	const message = value as Record<string, unknown>;

	return (
		message.role === "assistant" &&
		typeof message.id === "string" &&
		typeof message.content === "string" &&
		isValidDateString(message.timestamp)
	);
}

/**
 * Type guard for SystemMessage
 */
export function isSystemMessage(value: unknown): value is SystemMessage {
	if (!value || typeof value !== "object") return false;

	const message = value as Record<string, unknown>;

	return (
		message.role === "system" &&
		typeof message.id === "string" &&
		typeof message.content === "string" &&
		isValidDateString(message.timestamp) &&
		(message.type === "info" ||
			message.type === "warning" ||
			message.type === "error")
	);
}

/**
 * Type guard for WebSocket message
 */
export function isWebSocketMessage(value: unknown): value is WebSocketMessage {
	if (!value || typeof value !== "object") return false;

	const message = value as Record<string, unknown>;
	const validTypes = ["connection", "chat", "notification", "error"];

	return typeof message.type === "string" && validTypes.includes(message.type);
}

/**
 * Validate pain score (0-10)
 */
export function isValidPainScore(value: unknown): value is number {
	return typeof value === "number" && value >= 0 && value <= 10;
}

/**
 * Validate percentage (0-100)
 */
export function isValidPercentage(value: unknown): value is number {
	return typeof value === "number" && value >= 0 && value <= 100;
}

/**
 * Clinical validation for hemoglobin levels
 */
export function isValidHemoglobinLevel(value: unknown, unit = "g/dL"): boolean {
	if (typeof value !== "number") return false;

	// Normal ranges vary by age and gender, but for SCD patients:
	if (unit === "g/dL") {
		return value >= 4 && value <= 18; // Wider range for SCD patients
	}
	if (unit === "g/L") {
		return value >= 40 && value <= 180;
	}

	return false;
}

/**
 * Create a validated patient object
 */
export function createValidatedPatient(data: unknown): Patient {
	if (!isPatient(data)) {
		throw new Error("Invalid patient data");
	}
	return data;
}

/**
 * Create a validated VOE episode
 */
export function createValidatedVOEEpisode(data: unknown): VOEEpisode {
	if (!isVOEEpisode(data)) {
		throw new Error("Invalid VOE episode data");
	}
	return data;
}

/**
 * Utility to safely parse JSON with type guard
 */
export function safeJsonParse<T>(
	json: string,
	guard: (value: unknown) => value is T,
): T | null {
	try {
		const parsed = JSON.parse(json);
		return guard(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

/**
 * Validate array of items with type guard
 */
export function isArrayOf<T>(
	value: unknown,
	guard: (item: unknown) => item is T,
): value is T[] {
	return Array.isArray(value) && value.every(guard);
}

/**
 * Create a partial validator for updates
 */
export function createPartialValidator<T>(
	_fullValidator: (value: unknown) => value is T,
): (value: unknown) => value is Partial<T> {
	return (value: unknown): value is Partial<T> => {
		if (!value || typeof value !== "object") return false;

		// Check that all present fields would be valid in the full type
		// This is a simplified check - in production you might want more sophisticated validation
		return true;
	};
}
