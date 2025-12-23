import type {
	CreatePARequestData,
	PAUrgency,
	Payer,
	SCDDrug,
} from "@angstromscd/shared-types";
import { Plus, Trash2, X } from "lucide-react";
import type React from "react";
import { useState } from "react";

interface PARequestFormProps {
	drugs: SCDDrug[];
	payers: Payer[];
	onSubmit: (data: CreatePARequestData) => Promise<void>;
	onCancel: () => void;
	isLoading?: boolean;
}

const PARequestForm: React.FC<PARequestFormProps> = ({
	drugs,
	payers,
	onSubmit,
	onCancel,
	isLoading = false,
}) => {
	const [formData, setFormData] = useState<CreatePARequestData>({
		drug_id: "",
		payer_id: "",
		urgency: "standard",
		diagnosis_codes: [""],
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const cleanedData = {
			...formData,
			diagnosis_codes: formData.diagnosis_codes?.filter(
				(code) => code.trim() !== "",
			),
		};
		await onSubmit(cleanedData);
	};

	const addDiagnosisCode = () => {
		setFormData((prev) => ({
			...prev,
			diagnosis_codes: [...(prev.diagnosis_codes || []), ""],
		}));
	};

	const removeDiagnosisCode = (index: number) => {
		setFormData((prev) => ({
			...prev,
			diagnosis_codes: prev.diagnosis_codes?.filter((_, i) => i !== index),
		}));
	};

	const updateDiagnosisCode = (index: number, value: string) => {
		setFormData((prev) => ({
			...prev,
			diagnosis_codes: prev.diagnosis_codes?.map((code, i) =>
				i === index ? value : code,
			),
		}));
	};

	return (
		<div className="glass-strong rounded-lg p-6">
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-xl font-medium text-white/90">
					New Prior Authorization
				</h2>
				<button
					onClick={onCancel}
					className="p-2 text-white/70 hover:text-white/90 rounded-full glass-subtle hover:glass-hover transition-all"
				>
					<X size={20} />
				</button>
			</div>

			<form onSubmit={handleSubmit} className="space-y-6">
				<div>
					<label className="block text-sm font-medium text-white/80 mb-2">
						SCD Drug *
					</label>
					<select
						value={formData.drug_id}
						onChange={(e) =>
							setFormData((prev) => ({ ...prev, drug_id: e.target.value }))
						}
						required
						className="w-full px-4 py-2 rounded-lg glass-subtle border border-white/20 text-white/90 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-400/50"
					>
						<option value="" className="bg-slate-800">
							Select a drug...
						</option>
						{drugs.map((drug) => (
							<option key={drug.id} value={drug.id} className="bg-slate-800">
								{drug.brand_name} ({drug.generic_name})
							</option>
						))}
					</select>
				</div>

				<div>
					<label className="block text-sm font-medium text-white/80 mb-2">
						Insurance Payer *
					</label>
					<select
						value={formData.payer_id}
						onChange={(e) =>
							setFormData((prev) => ({ ...prev, payer_id: e.target.value }))
						}
						required
						className="w-full px-4 py-2 rounded-lg glass-subtle border border-white/20 text-white/90 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-400/50"
					>
						<option value="" className="bg-slate-800">
							Select a payer...
						</option>
						{payers.map((payer) => (
							<option key={payer.id} value={payer.id} className="bg-slate-800">
								{payer.name}
							</option>
						))}
					</select>
				</div>

				<div>
					<label className="block text-sm font-medium text-white/80 mb-2">
						Urgency
					</label>
					<div className="flex gap-3">
						{(["standard", "urgent", "emergency"] as PAUrgency[]).map(
							(urgency) => (
								<button
									key={urgency}
									type="button"
									onClick={() => setFormData((prev) => ({ ...prev, urgency }))}
									className={`px-4 py-2 rounded-lg border transition-all ${
										formData.urgency === urgency
											? urgency === "emergency"
												? "bg-red-500/20 border-red-400/50 text-red-300"
												: urgency === "urgent"
													? "bg-yellow-500/20 border-yellow-400/50 text-yellow-300"
													: "bg-blue-500/20 border-blue-400/50 text-blue-300"
											: "glass-subtle border-white/20 text-white/70 hover:glass-hover"
									}`}
								>
									{urgency.charAt(0).toUpperCase() + urgency.slice(1)}
								</button>
							),
						)}
					</div>
				</div>

				<div>
					<label className="block text-sm font-medium text-white/80 mb-2">
						ICD-10 Diagnosis Codes
					</label>
					<div className="space-y-2">
						{formData.diagnosis_codes?.map((code, index) => (
							<div key={index} className="flex gap-2">
								<input
									type="text"
									value={code}
									onChange={(e) => updateDiagnosisCode(index, e.target.value)}
									placeholder="e.g., D57.1"
									className="flex-1 px-4 py-2 rounded-lg glass-subtle border border-white/20 text-white/90 bg-transparent placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
								/>
								{formData.diagnosis_codes &&
									formData.diagnosis_codes.length > 1 && (
										<button
											type="button"
											onClick={() => removeDiagnosisCode(index)}
											className="p-2 text-red-400 hover:text-red-300 glass-subtle hover:glass-hover rounded-lg transition-all"
										>
											<Trash2 size={18} />
										</button>
									)}
							</div>
						))}
						<button
							type="button"
							onClick={addDiagnosisCode}
							className="flex items-center gap-2 text-blue-300 hover:text-blue-200 text-sm"
						>
							<Plus size={16} />
							Add diagnosis code
						</button>
					</div>
				</div>

				<div className="flex gap-3 pt-4">
					<button
						type="button"
						onClick={onCancel}
						className="flex-1 px-4 py-2 rounded-lg glass-subtle border border-white/20 text-white/80 hover:glass-hover transition-all"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isLoading || !formData.drug_id || !formData.payer_id}
						className="flex-1 px-4 py-2 rounded-lg medical-primary text-blue-300 font-medium hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
					>
						{isLoading ? "Creating..." : "Create PA Request"}
					</button>
				</div>
			</form>
		</div>
	);
};

export default PARequestForm;
