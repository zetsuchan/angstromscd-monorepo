import {
	type ConversationMessage,
	DatabaseError,
	type MessageOutboxEntry,
} from "@angstromscd/shared-types";
import { supabase } from "../lib/db";

const OUTBOX_TABLE = "message_outbox";
const ENQUEUE_FUNCTION = "enqueue_conversation_message";
const CONVERSATION_MESSAGES_TABLE = "conversation_messages";

export interface EnqueueMessageInput {
	conversationId: string;
	role: "user" | "assistant" | "system";
	content: string;
	model?: string;
	citations?: unknown;
	pubmedArticles?: unknown;
	metadata?: Record<string, unknown>;
}

export interface EnqueueMessageResult {
	messageId: string;
	sequence: number;
	outboxEntry: MessageOutboxEntry;
	message: ConversationMessage;
}

export class OutboxService {
	async enqueueMessage(
		input: EnqueueMessageInput,
	): Promise<EnqueueMessageResult> {
		const { data, error } = await supabase.rpc(ENQUEUE_FUNCTION, {
			p_conversation_id: input.conversationId,
			p_role: input.role,
			p_content: input.content,
			p_model: input.model ?? null,
			p_citations: input.citations ?? null,
			p_pubmed_articles: input.pubmedArticles ?? null,
			p_metadata: input.metadata ?? null,
		});

		if (error) {
			throw new DatabaseError(
				"Failed to enqueue conversation message",
				ENQUEUE_FUNCTION,
				error,
			);
		}

		const [result] = (data ?? []) as Array<{
			message_id: string;
			sequence: number;
		}>;

		if (!result) {
			throw new DatabaseError(
				"Enqueue function returned no data",
				ENQUEUE_FUNCTION,
			);
		}

		const outboxEntry = await this.getOutboxEntryForMessage(result.message_id);
		const message = await this.getConversationMessage(result.message_id);

		return {
			messageId: result.message_id,
			sequence: result.sequence,
			outboxEntry,
			message,
		};
	}

	async getPending(limit = 50): Promise<MessageOutboxEntry[]> {
		const { data, error } = await supabase
			.from(OUTBOX_TABLE)
			.select("*")
			.eq("status", "pending")
			.order("created_at", { ascending: true })
			.limit(limit);

		if (error) {
			// Gracefully handle ALL errors - outbox is optional and shouldn't crash the app
			// Log the error for debugging but return empty array
			console.warn(
				`Outbox polling skipped (${error.code || "unknown"}): ${error.message || "Unknown error"}`,
			);
			return [];
		}

		return (data ?? []) as MessageOutboxEntry[];
	}

	async markDispatched(id: string): Promise<void> {
		const { error } = await supabase.rpc("mark_outbox_dispatched", {
			p_id: id,
		});

		if (error) {
			throw new DatabaseError(
				"Failed to update outbox entry",
				"mark_outbox_dispatched",
				error,
			);
		}
	}

	async markFailed(id: string, reason: string): Promise<void> {
		const { error } = await supabase.rpc("mark_outbox_failed", {
			p_id: id,
			p_error: reason,
		});

		if (error) {
			throw new DatabaseError(
				"Failed to mark outbox failed",
				"mark_outbox_failed",
				error,
			);
		}
	}

	private async getOutboxEntryForMessage(
		messageId: string,
	): Promise<MessageOutboxEntry> {
		const { data, error } = await supabase
			.from(OUTBOX_TABLE)
			.select("*")
			.eq("message_id", messageId)
			.single();

		if (error || !data) {
			throw new DatabaseError(
				"Failed to find outbox entry",
				OUTBOX_TABLE,
				error,
			);
		}

		return data as MessageOutboxEntry;
	}

	private async getConversationMessage(
		messageId: string,
	): Promise<ConversationMessage> {
		const { data, error } = await supabase
			.from(CONVERSATION_MESSAGES_TABLE)
			.select("*")
			.eq("id", messageId)
			.single();

		if (error || !data) {
			throw new DatabaseError(
				"Failed to fetch conversation message",
				CONVERSATION_MESSAGES_TABLE,
				error,
			);
		}

		return data as ConversationMessage;
	}
}
