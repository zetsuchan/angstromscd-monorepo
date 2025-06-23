/**
 * Medical domain types for Sickle Cell Disease (SCD) research and clinical support
 */

/**
 * Patient demographics and clinical information
 */
export interface Patient {
	id: string;
	mrn: string; // Medical Record Number
	firstName: string;
	lastName: string;
	dateOfBirth: string; // ISO 8601 date string
	gender: "male" | "female" | "other";
	scdGenotype?: SickleCellGenotype;
	hydroxyureaTherapy?: HydroxyureaTherapy;
	createdAt: string;
	updatedAt: string;
}

/**
 * Sickle Cell Disease genotypes
 */
export type SickleCellGenotype =
	| "HbSS" // Homozygous sickle cell disease
	| "HbSC" // Hemoglobin SC disease
	| "HbSβ+" // Sickle beta-plus thalassemia
	| "HbSβ0" // Sickle beta-zero thalassemia
	| "HbSD" // Hemoglobin SD disease
	| "HbSE" // Hemoglobin SE disease
	| "HbSO" // Hemoglobin SO disease
	| "Other";

/**
 * Hydroxyurea therapy information
 */
export interface HydroxyureaTherapy {
	isActive: boolean;
	startDate?: string;
	currentDoseMgPerKg?: number;
	maxDoseMgPerKg?: number;
	adherencePercentage?: number;
	lastDoseAdjustment?: string;
}

/**
 * Vaso-Occlusive Episode (VOE) information
 */
export interface VOEEpisode {
	id: string;
	patientId: string;
	episodeDate: string;
	severity: VOESeverity;
	location: string[];
	duration: number; // in hours
	hospitalizationRequired: boolean;
	treatmentGiven: VOETreatment[];
	painScore: number; // 0-10 scale
	triggerFactors?: string[];
	createdAt: string;
	updatedAt: string;
}

/**
 * VOE severity levels
 */
export type VOESeverity = "mild" | "moderate" | "severe" | "critical";

/**
 * VOE treatment options
 */
export interface VOETreatment {
	type: "analgesic" | "hydration" | "oxygen" | "blood_transfusion" | "other";
	medication?: string;
	dosage?: string;
	route?: "oral" | "iv" | "im" | "subcutaneous";
	startTime: string;
	endTime?: string;
}

/**
 * Medical literature citation
 */
export interface Citation {
	id: string;
	pmid?: string; // PubMed ID
	doi?: string; // Digital Object Identifier
	title: string;
	authors: Author[];
	journal: string;
	publicationDate: string;
	abstract?: string;
	keywords?: string[];
	citationType: CitationType;
	relevanceScore?: number;
	createdAt: string;
	updatedAt: string;
}

/**
 * Author information
 */
export interface Author {
	firstName: string;
	lastName: string;
	affiliation?: string;
	orcid?: string;
}

/**
 * Citation types
 */
export type CitationType =
	| "research_article"
	| "review"
	| "clinical_trial"
	| "case_report"
	| "guideline"
	| "meta_analysis";

/**
 * Clinical dataset information
 */
export interface ClinicalDataset {
	id: string;
	name: string;
	description: string;
	dataType: DatasetType;
	patientCount: number;
	dateRange: {
		start: string;
		end: string;
	};
	variables: DatasetVariable[];
	qualityScore?: number;
	isPublic: boolean;
	createdAt: string;
	updatedAt: string;
}

/**
 * Dataset types
 */
export type DatasetType =
	| "ehr" // Electronic Health Records
	| "clinical_trial"
	| "registry"
	| "claims"
	| "laboratory"
	| "imaging";

/**
 * Dataset variable information
 */
export interface DatasetVariable {
	name: string;
	description: string;
	dataType: "numeric" | "categorical" | "date" | "text" | "boolean";
	unit?: string;
	possibleValues?: string[];
	isMandatory: boolean;
}

/**
 * Lab result information
 */
export interface LabResult {
	id: string;
	patientId: string;
	testName: string;
	value: number | string;
	unit: string;
	referenceRange?: {
		min?: number;
		max?: number;
		normal?: string;
	};
	abnormalFlag?: "high" | "low" | "critical_high" | "critical_low";
	collectionDate: string;
	resultDate: string;
	labProvider?: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * Common SCD-related lab tests
 */
export type SCDLabTest =
	| "hemoglobin"
	| "hematocrit"
	| "reticulocyte_count"
	| "white_blood_cell_count"
	| "platelet_count"
	| "hemoglobin_f_percentage"
	| "lactate_dehydrogenase"
	| "bilirubin_total"
	| "bilirubin_direct"
	| "creatinine"
	| "alt"
	| "ast";

/**
 * Risk assessment result
 */
export interface RiskAssessment {
	id: string;
	patientId: string;
	assessmentType: "voe_risk" | "stroke_risk" | "acute_chest_risk";
	riskScore: number; // 0-100
	riskLevel: "low" | "moderate" | "high" | "very_high";
	factors: RiskFactor[];
	recommendations: string[];
	validUntil: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * Risk factor information
 */
export interface RiskFactor {
	name: string;
	value: string | number;
	weight: number;
	contribution: number; // percentage contribution to overall risk
}

/**
 * FHIR-compatible observation
 */
export interface FHIRObservation {
	resourceType: "Observation";
	id: string;
	status: "registered" | "preliminary" | "final" | "amended";
	code: {
		coding: Array<{
			system: string;
			code: string;
			display: string;
		}>;
		text?: string;
	};
	subject: {
		reference: string; // Patient/[id]
	};
	effectiveDateTime?: string;
	issued?: string;
	valueQuantity?: {
		value: number;
		unit: string;
		system?: string;
		code?: string;
	};
	valueString?: string;
	interpretation?: Array<{
		coding: Array<{
			system: string;
			code: string;
			display: string;
		}>;
	}>;
}
