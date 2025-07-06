import { CodeInterpreter } from "@e2b/code-interpreter"
import type { 
  CodeExecutionInput, 
  ExecutionResult, 
  E2BConfig 
} from "../types/e2b"

export class CodeExecutorService {
  private config: E2BConfig
  private activeSandboxes: Map<string, CodeInterpreter> = new Map()

  constructor(config: E2BConfig) {
    this.config = config
  }

  /**
   * Execute code in an E2B sandbox
   */
  async executeCode(input: CodeExecutionInput): Promise<ExecutionResult> {
    const startTime = Date.now()
    let sandbox: CodeInterpreter | null = null
    
    try {
      // Create a new sandbox instance
      sandbox = await CodeInterpreter.create({
        apiKey: this.config.apiKey,
        timeoutMs: input.timeout ? input.timeout * 1000 : this.config.timeoutMs,
      })

      const sandboxId = sandbox.sandboxId

      // Upload files if provided
      if (input.files && input.files.length > 0) {
        for (const file of input.files) {
          await sandbox.notebook.uploadFile(file.content, file.name)
        }
      }

      // Install packages if provided
      if (input.packages && input.packages.length > 0) {
        const installCommand = this.getInstallCommand(input.language, input.packages)
        if (installCommand) {
          await sandbox.notebook.execCell(installCommand)
        }
      }

      // Execute the main code
      const execution = await sandbox.notebook.execCell(input.code)
      
      // Collect results
      const output = execution.logs.map((log: any) => log.line).join('\n')
      const error = execution.error?.name ? `${execution.error.name}: ${execution.error.value}` : undefined
      
      // Get generated files
      const files = []
      if (execution.results) {
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
        sandboxId: sandbox?.sandboxId || 'unknown',
      }
    } finally {
      // Clean up sandbox
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
   * Execute code with streaming output (for long-running operations)
   */
  async executeCodeStream(
    input: CodeExecutionInput,
    onOutput: (output: string) => void,
    onError: (error: string) => void
  ): Promise<ExecutionResult> {
    const startTime = Date.now()
    let sandbox: CodeInterpreter | null = null
    
    try {
      sandbox = await CodeInterpreter.create({
        apiKey: this.config.apiKey,
        timeoutMs: input.timeout ? input.timeout * 1000 : this.config.timeoutMs,
      })

      const sandboxId = sandbox.sandboxId

      // Upload files if provided
      if (input.files && input.files.length > 0) {
        for (const file of input.files) {
          await sandbox.notebook.uploadFile(file.content, file.name)
        }
      }

      // Install packages if provided
      if (input.packages && input.packages.length > 0) {
        const installCommand = this.getInstallCommand(input.language, input.packages)
        if (installCommand) {
          const installExecution = await sandbox.notebook.execCell(installCommand)
          if (installExecution.logs) {
            installExecution.logs.forEach((log: any) => onOutput(log.line))
          }
        }
      }

      // Execute with streaming
      const execution = await sandbox.notebook.execCell(input.code, {
        onStdout: (output: any) => onOutput(output),
        onStderr: (error: any) => onError(error),
      })

      const output = execution.logs.map((log: any) => log.line).join('\n')
      const error = execution.error?.name ? `${execution.error.name}: ${execution.error.value}` : undefined
      
      const files = []
      if (execution.results) {
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
        sandboxId: sandbox?.sandboxId || 'unknown',
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

  /**
   * Clean up all active sandboxes
   */
  async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.activeSandboxes.values()).map(async (sandbox) => {
      try {
        await sandbox.close()
      } catch (error) {
        console.error('Error closing sandbox during cleanup:', error)
      }
    })

    await Promise.all(cleanupPromises)
    this.activeSandboxes.clear()
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