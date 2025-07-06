import { Hono } from "hono"
import { z } from "zod"
import { getCodeExecutor } from "../services/code-executor"
import { getMedicalAnalysisOrchestrator } from "../tools/medical-analysis"
import { 
  CodeExecutionInputSchema, 
  MedicalAnalysisInputSchema,
  type CodeExecutionInput,
  type MedicalAnalysisInput 
} from "../types/e2b"

export const e2bRouter = new Hono()

// Health check for E2B service
e2bRouter.get("/health", (c) => {
  try {
    const executor = getCodeExecutor()
    return c.json({ status: "ok", service: "e2b-integration" })
  } catch (error) {
    return c.json({ 
      status: "error", 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, 500)
  }
})

// Execute code in E2B sandbox
e2bRouter.post("/execute", async (c) => {
  try {
    const body = await c.req.json()
    const parsed = CodeExecutionInputSchema.safeParse(body)
    
    if (!parsed.success) {
      return c.json({ 
        error: "Invalid input", 
        details: parsed.error.issues 
      }, 400)
    }

    const executor = getCodeExecutor()
    const result = await executor.executeCode(parsed.data)
    
    return c.json(result)
  } catch (error) {
    return c.json({ 
      error: error instanceof Error ? error.message : "Execution failed" 
    }, 500)
  }
})

// Execute code with streaming (Server-Sent Events)
e2bRouter.post("/execute/stream", async (c) => {
  try {
    const body = await c.req.json()
    const parsed = CodeExecutionInputSchema.safeParse(body)
    
    if (!parsed.success) {
      return c.json({ 
        error: "Invalid input", 
        details: parsed.error.issues 
      }, 400)
    }

    // Set up SSE headers
    c.header('Content-Type', 'text/event-stream')
    c.header('Cache-Control', 'no-cache')
    c.header('Connection', 'keep-alive')
    c.header('Access-Control-Allow-Origin', '*')

    const executor = getCodeExecutor()
    
    // Create a readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        
        const sendEvent = (event: string, data: any) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))
        }

        executor.executeCodeStream(
          parsed.data,
          (output) => sendEvent('output', { output }),
          (error) => sendEvent('error', { error })
        ).then((result) => {
          sendEvent('result', result)
          sendEvent('end', {})
          controller.close()
        }).catch((error) => {
          sendEvent('error', { error: error.message })
          controller.close()
        })
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })
  } catch (error) {
    return c.json({ 
      error: error instanceof Error ? error.message : "Stream execution failed" 
    }, 500)
  }
})

// Medical analysis endpoint
e2bRouter.post("/medical/analyze", async (c) => {
  try {
    const body = await c.req.json()
    const parsed = MedicalAnalysisInputSchema.safeParse(body)
    
    if (!parsed.success) {
      return c.json({ 
        error: "Invalid input", 
        details: parsed.error.issues 
      }, 400)
    }

    const orchestrator = getMedicalAnalysisOrchestrator()
    const result = await orchestrator.performAnalysis(parsed.data)
    
    return c.json(result)
  } catch (error) {
    return c.json({ 
      error: error instanceof Error ? error.message : "Medical analysis failed" 
    }, 500)
  }
})

// Medical analysis with streaming
e2bRouter.post("/medical/analyze/stream", async (c) => {
  try {
    const body = await c.req.json()
    const parsed = MedicalAnalysisInputSchema.safeParse(body)
    
    if (!parsed.success) {
      return c.json({ 
        error: "Invalid input", 
        details: parsed.error.issues 
      }, 400)
    }

    // Set up SSE headers
    c.header('Content-Type', 'text/event-stream')
    c.header('Cache-Control', 'no-cache')
    c.header('Connection', 'keep-alive')
    c.header('Access-Control-Allow-Origin', '*')

    const orchestrator = getMedicalAnalysisOrchestrator()
    
    // Create a readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        
        const sendEvent = (event: string, data: any) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))
        }

        orchestrator.performAnalysisStream(
          parsed.data,
          (progress) => sendEvent('progress', { progress }),
          (error) => sendEvent('error', { error })
        ).then((result) => {
          sendEvent('result', result)
          sendEvent('end', {})
          controller.close()
        }).catch((error) => {
          sendEvent('error', { error: error.message })
          controller.close()
        })
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })
  } catch (error) {
    return c.json({ 
      error: error instanceof Error ? error.message : "Stream analysis failed" 
    }, 500)
  }
})

// Get available analysis types
e2bRouter.get("/medical/types", (c) => {
  return c.json({
    analysisTypes: [
      {
        type: "data_analysis",
        description: "Basic data exploration and descriptive statistics",
        requiredFields: ["data"]
      },
      {
        type: "visualization",
        description: "Generate charts and visualizations from medical data",
        requiredFields: ["data"]
      },
      {
        type: "statistical_analysis",
        description: "Perform statistical tests and correlation analysis",
        requiredFields: ["data"]
      },
      {
        type: "ml_modeling",
        description: "Build machine learning models for prediction",
        requiredFields: ["data"]
      },
      {
        type: "report_generation",
        description: "Generate comprehensive medical analysis reports",
        requiredFields: ["data"]
      }
    ],
    supportedFormats: ["json", "csv"],
    outputFormats: ["json", "csv", "png", "pdf", "html"]
  })
}) 