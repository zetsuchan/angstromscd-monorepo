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
import { apiClient, isAuthenticated } from "../lib/api-client";
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
	// Auth state
	isAuthenticated: boolean;
	// Thread/conversation state
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
	// Actions
	setCurrentThread: (threadId: string) => void;
	setCurrentWorkspace: (workspace: Workspace) => void;
	addMessage: (
		content: string,
		sender: "user" | "ai",
		additionalData?: Partial<Message>,
	) => Promise<void>;
	createThread: (name: string) => Promise<void>;
	setChatMode: (mode: ChatMode) => void;
	setMessageTone: (tone: MessageTone) => void;
	setSelectedModel: (model: string) => void;
	setIsLoading: (loading: boolean) => void;
	markAlertAsRead: (id: string) => void;
	refreshConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [authenticated, setAuthenticated] = useState<boolean>(
		isAuthenticated(),
	);
	const [threads, setThreads] = useState<Thread[]>([]);
	const [currentWorkspace, setWorkspace] = useState<Workspace>(workspaces[0]);
	const [workspaceList] = useState<Workspace[]>(workspaces);
	const [alerts, setAlerts] = useState<Alert[]>(recentAlerts);
	const [chatMode, setChatMode] = useState<ChatMode>("Research");
	const [messageTone, setMessageTone] = useState<MessageTone>("Default");
	const [selectedModel, setSelectedModel] =
		useState<string>("openai:gpt-4o-mini");
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const gatewayRef = useRef<RealtimeGatewayClient | null>(null);
	const tokenStreamRef = useRef<TokenStreamClient | null>(null);
	const sequenceRef = useRef<Map<string, number>>(new Map());
	const tokenBuffers = useRef<Map<string, string>>(new Map());

	const currentThread = threads.find((thread) => thread.isActive) || null;

	// Fetch conversations from API
	const refreshConversations = useCallback(async () => {
		if (!isAuthenticated()) {
			// Use mock data for non-authenticated users (demo mode)
			setThreads(mockThreads);
			setAuthenticated(false);
			return;
		}

		setAuthenticated(true);
		try {
			const response = await apiClient.getConversations({ limit: 50 });
			const fetchedThreads: Thread[] = response.conversations.map(
				(conv, index) => ({
					id: conv.id,
					name: conv.title,
					isActive: index === 0, // Make first thread active
					messages: [], // Messages loaded when thread is selected
				}),
			);

			if (fetchedThreads.length === 0) {
				// No conversations yet - start with empty state
				setThreads([]);
			} else {
				setThreads(fetchedThreads);
				// Load messages for the first conversation
				if (fetchedThreads.length > 0) {
					await loadThreadMessages(fetchedThreads[0].id);
				}
			}
		} catch (error) {
			console.error("Failed to fetch conversations:", error);
			// Fall back to mock data on error
			setThreads(mockThreads);
		}
	}, []);

	// Load messages for a specific thread
	const loadThreadMessages = useCallback(async (threadId: string) => {
		if (!isAuthenticated()) return;

		try {
			const response = await apiClient.getConversation(threadId);
			const messages: Message[] = response.messages.map((msg) => ({
				id: msg.id,
				content: msg.content,
				sender: msg.role === "assistant" ? "ai" : "user",
				timestamp: new Date(msg.created_at),
				model: msg.model,
			}));

			setThreads((prev) =>
				prev.map((thread) =>
					thread.id === threadId ? { ...thread, messages } : thread,
				),
			);
		} catch (error) {
			console.error("Failed to load thread messages:", error);
		}
	}, []);

	// Initialize on mount
	useEffect(() => {
		refreshConversations();
	}, [refreshConversations]);

	// Check auth state changes (e.g., after login)
	useEffect(() => {
		const checkAuth = () => {
			const newAuthState = isAuthenticated();
			if (newAuthState !== authenticated) {
				setAuthenticated(newAuthState);
				refreshConversations();
			}
		};

		// Check periodically for auth changes
		const interval = setInterval(checkAuth, 1000);
		return () => clearInterval(interval);
	}, [authenticated, refreshConversations]);

	const handleRealtimeEnvelope = useCallback(
		(envelope: GatewayServerEnvelope, _meta: { replay: boolean }) => {
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

	const setCurrentThread = useCallback(
		async (threadId: string) => {
			setThreads((prevThreads) =>
				prevThreads.map((thread) => ({
					...thread,
					isActive: thread.id === threadId,
				})),
			);

			// Load messages if authenticated and not already loaded
			if (isAuthenticated()) {
				const thread = threads.find((t) => t.id === threadId);
				if (thread && thread.messages.length === 0) {
					await loadThreadMessages(threadId);
				}
			}
		},
		[threads, loadThreadMessages],
	);

	const setCurrentWorkspace = (workspace: Workspace) => {
		setWorkspace(workspace);
	};

	const addMessage = async (
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

		// Optimistically add to UI
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

		// Persist to API if authenticated
		if (isAuthenticated()) {
			try {
				const response = await apiClient.addMessageToConversation(
					currentThread.id,
					{
						role: sender === "ai" ? "assistant" : "user",
						content,
						model: additionalData?.model,
					},
				);

				// Update with real ID from server
				setThreads((prevThreads) =>
					prevThreads.map((thread) => {
						if (thread.id === currentThread.id) {
							return {
								...thread,
								messages: thread.messages.map((msg) =>
									msg.id === newMessage.id
										? { ...msg, id: response.message.id }
										: msg,
								),
							};
						}
						return thread;
					}),
				);
			} catch (error) {
				console.error("Failed to save message:", error);
				// Message is already in UI - could add error indicator
			}
		}
	};

	const createThread = async (name: string) => {
		if (isAuthenticated()) {
			try {
				const response = await apiClient.createConversation({ title: name });
				const newThread: Thread = {
					id: response.conversation.id,
					name: response.conversation.title,
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
			} catch (error) {
				console.error("Failed to create conversation:", error);
			}
		} else {
			// Demo mode - create local thread
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
		}
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
				isAuthenticated: authenticated,
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
				refreshConversations,
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
