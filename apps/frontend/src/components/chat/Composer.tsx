import { ChevronDown, Link, Paperclip, Send, Settings } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useChat } from "../../context/ChatContext";
import type { ChatMode, MessageTone } from "../../types";
import ModelSelector from "./ModelSelector";

const Composer: React.FC = () => {
	const { addMessage, chatMode, setChatMode, messageTone, setMessageTone, selectedModel, setSelectedModel, isLoading, setIsLoading } =
		useChat();
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

			const startTime = Date.now();

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
						citations: data.data.citations ? data.data.pubmedArticles?.map((article: any, index: number) => ({
							id: article.pmid || `cite-${index}`,
							reference: `${index + 1}`,
							snippet: article.title,
							source: `${article.journal} (${article.publicationDate})`
						})) : undefined
					});
				} else {
					addMessage("Sorry, I encountered an error processing your request.", "ai");
				}
			} catch (error) {
				console.error("Chat API error:", error);
				addMessage("Sorry, I'm having trouble connecting to the chat service. Please try again.", "ai");
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
		<div className="border-t border-gray-200 bg-white p-4 flex-shrink-0">
			<form onSubmit={handleSubmit} className="flex items-center">
				<div className="flex space-x-2 mr-3">
					<ModelSelector 
						selectedModel={selectedModel}
						onModelSelect={setSelectedModel}
					/>
					<button
						type="button"
						className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
						title="Attach file"
					>
						<Paperclip size={20} />
					</button>

					<button
						type="button"
						className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
						title="Insert citation"
					>
						<Link size={20} />
					</button>

					<div className="relative">
						<button
							type="button"
							className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
							title="Chat mode"
							onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
						>
							<Settings size={20} />
						</button>

						{isModeDropdownOpen && (
							<div className="absolute bottom-full left-0 mb-2 bg-white shadow-lg rounded-md border border-gray-200 w-48 z-10">
								<div className="py-2 px-3 border-b border-gray-200">
									<span className="text-sm font-medium text-gray-700">
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
												className={`w-full text-left px-4 py-2 text-sm ${
													mode === chatMode
														? "bg-blue-50 text-blue-700"
														: "hover:bg-gray-100"
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
					className="flex-1 border border-gray-300 rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
					placeholder={isLoading ? "Waiting for response..." : "Ask MedLab Chat..."}
					value={input}
					onChange={(e) => setInput(e.target.value)}
					disabled={isLoading}
				/>

				<div className="relative">
					<button
						type="button"
						className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 transition-colors px-3 py-2 border-t border-b border-r border-gray-300 focus:outline-none"
						onClick={() => setIsToneDropdownOpen(!isToneDropdownOpen)}
					>
						<span className="text-sm">{messageTone}</span>
						<ChevronDown size={16} />
					</button>

					{isToneDropdownOpen && (
						<div className="absolute bottom-full right-0 mb-2 bg-white shadow-lg rounded-md border border-gray-200 w-48 z-10">
							<div className="py-2 px-3 border-b border-gray-200">
								<span className="text-sm font-medium text-gray-700">Tone</span>
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
											className={`w-full text-left px-4 py-2 text-sm ${
												tone === messageTone
													? "bg-blue-50 text-blue-700"
													: "hover:bg-gray-100"
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
					className="bg-blue-600 hover:bg-blue-700 transition-colors text-white px-4 py-2 rounded-r-md focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={isLoading}
				>
					<Send size={20} />
				</button>
			</form>
		</div>
	);
};

export default Composer;