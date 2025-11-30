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

// Provider type mapping
const providerTypeMap: Record<string, "cloud" | "local"> = {
	openai: "cloud",
	anthropic: "cloud",
	openrouter: "cloud",
	lmstudio: "local",
	ollama: "local",
	apple: "local",
};

// Generate models array from centralized MODEL_PROVIDERS (display metadata is co-located)
const models: AIModel[] = (
	Object.entries(MODEL_PROVIDERS) as [
		string,
		{ models: Record<string, { displayName: string; description?: string }> },
	][]
)
	.filter(([provider]) => provider !== "apple") // Exclude Apple Foundation for now
	.flatMap(([provider, config]) =>
		Object.entries(config.models).map(([modelId, displayInfo]) => ({
			id: modelId,
			name: displayInfo.displayName,
			provider,
			type: providerTypeMap[provider] || "cloud",
			description: displayInfo.description,
		})),
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
