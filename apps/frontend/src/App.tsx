import React, { useState, createContext, useContext } from "react";
import ChatPane from "./components/chat/ChatPane";
import Composer from "./components/chat/Composer";
import Footer from "./components/layout/Footer";
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import { PADashboard } from "./components/prior-auth";
import GlassBackground from "./components/webgl/GlassBackground";
import { ChatProvider } from "./context/ChatContext";
import { PriorAuthProvider } from "./context/PriorAuthContext";

// Navigation context for switching between views
type AppView = "chat" | "prior-auth";

interface NavigationContextType {
	currentView: AppView;
	setCurrentView: (view: AppView) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
	undefined,
);

export const useNavigation = () => {
	const context = useContext(NavigationContext);
	if (!context) {
		throw new Error("useNavigation must be used within NavigationProvider");
	}
	return context;
};

function App() {
	const [currentView, setCurrentView] = useState<AppView>("chat");

	return (
		<NavigationContext.Provider value={{ currentView, setCurrentView }}>
			<ChatProvider>
				<PriorAuthProvider>
					<div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
						{/* WebGL Liquid Glass Background */}
						<GlassBackground />

						{/* Main UI Layer */}
						<div className="relative z-10 flex flex-col h-full">
							<Header />
							<div className="flex-1 flex overflow-hidden min-h-0">
								{currentView === "chat" && <Sidebar />}
								<main className="flex-1 flex flex-col min-h-0">
									{currentView === "chat" ? (
										<>
											<ChatPane />
											<Composer />
										</>
									) : (
										<PADashboard />
									)}
								</main>
							</div>
							<Footer />
						</div>
					</div>
				</PriorAuthProvider>
			</ChatProvider>
		</NavigationContext.Provider>
	);
}

export default App;
