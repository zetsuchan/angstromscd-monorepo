import type {
	CreatePAClinicalData,
	CreatePARequestData,
	GenerateJustificationResponse,
	PAClinicalData,
	PAStatus,
	Payer,
	PriorAuthRequest,
	SCDDrug,
	UpdatePARequestData,
} from "@angstromscd/shared-types";
import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { apiClient, isAuthenticated } from "../lib/api-client";

interface PriorAuthContextType {
	// State
	requests: PriorAuthRequest[];
	currentRequest: PriorAuthRequest | null;
	currentClinicalData: PAClinicalData | null;
	drugs: SCDDrug[];
	payers: Payer[];
	isLoading: boolean;
	error: string | null;

	// Actions
	refreshRequests: () => Promise<void>;
	createRequest: (data: CreatePARequestData) => Promise<PriorAuthRequest>;
	updateRequest: (
		id: string,
		data: UpdatePARequestData,
	) => Promise<PriorAuthRequest>;
	deleteRequest: (id: string) => Promise<void>;
	selectRequest: (id: string | null) => Promise<void>;
	saveClinicalData: (
		paId: string,
		data: CreatePAClinicalData,
	) => Promise<PAClinicalData>;
	generateJustification: (
		paId: string,
		clinicalData: CreatePAClinicalData,
	) => Promise<GenerateJustificationResponse>;
	loadReferenceData: () => Promise<void>;
	clearError: () => void;
}

const PriorAuthContext = createContext<PriorAuthContextType | undefined>(
	undefined,
);

export const PriorAuthProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [requests, setRequests] = useState<PriorAuthRequest[]>([]);
	const [currentRequest, setCurrentRequest] = useState<PriorAuthRequest | null>(
		null,
	);
	const [currentClinicalData, setCurrentClinicalData] =
		useState<PAClinicalData | null>(null);
	const [drugs, setDrugs] = useState<SCDDrug[]>([]);
	const [payers, setPayers] = useState<Payer[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const clearError = useCallback(() => setError(null), []);

	const loadReferenceData = useCallback(async () => {
		if (!isAuthenticated()) return;

		try {
			const [drugsRes, payersRes] = await Promise.all([
				apiClient.getSCDDrugs(),
				apiClient.getPayers(),
			]);
			setDrugs(drugsRes.drugs);
			setPayers(payersRes.payers);
		} catch (err) {
			console.error("Failed to load reference data:", err);
			setError("Failed to load reference data");
		}
	}, []);

	const refreshRequests = useCallback(async () => {
		if (!isAuthenticated()) {
			setRequests([]);
			return;
		}

		setIsLoading(true);
		try {
			const response = await apiClient.getPARequests({ limit: 50 });
			setRequests(response.requests);
		} catch (err) {
			console.error("Failed to fetch PA requests:", err);
			setError("Failed to load PA requests");
		} finally {
			setIsLoading(false);
		}
	}, []);

	const createRequest = useCallback(
		async (data: CreatePARequestData): Promise<PriorAuthRequest> => {
			setIsLoading(true);
			try {
				const response = await apiClient.createPARequest(data);
				setRequests((prev) => [response.request, ...prev]);
				return response.request;
			} catch (err) {
				console.error("Failed to create PA request:", err);
				setError("Failed to create PA request");
				throw err;
			} finally {
				setIsLoading(false);
			}
		},
		[],
	);

	const updateRequest = useCallback(
		async (
			id: string,
			data: UpdatePARequestData,
		): Promise<PriorAuthRequest> => {
			setIsLoading(true);
			try {
				const response = await apiClient.updatePARequest(id, data);
				setRequests((prev) =>
					prev.map((req) => (req.id === id ? response.request : req)),
				);
				if (currentRequest?.id === id) {
					setCurrentRequest(response.request);
				}
				return response.request;
			} catch (err) {
				console.error("Failed to update PA request:", err);
				setError("Failed to update PA request");
				throw err;
			} finally {
				setIsLoading(false);
			}
		},
		[currentRequest],
	);

	const deleteRequest = useCallback(
		async (id: string): Promise<void> => {
			setIsLoading(true);
			try {
				await apiClient.deletePARequest(id);
				setRequests((prev) => prev.filter((req) => req.id !== id));
				if (currentRequest?.id === id) {
					setCurrentRequest(null);
					setCurrentClinicalData(null);
				}
			} catch (err) {
				console.error("Failed to delete PA request:", err);
				setError("Failed to delete PA request");
				throw err;
			} finally {
				setIsLoading(false);
			}
		},
		[currentRequest],
	);

	const selectRequest = useCallback(
		async (id: string | null): Promise<void> => {
			if (!id) {
				setCurrentRequest(null);
				setCurrentClinicalData(null);
				return;
			}

			setIsLoading(true);
			try {
				const response = await apiClient.getPARequest(id);
				setCurrentRequest(response.request);
				setCurrentClinicalData(response.clinical_data || null);
			} catch (err) {
				console.error("Failed to load PA request:", err);
				setError("Failed to load PA request details");
			} finally {
				setIsLoading(false);
			}
		},
		[],
	);

	const saveClinicalData = useCallback(
		async (
			paId: string,
			data: CreatePAClinicalData,
		): Promise<PAClinicalData> => {
			setIsLoading(true);
			try {
				const response = await apiClient.addPAClinicalData(paId, data);
				setCurrentClinicalData(response.clinical_data);
				return response.clinical_data;
			} catch (err) {
				console.error("Failed to save clinical data:", err);
				setError("Failed to save clinical data");
				throw err;
			} finally {
				setIsLoading(false);
			}
		},
		[],
	);

	const generateJustification = useCallback(
		async (
			paId: string,
			clinicalData: CreatePAClinicalData,
		): Promise<GenerateJustificationResponse> => {
			setIsLoading(true);
			try {
				const response = await apiClient.generatePAJustification(
					paId,
					clinicalData,
				);

				// Update the request with the generated justification
				setRequests((prev) =>
					prev.map((req) =>
						req.id === paId
							? { ...req, clinical_justification: response.justification }
							: req,
					),
				);

				if (currentRequest?.id === paId) {
					setCurrentRequest((prev) =>
						prev
							? { ...prev, clinical_justification: response.justification }
							: null,
					);
				}

				return response;
			} catch (err) {
				console.error("Failed to generate justification:", err);
				setError("Failed to generate clinical justification");
				throw err;
			} finally {
				setIsLoading(false);
			}
		},
		[currentRequest],
	);

	// Load data on mount
	useEffect(() => {
		if (isAuthenticated()) {
			loadReferenceData();
			refreshRequests();
		}
	}, [loadReferenceData, refreshRequests]);

	return (
		<PriorAuthContext.Provider
			value={{
				requests,
				currentRequest,
				currentClinicalData,
				drugs,
				payers,
				isLoading,
				error,
				refreshRequests,
				createRequest,
				updateRequest,
				deleteRequest,
				selectRequest,
				saveClinicalData,
				generateJustification,
				loadReferenceData,
				clearError,
			}}
		>
			{children}
		</PriorAuthContext.Provider>
	);
};

export const usePriorAuth = () => {
	const context = useContext(PriorAuthContext);
	if (context === undefined) {
		throw new Error("usePriorAuth must be used within a PriorAuthProvider");
	}
	return context;
};
