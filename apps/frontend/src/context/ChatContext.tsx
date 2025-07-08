import type React from "react";
import { createContext, useContext, useState } from "react";
import {
	latestLiterature,
	mockThreads,
	recentAlerts,
	statusIndicator,
	workspaces,
} from "../data/mockData";
import type {
	Alert,
	ChatMode,
	Message,
	MessageTone,
	Thread,
	Workspace,
} from "../types";

interface ChatContextType {
	threads: Thread[];
	currentThread: Thread | null;
	currentWorkspace: Workspace;
	workspaces: Workspace[];
	alerts: Alert[];
	statusInfo: typeof statusIndicator;
	newLiterature: string;
	chatMode: ChatMode;
	messageTone: MessageTone;
	selectedModel: string;
	isLoading: boolean;
	setCurrentThread: (threadId: string) => void;
	setCurrentWorkspace: (workspace: Workspace) => void;
	addMessage: (content: string, sender: "user" | "ai", additionalData?: Partial<Message>) => void;
	createThread: (name: string) => void;
	setChatMode: (mode: ChatMode) => void;
	setMessageTone: (tone: MessageTone) => void;
	setSelectedModel: (model: string) => void;
	setIsLoading: (loading: boolean) => void;
	markAlertAsRead: (id: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [threads, setThreads] = useState<Thread[]>(mockThreads);
	const [currentWorkspace, setWorkspace] = useState<Workspace>(workspaces[0]);
	const [workspaceList] = useState<Workspace[]>(workspaces);
	const [alerts, setAlerts] = useState<Alert[]>(recentAlerts);
	const [chatMode, setChatMode] = useState<ChatMode>("Research");
	const [messageTone, setMessageTone] = useState<MessageTone>("Default");
	const [selectedModel, setSelectedModel] = useState<string>("meditron:7b");
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const currentThread = threads.find((thread) => thread.isActive) || null;

	const setCurrentThread = (threadId: string) => {
		setThreads((prevThreads) =>
			prevThreads.map((thread) => ({
				...thread,
				isActive: thread.id === threadId,
			})),
		);
	};

	const setCurrentWorkspace = (workspace: Workspace) => {
		setWorkspace(workspace);
	};

	const addMessage = (content: string, sender: "user" | "ai", additionalData?: Partial<Message>) => {
		if (!currentThread) return;

		const newMessage: Message = {
			id: Date.now().toString(),
			content,
			sender,
			timestamp: new Date(),
			...additionalData,
		};

		setThreads((prevThreads) =>
			prevThreads.map((thread) => {
				if (thread.id === currentThread.id) {
					return {
						...thread,
						messages: [...thread.messages, newMessage],
					};
				}
				return thread;
			}),
		);
	};

	const createThread = (name: string) => {
		const newThread: Thread = {
			id: Date.now().toString(),
			name,
			isActive: true,
			messages: [],
		};

		setThreads((prevThreads) => [
			...prevThreads.map((thread) => ({
				...thread,
				isActive: false,
			})),
			newThread,
		]);
	};

	const markAlertAsRead = (id: string) => {
		setAlerts((prevAlerts) =>
			prevAlerts.map((alert) => {
				if (alert.id === id) {
					return { ...alert, isRead: true };
				}
				return alert;
			}),
		);
	};

	return (
		<ChatContext.Provider
			value={{
				threads,
				currentThread,
				currentWorkspace,
				workspaces: workspaceList,
				alerts,
				statusInfo: statusIndicator,
				newLiterature: latestLiterature,
				chatMode,
				messageTone,
				selectedModel,
				isLoading,
				setCurrentThread,
				setCurrentWorkspace,
				addMessage,
				createThread,
				setChatMode,
				setMessageTone,
				setSelectedModel,
				setIsLoading,
				markAlertAsRead,
			}}
		>
			{children}
		</ChatContext.Provider>
	);
};

export const useChat = () => {
	const context = useContext(ChatContext);
	if (context === undefined) {
		throw new Error("useChat must be used within a ChatProvider");
	}
	return context;
};