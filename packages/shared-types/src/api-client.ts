/**
 * Type-safe API client configuration and utilities
 */

import type {
	ApiResponse,
	ChatMessage,
	Citation,
	LiteratureSearchRequest,
	Patient,
	RiskAssessment,
	VOEEpisode,
} from "./api";
import { AppError, ErrorUtils } from "./errors";
import type { PaginatedResponse } from "./utils";

/**
 * API client configuration
 */
export interface ApiClientConfig {
	baseUrl: string;
	headers?: Record<string, string>;
	timeout?: number;
	onError?: (error: AppError) => void;
	onRequest?: (config: RequestInit) => RequestInit | Promise<RequestInit>;
}

/**
 * Type-safe fetch wrapper
 */
export async function fetchApi<T>(
	url: string,
	options?: RequestInit,
	config?: ApiClientConfig,
): Promise<T> {
	const controller = new AbortController();
	const timeoutId = config?.timeout
		? setTimeout(() => controller.abort(), config.timeout)
		: undefined;

	try {
		// Apply request interceptor if provided
		const finalOptions = config?.onRequest
			? await config.onRequest({ ...options, signal: controller.signal })
			: { ...options, signal: controller.signal };

		const response = await fetch(`${config?.baseUrl || ""}${url}`, {
			...finalOptions,
			headers: {
				"Content-Type": "application/json",
				...config?.headers,
				...finalOptions.headers,
			},
		});

		if (timeoutId) clearTimeout(timeoutId);

		const data = (await response.json()) as T;

		if (!response.ok) {
			const errorData = data as unknown as { error?: { message?: string } };
			const error = ErrorUtils.fromUnknown(
				new Error(errorData.error?.message || "API request failed"),
			);
			config?.onError?.(error);
			throw error;
		}

		return data as T;
	} catch (error) {
		if (timeoutId) clearTimeout(timeoutId);

		if (error instanceof Error && error.name === "AbortError") {
			const timeoutError = new AppError(
				"Request timeout",
				"TIMEOUT_ERROR",
				408,
			);
			config?.onError?.(timeoutError);
			throw timeoutError;
		}

		const appError = ErrorUtils.fromUnknown(error);
		config?.onError?.(appError);
		throw appError;
	}
}

/**
 * Type-safe API response handler
 */
export async function handleApiResponse<T>(
	response: ApiResponse<T>,
): Promise<T> {
	if (response.success) {
		return response.data;
	} else {
		throw ErrorUtils.fromUnknown(response.error);
	}
}

/**
 * API endpoint definitions with proper types
 */
export interface ApiEndpoints {
	// Chat endpoints
	chat: {
		send: (
			message: string,
			conversationId?: string,
		) => Promise<ApiResponse<ChatMessage>>;
		getHistory: (conversationId: string) => Promise<ApiResponse<ChatMessage[]>>;
	};

	// Literature endpoints
	literature: {
		search: (
			request: LiteratureSearchRequest,
		) => Promise<ApiResponse<PaginatedResponse<Citation>>>;
		getById: (id: string) => Promise<ApiResponse<Citation>>;
		getBatch: (ids: string[]) => Promise<ApiResponse<Citation[]>>;
	};

	// Patient endpoints
	patients: {
		getAll: () => Promise<ApiResponse<Patient[]>>;
		getById: (id: string) => Promise<ApiResponse<Patient>>;
		create: (
			patient: Omit<Patient, "id" | "createdAt" | "updatedAt">,
		) => Promise<ApiResponse<Patient>>;
		update: (
			id: string,
			updates: Partial<Patient>,
		) => Promise<ApiResponse<Patient>>;
		delete: (id: string) => Promise<ApiResponse<void>>;
	};

	// VOE endpoints
	voeEpisodes: {
		getByPatient: (patientId: string) => Promise<ApiResponse<VOEEpisode[]>>;
		create: (
			episode: Omit<VOEEpisode, "id" | "createdAt" | "updatedAt">,
		) => Promise<ApiResponse<VOEEpisode>>;
		update: (
			id: string,
			updates: Partial<VOEEpisode>,
		) => Promise<ApiResponse<VOEEpisode>>;
	};

	// Risk assessment endpoints
	riskAssessments: {
		calculate: (
			patientId: string,
			type: string,
		) => Promise<ApiResponse<RiskAssessment>>;
		getHistory: (patientId: string) => Promise<ApiResponse<RiskAssessment[]>>;
	};
}

/**
 * Create typed API client
 */
export function createApiClient(config: ApiClientConfig): ApiEndpoints {
	return {
		chat: {
			send: (message, conversationId) =>
				fetchApi(
					"/api/chat",
					{
						method: "POST",
						body: JSON.stringify({ message, conversationId }),
					},
					config,
				),

			getHistory: (conversationId) =>
				fetchApi(`/api/chat/history/${conversationId}`, undefined, config),
		},

		literature: {
			search: (request) =>
				fetchApi(
					"/api/literature/search",
					{
						method: "POST",
						body: JSON.stringify(request),
					},
					config,
				),

			getById: (id) => fetchApi(`/api/literature/${id}`, undefined, config),

			getBatch: (ids) =>
				fetchApi(
					"/api/literature/batch",
					{
						method: "POST",
						body: JSON.stringify({ ids }),
					},
					config,
				),
		},

		patients: {
			getAll: () => fetchApi("/api/patients", undefined, config),

			getById: (id) => fetchApi(`/api/patients/${id}`, undefined, config),

			create: (patient) =>
				fetchApi(
					"/api/patients",
					{
						method: "POST",
						body: JSON.stringify(patient),
					},
					config,
				),

			update: (id, updates) =>
				fetchApi(
					`/api/patients/${id}`,
					{
						method: "PATCH",
						body: JSON.stringify(updates),
					},
					config,
				),

			delete: (id) =>
				fetchApi(
					`/api/patients/${id}`,
					{
						method: "DELETE",
					},
					config,
				),
		},

		voeEpisodes: {
			getByPatient: (patientId) =>
				fetchApi(`/api/voe-episodes?patientId=${patientId}`, undefined, config),

			create: (episode) =>
				fetchApi(
					"/api/voe-episodes",
					{
						method: "POST",
						body: JSON.stringify(episode),
					},
					config,
				),

			update: (id, updates) =>
				fetchApi(
					`/api/voe-episodes/${id}`,
					{
						method: "PATCH",
						body: JSON.stringify(updates),
					},
					config,
				),
		},

		riskAssessments: {
			calculate: (patientId, type) =>
				fetchApi(
					"/api/risk-assessments/calculate",
					{
						method: "POST",
						body: JSON.stringify({ patientId, type }),
					},
					config,
				),

			getHistory: (patientId) =>
				fetchApi(
					`/api/risk-assessments?patientId=${patientId}`,
					undefined,
					config,
				),
		},
	};
}
