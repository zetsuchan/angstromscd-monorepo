/**
 * Database schema types and conversion utilities
 */

import type { Citation, Patient, VOEEpisode } from "./medical";

/**
 * Database table names
 */
export const TableNames = {
	PATIENTS: "scd_patients",
	VOE_EPISODES: "voe_episodes",
	CITATIONS: "literature_citations",
	LAB_RESULTS: "lab_results",
	RISK_ASSESSMENTS: "risk_assessments",
	USERS: "users",
	CONVERSATIONS: "conversations",
	MESSAGES: "messages",
} as const;

/**
 * Database user record
 */
export interface DbUser {
	id: string;
	email: string;
	role: "viewer" | "editor" | "admin";
	display_name?: string;
	created_at: string;
	updated_at: string;
}

/**
 * Database patient record
 */
export interface DBPatient {
	id: string;
	mrn: string;
	first_name: string;
	last_name: string;
	date_of_birth: string;
	gender: "male" | "female" | "other";
	scd_genotype?: string;
	hydroxyurea_therapy?: {
		is_active: boolean;
		start_date?: string;
		current_dose_mg_per_kg?: number;
		max_dose_mg_per_kg?: number;
		adherence_percentage?: number;
		last_dose_adjustment?: string;
	};
	created_at: string;
	updated_at: string;
}

/**
 * Database VOE episode record
 */
export interface DBVOEEpisode {
	id: string;
	patient_id: string;
	episode_date: string;
	severity: string;
	location: string[];
	duration_hours: number;
	hospitalization_required: boolean;
	treatment_given: Array<{
		type: string;
		medication?: string;
		dosage?: string;
		route?: string;
		start_time: string;
		end_time?: string;
	}>;
	pain_score: number;
	trigger_factors?: string[];
	created_at: string;
	updated_at: string;
}

/**
 * Database citation record
 */
export interface DBCitation {
	id: string;
	pmid?: string;
	doi?: string;
	title: string;
	authors: Array<{
		first_name: string;
		last_name: string;
		affiliation?: string;
		orcid?: string;
	}>;
	journal: string;
	publication_date: string;
	abstract?: string;
	keywords?: string[];
	citation_type: string;
	relevance_score?: number;
	created_at: string;
	updated_at: string;
}

/**
 * Database lab result record
 */
export interface DBLabResult {
	id: string;
	patient_id: string;
	test_name: string;
	value: number | string;
	unit: string;
	reference_range?: {
		min?: number;
		max?: number;
		normal?: string;
	};
	abnormal_flag?: string;
	collection_date: string;
	result_date: string;
	lab_provider?: string;
	created_at: string;
	updated_at: string;
}

/**
 * Database risk assessment record
 */
export interface DBRiskAssessment {
	id: string;
	patient_id: string;
	assessment_type: string;
	risk_score: number;
	risk_level: string;
	factors: Array<{
		name: string;
		value: string | number;
		weight: number;
		contribution: number;
	}>;
	recommendations: string[];
	valid_until: string;
	created_at: string;
	updated_at: string;
}

/**
 * Convert database patient to domain patient
 */
export function dbPatientToDomain(dbPatient: DBPatient): Patient {
	return {
		id: dbPatient.id,
		mrn: dbPatient.mrn,
		firstName: dbPatient.first_name,
		lastName: dbPatient.last_name,
		dateOfBirth: dbPatient.date_of_birth,
		gender: dbPatient.gender,
		scdGenotype: dbPatient.scd_genotype as Patient["scdGenotype"],
		hydroxyureaTherapy: dbPatient.hydroxyurea_therapy
			? {
					isActive: dbPatient.hydroxyurea_therapy.is_active,
					startDate: dbPatient.hydroxyurea_therapy.start_date,
					currentDoseMgPerKg:
						dbPatient.hydroxyurea_therapy.current_dose_mg_per_kg,
					maxDoseMgPerKg: dbPatient.hydroxyurea_therapy.max_dose_mg_per_kg,
					adherencePercentage:
						dbPatient.hydroxyurea_therapy.adherence_percentage,
					lastDoseAdjustment:
						dbPatient.hydroxyurea_therapy.last_dose_adjustment,
				}
			: undefined,
		createdAt: dbPatient.created_at,
		updatedAt: dbPatient.updated_at,
	};
}

/**
 * Convert domain patient to database patient
 */
export function domainPatientToDb(patient: Patient): DBPatient {
	return {
		id: patient.id,
		mrn: patient.mrn,
		first_name: patient.firstName,
		last_name: patient.lastName,
		date_of_birth: patient.dateOfBirth,
		gender: patient.gender,
		scd_genotype: patient.scdGenotype,
		hydroxyurea_therapy: patient.hydroxyureaTherapy
			? {
					is_active: patient.hydroxyureaTherapy.isActive,
					start_date: patient.hydroxyureaTherapy.startDate,
					current_dose_mg_per_kg: patient.hydroxyureaTherapy.currentDoseMgPerKg,
					max_dose_mg_per_kg: patient.hydroxyureaTherapy.maxDoseMgPerKg,
					adherence_percentage: patient.hydroxyureaTherapy.adherencePercentage,
					last_dose_adjustment: patient.hydroxyureaTherapy.lastDoseAdjustment,
				}
			: undefined,
		created_at: patient.createdAt,
		updated_at: patient.updatedAt,
	};
}

/**
 * Convert database VOE episode to domain
 */
export function dbVOEEpisodeToDomain(dbEpisode: DBVOEEpisode): VOEEpisode {
	return {
		id: dbEpisode.id,
		patientId: dbEpisode.patient_id,
		episodeDate: dbEpisode.episode_date,
		severity: dbEpisode.severity as VOEEpisode["severity"],
		location: dbEpisode.location,
		duration: dbEpisode.duration_hours,
		hospitalizationRequired: dbEpisode.hospitalization_required,
		treatmentGiven: dbEpisode.treatment_given.map((treatment) => ({
			type: treatment.type as VOEEpisode["treatmentGiven"][0]["type"],
			medication: treatment.medication,
			dosage: treatment.dosage,
			route: treatment.route as VOEEpisode["treatmentGiven"][0]["route"],
			startTime: treatment.start_time,
			endTime: treatment.end_time,
		})),
		painScore: dbEpisode.pain_score,
		triggerFactors: dbEpisode.trigger_factors,
		createdAt: dbEpisode.created_at,
		updatedAt: dbEpisode.updated_at,
	};
}

/**
 * Convert domain VOE episode to database
 */
export function domainVOEEpisodeToDb(episode: VOEEpisode): DBVOEEpisode {
	return {
		id: episode.id,
		patient_id: episode.patientId,
		episode_date: episode.episodeDate,
		severity: episode.severity,
		location: episode.location,
		duration_hours: episode.duration,
		hospitalization_required: episode.hospitalizationRequired,
		treatment_given: episode.treatmentGiven.map((treatment) => ({
			type: treatment.type,
			medication: treatment.medication,
			dosage: treatment.dosage,
			route: treatment.route,
			start_time: treatment.startTime,
			end_time: treatment.endTime,
		})),
		pain_score: episode.painScore,
		trigger_factors: episode.triggerFactors,
		created_at: episode.createdAt,
		updated_at: episode.updatedAt,
	};
}

/**
 * Convert database citation to domain
 */
export function dbCitationToDomain(dbCitation: DBCitation): Citation {
	return {
		id: dbCitation.id,
		pmid: dbCitation.pmid,
		doi: dbCitation.doi,
		title: dbCitation.title,
		authors: dbCitation.authors.map((author) => ({
			firstName: author.first_name,
			lastName: author.last_name,
			affiliation: author.affiliation,
			orcid: author.orcid,
		})),
		journal: dbCitation.journal,
		publicationDate: dbCitation.publication_date,
		abstract: dbCitation.abstract,
		keywords: dbCitation.keywords,
		citationType: dbCitation.citation_type as Citation["citationType"],
		relevanceScore: dbCitation.relevance_score,
		createdAt: dbCitation.created_at,
		updatedAt: dbCitation.updated_at,
	};
}

/**
 * Convert domain citation to database
 */
export function domainCitationToDb(citation: Citation): DBCitation {
	return {
		id: citation.id,
		pmid: citation.pmid,
		doi: citation.doi,
		title: citation.title,
		authors: citation.authors.map((author) => ({
			first_name: author.firstName,
			last_name: author.lastName,
			affiliation: author.affiliation,
			orcid: author.orcid,
		})),
		journal: citation.journal,
		publication_date: citation.publicationDate,
		abstract: citation.abstract,
		keywords: citation.keywords,
		citation_type: citation.citationType,
		relevance_score: citation.relevanceScore,
		created_at: citation.createdAt,
		updated_at: citation.updatedAt,
	};
}

/**
 * Database query builder types
 */
export interface QueryOptions {
	select?: string[];
	where?: Record<string, unknown>;
	orderBy?: Array<{ column: string; direction: "asc" | "desc" }>;
	limit?: number;
	offset?: number;
	include?: string[];
}

/**
 * Transaction wrapper type
 */
export type Transaction<T> = (tx: unknown) => Promise<T>;

/**
 * Database connection config
 */
export interface DatabaseConfig {
	host: string;
	port: number;
	database: string;
	username: string;
	password: string;
	ssl?: boolean;
	poolSize?: number;
}

/**
 * Vector database types
 */
export interface VectorDocument {
	id: string;
	content: string;
	embedding?: number[];
	metadata: Record<string, unknown>;
	createdAt: string;
}

/**
 * Vector search query
 */
export interface VectorSearchQuery {
	query: string;
	collection: string;
	limit?: number;
	threshold?: number;
	filter?: Record<string, unknown>;
}

/**
 * Vector search result
 */
export interface VectorSearchResult {
	id: string;
	score: number;
	content: string;
	metadata: Record<string, unknown>;
}
