import { GitBranch } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useChat } from "../../context/ChatContext";
import ChatBubble from "./ChatBubble";

const ChatPane: React.FC = () => {
	const { currentThread, createThread, isLoading } = useChat();
	const [isCreatingBranch, setIsCreatingBranch] = useState(false);
	const [branchName, setBranchName] = useState("");
	const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);
	const [elapsedTime, setElapsedTime] = useState(0);
	const chatContainerRef = useRef<HTMLDivElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	});

	// Track loading time
	useEffect(() => {
		if (isLoading) {
			setLoadingStartTime(Date.now());
			const interval = setInterval(() => {
				setElapsedTime(Math.floor((Date.now() - Date.now()) / 1000));
			}, 100);
			return () => clearInterval(interval);
		}
		setLoadingStartTime(null);
		setElapsedTime(0);
	}, [isLoading]);

	// Update elapsed time
	useEffect(() => {
		if (loadingStartTime) {
			const interval = setInterval(() => {
				setElapsedTime(Math.floor((Date.now() - loadingStartTime) / 1000));
			}, 100);
			return () => clearInterval(interval);
		}
	}, [loadingStartTime]);

	const handleCreateBranch = () => {
		if (branchName.trim()) {
			createThread(branchName.trim());
			setBranchName("");
			setIsCreatingBranch(false);
		}
	};

	if (!currentThread) {
		return (
			<div className="flex-1 flex items-center justify-center p-4">
				<div className="text-center text-white/70 glass-subtle p-8 rounded-lg">
					<p className="mb-2">No thread selected.</p>
					<p>Select a thread from the sidebar or create a new one.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 flex flex-col relative overflow-hidden">
			<div className="flex items-center justify-between px-4 py-2 glass-subtle border-b border-white/20 flex-shrink-0">
				<h2 className="font-medium text-white/90">{currentThread.name}</h2>
				<button
					type="button"
					className="flex items-center space-x-1 text-white/80 hover:text-blue-300 transition-all px-2 py-1 rounded glass-subtle hover:glass-hover glass-focus"
					onClick={() => setIsCreatingBranch(true)}
				>
					<GitBranch size={16} />
					<span className="text-sm">Fork this thread</span>
				</button>
			</div>

			<div
				className="flex-1 overflow-y-auto p-4 min-h-0"
				ref={chatContainerRef}
			>
				{currentThread.messages.length === 0 ? (
					<div className="flex items-center justify-center h-full text-white/70">
						<div className="glass-subtle p-6 rounded-lg">
							<p>This thread is empty. Start a conversation!</p>
						</div>
					</div>
				) : (
					<>
						{currentThread.messages.map((message) => (
							<ChatBubble key={message.id} message={message} />
						))}
						{isLoading && (
							<div className="flex items-start space-x-3 mt-4">
								<div className="w-8 h-8 rounded-full medical-primary flex items-center justify-center">
									<span className="text-blue-300 font-bold text-sm">AI</span>
								</div>
								<div className="glass-subtle rounded-lg px-4 py-3 max-w-3xl">
									<div className="flex items-center space-x-2">
										<div className="flex space-x-1">
											<div
												className="w-2 h-2 bg-blue-300 rounded-full animate-bounce"
												style={{ animationDelay: "0ms" }}
											/>
											<div
												className="w-2 h-2 bg-blue-300 rounded-full animate-bounce"
												style={{ animationDelay: "150ms" }}
											/>
											<div
												className="w-2 h-2 bg-blue-300 rounded-full animate-bounce"
												style={{ animationDelay: "300ms" }}
											/>
										</div>
										<span className="text-sm text-white/80">
											Thinking{elapsedTime > 0 && ` for ${elapsedTime}s`}...
										</span>
									</div>
								</div>
							</div>
						)}
						<div ref={messagesEndRef} />
					</>
				)}
			</div>

			{isCreatingBranch && (
				<div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10">
					<div className="glass-strong rounded-lg p-6 w-80">
						<h3 className="text-lg font-medium mb-4 text-white/90">
							Fork this thread as...
						</h3>
						<input
							type="text"
							className="w-full glass-subtle border border-white/20 rounded px-3 py-2 mb-4 text-white/90 placeholder-white/50 glass-focus"
							placeholder="Enter branch name"
							value={branchName}
							onChange={(e) => setBranchName(e.target.value)}
						/>
						<div className="flex justify-end space-x-2">
							<button
								type="button"
								className="px-4 py-2 text-white/80 hover:text-white/90 glass-subtle hover:glass-hover glass-focus rounded transition-all"
								onClick={() => setIsCreatingBranch(false)}
							>
								Cancel
							</button>
							<button
								type="button"
								className="px-4 py-2 medical-primary text-blue-300 hover:glass-hover glass-focus rounded transition-all"
								onClick={handleCreateBranch}
							>
								Create
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ChatPane;
