/**
 * Prior Authorization Types for SCD Drugs
 *
 * Types for managing prior authorization requests, SCD drug references,
 * payer requirements, and AI-generated clinical justifications.
 */

// ============================================
// Status and Enum Types
// ============================================

export type PAStatus =
	| "draft"
	| "pending_info"
	| "ready_to_submit"
	| "submitted"
	| "approved"
	| "denied"
	| "appeal"
	| "expired";

export type PAUrgency = "standard" | "urgent" | "expedited";

export type SCDDrugId = "adakveo" | "endari" | "oxbryta" | "hydroxyurea";

export type PayerType = "commercial" | "medicare" | "medicaid" | "other";

export type DocumentType =
	| "lab_result"
	| "clinical_note"
	| "prescription"
	| "letter"
	| "other";

// ============================================
// Supporting Document Types
// ============================================

export interface SupportingDocument {
	id: string;
	name: string;
	type: DocumentType;
	url?: string;
	content?: string;
	uploaded_at?: string;
}

// ============================================
// Prior Auth Request Types
// ============================================

export interface PriorAuthRequest {
	id: string;
	user_id: string;
	patient_id?: string;
	status: PAStatus;
	drug_id: SCDDrugId;
	payer_id: string;
	diagnosis_codes: string[];
	urgency: PAUrgency;
	clinical_justification?: string;
	supporting_documents: SupportingDocument[];
	submission_date?: string;
	decision_date?: string;
	denial_reason?: string;
	appeal_deadline?: string;
	payer_reference_number?: string;
	created_at: string;
	updated_at: string;
	metadata?: Record<string, unknown>;
}

export interface CreatePARequestData {
	patient_id?: string;
	drug_id: SCDDrugId;
	payer_id: string;
	urgency?: PAUrgency;
	diagnosis_codes?: string[];
}

export interface UpdatePARequestData {
	status?: PAStatus;
	diagnosis_codes?: string[];
	urgency?: PAUrgency;
	clinical_justification?: string;
	supporting_documents?: SupportingDocument[];
	payer_reference_number?: string;
	denial_reason?: string;
	appeal_deadline?: string;
	submission_date?: string;
	decision_date?: string;
}

// ============================================
// SCD Drug Types
// ============================================

export interface DosingInfo {
	standard_dose: string;
	route: string;
	frequency: string;
	adjustments?: string[];
}

export interface LabRequirement {
	test: string;
	threshold?: string;
	timeframe?: string;
}

export interface ClinicalCriteria {
	age_requirement?: string;
	genotype_requirement?: string[];
	voe_frequency?: string;
	hemoglobin_requirement?: string;
	failed_therapies?: string[];
	lab_requirements?: LabRequirement[];
	monitoring?: string[];
	indication?: string;
}

export interface LiteratureReference {
	pmid?: string;
	doi?: string;
	title: string;
	summary: string;
}

export interface SCDDrug {
	id: SCDDrugId;
	brand_name: string;
	generic_name: string;
	manufacturer?: string;
	ndc_codes: string[];
	mechanism_of_action?: string;
	indication: string;
	dosing_info?: DosingInfo;
	clinical_criteria: ClinicalCriteria;
	common_denial_reasons: string[];
	supporting_literature: LiteratureReference[];
	fhir_medication_code?: string;
	created_at?: string;
	updated_at?: string;
}

// ============================================
// Payer Types
// ============================================

export interface DrugPARequirement {
	required: boolean;
	step_therapy?: string[];
	documentation_required: string[];
	quantity_limits?: string;
	renewal_frequency?: string;
}

export interface PayerPARequirements {
	drugs: Partial<Record<SCDDrugId, DrugPARequirement>>;
}

export interface AppealProcess {
	levels: number;
	timeframe_days: number;
	required_documents: string[];
}

export interface Payer {
	id: string;
	name: string;
	payer_type: PayerType;
	pa_requirements: PayerPARequirements;
	submission_portal_url?: string;
	phone_number?: string;
	fax_number?: string;
	average_response_days?: number;
	appeal_process?: AppealProcess;
	fhir_endpoint?: string;
	created_at?: string;
	updated_at?: string;
}

// ============================================
// Clinical Data Types
// ============================================

export interface VOEHistory {
	total_episodes: number;
	episodes_past_year: number;
	average_severity?: string;
	hospitalizations: number;
	last_episode_date?: string;
}

export interface PALabResults {
	hemoglobin?: number;
	hemoglobin_f_percentage?: number;
	reticulocyte_count?: number;
	lactate_dehydrogenase?: number;
	bilirubin?: number;
	test_date?: string;
}

export interface TransfusionHistory {
	requires_chronic_transfusion: boolean;
	transfusions_past_year?: number;
	last_transfusion_date?: string;
}

export interface PAClinicalData {
	id: string;
	pa_request_id: string;
	scd_genotype?: string;
	voe_history?: VOEHistory;
	current_therapies: string[];
	lab_results?: PALabResults;
	transfusion_history?: TransfusionHistory;
	hospitalizations_past_year?: number;
	failed_therapies: string[];
	contraindications: string[];
	created_at?: string;
	updated_at?: string;
}

export interface CreatePAClinicalData {
	scd_genotype?: string;
	voe_history?: VOEHistory;
	current_therapies: string[];
	lab_results?: PALabResults;
	transfusion_history?: TransfusionHistory;
	hospitalizations_past_year?: number;
	failed_therapies: string[];
	contraindications?: string[];
}

// ============================================
// AI Justification Types
// ============================================

export interface GenerateJustificationRequest {
	clinical_data: CreatePAClinicalData;
	tone?: "formal" | "clinical" | "detailed";
}

export interface GenerateJustificationResponse {
	justification: string;
	citations: LiteratureReference[];
	confidence_score: number;
	key_points: string[];
	warnings?: string[];
}

// ============================================
// API Response Types
// ============================================

export interface PAListResponse {
	requests: PriorAuthRequest[];
	total: number;
	page: number;
	limit: number;
}

export interface PADetailResponse {
	request: PriorAuthRequest;
	clinical_data?: PAClinicalData;
	drug?: SCDDrug;
	payer?: Payer;
}

export interface PADrugsResponse {
	drugs: SCDDrug[];
}

export interface PAPayersResponse {
	payers: Payer[];
}

export interface PADrugRequirementsResponse {
	drug: SCDDrug;
	payer: Payer;
	requirements: DrugPARequirement;
}

// ============================================
// Dashboard/Analytics Types
// ============================================

export interface PAStatusCounts {
	draft: number;
	pending_info: number;
	ready_to_submit: number;
	submitted: number;
	approved: number;
	denied: number;
	appeal: number;
	expired: number;
}

export interface PADashboardStats {
	total_requests: number;
	status_counts: PAStatusCounts;
	approval_rate: number;
	average_turnaround_days: number;
	requests_by_drug: Record<SCDDrugId, number>;
	requests_by_payer: Record<string, number>;
}
