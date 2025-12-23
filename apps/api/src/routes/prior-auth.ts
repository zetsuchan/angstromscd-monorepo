import {
	type ApiResponse,
	type CreatePAClinicalData,
	type CreatePARequestData,
	type GenerateJustificationRequest,
	type GenerateJustificationResponse,
	type PAClinicalData,
	type PADetailResponse,
	type PADrugsResponse,
	type PAListResponse,
	type PAPayersResponse,
	type Payer,
	type PriorAuthRequest,
	type SCDDrug,
	type UpdatePARequestData,
	DatabaseError,
	ValidationError,
	errorToApiError,
	isAppError,
} from "@angstromscd/shared-types";
import { Hono } from "hono";
import { z } from "zod";
import { supabase } from "../lib/db";
import { getAuthUser } from "../middleware";

export const priorAuthRouter = new Hono();

// Type-safe wrapper for API responses
function createApiResponse<T>(data: T): ApiResponse<T> {
	return {
		success: true,
		data,
		meta: {
			requestId: crypto.randomUUID(),
			timestamp: new Date().toISOString(),
			version: "1.0.0",
		},
	};
}

function createErrorResponse(error: unknown): ApiResponse<never> {
	return {
		success: false,
		error: errorToApiError(error),
		meta: {
			requestId: crypto.randomUUID(),
			timestamp: new Date().toISOString(),
			version: "1.0.0",
		},
	};
}

// Validation schemas
const scdDrugIdSchema = z.enum(["adakveo", "endari", "oxbryta", "hydroxyurea"]);
const paStatusSchema = z.enum([
	"draft",
	"pending_info",
	"ready_to_submit",
	"submitted",
	"approved",
	"denied",
	"appeal",
	"expired",
]);
const paUrgencySchema = z.enum(["standard", "urgent", "expedited"]);

const createPARequestSchema = z.object({
	patient_id: z.string().uuid().optional(),
	drug_id: scdDrugIdSchema,
	payer_id: z.string().min(1, "Payer ID is required"),
	urgency: paUrgencySchema.default("standard"),
	diagnosis_codes: z.array(z.string()).optional(),
});

const updatePARequestSchema = z.object({
	status: paStatusSchema.optional(),
	diagnosis_codes: z.array(z.string()).optional(),
	urgency: paUrgencySchema.optional(),
	clinical_justification: z.string().optional(),
	payer_reference_number: z.string().optional(),
	denial_reason: z.string().optional(),
	appeal_deadline: z.string().optional(),
	submission_date: z.string().optional(),
	decision_date: z.string().optional(),
});

const clinicalDataSchema = z.object({
	scd_genotype: z.string().optional(),
	voe_history: z
		.object({
			total_episodes: z.number(),
			episodes_past_year: z.number(),
			average_severity: z.string().optional(),
			hospitalizations: z.number(),
			last_episode_date: z.string().optional(),
		})
		.optional(),
	current_therapies: z.array(z.string()),
	lab_results: z
		.object({
			hemoglobin: z.number().optional(),
			hemoglobin_f_percentage: z.number().optional(),
			reticulocyte_count: z.number().optional(),
			lactate_dehydrogenase: z.number().optional(),
			bilirubin: z.number().optional(),
			test_date: z.string().optional(),
		})
		.optional(),
	transfusion_history: z
		.object({
			requires_chronic_transfusion: z.boolean(),
			transfusions_past_year: z.number().optional(),
			last_transfusion_date: z.string().optional(),
		})
		.optional(),
	hospitalizations_past_year: z.number().optional(),
	failed_therapies: z.array(z.string()),
	contraindications: z.array(z.string()).optional(),
});

const generateJustificationSchema = z.object({
	clinical_data: clinicalDataSchema,
	tone: z.enum(["formal", "clinical", "detailed"]).optional(),
});

// ============================================
// Reference Data Endpoints (must be before /:id routes)
// ============================================

// Get SCD drugs
priorAuthRouter.get("/drugs", async (c) => {
	try {
		const { data, error } = await supabase.from("scd_drugs").select("*");

		if (error) {
			throw new DatabaseError("get drugs", error);
		}

		const response: PADrugsResponse = {
			drugs: data as SCDDrug[],
		};

		return c.json(createApiResponse(response));
	} catch (error) {
		const response = createErrorResponse(error);
		const statusCode = isAppError(error) ? error.statusCode : 500;
		return c.json(response, statusCode);
	}
});

// Get payers
priorAuthRouter.get("/payers", async (c) => {
	try {
		const { data, error } = await supabase.from("payers").select("*");

		if (error) {
			throw new DatabaseError("get payers", error);
		}

		const response: PAPayersResponse = {
			payers: data as Payer[],
		};

		return c.json(createApiResponse(response));
	} catch (error) {
		const response = createErrorResponse(error);
		const statusCode = isAppError(error) ? error.statusCode : 500;
		return c.json(response, statusCode);
	}
});

// Get drug requirements for specific payer
priorAuthRouter.get("/drugs/:drugId/requirements/:payerId", async (c) => {
	try {
		const drugId = c.req.param("drugId");
		const payerId = c.req.param("payerId");

		const { data: drug, error: drugError } = await supabase
			.from("scd_drugs")
			.select("*")
			.eq("id", drugId)
			.single();

		if (drugError || !drug) {
			throw new ValidationError("Drug not found");
		}

		const { data: payer, error: payerError } = await supabase
			.from("payers")
			.select("*")
			.eq("id", payerId)
			.single();

		if (payerError || !payer) {
			throw new ValidationError("Payer not found");
		}

		const paRequirements = payer.pa_requirements as {
			drugs?: Record<string, { documentation_required?: string[]; step_therapy?: string[]; required?: boolean; quantity_limits?: string; renewal_frequency?: string }>;
		};
		const drugRequirements = paRequirements?.drugs?.[drugId] || {
			required: false,
			documentation_required: [],
		};

		return c.json(
			createApiResponse({
				drug: drug as SCDDrug,
				payer: payer as Payer,
				requirements: drugRequirements,
			}),
		);
	} catch (error) {
		const response = createErrorResponse(error);
		const statusCode = isAppError(error) ? error.statusCode : 500;
		return c.json(response, statusCode);
	}
});

// ============================================
// PA Request CRUD Endpoints
// ============================================

// List PA requests
priorAuthRouter.get("/", async (c) => {
	try {
		const { id: userId } = getAuthUser(c);
		const page = Number.parseInt(c.req.query("page") || "1");
		const limit = Number.parseInt(c.req.query("limit") || "20");
		const status = c.req.query("status");
		const drugId = c.req.query("drug_id");

		const offset = (page - 1) * limit;

		// Build query
		let query = supabase
			.from("prior_auth_requests")
			.select("*", { count: "exact" })
			.eq("user_id", userId);

		if (status) {
			query = query.eq("status", status);
		}

		if (drugId) {
			query = query.eq("drug_id", drugId);
		}

		const { data, error, count } = await query
			.order("created_at", { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			throw new DatabaseError("list PA requests", error);
		}

		const response: PAListResponse = {
			requests: data as PriorAuthRequest[],
			total: count || 0,
			page,
			limit,
		};

		return c.json(createApiResponse(response));
	} catch (error) {
		const response = createErrorResponse(error);
		const statusCode = isAppError(error) ? error.statusCode : 500;
		return c.json(response, statusCode);
	}
});

// Create PA request
priorAuthRouter.post("/", async (c) => {
	try {
		const { id: userId } = getAuthUser(c);
		const body = await c.req.json();
		const parsed = createPARequestSchema.safeParse(body);

		if (!parsed.success) {
			throw new ValidationError("Invalid PA request data", parsed.error.flatten());
		}

		// Verify drug exists
		const { data: drug, error: drugError } = await supabase
			.from("scd_drugs")
			.select("id")
			.eq("id", parsed.data.drug_id)
			.single();

		if (drugError || !drug) {
			throw new ValidationError("Invalid drug ID");
		}

		// Verify payer exists
		const { data: payer, error: payerError } = await supabase
			.from("payers")
			.select("id")
			.eq("id", parsed.data.payer_id)
			.single();

		if (payerError || !payer) {
			throw new ValidationError("Invalid payer ID");
		}

		const { data, error } = await supabase
			.from("prior_auth_requests")
			.insert({
				user_id: userId,
				patient_id: parsed.data.patient_id,
				drug_id: parsed.data.drug_id,
				payer_id: parsed.data.payer_id,
				urgency: parsed.data.urgency,
				diagnosis_codes: parsed.data.diagnosis_codes || [],
				status: "draft",
			})
			.select()
			.single();

		if (error) {
			throw new DatabaseError("create PA request", error);
		}

		return c.json(createApiResponse({ request: data as PriorAuthRequest }));
	} catch (error) {
		const response = createErrorResponse(error);
		const statusCode = isAppError(error) ? error.statusCode : 500;
		return c.json(response, statusCode);
	}
});

// Get PA request details
priorAuthRouter.get("/:id", async (c) => {
	try {
		const { id: userId } = getAuthUser(c);
		const requestId = c.req.param("id");

		// Get PA request
		const { data: request, error: requestError } = await supabase
			.from("prior_auth_requests")
			.select("*")
			.eq("id", requestId)
			.eq("user_id", userId)
			.single();

		if (requestError) {
			throw new DatabaseError("get PA request", requestError);
		}

		if (!request) {
			throw new ValidationError("PA request not found");
		}

		// Get clinical data if exists
		const { data: clinicalData } = await supabase
			.from("pa_clinical_data")
			.select("*")
			.eq("pa_request_id", requestId)
			.single();

		// Get drug info
		const { data: drug } = await supabase
			.from("scd_drugs")
			.select("*")
			.eq("id", request.drug_id)
			.single();

		// Get payer info
		const { data: payer } = await supabase
			.from("payers")
			.select("*")
			.eq("id", request.payer_id)
			.single();

		const response: PADetailResponse = {
			request: request as PriorAuthRequest,
			clinical_data: clinicalData as PAClinicalData | undefined,
			drug: drug as SCDDrug | undefined,
			payer: payer as Payer | undefined,
		};

		return c.json(createApiResponse(response));
	} catch (error) {
		const response = createErrorResponse(error);
		const statusCode = isAppError(error) ? error.statusCode : 500;
		return c.json(response, statusCode);
	}
});

// Update PA request
priorAuthRouter.put("/:id", async (c) => {
	try {
		const { id: userId } = getAuthUser(c);
		const requestId = c.req.param("id");
		const body = await c.req.json();
		const parsed = updatePARequestSchema.safeParse(body);

		if (!parsed.success) {
			throw new ValidationError("Invalid update data", parsed.error.flatten());
		}

		// Verify ownership
		const { data: existing } = await supabase
			.from("prior_auth_requests")
			.select("id")
			.eq("id", requestId)
			.eq("user_id", userId)
			.single();

		if (!existing) {
			throw new ValidationError("PA request not found");
		}

		const { data, error } = await supabase
			.from("prior_auth_requests")
			.update(parsed.data)
			.eq("id", requestId)
			.eq("user_id", userId)
			.select()
			.single();

		if (error) {
			throw new DatabaseError("update PA request", error);
		}

		return c.json(createApiResponse({ request: data as PriorAuthRequest }));
	} catch (error) {
		const response = createErrorResponse(error);
		const statusCode = isAppError(error) ? error.statusCode : 500;
		return c.json(response, statusCode);
	}
});

// Delete PA request
priorAuthRouter.delete("/:id", async (c) => {
	try {
		const { id: userId } = getAuthUser(c);
		const requestId = c.req.param("id");

		const { error } = await supabase
			.from("prior_auth_requests")
			.delete()
			.eq("id", requestId)
			.eq("user_id", userId);

		if (error) {
			throw new DatabaseError("delete PA request", error);
		}

		return c.json(createApiResponse({ deleted: true }));
	} catch (error) {
		const response = createErrorResponse(error);
		const statusCode = isAppError(error) ? error.statusCode : 500;
		return c.json(response, statusCode);
	}
});

// ============================================
// Clinical Data Endpoints
// ============================================

// Add/update clinical data
priorAuthRouter.post("/:id/clinical-data", async (c) => {
	try {
		const { id: userId } = getAuthUser(c);
		const requestId = c.req.param("id");
		const body = await c.req.json();
		const parsed = clinicalDataSchema.safeParse(body);

		if (!parsed.success) {
			throw new ValidationError("Invalid clinical data", parsed.error.flatten());
		}

		// Verify PA request ownership
		const { data: request } = await supabase
			.from("prior_auth_requests")
			.select("id")
			.eq("id", requestId)
			.eq("user_id", userId)
			.single();

		if (!request) {
			throw new ValidationError("PA request not found");
		}

		// Check if clinical data already exists
		const { data: existing } = await supabase
			.from("pa_clinical_data")
			.select("id")
			.eq("pa_request_id", requestId)
			.single();

		let result;
		if (existing) {
			// Update existing
			const { data, error } = await supabase
				.from("pa_clinical_data")
				.update({
					...parsed.data,
					contraindications: parsed.data.contraindications || [],
				})
				.eq("pa_request_id", requestId)
				.select()
				.single();

			if (error) throw new DatabaseError("update clinical data", error);
			result = data;
		} else {
			// Insert new
			const { data, error } = await supabase
				.from("pa_clinical_data")
				.insert({
					pa_request_id: requestId,
					...parsed.data,
					contraindications: parsed.data.contraindications || [],
				})
				.select()
				.single();

			if (error) throw new DatabaseError("create clinical data", error);
			result = data;
		}

		return c.json(createApiResponse({ clinical_data: result as PAClinicalData }));
	} catch (error) {
		const response = createErrorResponse(error);
		const statusCode = isAppError(error) ? error.statusCode : 500;
		return c.json(response, statusCode);
	}
});

// ============================================
// AI Justification Generation
// ============================================

priorAuthRouter.post("/:id/generate-justification", async (c) => {
	try {
		const { id: userId } = getAuthUser(c);
		const requestId = c.req.param("id");
		const body = await c.req.json();
		const parsed = generateJustificationSchema.safeParse(body);

		if (!parsed.success) {
			throw new ValidationError(
				"Invalid justification request",
				parsed.error.flatten(),
			);
		}

		// Get PA request with drug and payer info
		const { data: request, error: requestError } = await supabase
			.from("prior_auth_requests")
			.select("*")
			.eq("id", requestId)
			.eq("user_id", userId)
			.single();

		if (requestError || !request) {
			throw new ValidationError("PA request not found");
		}

		// Get drug info
		const { data: drug } = await supabase
			.from("scd_drugs")
			.select("*")
			.eq("id", request.drug_id)
			.single();

		if (!drug) {
			throw new ValidationError("Drug not found");
		}

		// Get payer info
		const { data: payer } = await supabase
			.from("payers")
			.select("*")
			.eq("id", request.payer_id)
			.single();

		if (!payer) {
			throw new ValidationError("Payer not found");
		}

		// Import and call BAML function
		const { b } = await import("@angstromscd/baml");

		const clinicalData = parsed.data.clinical_data;
		const paRequirements = payer.pa_requirements as {
			drugs?: Record<string, { documentation_required?: string[]; step_therapy?: string[]; required?: boolean }>;
		};
		const drugRequirements = paRequirements?.drugs?.[request.drug_id] || {};

		const result = await b.GeneratePAClinicalJustification(
			{
				genotype: clinicalData.scd_genotype || null,
				voe_count_past_year: clinicalData.voe_history?.episodes_past_year || 0,
				hospitalization_count: clinicalData.hospitalizations_past_year || 0,
				current_therapies: clinicalData.current_therapies,
				failed_therapies: clinicalData.failed_therapies,
				hemoglobin: clinicalData.lab_results?.hemoglobin || null,
				hemoglobin_f_percentage:
					clinicalData.lab_results?.hemoglobin_f_percentage || null,
				age: null,
			},
			{
				drug_name: drug.brand_name,
				generic_name: drug.generic_name,
				indication: drug.indication,
				mechanism: drug.mechanism_of_action || "",
			},
			{
				required_documentation: drugRequirements.documentation_required || [],
				step_therapy: drugRequirements.step_therapy || null,
				clinical_criteria: Object.entries(drug.clinical_criteria || {}).map(
					([k, v]) => `${k}: ${v}`,
				),
			},
			request.diagnosis_codes || [],
		);

		// Update the PA request with the generated justification
		await supabase
			.from("prior_auth_requests")
			.update({
				clinical_justification: result.justification,
				status:
					request.status === "draft" ? "pending_info" : request.status,
			})
			.eq("id", requestId);

		const response: GenerateJustificationResponse = {
			justification: result.justification,
			citations: result.citations.map((c) => ({
				pmid: c.pmid || undefined,
				title: c.title,
				summary: `${c.journal} (${c.year})`,
			})),
			confidence_score:
				result.confidence_level === "high"
					? 0.9
					: result.confidence_level === "medium"
						? 0.7
						: 0.5,
			key_points: result.key_points,
			warnings: result.warnings.length > 0 ? result.warnings : undefined,
		};

		return c.json(createApiResponse(response));
	} catch (error) {
		const response = createErrorResponse(error);
		const statusCode = isAppError(error) ? error.statusCode : 500;
		return c.json(response, statusCode);
	}
});

