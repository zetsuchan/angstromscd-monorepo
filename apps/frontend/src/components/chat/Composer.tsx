import { ChevronDown, Link, Paperclip, Send, Settings } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useChat } from "../../context/ChatContext";
import type { ChatMode, MessageTone } from "../../types";
import ModelSelector from "./ModelSelector";

const Composer: React.FC = () => {
	const {
		addMessage,
		chatMode,
		setChatMode,
		messageTone,
		setMessageTone,
		selectedModel,
		setSelectedModel,
		isLoading,
		setIsLoading,
	} = useChat();
	const [input, setInput] = useState("");
	const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
	const [isToneDropdownOpen, setIsToneDropdownOpen] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (input.trim() && !isLoading) {
			const userMessage = input.trim();
			addMessage(userMessage, "user");
			setInput("");
			setIsLoading(true);

			// Call the API with the selected model
			try {
				const response = await fetch("/api/chat", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						message: userMessage,
						model: selectedModel,
					}),
				});

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const data = await response.json();

				if (data.success) {
					addMessage(data.data.reply, "ai", {
						visualizations: data.data.visualizations,
						executionCode: data.data.executionCode,
						citations: data.data.citations
							? data.data.pubmedArticles?.map(
									(article: { pmid?: string; title?: string; journal?: string; publicationDate?: string }, index: number) => ({
										id: article.pmid || `cite-${index}`,
										reference: `${index + 1}`,
										snippet: article.title,
										source: `${article.journal} (${article.publicationDate})`,
									}),
								)
							: undefined,
					});
				} else {
					addMessage(
						"Sorry, I encountered an error processing your request.",
						"ai",
					);
				}
			} catch (error) {
				console.error("Chat API error:", error);
				addMessage(
					"Sorry, I'm having trouble connecting to the chat service. Please try again.",
					"ai",
				);
			} finally {
				setIsLoading(false);
			}
		}
	};

	const handleModeSelect = (mode: ChatMode) => {
		setChatMode(mode);
		setIsModeDropdownOpen(false);
	};

	const handleToneSelect = (tone: MessageTone) => {
		setMessageTone(tone);
		setIsToneDropdownOpen(false);
	};

	return (
		<div className="border-t border-white/20 glass-subtle p-4 flex-shrink-0">
			<form onSubmit={handleSubmit} className="flex items-center">
				<div className="flex space-x-2 mr-3">
					<ModelSelector
						selectedModel={selectedModel}
						onModelSelect={setSelectedModel}
					/>
					<button
						type="button"
						className="p-2 text-white/70 hover:text-white/90 glass-subtle hover:glass-hover glass-focus rounded-full transition-all"
						title="Attach file"
					>
						<Paperclip size={20} />
					</button>

					<button
						type="button"
						className="p-2 text-white/70 hover:text-white/90 glass-subtle hover:glass-hover glass-focus rounded-full transition-all"
						title="Insert citation"
					>
						<Link size={20} />
					</button>

					<div className="relative">
						<button
							type="button"
							className="p-2 text-white/70 hover:text-white/90 glass-subtle hover:glass-hover glass-focus rounded-full transition-all"
							title="Chat mode"
							onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
						>
							<Settings size={20} />
						</button>

						{isModeDropdownOpen && (
							<div className="absolute bottom-full left-0 mb-2 glass-strong rounded-md border border-white/20 w-48 z-10">
								<div className="py-2 px-3 border-b border-white/20">
									<span className="text-sm font-medium text-white/90">
										Mode
									</span>
								</div>
								<ul>
									{(
										[
											"Research",
											"Create",
											"Analyze",
											"Plan",
											"Learn",
										] as ChatMode[]
									).map((mode) => (
										<li key={mode}>
											<button
												type="button"
												className={`w-full text-left px-4 py-2 text-sm transition-all ${
													mode === chatMode
														? "medical-primary text-blue-300"
														: "text-white/80 hover:glass-subtle"
												}`}
												onClick={() => handleModeSelect(mode)}
											>
												{mode}
											</button>
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</div>

				<input
					type="text"
					className="flex-1 glass-subtle border border-white/20 rounded-l-md px-4 py-2 text-white/90 placeholder-white/50 glass-focus disabled:opacity-50 disabled:cursor-not-allowed"
					placeholder={
						isLoading ? "Waiting for response..." : "Ask MedLab Chat..."
					}
					value={input}
					onChange={(e) => setInput(e.target.value)}
					disabled={isLoading}
				/>

				<div className="relative">
					<button
						type="button"
						className="flex items-center space-x-1 glass-subtle hover:glass-hover glass-focus transition-all px-3 py-2 border-t border-b border-r border-white/20 text-white/90"
						onClick={() => setIsToneDropdownOpen(!isToneDropdownOpen)}
					>
						<span className="text-sm">{messageTone}</span>
						<ChevronDown size={16} />
					</button>

					{isToneDropdownOpen && (
						<div className="absolute bottom-full right-0 mb-2 glass-strong rounded-md border border-white/20 w-48 z-10">
							<div className="py-2 px-3 border-b border-white/20">
								<span className="text-sm font-medium text-white/90">Tone</span>
							</div>
							<ul>
								{(
									[
										"Default",
										"Formal",
										"Bullet Points",
										"Lay Summary",
									] as MessageTone[]
								).map((tone) => (
									<li key={tone}>
										<button
											type="button"
											className={`w-full text-left px-4 py-2 text-sm transition-all ${
												tone === messageTone
													? "medical-primary text-blue-300"
													: "text-white/80 hover:glass-subtle"
											}`}
											onClick={() => handleToneSelect(tone)}
										>
											{tone}
										</button>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>

				<button
					type="submit"
					className="medical-primary hover:glass-hover glass-focus transition-all text-blue-300 px-4 py-2 rounded-r-md disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={isLoading}
				>
					<Send size={20} />
				</button>
			</form>
		</div>
	);
};

export default Composer;
