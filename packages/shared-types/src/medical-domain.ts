/**
 * Medical domain types for Sickle Cell Disease research
 */

// Patient-related types
export interface Patient {
	id: string;
	medicalRecordNumber?: string;
	dateOfBirth: Date;
	diagnosis: SickleCellType;
	hydroxyureaTherapy?: HydroxyureaTherapy;
	createdAt: Date;
	updatedAt: Date;
}

export type SickleCellType = "HbSS" | "HbSC" | "HbS-Beta-Thal" | "Other";

export interface HydroxyureaTherapy {
	startDate: Date;
	currentDose: number; // mg/kg/day
	maxDose: number;
	adherence: number; // percentage 0-100
	lastLabDate?: Date;
	response: "Excellent" | "Good" | "Fair" | "Poor";
}

// Vaso-Occlusive Episode (VOE) types
export interface VOEEpisode {
	id: string;
	patientId: string;
	startDate: Date;
	endDate?: Date;
	severity: VOESeverity;
	location: string[];
	treatmentLocation: "Home" | "ED" | "Hospital" | "Clinic";
	painScore: number; // 0-10
	triggers?: VOETrigger[];
	interventions: VOEIntervention[];
}

export type VOESeverity = "Mild" | "Moderate" | "Severe" | "Critical";

export type VOETrigger =
	| "Dehydration"
	| "Infection"
	| "Cold Exposure"
	| "Stress"
	| "Physical Exertion"
	| "Unknown";

export interface VOEIntervention {
	type: "Medication" | "Hydration" | "Oxygen" | "Blood Transfusion" | "Other";
	description: string;
	effectiveness: "Effective" | "Partially Effective" | "Not Effective";
}

// Literature and research types
export interface Citation {
	id: string;
	pmid?: string;
	doi?: string;
	title: string;
	authors: string[];
	journal: string;
	year: number;
	abstract?: string;
	relevanceScore?: number;
	tags?: string[];
}

export interface ResearchThread {
	id: string;
	name: string;
	description?: string;
	citations: Citation[];
	notes: ResearchNote[];
	createdAt: Date;
	updatedAt: Date;
	userId: string;
	workspace: WorkspaceType;
}

export interface ResearchNote {
	id: string;
	content: string;
	citationIds: string[];
	createdAt: Date;
	updatedAt: Date;
}

export type WorkspaceType = "Global" | "ProjectX" | "MyPapers";

// Clinical data types
export interface LabResult {
	id: string;
	patientId: string;
	testDate: Date;
	hemoglobin: number; // g/dL
	hematocrit?: number; // %
	wbc?: number; // cells/μL
	platelets?: number; // cells/μL
	reticulocytes?: number; // %
	hbF?: number; // % fetal hemoglobin
	ferritin?: number; // ng/mL
}

export interface ClinicalAlert {
	id: string;
	patientId?: string;
	type: AlertType;
	severity: AlertSeverity;
	message: string;
	isRead: boolean;
	createdAt: Date;
	metadata?: Record<string, unknown>;
}

export type AlertType =
	| "VOE_RISK"
	| "LAB_ABNORMAL"
	| "MEDICATION_ADHERENCE"
	| "APPOINTMENT_DUE"
	| "NEW_LITERATURE"
	| "SYSTEM";

export type AlertSeverity = "info" | "warning" | "critical";
