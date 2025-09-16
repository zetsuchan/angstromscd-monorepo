import type {
	GatewayServerEnvelope,
	RealtimeEnvelope,
	TokenStreamEvent,
} from "@angstromscd/shared-types";
import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	latestLiterature,
	mockThreads,
	recentAlerts,
	statusIndicator,
	workspaces,
} from "../data/mockData";
import { RealtimeGatewayClient, TokenStreamClient } from "../lib/realtime";
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
	addMessage: (
		content: string,
		sender: "user" | "ai",
		additionalData?: Partial<Message>,
	) => void;
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
	const gatewayRef = useRef<RealtimeGatewayClient | null>(null);
	const tokenStreamRef = useRef<TokenStreamClient | null>(null);
	const sequenceRef = useRef<Map<string, number>>(new Map());
	const tokenBuffers = useRef<Map<string, string>>(new Map());

	const currentThread = threads.find((thread) => thread.isActive) || null;

	const handleRealtimeEnvelope = useCallback(
		(envelope: GatewayServerEnvelope, meta: { replay: boolean }) => {
			sequenceRef.current.set(envelope.conversationId, envelope.sequence);

			if (envelope.event.type === "chat.message.created") {
				const event = envelope.event;
				setThreads((prevThreads) =>
					prevThreads.map((thread) => {
						if (thread.id !== envelope.conversationId) {
							return thread;
						}

						const exists = thread.messages.some(
							(message) => message.id === event.messageId,
						);

						if (exists) {
							return thread;
						}

						const newMessage: Message = {
							id: event.messageId,
							content: event.content,
							sender: event.role === "assistant" ? "ai" : "user",
							timestamp: new Date(envelope.issuedAt),
							model: event.model,
						};

						return {
							...thread,
							messages: [...thread.messages, newMessage],
						};
					}),
				);
			}
		},
		[],
	);

	const handleTokenEvent = useCallback(
		(envelope: RealtimeEnvelope<TokenStreamEvent>) => {
			const { conversationId, event } = envelope;
			const existingBuffer = tokenBuffers.current.get(event.messageId) ?? "";
			const updatedBuffer = `${existingBuffer}${event.token}`;
			tokenBuffers.current.set(event.messageId, updatedBuffer);

			setThreads((prevThreads) =>
				prevThreads.map((thread) => {
					if (thread.id !== conversationId) {
						return thread;
					}

					const hasMessage = thread.messages.some(
						(message) => message.id === event.messageId,
					);

					const messages = hasMessage
						? thread.messages.map((message) =>
								message.id === event.messageId
									? { ...message, content: updatedBuffer }
									: message,
							)
						: [
								...thread.messages,
								{
									id: event.messageId,
									content: updatedBuffer,
									sender: "ai" as const,
									timestamp: new Date(envelope.issuedAt),
								},
							];

					return {
						...thread,
						messages,
					};
				}),
			);

			if (event.isFinal) {
				tokenBuffers.current.delete(event.messageId);
			}
		},
		[],
	);

	useEffect(() => {
		const gateway = new RealtimeGatewayClient({
			url: import.meta.env.VITE_GATEWAY_WS_URL ?? "ws://localhost:3005",
			onEnvelope: handleRealtimeEnvelope,
			onControl: (control) => {
				if (
					control &&
					typeof control === "object" &&
					"type" in control &&
					(control as { type: string }).type === "chat.ack.requested"
				) {
					const sequence = (control as { upToSequence?: number }).upToSequence;
					const conversationId = (control as { conversationId?: string })
						.conversationId;
					if (conversationId && typeof sequence === "number") {
						gateway.resume(conversationId, sequence);
					}
				}
			},
		});
		gateway.connect();
		gatewayRef.current = gateway;

		const tokenClient = new TokenStreamClient({
			baseUrl: import.meta.env.VITE_API_URL ?? "http://localhost:3001",
			onToken: handleTokenEvent,
		});
		tokenStreamRef.current = tokenClient;

		return () => {
			gateway.close();
			tokenClient.close();
			gatewayRef.current = null;
			tokenStreamRef.current = null;
		};
	}, [handleRealtimeEnvelope, handleTokenEvent]);

	useEffect(() => {
		if (!currentThread) return;
		const conversationId = currentThread.id;
		const lastSequence = sequenceRef.current.get(conversationId);
		gatewayRef.current?.joinRoom(conversationId, lastSequence);
		gatewayRef.current?.updatePresence(conversationId, "online", {
			workspace: currentWorkspace.name,
		});
		tokenStreamRef.current?.subscribe(conversationId);
		return () => {
			tokenStreamRef.current?.close();
		};
	}, [currentThread?.id, currentWorkspace.name]);

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

	const addMessage = (
		content: string,
		sender: "user" | "ai",
		additionalData?: Partial<Message>,
	) => {
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
