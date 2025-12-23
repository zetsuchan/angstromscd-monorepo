import type { PAStatus } from "@angstromscd/shared-types";
import type React from "react";

interface PAStatusBadgeProps {
	status: PAStatus;
	size?: "sm" | "md";
}

const statusConfig: Record<
	PAStatus,
	{ label: string; className: string; icon: string }
> = {
	draft: {
		label: "Draft",
		className: "bg-gray-500/20 text-gray-300 border-gray-400/30",
		icon: "📝",
	},
	pending_info: {
		label: "Pending Info",
		className: "bg-yellow-500/20 text-yellow-300 border-yellow-400/30",
		icon: "⏳",
	},
	submitted: {
		label: "Submitted",
		className: "bg-blue-500/20 text-blue-300 border-blue-400/30",
		icon: "📤",
	},
	under_review: {
		label: "Under Review",
		className: "bg-purple-500/20 text-purple-300 border-purple-400/30",
		icon: "🔍",
	},
	approved: {
		label: "Approved",
		className: "bg-green-500/20 text-green-300 border-green-400/30",
		icon: "✅",
	},
	denied: {
		label: "Denied",
		className: "bg-red-500/20 text-red-300 border-red-400/30",
		icon: "❌",
	},
	appealed: {
		label: "Appealed",
		className: "bg-orange-500/20 text-orange-300 border-orange-400/30",
		icon: "📋",
	},
};

const PAStatusBadge: React.FC<PAStatusBadgeProps> = ({
	status,
	size = "md",
}) => {
	const config = statusConfig[status];
	const sizeClasses =
		size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full border backdrop-blur-sm ${config.className} ${sizeClasses}`}
		>
			<span>{config.icon}</span>
			<span>{config.label}</span>
		</span>
	);
};

export default PAStatusBadge;
