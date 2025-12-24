/**
 * VOCDashboard Component
 * Main dashboard for VOC risk prediction and symptom history
 */

import {
	Activity,
	AlertTriangle,
	Brain,
	ChevronRight,
	Clock,
	Plus,
	RefreshCw,
	Shield,
	Sparkles,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { SymptomLogger } from "./SymptomLogger";

interface ContributingFactor {
	factor: string;
	weight: number;
	description: string;
}

interface Prediction {
	id: string;
	riskScore: number;
	riskLevel: "low" | "moderate" | "high" | "critical";
	confidence: number;
	contributingFactors: ContributingFactor[];
	explanation: string;
	recommendedActions: string[];
	predictedAt: string;
}

interface SymptomLog {
	id: string;
	recordedAt: string;
	painScore: number | null;
	fatigueScore: number | null;
	moodScore: number | null;
	sleepQuality: number | null;
}

interface PatientProfile {
	modelConfidence: number;
	dataPointsCount: number;
	triggerWeights: Record<string, number>;
}

interface DashboardData {
	currentRisk: Prediction | null;
	recentSymptoms: SymptomLog[];
	profile: PatientProfile | null;
}

interface VOCDashboardProps {
	patientId: string;
}

function RiskGauge({ score, level }: { score: number; level: string }) {
	const percentage = score * 100;
	const circumference = 2 * Math.PI * 45;
	const strokeDashoffset = circumference - (percentage / 100) * circumference;

	const colors = {
		low: { stroke: "#22c55e", bg: "bg-green-500/20", text: "text-green-400" },
		moderate: {
			stroke: "#eab308",
			bg: "bg-yellow-500/20",
			text: "text-yellow-400",
		},
		high: {
			stroke: "#f97316",
			bg: "bg-orange-500/20",
			text: "text-orange-400",
		},
		critical: { stroke: "#ef4444", bg: "bg-red-500/20", text: "text-red-400" },
	};

	const color = colors[level as keyof typeof colors] || colors.low;

	return (
		<div className="relative flex items-center justify-center">
			<svg className="w-32 h-32 transform -rotate-90" aria-hidden="true">
				<circle
					cx="64"
					cy="64"
					r="45"
					stroke="currentColor"
					strokeWidth="8"
					fill="none"
					className="text-white/10"
				/>
				<circle
					cx="64"
					cy="64"
					r="45"
					stroke={color.stroke}
					strokeWidth="8"
					fill="none"
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={strokeDashoffset}
					className="transition-all duration-1000 ease-out"
				/>
			</svg>
			<div className="absolute flex flex-col items-center">
				<span className={`text-3xl font-bold ${color.text}`}>
					{Math.round(percentage)}%
				</span>
				<span className="text-xs text-white/60 uppercase tracking-wide">
					{level}
				</span>
			</div>
		</div>
	);
}

function FactorBadge({ factor }: { factor: ContributingFactor }) {
	return (
		<div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/70">
			<div
				className="w-2 h-2 rounded-full"
				style={{
					backgroundColor: `rgba(239, 68, 68, ${factor.weight})`,
				}}
			/>
			<span className="text-sm text-white/80">{factor.description}</span>
		</div>
	);
}

function ActionItem({ action }: { action: string }) {
	return (
		<div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
			<ChevronRight size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
			<span className="text-sm text-blue-100">{action}</span>
		</div>
	);
}

function SymptomTrend({ symptoms }: { symptoms: SymptomLog[] }) {
	if (symptoms.length < 2) {
		return (
			<div className="text-sm text-white/50 italic">
				Log more symptoms to see trends
			</div>
		);
	}

	// Calculate 7-day pain trend
	const recentPain = symptoms
		.slice(0, 7)
		.filter((s) => s.painScore !== null)
		.map((s) => s.painScore as number);

	if (recentPain.length < 2) {
		return null;
	}

	const avgRecent = recentPain.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
	const avgOlder =
		recentPain.slice(-3).reduce((a, b) => a + b, 0) /
		Math.min(3, recentPain.length);
	const trend = avgRecent - avgOlder;

	return (
		<div className="flex items-center gap-2">
			{trend > 0.5 ? (
				<>
					<TrendingUp size={16} className="text-red-400" />
					<span className="text-sm text-red-300">Pain increasing</span>
				</>
			) : trend < -0.5 ? (
				<>
					<TrendingDown size={16} className="text-green-400" />
					<span className="text-sm text-green-300">Pain decreasing</span>
				</>
			) : (
				<>
					<Activity size={16} className="text-white/50" />
					<span className="text-sm text-white/50">Pain stable</span>
				</>
			)}
		</div>
	);
}

function ProfileInsight({ profile }: { profile: PatientProfile | null }) {
	if (!profile || profile.dataPointsCount < 7) {
		return (
			<div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20">
				<div className="flex items-center gap-2 mb-2">
					<Brain size={18} className="text-purple-400" />
					<span className="text-sm font-medium text-white/90">
						Building Your Profile
					</span>
				</div>
				<p className="text-sm text-white/70">
					Log symptoms daily to help Monarch learn your patterns. After 7 days,
					predictions become personalized.
				</p>
				<div className="mt-3 flex items-center gap-2">
					<div className="flex-1 h-2 rounded-full bg-slate-700/60">
						<div
							className="h-full rounded-full bg-purple-500/60 transition-all"
							style={{
								width: `${Math.min(100, ((profile?.dataPointsCount || 0) / 7) * 100)}%`,
							}}
						/>
					</div>
					<span className="text-xs text-white/50">
						{profile?.dataPointsCount || 0}/7 days
					</span>
				</div>
			</div>
		);
	}

	const confidence = Math.round(profile.modelConfidence * 100);
	const topTriggers = Object.entries(profile.triggerWeights)
		.sort(([, a], [, b]) => b - a)
		.slice(0, 3);

	return (
		<div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20">
			<div className="flex items-center gap-2 mb-3">
				<Sparkles size={18} className="text-purple-400" />
				<span className="text-sm font-medium text-white/90">
					What Monarch Knows About You
				</span>
				<span className="ml-auto text-xs text-purple-300">
					{confidence}% confidence
				</span>
			</div>

			{topTriggers.length > 0 && (
				<div className="space-y-2">
					<span className="text-xs text-white/50 uppercase tracking-wide">
						Your top triggers:
					</span>
					<div className="flex flex-wrap gap-2">
						{topTriggers.map(([trigger, weight]) => (
							<span
								key={trigger}
								className="px-2 py-1 rounded-full bg-slate-700/60 text-xs text-white/80"
							>
								{trigger.replace(/_/g, " ")} ({Math.round(weight * 100)}%)
							</span>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

export function VOCDashboard({ patientId }: VOCDashboardProps) {
	const [data, setData] = useState<DashboardData | null>(null);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [showLogger, setShowLogger] = useState(false);
	const [predicting, setPredicting] = useState(false);

	const fetchDashboard = useCallback(async () => {
		try {
			const response = await fetch(`/api/voc/patients/${patientId}/dashboard`);
			if (!response.ok) throw new Error("Failed to fetch dashboard");
			const result = await response.json();
			setData(result);
		} catch (error) {
			console.error("Error fetching dashboard:", error);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [patientId]);

	const generatePrediction = useCallback(async () => {
		setPredicting(true);
		try {
			const response = await fetch(`/api/voc/patients/${patientId}/predict`, {
				method: "POST",
			});
			if (!response.ok) throw new Error("Failed to generate prediction");
			await fetchDashboard();
		} catch (error) {
			console.error("Error generating prediction:", error);
		} finally {
			setPredicting(false);
		}
	}, [patientId, fetchDashboard]);

	useEffect(() => {
		fetchDashboard();
	}, [fetchDashboard]);

	const handleRefresh = () => {
		setRefreshing(true);
		fetchDashboard();
	};

	const handleSymptomLogged = () => {
		setShowLogger(false);
		fetchDashboard();
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
			</div>
		);
	}

	if (showLogger) {
		return (
			<div className="p-6">
				<SymptomLogger
					patientId={patientId}
					onSubmit={handleSymptomLogged}
					onCancel={() => setShowLogger(false)}
				/>
			</div>
		);
	}

	const prediction = data?.currentRisk;

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-xl font-bold text-white">VOC Risk Monitor</h1>
					<p className="text-sm text-white/60">Powered by Monarch AI</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={handleRefresh}
						disabled={refreshing}
						className="p-2 rounded-lg bg-slate-800/70 hover:bg-slate-700/80 text-white/70 hover:text-white transition-all disabled:opacity-50"
					>
						<RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
					</button>
					<button
						type="button"
						onClick={() => setShowLogger(true)}
						className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/80 hover:bg-blue-500 text-white font-medium transition-all"
					>
						<Plus size={18} />
						<span>Log Symptoms</span>
					</button>
				</div>
			</div>

			{/* Risk Card */}
			{prediction ? (
				<div
					className={`p-6 rounded-2xl border ${
						prediction.riskLevel === "critical"
							? "bg-red-500/10 border-red-500/30"
							: prediction.riskLevel === "high"
								? "bg-orange-500/10 border-orange-500/30"
								: prediction.riskLevel === "moderate"
									? "bg-yellow-500/10 border-yellow-500/30"
									: "bg-green-500/10 border-green-500/30"
					}`}
				>
					<div className="flex items-start gap-6">
						<RiskGauge
							score={prediction.riskScore}
							level={prediction.riskLevel}
						/>

						<div className="flex-1 space-y-4">
							<div>
								<div className="flex items-center gap-2 mb-1">
									{prediction.riskLevel === "critical" ||
									prediction.riskLevel === "high" ? (
										<AlertTriangle size={18} className="text-orange-400" />
									) : (
										<Shield size={18} className="text-green-400" />
									)}
									<span className="font-medium text-white">
										{prediction.riskLevel === "critical"
											? "Critical Risk - Contact Provider"
											: prediction.riskLevel === "high"
												? "Elevated Risk - Take Precautions"
												: prediction.riskLevel === "moderate"
													? "Moderate Risk - Monitor Closely"
													: "Low Risk - Looking Good"}
									</span>
								</div>
								<p className="text-sm text-white/70">
									{prediction.explanation}
								</p>
							</div>

							<div className="flex items-center gap-4 text-xs text-white/50">
								<span className="flex items-center gap-1">
									<Clock size={12} />
									Updated{" "}
									{new Date(prediction.predictedAt).toLocaleTimeString()}
								</span>
								<span>
									Confidence: {Math.round((prediction.confidence || 0) * 100)}%
								</span>
							</div>
						</div>
					</div>

					{/* Contributing Factors */}
					{prediction.contributingFactors.length > 0 && (
						<div className="mt-4 pt-4 border-t border-slate-600/50">
							<h3 className="text-sm font-medium text-white/70 mb-2">
								Contributing Factors
							</h3>
							<div className="flex flex-wrap gap-2">
								{prediction.contributingFactors.map((factor) => (
									<FactorBadge key={factor.factor} factor={factor} />
								))}
							</div>
						</div>
					)}

					{/* Recommended Actions */}
					{prediction.recommendedActions.length > 0 && (
						<div className="mt-4 pt-4 border-t border-slate-600/50">
							<h3 className="text-sm font-medium text-white/70 mb-2">
								Recommended Actions
							</h3>
							<div className="space-y-2">
								{prediction.recommendedActions.map((action) => (
									<ActionItem key={action} action={action} />
								))}
							</div>
						</div>
					)}
				</div>
			) : (
				<div className="p-6 rounded-2xl bg-slate-800/70 border border-slate-600/50 text-center">
					<Brain size={48} className="mx-auto mb-4 text-white/30" />
					<h3 className="text-lg font-medium text-white mb-2">
						No Prediction Yet
					</h3>
					<p className="text-sm text-white/60 mb-4">
						Log your symptoms and generate your first VOC risk prediction
					</p>
					<button
						type="button"
						onClick={generatePrediction}
						disabled={predicting}
						className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/80 hover:bg-blue-500 text-white font-medium transition-all disabled:opacity-50"
					>
						{predicting ? (
							<>
								<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								<span>Analyzing...</span>
							</>
						) : (
							<>
								<Sparkles size={18} />
								<span>Generate Prediction</span>
							</>
						)}
					</button>
				</div>
			)}

			{/* Profile Insight */}
			<ProfileInsight profile={data?.profile || null} />

			{/* Symptom Trend */}
			{data?.recentSymptoms && data.recentSymptoms.length > 0 && (
				<div className="p-4 rounded-xl bg-slate-800/70">
					<div className="flex items-center justify-between mb-3">
						<h3 className="text-sm font-medium text-white/90">7-Day Trend</h3>
						<SymptomTrend symptoms={data.recentSymptoms} />
					</div>

					{/* Mini chart placeholder */}
					<div className="flex items-end gap-1 h-16">
						{data.recentSymptoms
							.slice(0, 7)
							.reverse()
							.map((s, i) => (
								<div
									key={s.id}
									className="flex-1 rounded-t bg-blue-500/60 transition-all hover:bg-blue-500"
									style={{
										height: `${((s.painScore || 0) / 10) * 100}%`,
										minHeight: "4px",
									}}
									title={`Pain: ${s.painScore ?? "N/A"}`}
								/>
							))}
					</div>
					<div className="flex justify-between mt-1 text-xs text-white/40">
						<span>7d ago</span>
						<span>Today</span>
					</div>
				</div>
			)}

			{/* Quick Actions */}
			<div className="grid grid-cols-2 gap-3">
				<button
					type="button"
					onClick={generatePrediction}
					disabled={predicting}
					className="flex items-center justify-center gap-2 p-4 rounded-xl bg-slate-800/70 hover:bg-slate-700/80 text-white/80 transition-all disabled:opacity-50"
				>
					{predicting ? (
						<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
					) : (
						<RefreshCw size={18} />
					)}
					<span>Update Prediction</span>
				</button>
				<button
					type="button"
					onClick={() => setShowLogger(true)}
					className="flex items-center justify-center gap-2 p-4 rounded-xl bg-slate-800/70 hover:bg-slate-700/80 text-white/80 transition-all"
				>
					<Plus size={18} />
					<span>Log Symptoms</span>
				</button>
			</div>
		</div>
	);
}

export default VOCDashboard;
