// Re-export shared types
export type {
	Citation,
	ResearchThread,
	ClinicalAlert,
	WorkspaceType,
	Patient,
	VOEEpisode,
	LabResult,
} from "@angstromscd/shared-types";

// Frontend-specific types that extend shared types
export interface Thread {
	id: string;
	name: string;
	isActive: boolean;
	messages: Message[];
}

export interface Message {
	id: string;
	content: string;
	sender: "user" | "ai";
	timestamp: Date;
	citations?: SimplifiedCitation[];
	model?: string;
	provider?: string;
	visualizations?: Visualization[];
	executionCode?: string;
}

export interface Visualization {
	type: string;
	data: string; // base64 encoded image
	format: "png" | "html" | "svg";
}

// Simplified citation for UI display
export interface SimplifiedCitation {
	id: string;
	reference: string;
	snippet: string;
	source: string;
}

export interface Alert {
	id: string;
	type: "warning" | "info";
	content: string;
	isRead: boolean;
}

export interface Workspace {
	id: string;
	name: string;
	type: import("@angstromscd/shared-types").WorkspaceType;
}

export type ChatMode = "Research" | "Create" | "Analyze" | "Plan" | "Learn";

export type MessageTone =
	| "Default"
	| "Formal"
	| "Bullet Points"
	| "Lay Summary";

// UI state types
export interface UIState {
	isSidebarOpen: boolean;
	isLoading: boolean;
	error: string | null;
}

// Form types
export interface ChatFormData {
	message: string;
	mode: ChatMode;
	tone: MessageTone;
	attachments?: File[];
}
