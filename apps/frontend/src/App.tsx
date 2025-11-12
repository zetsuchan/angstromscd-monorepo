import React from "react";
import ChatPane from "./components/chat/ChatPane";
import Composer from "./components/chat/Composer";
import Footer from "./components/layout/Footer";
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import { ChatProvider } from "./context/ChatContext";
import GlassBackground from "./components/webgl/GlassBackground";

function App() {
	return (
		<ChatProvider>
			<div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
				{/* WebGL Liquid Glass Background */}
				<GlassBackground />

				{/* Main UI Layer */}
				<div className="relative z-10 flex flex-col h-full">
					<Header />
					<div className="flex-1 flex overflow-hidden min-h-0">
						<Sidebar />
						<main className="flex-1 flex flex-col min-h-0">
							<ChatPane />
							<Composer />
						</main>
					</div>
					<Footer />
				</div>
			</div>
		</ChatProvider>
	);
}

export default App;
