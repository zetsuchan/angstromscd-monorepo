import type {
	Payer,
	PriorAuthRequest,
	SCDDrug,
} from "@angstromscd/shared-types";
import { Building2, Clock, FileText, Pill } from "lucide-react";
import type React from "react";
import PAStatusBadge from "./PAStatusBadge";

interface PARequestCardProps {
	request: PriorAuthRequest;
	drug?: SCDDrug;
	payer?: Payer;
	onClick: () => void;
	isSelected?: boolean;
}

const PARequestCard: React.FC<PARequestCardProps> = ({
	request,
	drug,
	payer,
	onClick,
	isSelected = false,
}) => {
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	const urgencyColors = {
		standard: "text-gray-400",
		urgent: "text-yellow-400",
		emergency: "text-red-400",
	};

	return (
		<button
			onClick={onClick}
			className={`w-full text-left p-4 rounded-lg transition-all ${
				isSelected ? "medical-primary" : "glass-subtle hover:glass-hover"
			} border border-white/10`}
		>
			<div className="flex items-start justify-between mb-3">
				<div className="flex items-center gap-2">
					<Pill className="text-blue-300" size={18} />
					<span className="font-medium text-white/90">
						{drug?.brand_name || request.drug_id}
					</span>
				</div>
				<PAStatusBadge status={request.status} size="sm" />
			</div>

			<div className="space-y-2 text-sm">
				<div className="flex items-center gap-2 text-white/70">
					<Building2 size={14} />
					<span>{payer?.name || request.payer_id}</span>
				</div>

				{request.diagnosis_codes && request.diagnosis_codes.length > 0 && (
					<div className="flex items-center gap-2 text-white/70">
						<FileText size={14} />
						<span>ICD-10: {request.diagnosis_codes.join(", ")}</span>
					</div>
				)}

				<div className="flex items-center justify-between text-white/60 text-xs mt-3">
					<div className="flex items-center gap-1">
						<Clock size={12} />
						<span>{formatDate(request.created_at)}</span>
					</div>
					{request.urgency && (
						<span className={urgencyColors[request.urgency]}>
							{request.urgency.charAt(0).toUpperCase() +
								request.urgency.slice(1)}
						</span>
					)}
				</div>
			</div>

			{request.clinical_justification && (
				<div className="mt-3 pt-3 border-t border-white/10">
					<p className="text-xs text-white/50 line-clamp-2">
						{request.clinical_justification.substring(0, 100)}...
					</p>
				</div>
			)}
		</button>
	);
};

export default PARequestCard;
