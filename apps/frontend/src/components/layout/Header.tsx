import {
	ChevronDown,
	FileCheck,
	Grid3X3,
	MessageSquare,
	Search,
	Settings,
	Upload,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useNavigation } from "../../App";
import { useChat } from "../../context/ChatContext";
import type { Workspace } from "../../types";

const Header: React.FC = () => {
	const { currentWorkspace, setCurrentWorkspace, workspaces } = useChat();
	const { currentView, setCurrentView } = useNavigation();
	const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);

	const handleWorkspaceChange = (workspace: Workspace) => {
		setCurrentWorkspace(workspace);
		setIsWorkspaceDropdownOpen(false);
	};

	return (
		<header className="glass-light border-b border-white/20 py-3 px-4 flex items-center justify-between">
			<div className="flex items-center space-x-4">
				<div className="flex items-center">
					<span className="text-blue-300 font-bold text-2xl">MedLab Chat</span>
					<span className="text-gray-300 text-xs ml-2">by Angstrom AI</span>
				</div>

				<div className="relative">
					<button
						className="flex items-center space-x-1 glass-subtle hover:glass-hover glass-focus px-3 py-1.5 rounded-md text-white/90 transition-all"
						onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
					>
						<span>{currentWorkspace.name}</span>
						<ChevronDown size={16} />
					</button>

					{isWorkspaceDropdownOpen && (
						<div className="absolute top-full left-0 mt-1 glass-strong rounded-md border border-white/20 w-48 z-10">
							<ul>
								{workspaces.map((workspace) => (
									<li key={workspace.id}>
										<button
											className={`w-full text-left px-4 py-2 hover:glass-subtle transition-all rounded-md ${
												workspace.id === currentWorkspace.id
													? "medical-primary text-blue-300"
													: "text-white/90"
											}`}
											onClick={() => handleWorkspaceChange(workspace)}
										>
											{workspace.name}
										</button>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			</div>

			<div className="flex items-center space-x-3">
				{/* View Toggle */}
				<div className="flex items-center rounded-lg glass-subtle p-0.5">
					<button
						onClick={() => setCurrentView("chat")}
						className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition-all ${
							currentView === "chat"
								? "medical-primary text-blue-300"
								: "text-white/70 hover:text-white/90 hover:glass-hover"
						}`}
					>
						<MessageSquare size={18} />
						<span className="text-sm">Chat</span>
					</button>
					<button
						onClick={() => setCurrentView("prior-auth")}
						className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition-all ${
							currentView === "prior-auth"
								? "medical-primary text-blue-300"
								: "text-white/70 hover:text-white/90 hover:glass-hover"
						}`}
					>
						<FileCheck size={18} />
						<span className="text-sm">Prior Auth</span>
					</button>
				</div>

				<div className="w-px h-6 bg-white/20" />

				<button className="flex items-center space-x-1 text-white/80 hover:text-blue-300 glass-subtle hover:glass-hover glass-focus px-3 py-1.5 rounded-md transition-all">
					<Search size={18} />
					<span className="text-sm">New Search</span>
				</button>

				<button className="flex items-center space-x-1 text-white/80 hover:text-green-300 glass-subtle hover:glass-hover glass-focus px-3 py-1.5 rounded-md transition-all">
					<Upload size={18} />
					<span className="text-sm">Upload</span>
				</button>

				<button className="flex items-center space-x-1 text-white/80 hover:text-pink-300 glass-subtle hover:glass-hover glass-focus px-3 py-1.5 rounded-md transition-all">
					<Grid3X3 size={18} />
					<span className="text-sm">Claims Matrix</span>
				</button>

				<button className="p-1.5 text-white/70 hover:text-white/90 rounded-full glass-subtle hover:glass-hover glass-focus transition-all">
					<Settings size={20} />
				</button>
			</div>
		</header>
	);
};

export default Header;
