import { Sandbox } from "@e2b/code-interpreter"
import type { 
  CodeExecutionInput, 
  ExecutionResult, 
  E2BConfig 
} from "../types/e2b"

export class CodeExecutorService {
  private config: E2BConfig

  constructor(config: E2BConfig) {
    this.config = config
  }

  /**
   * Execute code in an E2B sandbox
   */
  async executeCode(input: CodeExecutionInput): Promise<ExecutionResult> {
    const startTime = Date.now()
    let sandbox: Sandbox | null = null
    
    try {
      // Create a new sandbox instance
      sandbox = await Sandbox.create({
        apiKey: this.config.apiKey,
        timeout: input.timeout ? input.timeout * 1000 : this.config.timeoutMs,
      })

      const sandboxId = sandbox.id

      // Install packages if provided
      if (input.packages && input.packages.length > 0) {
        const installCommand = this.getInstallCommand(input.language, input.packages)
        if (installCommand) {
          await sandbox.runCode(installCommand)
        }
      }

      // Execute the main code
      const execution = await sandbox.runCode(input.code)
      
      // Collect results
      const output = execution.text || ''
      const error = execution.error || undefined
      
      // Get generated files (images, plots, etc)
      const files = []
      
      // Check for matplotlib figures
      if (execution.results && execution.results.length > 0) {
        for (const result of execution.results) {
          if (result.png) {
            files.push({
              name: `output_${Date.now()}.png`,
              content: result.png,
              type: 'image/png'
            })
          }
          if (result.jpeg) {
            files.push({
              name: `output_${Date.now()}.jpg`,
              content: result.jpeg,
              type: 'image/jpeg'
            })
          }
          if (result.svg) {
            files.push({
              name: `output_${Date.now()}.svg`,
              content: result.svg,
              type: 'image/svg+xml'
            })
          }
          if (result.html) {
            files.push({
              name: `output_${Date.now()}.html`,
              content: result.html,
              type: 'text/html'
            })
          }
        }
      }

      const executionTime = Date.now() - startTime

      return {
        success: !execution.error,
        output,
        error,
        files: files.length > 0 ? files : undefined,
        executionTime,
        sandboxId,
      }

    } catch (error) {
      const executionTime = Date.now() - startTime
      
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown execution error',
        executionTime,
        sandboxId: sandbox?.id || 'unknown',
      }
    } finally {
      // Clean up sandbox
      if (sandbox) {
        try {
          await sandbox.kill()
        } catch (error) {
          console.error('Error killing sandbox:', error)
        }
      }
    }
  }

  /**
   * Execute code with streaming output (for long-running operations)
   */
  async executeCodeStream(
    input: CodeExecutionInput,
    onOutput: (output: string) => void,
    onError: (error: string) => void
  ): Promise<ExecutionResult> {
    const startTime = Date.now()
    let sandbox: Sandbox | null = null
    
    try {
      sandbox = await Sandbox.create({
        apiKey: this.config.apiKey,
        timeout: input.timeout ? input.timeout * 1000 : this.config.timeoutMs,
      })

      const sandboxId = sandbox.id

      // Install packages if provided
      if (input.packages && input.packages.length > 0) {
        const installCommand = this.getInstallCommand(input.language, input.packages)
        if (installCommand) {
          const installExecution = await sandbox.runCode(installCommand)
          if (installExecution.text) {
            onOutput(installExecution.text)
          }
        }
      }

      // Execute with streaming
      const execution = await sandbox.runCode(input.code)
      
      if (execution.text) {
        onOutput(execution.text)
      }
      
      if (execution.error) {
        onError(execution.error)
      }

      const output = execution.text || ''
      const error = execution.error || undefined
      
      const files = []
      if (execution.results && execution.results.length > 0) {
        for (const result of execution.results) {
          if (result.png) {
            files.push({
              name: `output_${Date.now()}.png`,
              content: result.png,
              type: 'image/png'
            })
          }
        }
      }

      const executionTime = Date.now() - startTime

      return {
        success: !execution.error,
        output,
        error,
        files: files.length > 0 ? files : undefined,
        executionTime,
        sandboxId,
      }

    } catch (error) {
      const executionTime = Date.now() - startTime
      onError(error instanceof Error ? error.message : 'Unknown execution error')
      
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown execution error',
        executionTime,
        sandboxId: sandbox?.id || 'unknown',
      }
    } finally {
      if (sandbox) {
        try {
          await sandbox.close()
        } catch (error) {
          console.error('Error closing sandbox:', error)
        }
      }
    }
  }

  /**
   * Get the appropriate package installation command for the language
   */
  private getInstallCommand(language: string, packages: string[]): string | null {
    switch (language) {
      case 'python':
        return `!pip install ${packages.join(' ')}`
      case 'javascript':
      case 'typescript':
        return `!npm install ${packages.join(' ')}`
      default:
        return null
    }
  }
}

// Singleton instance
let codeExecutorInstance: CodeExecutorService | null = null

export function getCodeExecutor(): CodeExecutorService {
  if (!codeExecutorInstance) {
    const config = {
      apiKey: process.env.E2B_API_KEY || '',
      timeoutMs: 30000,
      maxSandboxes: 10,
    }
    
    if (!config.apiKey) {
      throw new Error('E2B_API_KEY environment variable is required')
    }
    
    codeExecutorInstance = new CodeExecutorService(config)
  }
  
  return codeExecutorInstance
}