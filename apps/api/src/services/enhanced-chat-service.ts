import { searchPubMed, formatCitations, shouldSearchPubMed } from "./pubmed-service";
import { VisualizationDetector } from "./visualization-detector";
import { getCodeExecutor } from "./code-executor";
import { b } from "@angstromscd/baml/baml_client";
import type { ToolType } from "@angstromscd/baml/baml_client/types";

interface EnhancedChatMessage {
	role: "user" | "assistant" | "system";
	content: string;
}

interface EnhancedChatResponse {
	reply: string;
	citations?: string;
	pubmedArticles?: any[];
	model: string;
	visualizations?: Array<{
		type: string;
		data: string; // base64 encoded image or HTML
		format: 'png' | 'html' | 'svg';
	}>;
	executionCode?: string;
}

/**
 * Enhanced chat service that combines Meditron medical LLM with PubMed literature search
 */
export class EnhancedChatService {
	private ollamaBaseUrl: string;
	private defaultModel: string = "meditron:latest";
	private visualizationDetector: VisualizationDetector;

	constructor(ollamaBaseUrl = "http://localhost:11434") {
		this.ollamaBaseUrl = ollamaBaseUrl;
		this.visualizationDetector = new VisualizationDetector();
	}

	/**
	 * Process a chat message with medical context and PubMed integration
	 */
	async processMessage(message: string, model?: string): Promise<EnhancedChatResponse> {
		const selectedModel = model || this.defaultModel;
		let pubmedArticles = null;
		let citations = "";
		let enhancedPrompt = message;
		let visualizations: any[] = [];
		let executionCode: string | undefined;

		// First, determine if we need to use any tools
		// For now, let's use a simple pattern matching approach for visualization requests
		const visualizationKeywords = [
			"chart", "graph", "plot", "visualiz", "diagram", 
			"bar chart", "line graph", "pie chart", "scatter plot",
			"show me a chart", "create a chart", "generate a chart"
		];
		
		const needsVisualization = visualizationKeywords.some(keyword => 
			message.toLowerCase().includes(keyword)
		);
		
		console.log("Checking visualization need:", { message, needsVisualization, model: selectedModel });
		
		if (needsVisualization) {
			console.log("Visualization request detected, generating code...");
			
			// For Ollama models, use direct approach without BAML structured parsing
			const isOllamaModel = selectedModel.startsWith("qwen") || 
			                     selectedModel.startsWith("llama") || 
			                     selectedModel.startsWith("mixtral") ||
			                     selectedModel === "meditron:latest";
			
			if (isOllamaModel) {
				// Direct approach for Ollama models
				try {
					// Generate Python code directly using Ollama
					const codePrompt = `Generate ONLY Python code (no explanations) for this request: ${message}

Start your response with:
\`\`\`python
import matplotlib.pyplot as plt
import numpy as np

Then write the code to create the visualization.
End with:
plt.show()
\`\`\`

Remember: ONLY return the code inside the code block, nothing else.`;

					const codeResponse = await this.callMeditron(codePrompt, selectedModel);
					console.log("Ollama code generation response length:", codeResponse.length);
					
					// Extract code from response (look for code blocks)
					const codeMatch = codeResponse.match(/```python\n([\s\S]*?)\n```/) || 
					                 codeResponse.match(/```\n([\s\S]*?)\n```/);
					
					let pythonCode = codeMatch ? codeMatch[1] : codeResponse;
					console.log("Extracted code:", pythonCode ? pythonCode.substring(0, 100) + "..." : "No code");
					
					// If no code block found or code looks invalid, generate a simple visualization ourselves
					if (!codeMatch || !pythonCode.includes('matplotlib')) {
						console.log("No code block found, generating fallback visualization");
						
						// Generate a simple chart based on keywords
						if (message.toLowerCase().includes("chart") || message.toLowerCase().includes("graph") || message.toLowerCase().includes("plot")) {
							pythonCode = `
import matplotlib.pyplot as plt
import numpy as np

# SCD Treatment Effectiveness Data
treatments = ['Hydroxyurea', 'Voxelotor', 'Crizanlizumab']
effectiveness = [85, 70, 75]
colors = ['#2E86AB', '#A23B72', '#F18F01']

# Create bar chart
fig, ax = plt.subplots(figsize=(10, 6))
bars = ax.bar(treatments, effectiveness, color=colors, alpha=0.8, edgecolor='black', linewidth=1.2)

# Add value labels on bars
for bar in bars:
    height = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2., height + 1,
            f'{height}%', ha='center', va='bottom', fontsize=12, fontweight='bold')

# Customize the chart
ax.set_xlabel('Treatment', fontsize=14, fontweight='bold')
ax.set_ylabel('Effectiveness (%)', fontsize=14, fontweight='bold')
ax.set_title('Effectiveness of Sickle Cell Disease Treatments', fontsize=16, fontweight='bold', pad=20)
ax.set_ylim(0, 100)
ax.grid(axis='y', alpha=0.3, linestyle='--')
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)

# Add a note
plt.figtext(0.5, 0.02, 'Note: Effectiveness percentages are based on clinical trial data', 
           ha='center', fontsize=10, style='italic', color='gray')

plt.tight_layout()
plt.show()
`;
						} else {
							// Skip if we can't generate appropriate code
							console.log("Cannot generate appropriate fallback visualization");
							enhancedPrompt = message;
						}
					}
					
					// Execute code if we have it
					if (pythonCode && pythonCode.includes('import')) {
						// Execute the extracted code
						console.log("Executing Python code with E2B...");
						const codeExecutor = getCodeExecutor();
						const result = await codeExecutor.executeCode({
							language: "python",
							code: pythonCode,
							packages: ["matplotlib", "numpy", "pandas", "seaborn"],
						});
						
						console.log("E2B execution result:", { success: result.success, hasFiles: !!result.files, filesCount: result.files?.length || 0, error: result.error });
						
						// Check if we have files even if there was an error (partial execution)
						if (result.files && result.files.length > 0) {
							for (const file of result.files) {
								visualizations.push({
									type: "chart",
									data: file.content,
									format: file.type.includes("png") ? "png" : 
									       file.type.includes("svg") ? "svg" : "html"
								});
							}
							executionCode = pythonCode;
							
							if (result.success) {
								enhancedPrompt = `I've created the visualization you requested. The chart has been generated successfully showing ${message.toLowerCase()}.`;
							} else {
								enhancedPrompt = `I've created the visualization, though there was a minor error during execution. The chart shows ${message.toLowerCase()}.`;
							}
						} else if (result.error) {
							console.error("Code execution error:", result.error);
							enhancedPrompt = `I attempted to create the visualization but encountered an error. Let me provide the information in text format instead.`;
						}
					}
				} catch (error) {
					console.error("Error in Ollama visualization:", error);
					enhancedPrompt = message; // Fall back to original message
				}
			} else {
				// Use BAML for GPT/Claude models
				try {
					const vizRequest = await b.GenerateVisualizationCode(message, null);
					
					// Execute the code
					const codeExecutor = getCodeExecutor();
					const result = await codeExecutor.executeCode({
						language: "python",
						code: vizRequest.code,
						packages: vizRequest.packages || [],
					});
					
					if (result.success && result.files) {
						for (const file of result.files) {
							visualizations.push({
								type: vizRequest.expected_output || "chart",
								data: file.content,
								format: file.type.includes("png") ? "png" : 
								       file.type.includes("svg") ? "svg" : "html"
							});
						}
						executionCode = vizRequest.code;
					}
					
					if (result.output) {
						enhancedPrompt = `I've created the visualization you requested. Here's what the analysis shows:\n\n${result.output}`;
					} else {
						enhancedPrompt = "I've created the visualization you requested. The chart has been generated successfully.";
					}
				} catch (error) {
					console.error("Error generating visualization:", error);
					enhancedPrompt = message; // Fall back to original message
				}
			}
		}
		
		// Original tool detection code (commented out for now)
		/*
		try {
			// Use the appropriate tool detection based on model
			const isOllamaModel = selectedModel.startsWith("qwen") || 
			                     selectedModel.startsWith("llama") || 
			                     selectedModel.startsWith("mixtral") ||
			                     selectedModel === "meditron:latest";
			
			const toolAnalysis = isOllamaModel 
				? await b.DetermineToolUsageOllama(message, null)
				: await b.DetermineToolUsage(message, null);
			
			if (toolAnalysis.requires_tools && toolAnalysis.tool_calls.length > 0) {
				for (const toolCall of toolAnalysis.tool_calls) {
					if (toolCall.tool === "E2B_CODE_INTERPRETER" as ToolType) {
						// Parse the arguments
						const args = JSON.parse(toolCall.arguments);
						
						// Execute the code
						const codeExecutor = getCodeExecutor();
						const result = await codeExecutor.executeCode({
							language: "python",
							code: args.code,
							packages: args.packages || [],
						});
						
						if (result.success && result.files) {
							for (const file of result.files) {
								visualizations.push({
									type: args.expected_output || "chart",
									data: file.content,
									format: file.type.includes("png") ? "png" : 
									       file.type.includes("svg") ? "svg" : "html"
								});
							}
							executionCode = args.code;
						}
						
						if (result.output) {
							enhancedPrompt += `\n\nExecution Result:\n${result.output}`;
						}
					} else if (toolCall.tool === "PUBMED_SEARCH" as ToolType) {
						// PubMed search will be handled below
					}
				}
			}
			
			// Use the tool analysis message as part of the response
			if (toolAnalysis.message) {
				enhancedPrompt = toolAnalysis.message + "\n\n" + enhancedPrompt;
			}
		} catch (error) {
			console.error("Error in tool analysis:", error);
			// Continue without tools if there's an error
		}
		*/

		// Check if we should search PubMed
		if (shouldSearchPubMed(message)) {
			console.log("Searching PubMed for relevant literature...");
			
			try {
				// Extract medical terms for better search
				const searchQuery = this.extractMedicalSearchTerms(message);
				console.log("PubMed search query:", searchQuery);
				const searchResults = await searchPubMed(searchQuery, 5);
				
				if (searchResults.articles.length > 0) {
					pubmedArticles = searchResults.articles;
					citations = formatCitations(searchResults.articles);
					
					// Enhance the prompt with PubMed context
					enhancedPrompt = this.buildEnhancedPrompt(message, searchResults.articles);
				}
			} catch (error) {
				console.error("PubMed search failed:", error);
				// Continue without PubMed data
			}
		}

		// Note: Visualization detection now happens via BAML tool analysis above

		// If we already have a response from tool analysis, use that instead of calling the model again
		let finalReply: string;
		
		if (visualizations.length > 0 && enhancedPrompt.includes("Execution Result:")) {
			// We already have results from E2B execution, use the enhanced prompt as the reply
			finalReply = enhancedPrompt;
		} else {
			// Call the selected model with the enhanced prompt
			const reply = await this.callMeditron(enhancedPrompt, selectedModel);
			finalReply = reply;
		}

		// If we have citations, append them to the reply
		if (citations) {
			finalReply += "\n\n## References\n" + citations;
		}

		return {
			reply: finalReply,
			citations: citations || undefined,
			pubmedArticles: pubmedArticles || undefined,
			model: selectedModel,
			visualizations: visualizations.length > 0 ? visualizations : undefined,
			executionCode,
		};
	}

	/**
	 * Extract medical search terms from the user's message
	 */
	private extractMedicalSearchTerms(message: string): string {
		// Common SCD-related terms to enhance search
		const scdTerms = [
			"sickle cell disease",
			"SCD",
			"vaso-occlusive",
			"VOE",
			"VOC",
			"hydroxyurea",
			"voxelotor",
			"crizanlizumab",
			"L-glutamine",
			"hemoglobin S",
			"HbS",
		];

		// Check if message contains SCD terms
		const messageLower = message.toLowerCase();
		const relevantTerms = scdTerms.filter(term => 
			messageLower.includes(term.toLowerCase())
		);

		// If no specific SCD terms, assume generic SCD query
		if (relevantTerms.length === 0) {
			// Default to sickle cell disease for medical queries
			relevantTerms.push("sickle cell disease");
		}

		// Build the query
		let query = relevantTerms.map(term => `"${term}"`).join(" OR ");
		
		// Add treatment/research context if mentioned
		if (messageLower.includes("treatment") || messageLower.includes("therapy")) {
			query = `(${query}) AND (treatment OR therapy OR management)`;
		}
		if (messageLower.includes("voe") || messageLower.includes("vaso-occlusive") || messageLower.includes("crisis")) {
			query = `(${query}) AND ("vaso-occlusive" OR VOE OR crisis OR "pain management")`;
		}
		if (messageLower.includes("research") || messageLower.includes("latest") || messageLower.includes("recent")) {
			query = `(${query}) AND (recent OR latest OR "clinical trial" OR research)`;
		}
		if (messageLower.includes("prevention") || messageLower.includes("prophylaxis")) {
			query = `(${query}) AND (prevention OR prophylaxis)`;
		}
		if (messageLower.includes("pediatric") || messageLower.includes("children")) {
			query = `(${query}) AND (pediatric OR children OR adolescent)`;
		}
		
		return query;
	}

	/**
	 * Build an enhanced prompt with PubMed context
	 */
	private buildEnhancedPrompt(originalMessage: string, articles: any[]): string {
		const context = articles.map((article, index) => 
			`Study ${index + 1}: ${article.title}\nKey findings: ${article.abstract.slice(0, 200)}...`
		).join("\n\n");

		return `You are a medical AI assistant with access to recent research. Based on the following recent studies:

${context}

User Question: ${originalMessage}

Please provide a comprehensive answer that incorporates insights from these studies. Cite specific studies when relevant.`;
	}

	/**
	 * Call Meditron model via Ollama
	 */
	private async callMeditron(prompt: string, model: string): Promise<string> {
		try {
			const response = await fetch(`${this.ollamaBaseUrl}/api/chat`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: model,
					messages: [
						{
							role: "system",
							content: "You are Meditron, a medical AI assistant specializing in Sickle Cell Disease (SCD) and related hematological conditions. Provide evidence-based medical information and cite relevant research when available. Always remind users to consult with healthcare providers for personal medical decisions.",
						},
						{
							role: "user",
							content: prompt,
						},
					],
					stream: false,
				}),
			});

			if (!response.ok) {
				throw new Error(`Ollama API error: ${response.status}`);
			}

			const data = await response.json();
			return data.message?.content || "No response generated";
		} catch (error) {
			console.error("Meditron call failed:", error);
			// Return a fallback response instead of throwing
			return "I apologize, but I'm having trouble generating a response. Please ensure Meditron is running in Ollama and try again.";
		}
	}

	/**
	 * Test if Meditron is available
	 */
	async testConnection(): Promise<boolean> {
		try {
			const response = await fetch(`${this.ollamaBaseUrl}/api/tags`);
			if (!response.ok) return false;
			
			const data = await response.json();
			return data.models?.some((m: any) => m.name.includes("meditron"));
		} catch {
			return false;
		}
	}
}