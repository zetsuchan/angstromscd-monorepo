import { searchPubMed, formatCitations, shouldSearchPubMed } from "./pubmed-service";
import { VisualizationDetector } from "./visualization-detector";
import { getCodeExecutor } from "./code-executor";

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

		// Check if visualization is needed
		const vizDetection = this.visualizationDetector.detectVisualization(message);
		let visualizations = undefined;
		let executionCode = undefined;

		if (vizDetection.requiresVisualization) {
			try {
				// Generate code for visualization
				const code = this.visualizationDetector.generateE2BCode(message, enhancedPrompt);
				executionCode = code;

				// Execute code in E2B sandbox
				const codeExecutor = getCodeExecutor();
				const result = await codeExecutor.executeCode({
					code,
					language: 'python',
					packages: vizDetection.suggestedLibraries || ['matplotlib', 'pandas', 'numpy'],
				});

				if (result.success && result.files) {
					visualizations = result.files.map(file => ({
						type: vizDetection.visualizationType || 'other',
						data: file.content,
						format: file.type.includes('png') ? 'png' as const : 
						       file.type.includes('svg') ? 'svg' as const : 'html' as const,
					}));
				}
			} catch (error) {
				console.error("Visualization execution failed:", error);
				// Continue without visualization
			}
		}

		// Call Meditron with the enhanced prompt
		const reply = await this.callMeditron(enhancedPrompt, selectedModel);

		// If we have citations, append them to the reply
		let finalReply = reply;
		if (citations) {
			finalReply += "\n\n## References\n" + citations;
		}

		return {
			reply: finalReply,
			citations: citations || undefined,
			pubmedArticles: pubmedArticles || undefined,
			model: selectedModel,
			visualizations,
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