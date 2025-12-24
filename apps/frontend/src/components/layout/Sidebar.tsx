import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useChat } from "../../context/ChatContext";
import type { Alert, Thread } from "../../types";

const Sidebar: React.FC = () => {
	const { threads, setCurrentThread, alerts, markAlertAsRead } = useChat();
	const [isCollapsed, setIsCollapsed] = useState(false);

	const handleThreadClick = (threadId: string) => {
		setCurrentThread(threadId);
	};

	const handleAlertClick = (alert: Alert) => {
		markAlertAsRead(alert.id);
		// In a real implementation, we would navigate to the relevant thread or show more details
	};

	if (isCollapsed) {
		return (
			<div className="w-12 glass-light border-r border-white/20 flex flex-col items-center py-4 h-full">
				<button
					type="button"
					onClick={() => setIsCollapsed(false)}
					className="p-1.5 text-white/70 hover:text-white/90 rounded-full glass-subtle hover:glass-hover glass-focus mb-6 transition-all"
				>
					<ChevronRight size={18} />
				</button>

				{threads.map((thread) => (
					<button
						type="button"
						key={thread.id}
						className={`w-8 h-8 mb-2 rounded-full flex items-center justify-center transition-all ${
							thread.isActive
								? "medical-primary text-blue-300"
								: "glass-subtle text-white/80 hover:glass-hover glass-focus"
						}`}
						onClick={() => handleThreadClick(thread.id)}
					>
						{thread.name.charAt(0)}
					</button>
				))}

				<button
					type="button"
					className="w-8 h-8 mt-2 rounded-full glass-subtle text-white/80 hover:glass-hover glass-focus flex items-center justify-center transition-all"
				>
					<Plus size={16} />
				</button>
			</div>
		);
	}

	return (
		<div className="w-64 glass-light border-r border-white/20 flex flex-col h-full">
			<div className="p-4 flex items-center justify-between border-b border-white/20">
				<h2 className="font-medium text-white/90">Threads</h2>
				<button
					type="button"
					onClick={() => setIsCollapsed(true)}
					className="p-1.5 text-white/70 hover:text-white/90 rounded-full glass-subtle hover:glass-hover glass-focus transition-all"
				>
					<ChevronLeft size={18} />
				</button>
			</div>

			<div className="overflow-y-auto flex-grow">
				<ul className="py-2">
					{threads.map((thread) => (
						<ThreadItem
							key={thread.id}
							thread={thread}
							onClick={() => handleThreadClick(thread.id)}
						/>
					))}
				</ul>

				<div className="px-4 py-2">
					<button
						type="button"
						className="w-full flex items-center space-x-2 text-white/80 hover:text-blue-300 glass-subtle hover:glass-hover glass-focus px-3 py-2 rounded-md transition-all"
					>
						<Plus size={16} />
						<span>New Thread</span>
					</button>
				</div>
			</div>

			<div className="border-t border-white/20 p-4">
				<h3 className="font-medium text-sm text-white/90 mb-2">
					Recent Alerts
				</h3>
				<ul>
					{alerts.map((alert) => (
						<li key={alert.id} className="mb-2">
							<button
								type="button"
								className={`w-full text-left py-1 px-2 rounded transition-all ${
									alert.isRead
										? "text-white/50 glass-subtle"
										: alert.type === "warning"
											? "text-pink-300 medical-alert"
											: "text-blue-300 medical-primary"
								}`}
								onClick={() => handleAlertClick(alert)}
							>
								<div className="flex items-center">
									<span className="mr-2">
										{alert.type === "warning" ? "🚨" : "📬"}
									</span>
									<span className={alert.isRead ? "" : "font-medium"}>
										{alert.content}
									</span>
								</div>
							</button>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
};

interface ThreadItemProps {
	thread: Thread;
	onClick: () => void;
}

const ThreadItem: React.FC<ThreadItemProps> = ({ thread, onClick }) => {
	return (
		<li>
			<button
				type="button"
				className={`w-full flex items-center space-x-2 px-4 py-2 text-left transition-all ${
					thread.isActive
						? "medical-primary text-blue-300"
						: "text-white/80 hover:glass-subtle"
				}`}
				onClick={onClick}
			>
				<span className={thread.isActive ? "font-medium" : ""}>
					{thread.name}
				</span>
				{thread.isActive && <span className="text-blue-300 text-xs">▶</span>}
			</button>
		</li>
	);
};

export default Sidebar;
