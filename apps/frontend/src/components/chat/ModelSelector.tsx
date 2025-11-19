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

const models: AIModel[] = [
	// Cloud Models - OpenAI & Anthropic
	{ id: "gpt-4o", name: "GPT-4o", provider: "openai", type: "cloud" },
	{ id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", type: "cloud" },
	{
		id: "claude-3-5-sonnet-20241022",
		name: "Claude 3.5 Sonnet",
		provider: "anthropic",
		type: "cloud",
	},
	{
		id: "claude-3-haiku-20240307",
		name: "Claude 3 Haiku",
		provider: "anthropic",
		type: "cloud",
	},

	// OpenRouter Models
	{
		id: "gemini-3-pro",
		name: "Gemini 3 Pro Preview",
		provider: "openrouter",
		type: "cloud",
		description: "Google Gemini 3 Pro via OpenRouter",
	},
	{
		id: "claude-sonnet-4.5",
		name: "Claude Sonnet 4.5",
		provider: "openrouter",
		type: "cloud",
		description: "Anthropic Claude 4.5 via OpenRouter",
	},
	{
		id: "minimax-m2",
		name: "MiniMax M2",
		provider: "openrouter",
		type: "cloud",
		description: "MiniMax M2 via OpenRouter",
	},
	{
		id: "glm-4.6",
		name: "GLM 4.6",
		provider: "openrouter",
		type: "cloud",
		description: "Z-AI GLM 4.6 via OpenRouter",
	},
	{
		id: "gpt-5",
		name: "GPT-5",
		provider: "openrouter",
		type: "cloud",
		description: "OpenAI GPT-5 via OpenRouter",
	},
	{
		id: "gpt-oss-120b",
		name: "GPT OSS 120B",
		provider: "openrouter",
		type: "cloud",
		description: "Open-source GPT 120B via OpenRouter",
	},

	// Local Models - Ollama
	{
		id: "llama3.2:3b",
		name: "Llama 3.2 3B",
		provider: "ollama",
		type: "local",
	},
	{
		id: "qwen2.5:0.5b",
		name: "Qwen 2.5 0.5B",
		provider: "ollama",
		type: "local",
	},
	{
		id: "mixtral:8x7b",
		name: "Mixtral 8x7B",
		provider: "ollama",
		type: "local",
	},

	// LM Studio Local Model
	{
		id: "lmstudio-local",
		name: "LM Studio Model",
		provider: "lmstudio",
		type: "local",
		description: "Currently loaded model in LM Studio",
	},
];

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
