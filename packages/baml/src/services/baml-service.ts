// Import BAML client
import { b } from "../../baml_client";
import { fetchWithRetry } from "../utils/retry";

/**
 * Checks if a valid connection to the OpenAI API can be established using the configured API key.
 *
 * @returns `true` if the OpenAI API is reachable and the API key is valid; otherwise, `false`.
 */
export async function testOpenAIConnection(): Promise<boolean> {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) return false;

	try {
 main
		return false;
	}
}

/**
 * Checks connectivity to the Anthropic API using the configured API key.
 *
 * @returns `true` if the Anthropic API is reachable and the API key is set; otherwise, `false`.
 */
export async function testAnthropicConnection(): Promise<boolean> {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) return false;

	try {
 main
			headers: {
				"x-api-key": apiKey,
				"anthropic-version": "2023-06-01",
			},
		});
		return res.ok;
 main
		return false;
	}
}

/**
 * Sends a user message to the OpenAI Chat Completions API using the "gpt-4o" model and returns the generated response.
 *
 * @param message - The user's input message to send to the chat model.
 * @returns The content of the first response message from the model, or an empty string if no response is available.
 *
 * @throws {Error} If the `OPENAI_API_KEY` environment variable is missing.
 */
export async function runOpenAIChat(message: string): Promise<string> {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

 main
}

/**
 * Sends a chat message to the Anthropic Claude API and returns the model's response.
 *
 * @param message - The user's input message to send to the Claude model.
 * @returns The response text from the Claude model, or an empty string if no response is returned.
 *
 * @throws {Error} If the `ANTHROPIC_API_KEY` environment variable is missing.
 */
export async function runAnthropicChat(message: string): Promise<string> {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");
 main
}

export interface MedicalAnalysisRequest {
	patient_data: string;
	symptoms: string;
	medical_history: string;
}

export interface LiteratureSearchRequest {
	research_query: string;
	medical_domain: string;
	time_period: string;
}

export interface RiskModelingRequest {
	patient_profile: string;
	risk_factors: string[];
	outcome_target: string;
}

export interface PopulationRiskRequest {
	population_data: string;
	demographic_factors: string;
	environmental_factors: string;
}

export interface ClinicalDecisionRequest {
	clinical_scenario: string;
	patient_data: string;
	treatment_options: string[];
}

export interface ResearchSynthesisRequest {
	papers: string[];
	research_question: string;
}

export type InsightRequest =
	| {
			type: "medical-analysis";
			data: MedicalAnalysisRequest;
	  }
	| {
			type: "literature-search";
			data: LiteratureSearchRequest;
	  }
	| {
			type: "risk-modeling";
			data: RiskModelingRequest;
	  }
	| {
			type: "population-risk";
			data: PopulationRiskRequest;
	  }
	| {
			type: "clinical-decision";
			data: ClinicalDecisionRequest;
	  }
	| {
			type: "research-synthesis";
			data: ResearchSynthesisRequest;
	  };

/**
 * Generates an insight based on the specified request type and data.
 *
 * Selects the appropriate analysis or synthesis method according to the {@link request.type} and returns the generated insight as a string.
 *
 * @param request - The insight request, specifying the type and associated data for analysis or synthesis.
 * @returns The generated insight as a string.
 *
 * @throws {Error} If the {@link request.type} is unknown or if an error occurs during insight generation.
 */
export async function generateInsight(
	request: InsightRequest,
): Promise<string> {
	try {
		switch (request.type) {
			case "medical-analysis":
				return await b.MedicalAnalysis(
					request.data.patient_data,
					request.data.symptoms,
					request.data.medical_history,
				);

			case "literature-search":
				return await b.LiteratureSearch(
					request.data.research_query,
					request.data.medical_domain,
					request.data.time_period,
				);

			case "risk-modeling":
				return await b.RiskModeling(
					request.data.patient_profile,
					request.data.risk_factors,
					request.data.outcome_target,
				);

			case "population-risk":
				return await b.PopulationRiskAnalysis(
					request.data.population_data,
					request.data.demographic_factors,
					request.data.environmental_factors,
				);

			case "clinical-decision":
				return await b.ClinicalDecisionSupport(
					request.data.clinical_scenario,
					request.data.patient_data,
					request.data.treatment_options,
				);

			case "research-synthesis":
				return await b.ResearchSynthesis(
					request.data.papers,
					request.data.research_question,
				);

 main
		}
	} catch (error) {
		throw new Error(
			`Failed to generate insight: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
 main
}
