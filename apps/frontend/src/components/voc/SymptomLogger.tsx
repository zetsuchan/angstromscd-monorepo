/**
 * SymptomLogger Component
 * Daily symptom logging form for VOC prediction
 */

import {
	Activity,
	Droplets,
	Heart,
	Moon,
	Save,
	Smile,
	Thermometer,
	Wind,
	X,
} from "lucide-react";
import { useState } from "react";

interface SymptomFormData {
	painScore: number | null;
	fatigueScore: number | null;
	moodScore: number | null;
	sleepQuality: number | null;
	sleepHours: number | null;
	hydrationLevel: "poor" | "fair" | "good" | "excellent" | null;
	hasFever: boolean;
	hasHeadache: boolean;
	hasShortnessOfBreath: boolean;
	hasChestPain: boolean;
	hasJointPain: boolean;
	hasAbdominalPain: boolean;
	notes: string;
}

interface SymptomLoggerProps {
	patientId: string;
	onSubmit?: (data: SymptomFormData) => void;
	onCancel?: () => void;
	isLoading?: boolean;
}

const initialFormData: SymptomFormData = {
	painScore: null,
	fatigueScore: null,
	moodScore: null,
	sleepQuality: null,
	sleepHours: null,
	hydrationLevel: null,
	hasFever: false,
	hasHeadache: false,
	hasShortnessOfBreath: false,
	hasChestPain: false,
	hasJointPain: false,
	hasAbdominalPain: false,
	notes: "",
};

function ScoreSlider({
	label,
	value,
	onChange,
	icon: Icon,
	lowLabel = "None",
	highLabel = "Severe",
}: {
	label: string;
	value: number | null;
	onChange: (value: number) => void;
	icon: React.ComponentType<{ size?: number; className?: string }>;
	lowLabel?: string;
	highLabel?: string;
}) {
	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2">
				<Icon size={18} className="text-white/70" />
				<span className="text-sm font-medium text-white/90">{label}</span>
				{value !== null && (
					<span className="ml-auto text-sm font-bold text-blue-300">
						{value}/10
					</span>
				)}
			</div>
			<input
				type="range"
				min="0"
				max="10"
				value={value ?? 5}
				onChange={(e) => onChange(Number(e.target.value))}
				className="w-full h-2 bg-slate-700/60 rounded-lg appearance-none cursor-pointer accent-blue-500"
			/>
			<div className="flex justify-between text-xs text-white/50">
				<span>{lowLabel}</span>
				<span>{highLabel}</span>
			</div>
		</div>
	);
}

function SymptomCheckbox({
	label,
	checked,
	onChange,
	warning = false,
}: {
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
	warning?: boolean;
}) {
	return (
		<label className="flex items-center gap-3 cursor-pointer group">
			<div
				className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
					checked
						? warning
							? "bg-red-500/80 border-red-400"
							: "bg-blue-500/80 border-blue-400"
						: "border-white/30 group-hover:border-white/50"
				}`}
			>
				{checked && (
					<svg
						className="w-3 h-3 text-white"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={3}
							d="M5 13l4 4L19 7"
						/>
					</svg>
				)}
			</div>
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
				className="sr-only"
			/>
			<span
				className={`text-sm ${warning && checked ? "text-red-300" : "text-white/80"}`}
			>
				{label}
			</span>
		</label>
	);
}

function HydrationSelector({
	value,
	onChange,
}: {
	value: "poor" | "fair" | "good" | "excellent" | null;
	onChange: (value: "poor" | "fair" | "good" | "excellent") => void;
}) {
	const options: Array<{
		value: "poor" | "fair" | "good" | "excellent";
		label: string;
		color: string;
	}> = [
		{ value: "poor", label: "Poor", color: "bg-red-500/60" },
		{ value: "fair", label: "Fair", color: "bg-yellow-500/60" },
		{ value: "good", label: "Good", color: "bg-green-500/60" },
		{ value: "excellent", label: "Excellent", color: "bg-blue-500/60" },
	];

	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2">
				<Droplets size={18} className="text-white/70" />
				<span className="text-sm font-medium text-white/90">Hydration</span>
			</div>
			<div className="flex gap-2">
				{options.map((option) => (
					<button
						key={option.value}
						type="button"
						onClick={() => onChange(option.value)}
						className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
							value === option.value
								? `${option.color} text-white ring-2 ring-white/30`
								: "bg-slate-800/70 text-white/60 hover:bg-slate-700/60"
						}`}
					>
						{option.label}
					</button>
				))}
			</div>
		</div>
	);
}

export function SymptomLogger({
	patientId,
	onSubmit,
	onCancel,
	isLoading = false,
}: SymptomLoggerProps) {
	const [formData, setFormData] = useState<SymptomFormData>(initialFormData);
	const [submitting, setSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitting(true);

		try {
			// Call API
			const response = await fetch(`/api/voc/patients/${patientId}/symptoms`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					painScore: formData.painScore,
					fatigueScore: formData.fatigueScore,
					moodScore: formData.moodScore,
					sleepQuality: formData.sleepQuality,
					sleepHours: formData.sleepHours,
					hydrationLevel: formData.hydrationLevel,
					hasFever: formData.hasFever,
					hasHeadache: formData.hasHeadache,
					hasShortnessOfBreath: formData.hasShortnessOfBreath,
					hasChestPain: formData.hasChestPain,
					hasJointPain: formData.hasJointPain,
					hasAbdominalPain: formData.hasAbdominalPain,
					notes: formData.notes || undefined,
					source: "manual",
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				console.error("API Error:", errorData);
				throw new Error(errorData?.error?.message || "Failed to log symptoms");
			}

			onSubmit?.(formData);
			setFormData(initialFormData);
		} catch (error) {
			console.error("Error logging symptoms:", error);
		} finally {
			setSubmitting(false);
		}
	};

	const hasWarningSymptoms =
		formData.hasFever || formData.hasChestPain || formData.hasShortnessOfBreath;

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-white">
					Log Today's Symptoms
				</h2>
				{onCancel && (
					<button
						type="button"
						onClick={onCancel}
						className="p-2 text-white/60 hover:text-white/90 transition-colors"
					>
						<X size={20} />
					</button>
				)}
			</div>

			{/* Warning Banner */}
			{hasWarningSymptoms && (
				<div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
					<p className="text-sm text-red-200">
						<strong>Warning:</strong> You've reported symptoms that may require
						medical attention. Please contact your healthcare provider if
						symptoms are severe.
					</p>
				</div>
			)}

			{/* Core Metrics */}
			<div className="space-y-4 p-4 rounded-xl bg-slate-800/70">
				<h3 className="text-sm font-medium text-white/70 uppercase tracking-wide">
					How are you feeling?
				</h3>

				<ScoreSlider
					label="Pain Level"
					value={formData.painScore}
					onChange={(v) => setFormData((d) => ({ ...d, painScore: v }))}
					icon={Activity}
					lowLabel="No pain"
					highLabel="Severe pain"
				/>

				<ScoreSlider
					label="Fatigue"
					value={formData.fatigueScore}
					onChange={(v) => setFormData((d) => ({ ...d, fatigueScore: v }))}
					icon={Activity}
					lowLabel="Energetic"
					highLabel="Exhausted"
				/>

				<ScoreSlider
					label="Mood"
					value={formData.moodScore}
					onChange={(v) => setFormData((d) => ({ ...d, moodScore: v }))}
					icon={Smile}
					lowLabel="Low"
					highLabel="Great"
				/>
			</div>

			{/* Sleep */}
			<div className="space-y-4 p-4 rounded-xl bg-slate-800/70">
				<h3 className="text-sm font-medium text-white/70 uppercase tracking-wide">
					Sleep
				</h3>

				<ScoreSlider
					label="Sleep Quality"
					value={formData.sleepQuality}
					onChange={(v) => setFormData((d) => ({ ...d, sleepQuality: v }))}
					icon={Moon}
					lowLabel="Poor"
					highLabel="Excellent"
				/>

				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<Moon size={18} className="text-white/70" />
						<span className="text-sm font-medium text-white/90">
							Hours of Sleep
						</span>
						{formData.sleepHours !== null && (
							<span className="ml-auto text-sm font-bold text-blue-300">
								{formData.sleepHours}h
							</span>
						)}
					</div>
					<input
						type="range"
						min="0"
						max="12"
						step="0.5"
						value={formData.sleepHours ?? 7}
						onChange={(e) =>
							setFormData((d) => ({
								...d,
								sleepHours: Number(e.target.value),
							}))
						}
						className="w-full h-2 bg-slate-700/60 rounded-lg appearance-none cursor-pointer accent-blue-500"
					/>
					<div className="flex justify-between text-xs text-white/50">
						<span>0h</span>
						<span>12h</span>
					</div>
				</div>
			</div>

			{/* Hydration */}
			<div className="p-4 rounded-xl bg-slate-800/70">
				<HydrationSelector
					value={formData.hydrationLevel}
					onChange={(v) => setFormData((d) => ({ ...d, hydrationLevel: v }))}
				/>
			</div>

			{/* Symptoms Checklist */}
			<div className="space-y-4 p-4 rounded-xl bg-slate-800/70">
				<h3 className="text-sm font-medium text-white/70 uppercase tracking-wide">
					Symptoms Present
				</h3>

				<div className="grid grid-cols-2 gap-3">
					<SymptomCheckbox
						label="Fever"
						checked={formData.hasFever}
						onChange={(v) => setFormData((d) => ({ ...d, hasFever: v }))}
						warning
					/>
					<SymptomCheckbox
						label="Headache"
						checked={formData.hasHeadache}
						onChange={(v) => setFormData((d) => ({ ...d, hasHeadache: v }))}
					/>
					<SymptomCheckbox
						label="Shortness of Breath"
						checked={formData.hasShortnessOfBreath}
						onChange={(v) =>
							setFormData((d) => ({ ...d, hasShortnessOfBreath: v }))
						}
						warning
					/>
					<SymptomCheckbox
						label="Chest Pain"
						checked={formData.hasChestPain}
						onChange={(v) => setFormData((d) => ({ ...d, hasChestPain: v }))}
						warning
					/>
					<SymptomCheckbox
						label="Joint Pain"
						checked={formData.hasJointPain}
						onChange={(v) => setFormData((d) => ({ ...d, hasJointPain: v }))}
					/>
					<SymptomCheckbox
						label="Abdominal Pain"
						checked={formData.hasAbdominalPain}
						onChange={(v) =>
							setFormData((d) => ({ ...d, hasAbdominalPain: v }))
						}
					/>
				</div>
			</div>

			{/* Notes */}
			<label className="block space-y-2">
				<span className="text-sm font-medium text-white/90">
					Additional Notes (optional)
				</span>
				<textarea
					value={formData.notes}
					onChange={(e) =>
						setFormData((d) => ({ ...d, notes: e.target.value }))
					}
					placeholder="Any other symptoms or observations..."
					rows={3}
					className="w-full px-4 py-3 rounded-xl bg-slate-800/70 border border-slate-600/50 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
				/>
			</label>

			{/* Submit */}
			<button
				type="submit"
				disabled={submitting || isLoading}
				className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-500/80 hover:bg-blue-500 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{submitting ? (
					<>
						<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
						<span>Saving...</span>
					</>
				) : (
					<>
						<Save size={18} />
						<span>Log Symptoms</span>
					</>
				)}
			</button>
		</form>
	);
}

export default SymptomLogger;
