import {
	type Alert,
	type Thread,
	type Workspace,
} from "../types";

export const workspaces: Workspace[] = [
	{ id: "1", name: "Global", type: "Global" },
	{ id: "2", name: "Project X", type: "ProjectX" },
	{ id: "3", name: "My Papers", type: "MyPapers" },
];

export const mockThreads: Thread[] = [
	{
		id: "1",
		name: "Main",
		isActive: true,
		messages: [],
	},
	{
		id: "2",
		name: "Hb F Induction",
		isActive: false,
		messages: [],
	},
	{
		id: "3",
		name: "VOE Risk",
		isActive: false,
		messages: [],
	},
];

export const recentAlerts: Alert[] = [
	{
		id: "1",
		type: "warning",
		content: "VOE risk",
		isRead: false,
	},
	{
		id: "2",
		type: "info",
		content: "New PubMed hits (5)",
		isRead: false,
	},
];

export const statusIndicator = {
	vectorDb: {
		status: "synced",
		timeAgo: "2 min ago",
	},
	fhir: {
		status: "connected",
		connection: "FHIR sandbox",
	},
};

export const latestLiterature =
	"New meta-analysis shows promising results for gene therapy in β-thalassemia";
