/**
 * API request and response types with discriminated unions
 */

import type { Citation } from "./medical";

// Re-export medical types that are used in API types
export type {
	Patient,
	VOEEpisode,
	Citation,
	RiskAssessment,
	LabResult,
} from "./medical";

/**
 * Base API response with discriminated union
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Successful API response
 */
export interface ApiSuccessResponse<T> {
	success: true;
	data: T;
	meta?: ResponseMeta;
}

/**
 * Error API response
 */
export interface ApiErrorResponse {
	success: false;
	error: ApiError;
	meta?: ResponseMeta;
}

/**
 * API error structure
 */
export interface ApiError {
	code: string;
	message: string;
	details?: unknown;
	timestamp: string;
	requestId?: string;
}

/**
 * Response metadata
 */
export interface ResponseMeta {
	requestId: string;
	timestamp: string;
	version: string;
	pagination?: PaginationMeta;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
	page: number;
	limit: number;
	total: number;
	hasNext: boolean;
	hasPrev: boolean;
}

/**
 * Chat message types
 */
export type ChatMessage = UserMessage | AssistantMessage | SystemMessage;

export interface BaseMessage {
	id: string;
	timestamp: string;
	workspaceId?: string;
}

export interface UserMessage extends BaseMessage {
	role: "user";
	content: string;
	attachments?: MessageAttachment[];
}

export interface AssistantMessage extends BaseMessage {
	role: "assistant";
	content: string;
	citations?: Citation[];
	dataVisualizations?: DataVisualization[];
	modelUsed?: string;
}

export interface SystemMessage extends BaseMessage {
	role: "system";
	content: string;
	type: "info" | "warning" | "error";
}

/**
 * Message attachment
 */
export interface MessageAttachment {
	id: string;
	type: "document" | "image" | "dataset";
	name: string;
	url?: string;
	size?: number;
	mimeType?: string;
}

/**
 * Data visualization
 */
export interface DataVisualization {
	id: string;
	type: "chart" | "table" | "graph";
	title: string;
	data: unknown;
	config?: unknown;
}

/**
 * Chat request types
 */
export interface ChatRequest {
	message: string;
	workspaceId?: string;
	conversationId?: string;
	model?: import("./constants").AllModelNames;
	provider?: import("./constants").ProviderName;
	temperature?: number;
	maxTokens?: number;
	context?: ChatContext;
}

/**
 * AI model options
 */
export interface AIModel {
	provider: import("./constants").ModelProvider;
	model: import("./constants").AllModelNames;
	temperature?: number;
	maxTokens?: number;
}

/**
 * Chat context
 */
export interface ChatContext {
	patientId?: string;
	citations?: string[]; // Citation IDs
	previousMessages?: number; // Number of previous messages to include
}

/**
 * Chat response
 */
export interface ChatResponse {
	content: string;
	model: import("./constants").AllModelNames;
	provider: import("./constants").ProviderName;
	citations?: Citation[];
	visualizations?: DataVisualization[];
	attachments?: MessageAttachment[];
	tokenUsage?: TokenUsage;
}

/**
 * Token usage information
 */
export interface TokenUsage {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
}

/**
 * Literature search request
 */
export interface LiteratureSearchRequest {
	query: string;
	filters?: LiteratureFilters;
	limit?: number;
	offset?: number;
}

/**
 * Literature search filters
 */
export interface LiteratureFilters {
	dateRange?: {
		start: string;
		end: string;
	};
	citationType?: string[];
	journals?: string[];
	authors?: string[];
	minRelevanceScore?: number;
}

/**
 * Patient data requests
 */
export interface PatientDataRequest {
	patientId: string;
	dataTypes: PatientDataType[];
	dateRange?: {
		start: string;
		end: string;
	};
}

/**
 * Patient data types
 */
export type PatientDataType =
	| "demographics"
	| "voe_episodes"
	| "lab_results"
	| "medications"
	| "risk_assessments";

/**
 * VOE risk assessment request
 */
export interface VOERiskRequest {
	patientId: string;
	includeFactors?: boolean;
	includeRecommendations?: boolean;
}

/**
 * Batch operations
 */
export interface BatchOperation<T> {
	operations: Array<{
		id: string;
		method: "GET" | "POST" | "PUT" | "DELETE";
		path: string;
		body?: T;
	}>;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult<T> {
	results: Array<{
		id: string;
		status: number;
		response: ApiResponse<T>;
	}>;
}

/**
 * WebSocket message types
 */
export type WebSocketMessage =
	| WSConnectionMessage
	| WSChatMessage
	| WSNotificationMessage
	| WSErrorMessage;

export interface WSConnectionMessage {
	type: "connection";
	status: "connected" | "disconnected" | "reconnecting";
	sessionId?: string;
}

export interface WSChatMessage {
	type: "chat";
	message: ChatMessage;
	conversationId: string;
}

export interface WSNotificationMessage {
	type: "notification";
	notification: {
		id: string;
		title: string;
		message: string;
		severity: "info" | "warning" | "error" | "success";
		timestamp: string;
	};
}

export interface WSErrorMessage {
	type: "error";
	error: ApiError;
}

/**
 * Authentication types
 */
export interface AuthRequest {
	type: "password" | "oauth" | "sso";
	credentials?: {
		email: string;
		password: string;
	};
	provider?: "google" | "microsoft" | "okta";
	token?: string;
}

export interface AuthResponse {
	accessToken: string;
	refreshToken?: string;
	expiresIn: number;
	user: AuthUser;
}

export interface AuthUser {
	id: string;
	email: string;
	name: string;
	role: UserRole;
	permissions: string[];
	organization?: string;
}

export type UserRole = "admin" | "clinician" | "researcher" | "viewer";

/**
 * File upload types
 */
export interface FileUploadRequest {
	file: File;
	type: "document" | "dataset" | "image";
	metadata?: Record<string, unknown>;
}

export interface FileUploadResponse {
	id: string;
	url: string;
	name: string;
	size: number;
	mimeType: string;
	uploadedAt: string;
}

/**
 * Export request types
 */
export interface ExportRequest {
	format: "json" | "csv" | "pdf" | "excel";
	data: ExportDataType;
	filters?: Record<string, unknown>;
	options?: ExportOptions;
}

export type ExportDataType =
	| "patient_data"
	| "voe_episodes"
	| "lab_results"
	| "literature_citations"
	| "chat_history";

export interface ExportOptions {
	includeMetadata?: boolean;
	dateFormat?: string;
	timezone?: string;
	language?: string;
}
