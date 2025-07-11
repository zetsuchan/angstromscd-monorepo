import React from "react";
import ChatPane from "./components/chat/ChatPane";
import Composer from "./components/chat/Composer";
import Footer from "./components/layout/Footer";
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import { ChatProvider } from "./context/ChatContext";

function App() {
	return (
		<ChatProvider>
			<div className="flex flex-col h-screen bg-gray-900">
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
		</ChatProvider>
	);
}

export default App;
