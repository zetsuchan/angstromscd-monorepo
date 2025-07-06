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
 main
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

 main

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

	const addMessage = (content: string, sender: "user" | "ai") => {
		setThreads((prevThreads) => {
			const activeThread = prevThreads.find((thread) => thread.isActive);
			if (!activeThread) return prevThreads;

			const newMessage: Message = {
				id: Date.now().toString(),
				content,
				sender,
				timestamp: new Date(),
			};

			return prevThreads.map((thread) => {
				if (thread.id === activeThread.id) {
					return {
						...thread,
						messages: [...thread.messages, newMessage],
					};
				}
				return thread;
			});
		});
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

 main
};

export const useChat = () => {
	const context = useContext(ChatContext);
	if (context === undefined) {
		throw new Error("useChat must be used within a ChatProvider");
	}
	return context;
};
