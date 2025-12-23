import type {
	CreatePAClinicalData,
	SCDGenotype,
	VOESeverity,
} from "@angstromscd/shared-types";
import { Plus, Save, Sparkles, Trash2 } from "lucide-react";
import type React from "react";
import { useState } from "react";

interface ClinicalDataFormProps {
	initialData?: CreatePAClinicalData;
	onSave: (data: CreatePAClinicalData) => Promise<void>;
	onGenerateJustification: (data: CreatePAClinicalData) => Promise<void>;
	isLoading?: boolean;
	isGenerating?: boolean;
}

const ClinicalDataForm: React.FC<ClinicalDataFormProps> = ({
	initialData,
	onSave,
	onGenerateJustification,
	isLoading = false,
	isGenerating = false,
}) => {
	const [formData, setFormData] = useState<CreatePAClinicalData>({
		scd_genotype: initialData?.scd_genotype || "HbSS",
		voe_history: initialData?.voe_history || {
			total_episodes: 0,
			episodes_past_year: 0,
			hospitalizations: 0,
		},
		current_therapies: initialData?.current_therapies || [""],
		failed_therapies: initialData?.failed_therapies || [],
		lab_results: initialData?.lab_results || {},
		hospitalizations_past_year: initialData?.hospitalizations_past_year || 0,
		additional_notes: initialData?.additional_notes || "",
	});

	const genotypes: SCDGenotype[] = [
		"HbSS",
		"HbSC",
		"HbS-beta-thal",
		"HbSD",
		"HbSE",
		"HbSO",
	];
	const severities: VOESeverity[] = ["mild", "moderate", "severe"];

	const handleSave = async () => {
		const cleanedData = {
			...formData,
			current_therapies: formData.current_therapies?.filter(
				(t) => t.trim() !== "",
			),
			failed_therapies: formData.failed_therapies?.filter(
				(t) => t.trim() !== "",
			),
		};
		await onSave(cleanedData);
	};

	const handleGenerate = async () => {
		const cleanedData = {
			...formData,
			current_therapies: formData.current_therapies?.filter(
				(t) => t.trim() !== "",
			),
			failed_therapies: formData.failed_therapies?.filter(
				(t) => t.trim() !== "",
			),
		};
		await onGenerateJustification(cleanedData);
	};

	const addTherapy = (field: "current_therapies" | "failed_therapies") => {
		setFormData((prev) => ({
			...prev,
			[field]: [...(prev[field] || []), ""],
		}));
	};

	const removeTherapy = (
		field: "current_therapies" | "failed_therapies",
		index: number,
	) => {
		setFormData((prev) => ({
			...prev,
			[field]: prev[field]?.filter((_, i) => i !== index),
		}));
	};

	const updateTherapy = (
		field: "current_therapies" | "failed_therapies",
		index: number,
		value: string,
	) => {
		setFormData((prev) => ({
			...prev,
			[field]: prev[field]?.map((t, i) => (i === index ? value : t)),
		}));
	};

	return (
		<div className="space-y-6">
			<h3 className="text-lg font-medium text-white/90">Clinical Data</h3>

			{/* Genotype Selection */}
			<div>
				<label className="block text-sm font-medium text-white/80 mb-2">
					SCD Genotype *
				</label>
				<div className="flex flex-wrap gap-2">
					{genotypes.map((genotype) => (
						<button
							key={genotype}
							type="button"
							onClick={() =>
								setFormData((prev) => ({ ...prev, scd_genotype: genotype }))
							}
							className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
								formData.scd_genotype === genotype
									? "medical-primary text-blue-300"
									: "glass-subtle border-white/20 text-white/70 hover:glass-hover"
							}`}
						>
							{genotype}
						</button>
					))}
				</div>
			</div>

			{/* VOE History */}
			<div className="glass-subtle rounded-lg p-4 space-y-4">
				<h4 className="text-sm font-medium text-white/90">VOE History</h4>

				<div className="grid grid-cols-2 gap-4">
					<div>
						<label className="block text-xs text-white/60 mb-1">
							Total Episodes
						</label>
						<input
							type="number"
							min="0"
							value={formData.voe_history?.total_episodes || 0}
							onChange={(e) =>
								setFormData((prev) => ({
									...prev,
									voe_history: {
										...prev.voe_history,
										total_episodes: Number.parseInt(e.target.value) || 0,
									},
								}))
							}
							className="w-full px-3 py-2 rounded-lg glass-subtle border border-white/20 text-white/90 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-400/50"
						/>
					</div>
					<div>
						<label className="block text-xs text-white/60 mb-1">
							Episodes Past Year
						</label>
						<input
							type="number"
							min="0"
							value={formData.voe_history?.episodes_past_year || 0}
							onChange={(e) =>
								setFormData((prev) => ({
									...prev,
									voe_history: {
										...prev.voe_history,
										episodes_past_year: Number.parseInt(e.target.value) || 0,
									},
								}))
							}
							className="w-full px-3 py-2 rounded-lg glass-subtle border border-white/20 text-white/90 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-400/50"
						/>
					</div>
					<div>
						<label className="block text-xs text-white/60 mb-1">
							Hospitalizations
						</label>
						<input
							type="number"
							min="0"
							value={formData.voe_history?.hospitalizations || 0}
							onChange={(e) =>
								setFormData((prev) => ({
									...prev,
									voe_history: {
										...prev.voe_history,
										hospitalizations: Number.parseInt(e.target.value) || 0,
									},
								}))
							}
							className="w-full px-3 py-2 rounded-lg glass-subtle border border-white/20 text-white/90 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-400/50"
						/>
					</div>
					<div>
						<label className="block text-xs text-white/60 mb-1">
							Average Severity
						</label>
						<select
							value={formData.voe_history?.average_severity || ""}
							onChange={(e) =>
								setFormData((prev) => ({
									...prev,
									voe_history: {
										...prev.voe_history,
										average_severity:
											(e.target.value as VOESeverity) || undefined,
									},
								}))
							}
							className="w-full px-3 py-2 rounded-lg glass-subtle border border-white/20 text-white/90 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-400/50"
						>
							<option value="" className="bg-slate-800">
								Not specified
							</option>
							{severities.map((severity) => (
								<option
									key={severity}
									value={severity}
									className="bg-slate-800"
								>
									{severity.charAt(0).toUpperCase() + severity.slice(1)}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			{/* Lab Results */}
			<div className="glass-subtle rounded-lg p-4 space-y-4">
				<h4 className="text-sm font-medium text-white/90">Lab Results</h4>

				<div className="grid grid-cols-3 gap-4">
					<div>
						<label className="block text-xs text-white/60 mb-1">
							Hemoglobin (g/dL)
						</label>
						<input
							type="number"
							step="0.1"
							min="0"
							value={formData.lab_results?.hemoglobin || ""}
							onChange={(e) =>
								setFormData((prev) => ({
									...prev,
									lab_results: {
										...prev.lab_results,
										hemoglobin: Number.parseFloat(e.target.value) || undefined,
									},
								}))
							}
							className="w-full px-3 py-2 rounded-lg glass-subtle border border-white/20 text-white/90 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-400/50"
						/>
					</div>
					<div>
						<label className="block text-xs text-white/60 mb-1">HbF %</label>
						<input
							type="number"
							step="0.1"
							min="0"
							max="100"
							value={formData.lab_results?.hemoglobin_f_percentage || ""}
							onChange={(e) =>
								setFormData((prev) => ({
									...prev,
									lab_results: {
										...prev.lab_results,
										hemoglobin_f_percentage:
											Number.parseFloat(e.target.value) || undefined,
									},
								}))
							}
							className="w-full px-3 py-2 rounded-lg glass-subtle border border-white/20 text-white/90 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-400/50"
						/>
					</div>
					<div>
						<label className="block text-xs text-white/60 mb-1">
							Test Date
						</label>
						<input
							type="date"
							value={formData.lab_results?.test_date || ""}
							onChange={(e) =>
								setFormData((prev) => ({
									...prev,
									lab_results: {
										...prev.lab_results,
										test_date: e.target.value || undefined,
									},
								}))
							}
							className="w-full px-3 py-2 rounded-lg glass-subtle border border-white/20 text-white/90 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-400/50"
						/>
					</div>
				</div>
			</div>

			{/* Current Therapies */}
			<div>
				<label className="block text-sm font-medium text-white/80 mb-2">
					Current Therapies
				</label>
				<div className="space-y-2">
					{formData.current_therapies?.map((therapy, index) => (
						<div key={index} className="flex gap-2">
							<input
								type="text"
								value={therapy}
								onChange={(e) =>
									updateTherapy("current_therapies", index, e.target.value)
								}
								placeholder="e.g., Hydroxyurea 1000mg daily"
								className="flex-1 px-4 py-2 rounded-lg glass-subtle border border-white/20 text-white/90 bg-transparent placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
							/>
							<button
								type="button"
								onClick={() => removeTherapy("current_therapies", index)}
								className="p-2 text-red-400 hover:text-red-300 glass-subtle hover:glass-hover rounded-lg transition-all"
							>
								<Trash2 size={18} />
							</button>
						</div>
					))}
					<button
						type="button"
						onClick={() => addTherapy("current_therapies")}
						className="flex items-center gap-2 text-blue-300 hover:text-blue-200 text-sm"
					>
						<Plus size={16} />
						Add therapy
					</button>
				</div>
			</div>

			{/* Failed Therapies */}
			<div>
				<label className="block text-sm font-medium text-white/80 mb-2">
					Failed/Contraindicated Therapies
				</label>
				<div className="space-y-2">
					{formData.failed_therapies?.map((therapy, index) => (
						<div key={index} className="flex gap-2">
							<input
								type="text"
								value={therapy}
								onChange={(e) =>
									updateTherapy("failed_therapies", index, e.target.value)
								}
								placeholder="e.g., Hydroxyurea - inadequate response"
								className="flex-1 px-4 py-2 rounded-lg glass-subtle border border-white/20 text-white/90 bg-transparent placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
							/>
							<button
								type="button"
								onClick={() => removeTherapy("failed_therapies", index)}
								className="p-2 text-red-400 hover:text-red-300 glass-subtle hover:glass-hover rounded-lg transition-all"
							>
								<Trash2 size={18} />
							</button>
						</div>
					))}
					<button
						type="button"
						onClick={() => addTherapy("failed_therapies")}
						className="flex items-center gap-2 text-blue-300 hover:text-blue-200 text-sm"
					>
						<Plus size={16} />
						Add failed therapy
					</button>
				</div>
			</div>

			{/* Additional Notes */}
			<div>
				<label className="block text-sm font-medium text-white/80 mb-2">
					Additional Notes
				</label>
				<textarea
					value={formData.additional_notes || ""}
					onChange={(e) =>
						setFormData((prev) => ({
							...prev,
							additional_notes: e.target.value,
						}))
					}
					placeholder="Any additional clinical information relevant to this prior authorization..."
					rows={3}
					className="w-full px-4 py-2 rounded-lg glass-subtle border border-white/20 text-white/90 bg-transparent placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50 resize-none"
				/>
			</div>

			{/* Action Buttons */}
			<div className="flex gap-3 pt-4">
				<button
					type="button"
					onClick={handleSave}
					disabled={isLoading}
					className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg glass-subtle border border-white/20 text-white/80 hover:glass-hover disabled:opacity-50 transition-all"
				>
					<Save size={18} />
					{isLoading ? "Saving..." : "Save Clinical Data"}
				</button>
				<button
					type="button"
					onClick={handleGenerate}
					disabled={isGenerating || !formData.scd_genotype}
					className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg medical-success text-green-300 font-medium hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
				>
					<Sparkles size={18} />
					{isGenerating ? "Generating..." : "Generate Justification"}
				</button>
			</div>
		</div>
	);
};

export default ClinicalDataForm;
