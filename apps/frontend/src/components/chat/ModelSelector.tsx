import { MODEL_PROVIDERS } from "@angstromscd/shared-types";
import { Activity, ChevronDown, Cloud, Computer } from "lucide-react";
import type React from "react";
import { useState } from "react";

export interface AIModel {
	id: string;
	name: string;
	provider: string;
	type: "cloud" | "local" | "medical";
	description?: string;
}

// Display metadata for models (IDs come from centralized MODEL_PROVIDERS)
const modelDisplayInfo: Record<string, { name: string; description?: string }> = {
	// OpenAI
	"gpt-4o": { name: "GPT-4o" },
	"gpt-4o-mini": { name: "GPT-4o Mini" },
	// Anthropic (Claude 4.5)
	"claude-opus-4-5-20251101": { name: "Claude 4.5 Opus", description: "Most capable, supports effort parameter" },
	"claude-sonnet-4-5-20250929": { name: "Claude 4.5 Sonnet", description: "Best coding performance" },
	"claude-haiku-4-5-20251001": { name: "Claude 4.5 Haiku", description: "Fast and cost-effective" },
	// OpenRouter
	"gemini-3-pro": { name: "Gemini 3 Pro Preview", description: "Google Gemini 3 Pro via OpenRouter" },
	"claude-sonnet-4.5": { name: "Claude Sonnet 4.5", description: "Anthropic Claude 4.5 via OpenRouter" },
	"minimax-m2": { name: "MiniMax M2", description: "MiniMax M2 via OpenRouter" },
	"glm-4.6": { name: "GLM 4.6", description: "Z-AI GLM 4.6 via OpenRouter" },
	"gpt-5": { name: "GPT-5", description: "OpenAI GPT-5 via OpenRouter" },
	"gpt-oss-120b": { name: "GPT OSS 120B", description: "Open-source GPT 120B via OpenRouter" },
	// Ollama
	"llama3.2:3b": { name: "Llama 3.2 3B" },
	"qwen2.5:0.5b": { name: "Qwen 2.5 0.5B" },
	"mixtral:8x7b": { name: "Mixtral 8x7B" },
	// LM Studio
	"lmstudio-local": { name: "LM Studio Model", description: "Currently loaded model in LM Studio" },
};

// Provider type mapping
const providerTypeMap: Record<string, "cloud" | "local"> = {
	openai: "cloud",
	anthropic: "cloud",
	openrouter: "cloud",
	lmstudio: "local",
	ollama: "local",
	apple: "local",
};

// Generate models array from centralized MODEL_PROVIDERS
const models: AIModel[] = (Object.entries(MODEL_PROVIDERS) as [string, { models: readonly string[] }][])
	.filter(([provider]) => provider !== "apple") // Exclude Apple Foundation for now
	.flatMap(([provider, config]) =>
		config.models.map((modelId) => ({
			id: modelId,
			name: modelDisplayInfo[modelId]?.name || modelId,
			provider,
			type: providerTypeMap[provider] || "cloud",
			description: modelDisplayInfo[modelId]?.description,
		}))
	);

interface ModelSelectorProps {
	selectedModel: string;
	onModelSelect: (modelId: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
	selectedModel,
	onModelSelect,
}) => {
	const [isOpen, setIsOpen] = useState(false);

	const selectedModelData =
		models.find((m) => m.id === selectedModel) || models[0];

	const getIcon = (type: string) => {
		switch (type) {
			case "medical":
				return <Activity size={16} className="text-pink-400" />;
			case "cloud":
				return <Cloud size={16} className="text-blue-400" />;
			case "local":
				return <Computer size={16} className="text-green-400" />;
			default:
				return null;
		}
	};

	const modelsByType = {
		medical: models.filter((m) => m.type === "medical"),
		cloud: models.filter((m) => m.type === "cloud"),
		local: models.filter((m) => m.type === "local"),
	};

	const handleSelect = (modelId: string) => {
		onModelSelect(modelId);
		setIsOpen(false);
	};

	return (
		<div className="relative">
			<button
				type="button"
				className="flex items-center space-x-2 px-3 py-2 glass-subtle hover:glass-hover glass-focus rounded-md transition-all text-white/90"
				onClick={() => setIsOpen(!isOpen)}
			>
				{getIcon(selectedModelData.type)}
				<span className="text-sm font-medium">{selectedModelData.name}</span>
				<ChevronDown
					size={16}
					className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
				/>
			</button>

			{isOpen && (
				<div className="absolute bottom-full left-0 mb-2 glass-strong rounded-md border border-white/20 w-64 z-10 max-h-96 overflow-y-auto">
					{selectedModelData.type === "medical" && (
						<div className="px-3 py-2 medical-alert border-b border-pink-300/20">
							<p className="text-xs text-pink-300">
								Medical model with PubMed integration
							</p>
						</div>
					)}

					{Object.entries(modelsByType).map(([type, typeModels]) => {
						if (typeModels.length === 0) return null;

						return (
							<div key={type}>
								<div className="px-3 py-2 glass-subtle border-b border-white/20">
									<div className="flex items-center space-x-2">
										{getIcon(type)}
										<span className="text-xs font-medium text-white/90 uppercase">
											{type}
										</span>
									</div>
								</div>
								<ul>
									{typeModels.map((model) => (
										<li key={model.id}>
											<button
												type="button"
												className={`w-full text-left px-4 py-2 text-sm transition-all ${
													model.id === selectedModel
														? "medical-primary text-blue-300"
														: "text-white/80 hover:glass-subtle"
												}`}
												onClick={() => handleSelect(model.id)}
											>
												<div className="flex items-center justify-between">
													<span>{model.name}</span>
													<span className="text-xs text-white/60">
														{model.provider}
													</span>
												</div>
												{model.description && (
													<p className="text-xs text-white/60 mt-1">
														{model.description}
													</p>
												)}
											</button>
										</li>
									))}
								</ul>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default ModelSelector;
