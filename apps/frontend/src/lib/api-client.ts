import type {
	ApiResponse,
	AssistantMessage,
	AuthRequest,
	AuthResponse,
	ChatMessage,
	ChatRequest,
	Citation,
	LiteratureSearchRequest,
	PaginatedResponse,
} from "@angstromscd/shared-types";
import {
	isApiErrorResponse,
	isApiSuccessResponse,
} from "@angstromscd/shared-types";

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Custom error class for API errors
export class ApiClientError extends Error {
	constructor(
		message: string,
		public code: string,
		public statusCode: number,
		public details?: unknown,
	) {
		super(message);
		this.name = "ApiClientError";
	}
}

// Type-safe fetch wrapper
async function fetchApi<T>(
	endpoint: string,
	options?: RequestInit,
): Promise<T> {
	const url = `${API_BASE_URL}${endpoint}`;

	try {
		const response = await fetch(url, {
			...options,
			headers: {
				"Content-Type": "application/json",
				...options?.headers,
			},
		});

		// Handle 204 No Content response
		if (response.status === 204) {
			return {} as T;
		}

		// Check if response has JSON content
		const contentType = response.headers.get("content-type");
		if (!contentType || !contentType.includes("application/json")) {
			throw new ApiClientError(
				"Response is not JSON",
				"INVALID_CONTENT_TYPE",
				response.status,
			);
		}

		const data = (await response.json()) as ApiResponse<T>;

		if (!response.ok || isApiErrorResponse(data)) {
			const error = isApiErrorResponse(data)
				? data.error
				: {
						code: "UNKNOWN_ERROR",
						message: "An unknown error occurred",
						timestamp: new Date().toISOString(),
					};

			throw new ApiClientError(
				error.message,
				error.code,
				response.status,
				error.details,
			);
		}

		if (isApiSuccessResponse(data)) {
			return data.data;
		}

		throw new ApiClientError(
			"Invalid API response format",
			"INVALID_RESPONSE",
			500,
		);
	} catch (error) {
		if (error instanceof ApiClientError) {
			throw error;
		}

		if (error instanceof TypeError && error.message.includes("fetch")) {
			throw new ApiClientError(
				"Network error - unable to connect to API",
				"NETWORK_ERROR",
				0,
			);
		}

		throw new ApiClientError(
			error instanceof Error ? error.message : "Unknown error",
			"UNKNOWN_ERROR",
			500,
		);
	}
}

// Authentication token management
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
	authToken = token;
	if (token) {
		localStorage.setItem("auth_token", token);
	} else {
		localStorage.removeItem("auth_token");
	}
}

export function getAuthToken(): string | null {
	if (!authToken) {
		authToken = localStorage.getItem("auth_token");
	}
	return authToken;
}

// Authenticated fetch wrapper
async function fetchApiAuth<T>(
	endpoint: string,
	options?: RequestInit,
): Promise<T> {
	const token = getAuthToken();
	if (!token) {
		throw new ApiClientError("Authentication required", "UNAUTHENTICATED", 401);
	}

	return fetchApi<T>(endpoint, {
		...options,
		headers: {
			...options?.headers,
			Authorization: `Bearer ${token}`,
		},
	});
}

// API client methods
export const apiClient = {
	// Health check
	async health(): Promise<{ status: string; timestamp: string }> {
		return fetchApi("/health");
	},

	async healthDb(): Promise<{ status: string; database: string }> {
		return fetchApi("/health/db");
	},

	// Authentication
	async signup(data: AuthRequest): Promise<AuthResponse> {
		const response = await fetchApi<AuthResponse>("/auth/signup", {
			method: "POST",
			body: JSON.stringify(data),
		});

		if (response.session?.token) {
			setAuthToken(response.session.token);
		}

		return response;
	},

	async login(data: AuthRequest): Promise<AuthResponse> {
		const response = await fetchApi<AuthResponse>("/auth/login", {
			method: "POST",
			body: JSON.stringify(data),
		});

		if (response.session?.token) {
			setAuthToken(response.session.token);
		}

		return response;
	},

	async logout(): Promise<void> {
		setAuthToken(null);
		// Could also call a logout endpoint if needed
	},

	// Chat/AI interactions
	async chat(data: ChatRequest): Promise<AssistantMessage> {
		return fetchApiAuth<AssistantMessage>("/api/chat", {
			method: "POST",
			body: JSON.stringify(data),
		});
	},

	// Messages
	async getMessages(params?: {
		threadId?: string;
		limit?: number;
		offset?: number;
	}): Promise<{
		messages: Array<{
			id: string;
			content: string;
			sender: "user" | "ai";
			created_at: string;
		}>;
		pagination: {
			total: number;
			limit: number;
			offset: number;
			hasMore: boolean;
		};
	}> {
		const searchParams = new URLSearchParams();
		if (params?.threadId) searchParams.set("thread_id", params.threadId);
		if (params?.limit) searchParams.set("limit", params.limit.toString());
		if (params?.offset !== undefined)
			searchParams.set("offset", params.offset.toString());

		const query = searchParams.toString();
		return fetchApiAuth(`/api/messages${query ? `?${query}` : ""}`);
	},

	async createMessage(data: {
		content: string;
		thread_id?: string;
	}): Promise<{ message: ChatMessage }> {
		return fetchApiAuth("/api/messages", {
			method: "POST",
			body: JSON.stringify(data),
		});
	},

	// Literature search
	async searchLiterature(
		data: LiteratureSearchRequest,
	): Promise<PaginatedResponse<Citation>> {
		return fetchApiAuth<PaginatedResponse<Citation>>("/api/literature/search", {
			method: "POST",
			body: JSON.stringify(data),
		});
	},
};

// React Query hooks would go here in a real application
// export const useHealth = () => useQuery(['health'], apiClient.health)
// export const useLogin = () => useMutation(apiClient.login)
