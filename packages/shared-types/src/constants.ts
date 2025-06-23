/**
 * Constants and configurations using modern TypeScript features
 */

/**
 * Model provider configuration with const assertion
 */
export const MODEL_PROVIDERS = {
	openai: {
		name: "OpenAI",
		models: ["gpt-4o", "gpt-4o-mini"] as const,
		endpoint: "https://api.openai.com/v1",
	},
	anthropic: {
		name: "Anthropic",
		models: ["claude-3.5-sonnet", "claude-3-haiku"] as const,
		endpoint: "https://api.anthropic.com/v1",
	},
	ollama: {
		name: "Ollama",
		models: ["qwen2.5:0.5b", "llama3.2:3b", "mixtral:8x7b"] as const,
		endpoint: "http://localhost:11434",
	},
	apple: {
		name: "Apple Foundation",
		models: ["foundation"] as const,
		endpoint: "http://localhost:3004",
	},
} as const;

// Extract types from const assertion
export type ModelProvider = keyof typeof MODEL_PROVIDERS;
export type ProviderName = ModelProvider; // Alias for backward compatibility
export type ModelName<T extends ModelProvider> =
	(typeof MODEL_PROVIDERS)[T]["models"][number];

// Create a mapping from model name to provider
export const MODEL_TO_PROVIDER_MAP = {
	"gpt-4o": "openai",
	"gpt-4o-mini": "openai",
	"claude-3.5-sonnet": "anthropic",
	"claude-3-haiku": "anthropic",
	"qwen2.5:0.5b": "ollama",
	"llama3.2:3b": "ollama",
	"mixtral:8x7b": "ollama",
	foundation: "apple",
} as const;

export type AllModelNames = keyof typeof MODEL_TO_PROVIDER_MAP;

/**
 * API route configuration with template literal types
 */
export type ApiVersion = "v1" | "v2";
export type ApiResource =
	| "chat"
	| "patients"
	| "voe-episodes"
	| "literature"
	| "risk-assessments";
export type ApiAction =
	| "list"
	| "get"
	| "create"
	| "update"
	| "delete"
	| "search";

// Template literal type for API routes
export type ApiRoute<
	V extends ApiVersion = "v1",
	R extends ApiResource = ApiResource,
	A extends ApiAction = ApiAction,
> = `/api/${V}/${R}${A extends "list" ? "" : `/${A}`}`;

// Examples of generated types:
// type ChatRoute = ApiRoute<'v1', 'chat', 'create'>; // "/api/v1/chat/create"
// type PatientListRoute = ApiRoute<'v1', 'patients', 'list'>; // "/api/v1/patients"

/**
 * Medical code systems with const assertion
 */
export const MEDICAL_CODE_SYSTEMS = {
	ICD10: {
		name: "ICD-10",
		url: "http://hl7.org/fhir/sid/icd-10",
		sickleCellCodes: ["D57.0", "D57.1", "D57.2", "D57.8"] as const,
	},
	SNOMED: {
		name: "SNOMED CT",
		url: "http://snomed.info/sct",
		sickleCellCodes: ["417357006", "417517009", "417748003"] as const,
	},
	LOINC: {
		name: "LOINC",
		url: "http://loinc.org",
		hemoglobinTests: ["718-7", "30313-1", "4548-4"] as const,
	},
} as const;

// Extract specific code types
export type ICD10Code =
	(typeof MEDICAL_CODE_SYSTEMS.ICD10.sickleCellCodes)[number];
export type SNOMEDCode =
	(typeof MEDICAL_CODE_SYSTEMS.SNOMED.sickleCellCodes)[number];
export type LOINCCode =
	(typeof MEDICAL_CODE_SYSTEMS.LOINC.hemoglobinTests)[number];

/**
 * Environment configuration with satisfies operator
 */
interface EnvironmentConfig {
	name: string;
	apiUrl: string;
	features: {
		analytics: boolean;
		aiModels: boolean;
		export: boolean;
	};
}

export const ENVIRONMENTS = {
	development: {
		name: "Development",
		apiUrl: "http://localhost:3001",
		features: {
			analytics: false,
			aiModels: true,
			export: true,
		},
	},
	staging: {
		name: "Staging",
		apiUrl: "https://staging-api.angstromscd.com",
		features: {
			analytics: true,
			aiModels: true,
			export: true,
		},
	},
	production: {
		name: "Production",
		apiUrl: "https://api.angstromscd.com",
		features: {
			analytics: true,
			aiModels: true,
			export: false,
		},
	},
} as const satisfies Record<string, EnvironmentConfig>;

/**
 * VOE severity mapping with const assertion
 */
export const VOE_SEVERITY_CONFIG = {
	mild: {
		painScoreRange: [1, 3] as const,
		color: "#10b981",
		hospitalizationLikelihood: 0.1,
	},
	moderate: {
		painScoreRange: [4, 6] as const,
		color: "#f59e0b",
		hospitalizationLikelihood: 0.4,
	},
	severe: {
		painScoreRange: [7, 8] as const,
		color: "#ef4444",
		hospitalizationLikelihood: 0.7,
	},
	critical: {
		painScoreRange: [9, 10] as const,
		color: "#991b1b",
		hospitalizationLikelihood: 0.95,
	},
} as const;

// Extract pain score ranges
export type PainScoreRange<S extends keyof typeof VOE_SEVERITY_CONFIG> =
	(typeof VOE_SEVERITY_CONFIG)[S]["painScoreRange"];

/**
 * Feature flags with const assertion
 */
export const FEATURE_FLAGS = {
	ENABLE_AI_CHAT: true,
	ENABLE_VECTOR_SEARCH: true,
	ENABLE_PATIENT_PORTAL: false,
	ENABLE_CLINICAL_TRIALS: false,
	ENABLE_EXPORT_PDF: true,
	ENABLE_MULTI_LANGUAGE: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
export type EnabledFeatures = {
	[K in FeatureFlag]: (typeof FEATURE_FLAGS)[K] extends true ? K : never;
}[FeatureFlag];

/**
 * Database table names with const assertion
 */
export const DB_TABLES = {
	patients: "scd_patients",
	voeEpisodes: "voe_episodes",
	citations: "literature_citations",
	labResults: "lab_results",
	riskAssessments: "risk_assessments",
	users: "users",
	conversations: "conversations",
	messages: "messages",
} as const;

export type TableName = (typeof DB_TABLES)[keyof typeof DB_TABLES];

/**
 * HTTP status codes with const assertion
 */
export const HTTP_STATUS = {
	OK: 200,
	CREATED: 201,
	NO_CONTENT: 204,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	CONFLICT: 409,
	TOO_MANY_REQUESTS: 429,
	INTERNAL_SERVER_ERROR: 500,
	BAD_GATEWAY: 502,
	SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatusCode = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];
