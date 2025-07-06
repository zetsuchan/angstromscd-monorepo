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
			<div className="w-12 bg-gray-100 border-r border-gray-200 flex flex-col items-center py-4">
				<button
					onClick={() => setIsCollapsed(false)}
					className="p-1.5 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200 mb-6"
				>
					<ChevronRight size={18} />
				</button>

				{threads.map((thread) => (
					<button
						key={thread.id}
						className={`w-8 h-8 mb-2 rounded-full flex items-center justify-center ${
							thread.isActive
								? "bg-blue-600 text-white"
								: "bg-gray-200 text-gray-700 hover:bg-gray-300"
						}`}
						onClick={() => handleThreadClick(thread.id)}
					>
						{thread.name.charAt(0)}
					</button>
				))}

				<button className="w-8 h-8 mt-2 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center justify-center">
					<Plus size={16} />
				</button>
			</div>
		);
	}

	return (
		<div className="w-64 bg-gray-100 border-r border-gray-200 flex flex-col h-full">
			<div className="p-4 flex items-center justify-between border-b border-gray-200">
				<h2 className="font-medium text-gray-700">Threads</h2>
				<button
					onClick={() => setIsCollapsed(true)}
					className="p-1.5 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200"
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
					<button className="w-full flex items-center space-x-2 text-gray-700 hover:text-blue-700 transition-colors py-2">
						<Plus size={16} />
						<span>New Thread</span>
					</button>
				</div>
			</div>

			<div className="border-t border-gray-200 p-4">
				<h3 className="font-medium text-sm text-gray-700 mb-2">
					Recent Alerts
				</h3>
				<ul>
					{alerts.map((alert) => (
						<li key={alert.id} className="mb-2">
							<button
								className={`w-full text-left py-1 px-2 rounded ${
									alert.isRead
										? "text-gray-500"
										: alert.type === "warning"
											? "text-red-600 bg-red-50"
											: "text-blue-600 bg-blue-50"
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
				className={`w-full flex items-center space-x-2 px-4 py-2 text-left ${
					thread.isActive
						? "bg-blue-100 text-blue-700"
						: "text-gray-700 hover:bg-gray-200"
				}`}
				onClick={onClick}
			>
				<span className={thread.isActive ? "font-medium" : ""}>
					{thread.name}
				</span>
				{thread.isActive && <span className="text-blue-700 text-xs">▶</span>}
			</button>
		</li>
	);
};

export default Sidebar;
