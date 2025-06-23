import { Clock, Database } from "lucide-react";
import type React from "react";
import { useChat } from "../../context/ChatContext";

const Footer: React.FC = () => {
	const { statusInfo, newLiterature } = useChat();

	return (
		<footer className="bg-gray-50 border-t border-gray-200 py-2 px-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center text-sm text-gray-600">
					<span className="font-medium mr-1">What's New:</span>
					<span className="text-gray-700 max-w-lg truncate">
						{newLiterature}
					</span>
				</div>

				<div className="flex items-center space-x-4 text-xs text-gray-600">
					<div className="flex items-center">
						<Database size={14} className="mr-1 text-green-600" />
						<span>Vector-DB synced {statusInfo.vectorDb.timeAgo}</span>
					</div>

					<div className="flex items-center">
						<Clock size={14} className="mr-1 text-blue-600" />
						<span>Connected to {statusInfo.fhir.connection}</span>
					</div>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
