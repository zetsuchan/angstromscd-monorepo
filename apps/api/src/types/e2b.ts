import { z } from "zod"

// E2B Sandbox execution input types
export const CodeExecutionInputSchema = z.object({
  code: z.string().describe("The code to execute in the sandbox"),
  language: z.enum(["python", "javascript", "typescript", "bash"]).default("python"),
  files: z.array(z.object({
    name: z.string(),
    content: z.string(),
  })).optional().describe("Files to upload to the sandbox before execution"),
  packages: z.array(z.string()).optional().describe("Packages to install before execution"),
  timeout: z.number().optional().default(30).describe("Execution timeout in seconds"),
})

export const MedicalAnalysisInputSchema = z.object({
  analysisType: z.enum([
    "data_analysis", 
    "visualization", 
    "statistical_analysis", 
    "ml_modeling",
    "report_generation",
    "voe_risk"
  ]).describe("Type of medical analysis to perform"),
  data: z.string().describe("Medical data or dataset to analyze"),
  parameters: z.record(z.any()).optional().describe("Additional parameters for the analysis"),
  outputFormat: z.enum(["json", "csv", "png", "pdf", "html"]).default("json"),
}).merge(CodeExecutionInputSchema.omit({ code: true }))

// E2B Sandbox execution output types
export const ExecutionResultSchema = z.object({
  success: z.boolean(),
  output: z.string().describe("Standard output from code execution"),
  error: z.string().optional().describe("Error message if execution failed"),
  files: z.array(z.object({
    name: z.string(),
    content: z.string(),
    type: z.string(),
  })).optional().describe("Generated files from execution"),
  executionTime: z.number().describe("Execution time in milliseconds"),
  sandboxId: z.string().describe("ID of the sandbox used for execution"),
})

export const MedicalAnalysisResultSchema = z.object({
  analysisType: z.string(),
  results: z.record(z.any()).describe("Analysis results"),
  visualizations: z.array(z.object({
    name: z.string(),
    type: z.string(),
    data: z.string(), // base64 encoded or file path
  })).optional(),
  summary: z.string().describe("Human-readable summary of the analysis"),
  recommendations: z.array(z.string()).optional().describe("Medical recommendations based on analysis"),
}).merge(ExecutionResultSchema)

// Type exports
export type CodeExecutionInput = z.infer<typeof CodeExecutionInputSchema>
export type MedicalAnalysisInput = z.infer<typeof MedicalAnalysisInputSchema>
export type ExecutionResult = z.infer<typeof ExecutionResultSchema>
export type MedicalAnalysisResult = z.infer<typeof MedicalAnalysisResultSchema>

// E2B Configuration
export const E2BConfigSchema = z.object({
  apiKey: z.string(),
  templateId: z.string().optional(),
  timeoutMs: z.number().default(30000),
  maxSandboxes: z.number().default(10),
})

export type E2BConfig = z.infer<typeof E2BConfigSchema> 