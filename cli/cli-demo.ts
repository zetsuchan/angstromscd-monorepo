#!/usr/bin/env bun
/**
 * CLI demo bootstrap for AngstromSCD.
 *
 * Run with:
 *   bun run cli/cli-demo.ts
 */

import { getCodeExecutor } from "../apps/api/src/services/code-executor"
import { VectorService } from "../packages/vector/src/services/chroma-service"
import { MedicalContext, type PatientInfo } from "../packages/context/src/medical-context"
import { MedicalAnalysisOrchestrator } from "../apps/api/src/tools/medical-analysis"
import type { CodeExecutionInput, ExecutionResult, MedicalAnalysisInput, MedicalAnalysisResult } from "../apps/api/src/types/e2b"

// BAML generated client – import as type only to avoid bundling complexity in the demo.
// You can replace `any` with the correct client class once initialised properly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BAMLClient = any

export interface DemoSession {
  bamlClient: BAMLClient
  e2bSession: ReturnType<typeof getCodeExecutor>
  vectorClient: VectorService
  medicalContext: MedicalContext
  // tool facades with explicit types
  executeCode: (input: CodeExecutionInput) => Promise<ExecutionResult>
  searchLiterature: (query: string, topK?: number) => Promise<string[]>
  analyzeMedicalData: (input: MedicalAnalysisInput) => Promise<MedicalAnalysisResult>
}

/**
 * Construct a demo session with convenience wrappers around core services.
 */
export async function createDemoSession(
  patient: PatientInfo = { id: "demo-patient" },
): Promise<DemoSession> {
  // NOTE: Proper BAML initialisation requires a runtime + ctx manager.
  // For this demo we stub it to an empty object until full integration.
  const bamlClient: BAMLClient = {}

  const e2bSession = getCodeExecutor()
  const vectorClient = new VectorService()
  const medicalContext = new MedicalContext(patient)
  const analysis = new MedicalAnalysisOrchestrator()

  async function executeCode(input: Parameters<typeof e2bSession.executeCode>[0]) {
    return e2bSession.executeCode(input)
  }

  /**
   * Extremely lightweight PubMed search via E-utilities API.
   * Replace with a richer semantic-scholar integration if desired.
   */
  async function searchLiterature(query: string, topK = 5) {
    const url =
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=${topK}&term=${encodeURIComponent(
        query,
      )}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`PubMed search failed: ${res.status}`)
    const json = (await res.json()) as any
    return json.esearchresult?.idlist ?? []
  }

  async function analyzeMedicalData(
    input: Parameters<typeof analysis.performAnalysis>[0],
  ) {
    return analysis.performAnalysis(input)
  }

  return {
    bamlClient,
    e2bSession,
    vectorClient,
    medicalContext,
    executeCode,
    searchLiterature,
    analyzeMedicalData,
  }
}

// ------------ CLI entry ------------
if (import.meta.main) {
  const args = Bun.argv.slice(2)
  const runDetailedDemo = args.includes("--demo") || args.length === 0

  const session = await createDemoSession()

  if (!runDetailedDemo) {
    console.log("Demo session initialised. Use --demo to run the walkthrough or import this module in a REPL.")
    process.exit(0)
  }

  console.log("\n=== AngstromSCD CLI – Detailed Walkthrough ===\n")

  // 1. Simple Python execution
  console.log("1) Running Python code in an E2B sandbox (print 2+2)...")
  const codeResult = await session.executeCode({ code: "print(2+2)", language: "python", timeout: 30 })
  console.log("Output:", codeResult.output.trim(), "\n")

  // 2. Literature search
  console.log("2) Searching PubMed for sickle-cell literature (top 3 IDs)...")
  const pubmedIds = await session.searchLiterature("sickle cell vaso-occlusive event biomarkers", 3)
  console.log("PubMed IDs:", pubmedIds.join(", "), "\n")

  // 3. Medical data analysis (very small CSV example)
  console.log("3) Performing basic data analysis on sample CSV...")
  const csvData = "value1,value2\n1,2\n3,4"
  const analysisRes = await session.analyzeMedicalData({
    analysisType: "data_analysis" as any,
    data: csvData,
    language: "python" as any,
    timeout: 30,
    outputFormat: "json" as any,
  })
  console.log("Analysis summary:", analysisRes.summary, "\n")

  // 4. VOE risk scoring
  console.log("4) Calculating VOE risk on demo patient metrics...")
  const voeCsv = "age,hemoglobin,wbc,previous_voe,hydroxyurea\n28,8.5,11.2,1,0"
  const voeRes = await session.analyzeMedicalData({
    analysisType: "voe_risk" as any,
    data: voeCsv,
    language: "python" as any,
    timeout: 60,
    outputFormat: "text" as any,
  })
  console.log("VOE risk output:\n", voeRes.output.trim())
  const plot = voeRes.visualizations?.[0]
  if (plot) {
    console.log("VOE risk plot saved as:", plot.name)
  }

  console.log("=== Demo complete ===")
}
