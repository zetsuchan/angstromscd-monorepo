/*************************************************************************************************

Welcome to Baml! To use this generated code, please run one of the following:

$ npm install @boundaryml/baml
$ yarn add @boundaryml/baml
$ pnpm add @boundaryml/baml

*************************************************************************************************/

// This file was generated by BAML: do not edit it. Instead, edit the BAML
// files and re-generate this code.
//
/* eslint-disable */
// tslint:disable
// @ts-nocheck
// biome-ignore format: autogenerated code
import type { Audio, BamlCtxManager, BamlRuntime, ClientRegistry, Image } from "@boundaryml/baml"
import { type HTTPRequest, toBamlError } from "@boundaryml/baml";
import type TypeBuilder from "./type_builder";
import type { Check, Checked } from "./types";
import type * as types from "./types";
import type { Citation, MedicalInsight, Resume } from "./types";

type BamlCallOptions = {
	tb?: TypeBuilder;
	clientRegistry?: ClientRegistry;
	env?: Record<string, string | undefined>;
};

export class HttpRequest {
	constructor(
		private runtime: BamlRuntime,
		private ctxManager: BamlCtxManager,
	) {}

	AnthropicCompletion(
		prompt: string,
		__baml_options__?: BamlCallOptions,
	): HTTPRequest {
		try {
			const env = __baml_options__?.env
				? { ...process.env, ...__baml_options__.env }
				: { ...process.env };
			return this.runtime.buildRequestSync(
				"AnthropicCompletion",
				{
					prompt: prompt,
				},
				this.ctxManager.cloneContext(),
				__baml_options__?.tb?.__tb(),
				__baml_options__?.clientRegistry,
				false,
				env,
			);
		} catch (error) {
			throw toBamlError(error);
		}
	}

	ClinicalDecisionSupport(
		clinical_scenario: string,
		patient_data: string,
		treatment_options: string[],
		__baml_options__?: BamlCallOptions,
	): HTTPRequest {
		try {
			const env = __baml_options__?.env
				? { ...process.env, ...__baml_options__.env }
				: { ...process.env };
			return this.runtime.buildRequestSync(
				"ClinicalDecisionSupport",
				{
					clinical_scenario: clinical_scenario,
					patient_data: patient_data,
					treatment_options: treatment_options,
				},
				this.ctxManager.cloneContext(),
				__baml_options__?.tb?.__tb(),
				__baml_options__?.clientRegistry,
				false,
				env,
			);
		} catch (error) {
			throw toBamlError(error);
		}
	}

	ExtractResume(
		resume: string,
		__baml_options__?: BamlCallOptions,
	): HTTPRequest {
		try {
			const env = __baml_options__?.env
				? { ...process.env, ...__baml_options__.env }
				: { ...process.env };
			return this.runtime.buildRequestSync(
				"ExtractResume",
				{
					resume: resume,
				},
				this.ctxManager.cloneContext(),
				__baml_options__?.tb?.__tb(),
				__baml_options__?.clientRegistry,
				false,
				env,
			);
		} catch (error) {
			throw toBamlError(error);
		}
	}

	LiteratureSearch(
		research_query: string,
		medical_domain: string,
		time_period: string,
		__baml_options__?: BamlCallOptions,
	): HTTPRequest {
		try {
			const env = __baml_options__?.env
				? { ...process.env, ...__baml_options__.env }
				: { ...process.env };
			return this.runtime.buildRequestSync(
				"LiteratureSearch",
				{
					research_query: research_query,
					medical_domain: medical_domain,
					time_period: time_period,
				},
				this.ctxManager.cloneContext(),
				__baml_options__?.tb?.__tb(),
				__baml_options__?.clientRegistry,
				false,
				env,
			);
		} catch (error) {
			throw toBamlError(error);
		}
	}

	MedicalAnalysis(
		patient_data: string,
		symptoms: string,
		medical_history: string,
		__baml_options__?: BamlCallOptions,
	): HTTPRequest {
		try {
			const env = __baml_options__?.env
				? { ...process.env, ...__baml_options__.env }
				: { ...process.env };
			return this.runtime.buildRequestSync(
				"MedicalAnalysis",
				{
					patient_data: patient_data,
					symptoms: symptoms,
					medical_history: medical_history,
				},
				this.ctxManager.cloneContext(),
				__baml_options__?.tb?.__tb(),
				__baml_options__?.clientRegistry,
				false,
				env,
			);
		} catch (error) {
			throw toBamlError(error);
		}
	}

	MedicalResearcher(
		query: string,
		__baml_options__?: BamlCallOptions,
	): HTTPRequest {
		try {
			const env = __baml_options__?.env
				? { ...process.env, ...__baml_options__.env }
				: { ...process.env };
			return this.runtime.buildRequestSync(
				"MedicalResearcher",
				{
					query: query,
				},
				this.ctxManager.cloneContext(),
				__baml_options__?.tb?.__tb(),
				__baml_options__?.clientRegistry,
				false,
				env,
			);
		} catch (error) {
			throw toBamlError(error);
		}
	}

	PopulationRiskAnalysis(
		population_data: string,
		demographic_factors: string,
		environmental_factors: string,
		__baml_options__?: BamlCallOptions,
	): HTTPRequest {
		try {
			const env = __baml_options__?.env
				? { ...process.env, ...__baml_options__.env }
				: { ...process.env };
			return this.runtime.buildRequestSync(
				"PopulationRiskAnalysis",
				{
					population_data: population_data,
					demographic_factors: demographic_factors,
					environmental_factors: environmental_factors,
				},
				this.ctxManager.cloneContext(),
				__baml_options__?.tb?.__tb(),
				__baml_options__?.clientRegistry,
				false,
				env,
			);
		} catch (error) {
			throw toBamlError(error);
		}
	}

	ResearchSynthesis(
		papers: string[],
		research_question: string,
		__baml_options__?: BamlCallOptions,
	): HTTPRequest {
		try {
			const env = __baml_options__?.env
				? { ...process.env, ...__baml_options__.env }
				: { ...process.env };
			return this.runtime.buildRequestSync(
				"ResearchSynthesis",
				{
					papers: papers,
					research_question: research_question,
				},
				this.ctxManager.cloneContext(),
				__baml_options__?.tb?.__tb(),
				__baml_options__?.clientRegistry,
				false,
				env,
			);
		} catch (error) {
			throw toBamlError(error);
		}
	}

	RiskModeling(
		patient_profile: string,
		risk_factors: string[],
		outcome_target: string,
		__baml_options__?: BamlCallOptions,
	): HTTPRequest {
		try {
			const env = __baml_options__?.env
				? { ...process.env, ...__baml_options__.env }
				: { ...process.env };
			return this.runtime.buildRequestSync(
				"RiskModeling",
				{
					patient_profile: patient_profile,
					risk_factors: risk_factors,
					outcome_target: outcome_target,
				},
				this.ctxManager.cloneContext(),
				__baml_options__?.tb?.__tb(),
				__baml_options__?.clientRegistry,
				false,
				env,
			);
		} catch (error) {
			throw toBamlError(error);
		}
	}

	SimpleCompletion(
		prompt: string,
		__baml_options__?: BamlCallOptions,
	): HTTPRequest {
		try {
			const env = __baml_options__?.env
				? { ...process.env, ...__baml_options__.env }
				: { ...process.env };
			return this.runtime.buildRequestSync(
				"SimpleCompletion",
				{
					prompt: prompt,
				},
				this.ctxManager.cloneContext(),
				__baml_options__?.tb?.__tb(),
				__baml_options__?.clientRegistry,
				false,
				env,
			);
		} catch (error) {
			throw toBamlError(error);
		}
	}
}

export class HttpStreamRequest {
	constructor(
		private runtime: BamlRuntime,
		private ctxManager: BamlCtxManager,
	) {}

	AnthropicCompletion(
		prompt: string,
		__baml_options__?: BamlCallOptions,
	): HTTPRequest {
		try {
			const env = __baml_options__?.env
				? { ...process.env, ...__baml_options__.env }
				: { ...process.env };
			return this.runtime.buildRequestSync(
				"AnthropicCompletion",
				{
					prompt: prompt,
				},
				this.ctxManager.cloneContext(),
				__baml_options__?.tb?.__tb(),
				__baml_options__?.clientRegistry,
				true,
				env,
			);
		} catch (error) {
			throw toBamlError(error);
		}
	}

	ClinicalDecisionSupport(
		clinical_scenario: string,
		patient_data: string,
		treatment_options: string[],
		__baml_options__?: BamlCallOptions,
	): HTTPRequest {
		try {
			const env = __baml_options__?.env
				? { ...process.env, ...__baml_options__.env }
				: { ...process.env };
			return this.runtime.buildRequestSync(
				"ClinicalDecisionSupport",
				{
					clinical_scenario: clinical_scenario,
					patient_data: patient_data,
					treatment_options: treatment_options,
				},
				this.ctxManager.cloneContext(),
				__baml_options__?.tb?.__tb(),
				__baml_options__?.clientRegistry,
				true,
				env,
			);
		} catch (error) {
			throw toBamlError(error);
		}
	}

	ExtractResume(
		resume: string,
		__baml_options__?: BamlCallOptions,
	): HTTPRequest {
		try {
			const env = __baml_options__?.env
				? { ...process.env, ...__baml_options__.env }
				: { ...process.env };
			return this.runtime.buildRequestSync(
				"ExtractResume",
				{
					resume: resume,
				},
				this.ctxManager.cloneContext(),
				__baml_options__?.tb?.__tb(),
				__baml_options__?.clientRegistry,
				true,
				env,
			);
		} catch (error) {
			throw toBamlError(error);
		}
	}

	LiteratureSearch(
		research_query: string,
		medical_domain: string,
		time_period: string,
		__baml_options__?: BamlCallOptions,
	): HTTPRequest {
		try {
			const env = __baml_options__?.env
				? { ...process.env, ...__baml_options__.env }
				: { ...process.env };
			return this.runtime.buildRequestSync(
				"LiteratureSearch",
				{
					research_query: research_query,
					medical_domain: medical_domain,
					time_period: time_period,
				},
				this.ctxManager.cloneContext(),
				__baml_options__?.tb?.__tb(),
				__baml_options__?.clientRegistry,
				true,
				env,
			);
		} catch (error) {
			throw toBamlError(error);
		}
	}

	MedicalAnalysis(
		patient_data: string,
		symptoms: string,
		medical_history: string,
		__baml_options__?: BamlCallOptions,
	): HTTPRequest {
		try {
			const env = __baml_options__?.env
				? { ...process.env, ...__baml_options__.env }
				: { ...process.env };
			return this.runtime.buildRequestSync(
				"MedicalAnalysis",
				{
					patient_data: patient_data,
					symptoms: symptoms,
					medical_history: medical_history,
				},
				this.ctxManager.cloneContext(),
				__baml_options__?.tb?.__tb(),
				__baml_options__?.clientRegistry,
				true,
				env,
			);
		} catch (error) {
			throw toBamlError(error);
		}
	}

	MedicalResearcher(
		query: string,
		__baml_options__?: BamlCallOptions,
	): HTTPRequest {
		try {
			const env = __baml_options__?.env
				? { ...process.env, ...__baml_options__.env }
				: { ...process.env };
			return this.runtime.buildRequestSync(
				"MedicalResearcher",
				{
					query: query,
				},
				this.ctxManager.cloneContext(),
				__baml_options__?.tb?.__tb(),
				__baml_options__?.clientRegistry,
				true,
				env,
			);
		} catch (error) {
			throw toBamlError(error);
		}
	}

	PopulationRiskAnalysis(
		population_data: string,
		demographic_factors: string,
		environmental_factors: string,
		__baml_options__?: BamlCallOptions,
	): HTTPRequest {
		try {
			const env = __baml_options__?.env
				? { ...process.env, ...__baml_options__.env }
				: { ...process.env };
			return this.runtime.buildRequestSync(
				"PopulationRiskAnalysis",
				{
					population_data: population_data,
					demographic_factors: demographic_factors,
					environmental_factors: environmental_factors,
				},
				this.ctxManager.cloneContext(),
				__baml_options__?.tb?.__tb(),
				__baml_options__?.clientRegistry,
				true,
				env,
			);
		} catch (error) {
			throw toBamlError(error);
		}
	}

	ResearchSynthesis(
		papers: string[],
		research_question: string,
		__baml_options__?: BamlCallOptions,
	): HTTPRequest {
		try {
			const env = __baml_options__?.env
				? { ...process.env, ...__baml_options__.env }
				: { ...process.env };
			return this.runtime.buildRequestSync(
				"ResearchSynthesis",
				{
					papers: papers,
					research_question: research_question,
				},
				this.ctxManager.cloneContext(),
				__baml_options__?.tb?.__tb(),
				__baml_options__?.clientRegistry,
				true,
				env,
			);
		} catch (error) {
			throw toBamlError(error);
		}
	}

	RiskModeling(
		patient_profile: string,
		risk_factors: string[],
		outcome_target: string,
		__baml_options__?: BamlCallOptions,
	): HTTPRequest {
		try {
			const env = __baml_options__?.env
				? { ...process.env, ...__baml_options__.env }
				: { ...process.env };
			return this.runtime.buildRequestSync(
				"RiskModeling",
				{
					patient_profile: patient_profile,
					risk_factors: risk_factors,
					outcome_target: outcome_target,
				},
				this.ctxManager.cloneContext(),
				__baml_options__?.tb?.__tb(),
				__baml_options__?.clientRegistry,
				true,
				env,
			);
		} catch (error) {
			throw toBamlError(error);
		}
	}

	SimpleCompletion(
		prompt: string,
		__baml_options__?: BamlCallOptions,
	): HTTPRequest {
		try {
			const env = __baml_options__?.env
				? { ...process.env, ...__baml_options__.env }
				: { ...process.env };
			return this.runtime.buildRequestSync(
				"SimpleCompletion",
				{
					prompt: prompt,
				},
				this.ctxManager.cloneContext(),
				__baml_options__?.tb?.__tb(),
				__baml_options__?.clientRegistry,
				true,
				env,
			);
		} catch (error) {
			throw toBamlError(error);
		}
	}
}
