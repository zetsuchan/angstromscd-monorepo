import { Activity, MessageSquare } from "lucide-react";
import { useState } from "react";
import ChatPane from "./components/chat/ChatPane";
import Composer from "./components/chat/Composer";
import Footer from "./components/layout/Footer";
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import { VOCDashboard } from "./components/voc";
import GlassBackground from "./components/webgl/GlassBackground";
import { ChatProvider } from "./context/ChatContext";

type ViewMode = "chat" | "voc";

function App() {
	const [viewMode, setViewMode] = useState<ViewMode>("voc");

	// TODO: Get actual patient ID from auth context
	const patientId = "00000000-0000-0000-0000-000000000001";

	return (
		<ChatProvider>
			<div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
				{/* WebGL Liquid Glass Background */}
				<GlassBackground />

				{/* Main UI Layer */}
				<div className="relative z-10 flex flex-col h-full">
					<Header />

					{/* View Toggle */}
					<div className="px-4 py-2 flex items-center gap-2 border-b border-white/10 bg-slate-900/50 backdrop-blur-sm">
						<button
							type="button"
							onClick={() => setViewMode("voc")}
							className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
								viewMode === "voc"
									? "bg-purple-500/80 text-white"
									: "bg-slate-800/60 text-white/60 hover:bg-slate-700/60 hover:text-white/80"
							}`}
						>
							<Activity size={18} />
							<span>VOC Monitor</span>
						</button>
						<button
							type="button"
							onClick={() => setViewMode("chat")}
							className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
								viewMode === "chat"
									? "bg-blue-500/80 text-white"
									: "bg-slate-800/60 text-white/60 hover:bg-slate-700/60 hover:text-white/80"
							}`}
						>
							<MessageSquare size={18} />
							<span>Research Chat</span>
						</button>
					</div>

					<div className="flex-1 flex overflow-hidden min-h-0">
						<Sidebar />
						<main className="flex-1 flex flex-col min-h-0 overflow-auto">
							{viewMode === "chat" ? (
								<>
									<ChatPane />
									<Composer />
								</>
							) : (
								<VOCDashboard patientId={patientId} />
							)}
						</main>
					</div>
					<Footer />
				</div>
			</div>
		</ChatProvider>
	);
}

export default App;
