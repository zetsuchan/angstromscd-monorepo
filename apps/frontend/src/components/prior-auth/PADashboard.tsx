import { AlertCircle, Plus, RefreshCw } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { usePriorAuth } from "../../context/PriorAuthContext";
import PADetailView from "./PADetailView";
import PARequestCard from "./PARequestCard";
import PARequestForm from "./PARequestForm";

const PADashboard: React.FC = () => {
	const {
		requests,
		currentRequest,
		currentClinicalData,
		drugs,
		payers,
		isLoading,
		error,
		refreshRequests,
		createRequest,
		deleteRequest,
		selectRequest,
		saveClinicalData,
		generateJustification,
		clearError,
	} = usePriorAuth();

	const [showCreateForm, setShowCreateForm] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);

	const getDrugById = (drugId: string) => drugs.find((d) => d.id === drugId);
	const getPayerById = (payerId: string) =>
		payers.find((p) => p.id === payerId);

	const handleCreateRequest = async (
		data: Parameters<typeof createRequest>[0],
	) => {
		await createRequest(data);
		setShowCreateForm(false);
	};

	const handleSelectRequest = async (id: string) => {
		await selectRequest(id);
	};

	const handleBack = async () => {
		await selectRequest(null);
	};

	const handleDelete = async () => {
		if (currentRequest) {
			await deleteRequest(currentRequest.id);
		}
	};

	const handleSaveClinicalData = async (
		data: Parameters<typeof saveClinicalData>[1],
	) => {
		if (currentRequest) {
			await saveClinicalData(currentRequest.id, data);
		}
	};

	const handleGenerateJustification = async (
		data: Parameters<typeof generateJustification>[1],
	) => {
		if (currentRequest) {
			setIsGenerating(true);
			try {
				await generateJustification(currentRequest.id, data);
			} finally {
				setIsGenerating(false);
			}
		}
	};

	// Show detail view if a request is selected
	if (currentRequest) {
		return (
			<PADetailView
				request={currentRequest}
				clinicalData={currentClinicalData}
				drug={getDrugById(currentRequest.drug_id)}
				payer={getPayerById(currentRequest.payer_id)}
				onBack={handleBack}
				onDelete={handleDelete}
				onSaveClinicalData={handleSaveClinicalData}
				onGenerateJustification={handleGenerateJustification}
				isLoading={isLoading}
				isGenerating={isGenerating}
			/>
		);
	}

	// Show create form
	if (showCreateForm) {
		return (
			<div className="h-full flex items-center justify-center p-6">
				<div className="w-full max-w-lg">
					<PARequestForm
						drugs={drugs}
						payers={payers}
						onSubmit={handleCreateRequest}
						onCancel={() => setShowCreateForm(false)}
						isLoading={isLoading}
					/>
				</div>
			</div>
		);
	}

	// Show dashboard list
	return (
		<div className="h-full flex flex-col">
			{/* Header */}
			<div className="glass-light border-b border-white/20 p-4">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-xl font-medium text-white/90">
							Prior Authorizations
						</h1>
						<p className="text-sm text-white/60 mt-1">
							Manage SCD drug prior authorization requests
						</p>
					</div>
					<div className="flex items-center gap-3">
						<button
							onClick={() => refreshRequests()}
							disabled={isLoading}
							className="p-2 text-white/70 hover:text-white/90 rounded-full glass-subtle hover:glass-hover transition-all disabled:opacity-50"
						>
							<RefreshCw
								size={20}
								className={isLoading ? "animate-spin" : ""}
							/>
						</button>
						<button
							onClick={() => setShowCreateForm(true)}
							className="flex items-center gap-2 px-4 py-2 rounded-lg medical-primary text-blue-300 font-medium hover:bg-blue-500/30 transition-all"
						>
							<Plus size={18} />
							New PA Request
						</button>
					</div>
				</div>
			</div>

			{/* Error Banner */}
			{error && (
				<div className="mx-4 mt-4 px-4 py-3 rounded-lg medical-alert flex items-center justify-between">
					<div className="flex items-center gap-2 text-pink-300">
						<AlertCircle size={18} />
						<span>{error}</span>
					</div>
					<button
						onClick={clearError}
						className="text-pink-300 hover:text-pink-200 text-sm"
					>
						Dismiss
					</button>
				</div>
			)}

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-6">
				{requests.length === 0 ? (
					<div className="h-full flex flex-col items-center justify-center text-center">
						<div className="glass-subtle rounded-full p-6 mb-4">
							<Plus size={48} className="text-white/40" />
						</div>
						<h2 className="text-lg font-medium text-white/80 mb-2">
							No Prior Authorization Requests
						</h2>
						<p className="text-white/60 mb-6 max-w-md">
							Create your first PA request to get started with AI-powered
							clinical justification generation for SCD drugs.
						</p>
						<button
							onClick={() => setShowCreateForm(true)}
							className="flex items-center gap-2 px-6 py-3 rounded-lg medical-primary text-blue-300 font-medium hover:bg-blue-500/30 transition-all"
						>
							<Plus size={20} />
							Create First PA Request
						</button>
					</div>
				) : (
					<div className="max-w-4xl mx-auto">
						<div className="grid gap-4">
							{requests.map((request) => (
								<PARequestCard
									key={request.id}
									request={request}
									drug={getDrugById(request.drug_id)}
									payer={getPayerById(request.payer_id)}
									onClick={() => handleSelectRequest(request.id)}
								/>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default PADashboard;
