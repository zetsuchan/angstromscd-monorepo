// Import BAML client
import { b } from "../../baml_client";

export async function testOpenAIConnection(): Promise<boolean> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return false;

  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function testAnthropicConnection(): Promise<boolean> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return false;

  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function runOpenAIChat(message: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: message }],
    }),
  });

  const data = await res.json() as any;
  return data.choices?.[0]?.message?.content ?? "";
}

export async function runAnthropicChat(message: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 256,
      messages: [{ role: "user", content: message }],
    }),
  });

  const data = await res.json() as any;
  return data.content?.[0]?.text ?? "";
}



export async function testOllamaConnection(): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:11434/api/tags");
    return res.ok;
  } catch {
    return false;
  }
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

export type InsightRequest = {
  type: "medical-analysis";
  data: MedicalAnalysisRequest;
} | {
  type: "literature-search";
  data: LiteratureSearchRequest;
} | {
  type: "risk-modeling";
  data: RiskModelingRequest;
} | {
  type: "population-risk";
  data: PopulationRiskRequest;
} | {
  type: "clinical-decision";
  data: ClinicalDecisionRequest;
} | {
  type: "research-synthesis";
  data: ResearchSynthesisRequest;
};

export async function generateInsight(request: InsightRequest): Promise<string> {
  try {
    if (!b || typeof b !== "object") {
      throw new Error("BAML client is not properly initialized");
    }
    switch (request.type) {
      case "medical-analysis":
        return await b.MedicalAnalysis(
          request.data.patient_data,
          request.data.symptoms,
          request.data.medical_history
        );
      
      case "literature-search":
        return await b.LiteratureSearch(
          request.data.research_query,
          request.data.medical_domain,
          request.data.time_period
        );
      
      case "risk-modeling":
        return await b.RiskModeling(
          request.data.patient_profile,
          request.data.risk_factors,
          request.data.outcome_target
        );
      
      case "population-risk":
        return await b.PopulationRiskAnalysis(
          request.data.population_data,
          request.data.demographic_factors,
          request.data.environmental_factors
        );
      
      case "clinical-decision":
        return await b.ClinicalDecisionSupport(
          request.data.clinical_scenario,
          request.data.patient_data,
          request.data.treatment_options
        );
      
      case "research-synthesis":
        return await b.ResearchSynthesis(
          request.data.papers,
          request.data.research_question
        );
      
      default:
        throw new Error(`Unknown insight type: ${(request as any).type}`);
    }
  } catch (error) {
    throw new Error(`Failed to generate insight: ${error instanceof Error ? error.message : String(error)}`);
  }
}
