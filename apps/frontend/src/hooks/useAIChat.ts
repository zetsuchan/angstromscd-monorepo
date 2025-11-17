/**
 * AI Chat Hook - Vercel AI SDK Integration
 *
 * React hook for streaming chat with multi-provider support
 */

import { useChat } from "ai/react";

export interface UseAIChatOptions {
	/**
	 * Model ID (e.g., "openai:gpt-4o", "anthropic:claude-3-5-sonnet-20241022")
	 */
	modelId?: string;

	/**
	 * API endpoint (default: /api/chat/stream)
	 */
	api?: string;

	/**
	 * Temperature (0-2, default: 0.7)
	 */
	temperature?: number;

	/**
	 * Max tokens
	 */
	maxTokens?: number;

	/**
	 * Callback when a response is finished
	 */
	onFinish?: (message: { content: string; role: string }) => void;

	/**
	 * Callback on error
	 */
	onError?: (error: Error) => void;
}

/**
 * AI Chat Hook
 *
 * @example
 * ```tsx
 * function ChatInterface() {
 *   const { messages, input, handleInputChange, handleSubmit, isLoading } = useAIChat({
 *     modelId: "openai:gpt-4o-mini",
 *   });
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {messages.map((msg) => (
 *         <div key={msg.id}>{msg.content}</div>
 *       ))}
 *       <input value={input} onChange={handleInputChange} />
 *       <button disabled={isLoading}>Send</button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useAIChat(options: UseAIChatOptions = {}) {
	const {
		modelId,
		api = "/api/chat/stream",
		temperature,
		maxTokens,
		onFinish,
		onError,
	} = options;

	const chat = useChat({
		api,
		body: {
			modelId,
			temperature,
			maxTokens,
		},
		onFinish,
		onError: (error) => {
			console.error("AI Chat error:", error);
			onError?.(error);
		},
	});

	return {
		...chat,
		/**
		 * Current model ID
		 */
		modelId,
	};
}

/**
 * Fetch available models
 */
export async function fetchAvailableModels(): Promise<{
	defaultModel: string;
	providers: Array<{ provider: string; models: string[] }>;
}> {
	const response = await fetch("/api/chat/models");
	const data = await response.json();
	return data.data;
}

/**
 * Check AI SDK health
 */
export async function checkAISDKHealth(): Promise<{
	enabled: boolean;
	status: string;
	features: {
		streaming: boolean;
		toolCalling: boolean;
		multiModal: boolean;
	};
}> {
	const response = await fetch("/api/chat/ai-sdk/health");
	const data = await response.json();
	return data.data;
}
