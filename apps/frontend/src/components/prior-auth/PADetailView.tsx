import type {
	CreatePAClinicalData,
	PAClinicalData,
	Payer,
	PriorAuthRequest,
	SCDDrug,
} from "@angstromscd/shared-types";
import {
	ArrowLeft,
	Building2,
	Check,
	Copy,
	FileText,
	Pill,
	Trash2,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import ClinicalDataForm from "./ClinicalDataForm";
import PAStatusBadge from "./PAStatusBadge";

interface PADetailViewProps {
	request: PriorAuthRequest;
	clinicalData: PAClinicalData | null;
	drug?: SCDDrug;
	payer?: Payer;
	onBack: () => void;
	onDelete: () => Promise<void>;
	onSaveClinicalData: (data: CreatePAClinicalData) => Promise<void>;
	onGenerateJustification: (data: CreatePAClinicalData) => Promise<void>;
	isLoading?: boolean;
	isGenerating?: boolean;
}

const PADetailView: React.FC<PADetailViewProps> = ({
	request,
	clinicalData,
	drug,
	payer,
	onBack,
	onDelete,
	onSaveClinicalData,
	onGenerateJustification,
	isLoading = false,
	isGenerating = false,
}) => {
	const [copied, setCopied] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	const copyJustification = async () => {
		if (request.clinical_justification) {
			await navigator.clipboard.writeText(request.clinical_justification);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const handleDelete = async () => {
		await onDelete();
		setShowDeleteConfirm(false);
	};

	return (
		<div className="h-full flex flex-col">
			{/* Header */}
			<div className="glass-light border-b border-white/20 p-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<button
							onClick={onBack}
							className="p-2 text-white/70 hover:text-white/90 rounded-full glass-subtle hover:glass-hover transition-all"
						>
							<ArrowLeft size={20} />
						</button>
						<div>
							<div className="flex items-center gap-3">
								<h1 className="text-xl font-medium text-white/90">
									{drug?.brand_name || request.drug_id}
								</h1>
								<PAStatusBadge status={request.status} />
							</div>
							<p className="text-sm text-white/60 mt-1">
								Created {formatDate(request.created_at)}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						{!showDeleteConfirm ? (
							<button
								onClick={() => setShowDeleteConfirm(true)}
								className="p-2 text-red-400 hover:text-red-300 rounded-full glass-subtle hover:glass-hover transition-all"
							>
								<Trash2 size={20} />
							</button>
						) : (
							<div className="flex items-center gap-2 glass-subtle rounded-lg px-3 py-2">
								<span className="text-sm text-white/80">Delete this PA?</span>
								<button
									onClick={handleDelete}
									className="px-3 py-1 text-sm bg-red-500/30 text-red-300 rounded hover:bg-red-500/50 transition-all"
								>
									Yes
								</button>
								<button
									onClick={() => setShowDeleteConfirm(false)}
									className="px-3 py-1 text-sm glass-subtle text-white/70 rounded hover:glass-hover transition-all"
								>
									No
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-6">
				<div className="max-w-4xl mx-auto space-y-6">
					{/* Request Info */}
					<div className="glass-strong rounded-lg p-6">
						<h2 className="text-lg font-medium text-white/90 mb-4">
							Request Details
						</h2>
						<div className="grid grid-cols-2 gap-6">
							<div className="space-y-4">
								<div className="flex items-start gap-3">
									<Pill className="text-blue-300 mt-1" size={18} />
									<div>
										<p className="text-sm text-white/60">Drug</p>
										<p className="text-white/90">
											{drug?.brand_name || request.drug_id}
										</p>
										{drug?.generic_name && (
											<p className="text-sm text-white/60">
												{drug.generic_name}
											</p>
										)}
									</div>
								</div>
								<div className="flex items-start gap-3">
									<Building2 className="text-green-300 mt-1" size={18} />
									<div>
										<p className="text-sm text-white/60">Payer</p>
										<p className="text-white/90">
											{payer?.name || request.payer_id}
										</p>
										{payer?.payer_type && (
											<p className="text-sm text-white/60 capitalize">
												{payer.payer_type}
											</p>
										)}
									</div>
								</div>
							</div>
							<div className="space-y-4">
								<div className="flex items-start gap-3">
									<FileText className="text-purple-300 mt-1" size={18} />
									<div>
										<p className="text-sm text-white/60">Diagnosis Codes</p>
										<p className="text-white/90">
											{request.diagnosis_codes?.join(", ") || "Not specified"}
										</p>
									</div>
								</div>
								<div>
									<p className="text-sm text-white/60">Urgency</p>
									<p
										className={`capitalize ${
											request.urgency === "emergency"
												? "text-red-300"
												: request.urgency === "urgent"
													? "text-yellow-300"
													: "text-white/90"
										}`}
									>
										{request.urgency || "Standard"}
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Clinical Justification */}
					{request.clinical_justification && (
						<div className="glass-strong rounded-lg p-6">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-lg font-medium text-white/90">
									AI-Generated Clinical Justification
								</h2>
								<button
									onClick={copyJustification}
									className="flex items-center gap-2 px-3 py-1.5 text-sm glass-subtle text-white/70 hover:glass-hover rounded-lg transition-all"
								>
									{copied ? (
										<>
											<Check size={16} className="text-green-400" />
											Copied!
										</>
									) : (
										<>
											<Copy size={16} />
											Copy
										</>
									)}
								</button>
							</div>
							<div className="prose prose-invert max-w-none">
								<div className="whitespace-pre-wrap text-white/80 text-sm leading-relaxed">
									{request.clinical_justification}
								</div>
							</div>
						</div>
					)}

					{/* Clinical Data Form */}
					<div className="glass-strong rounded-lg p-6">
						<ClinicalDataForm
							initialData={
								clinicalData
									? {
											scd_genotype: clinicalData.scd_genotype,
											voe_history: clinicalData.voe_history,
											current_therapies: clinicalData.current_therapies,
											failed_therapies: clinicalData.failed_therapies,
											lab_results: clinicalData.lab_results,
											hospitalizations_past_year:
												clinicalData.hospitalizations_past_year,
											additional_notes: clinicalData.additional_notes,
										}
									: undefined
							}
							onSave={onSaveClinicalData}
							onGenerateJustification={onGenerateJustification}
							isLoading={isLoading}
							isGenerating={isGenerating}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PADetailView;
