/**
 * Convex Schema - Real-time Features (NON-PHI Data Only)
 *
 * ⚠️ CRITICAL: This schema ONLY contains non-PHI data
 * Patient records, VOE episodes, and medical data remain in Supabase
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	/**
	 * Collaborative Notes - De-identified research notes on papers
	 */
	collaborative_notes: defineTable({
		content: v.string(),
		author_id: v.string(), // Supabase user ID
		paper_id: v.string(), // References Supabase literature_citations.id
		created_at: v.number(),
		updated_at: v.number(),
		metadata: v.optional(
			v.object({
				tags: v.optional(v.array(v.string())),
				highlighted_text: v.optional(v.string()),
			}),
		),
	})
		.index("by_paper", ["paper_id"])
		.index("by_author", ["author_id"])
		.index("by_created_at", ["created_at"]),

	/**
	 * Chat Messages - De-identified chat history
	 * Does NOT contain PHI - only general medical research discussions
	 */
	chat_messages: defineTable({
		conversation_id: v.string(), // References Supabase conversations.id
		role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
		content: v.string(),
		model: v.optional(v.string()),
		created_at: v.number(),
		metadata: v.optional(
			v.object({
				tokens: v.optional(v.number()),
				citations: v.optional(v.array(v.string())),
			}),
		),
	})
		.index("by_conversation", ["conversation_id"])
		.index("by_created_at", ["created_at"]),

	/**
	 * Workspace Presence - Real-time presence for collaborative features
	 */
	workspace_presence: defineTable({
		workspace_id: v.string(),
		user_id: v.string(),
		user_name: v.string(),
		status: v.union(
			v.literal("active"),
			v.literal("idle"),
			v.literal("away"),
		),
		current_view: v.optional(v.string()), // e.g., "paper:abc123", "conversation:xyz789"
		last_seen: v.number(),
	})
		.index("by_workspace", ["workspace_id"])
		.index("by_user", ["user_id"]),

	/**
	 * VOE Alerts - Anonymized risk alerts (NO PHI)
	 * Contains only alert metadata, not patient-specific data
	 */
	voe_alerts: defineTable({
		alert_id: v.string(), // Unique alert ID (not patient ID)
		risk_level: v.union(
			v.literal("low"),
			v.literal("medium"),
			v.literal("high"),
			v.literal("critical"),
		),
		alert_type: v.string(), // e.g., "hydroxyurea_adjustment", "pain_score_trend"
		created_at: v.number(),
		acknowledged: v.boolean(),
		acknowledged_by: v.optional(v.string()),
		acknowledged_at: v.optional(v.number()),
		metadata: v.optional(
			v.object({
				severity_score: v.optional(v.number()),
				recommendation: v.optional(v.string()),
			}),
		),
	})
		.index("by_risk_level", ["risk_level"])
		.index("by_created_at", ["created_at"])
		.index("by_acknowledged", ["acknowledged"]),

	/**
	 * Activity Feed - User activity log (de-identified)
	 */
	activity_feed: defineTable({
		user_id: v.string(),
		activity_type: v.string(), // e.g., "viewed_paper", "created_note", "searched_literature"
		resource_id: v.optional(v.string()),
		timestamp: v.number(),
		metadata: v.optional(v.record(v.string(), v.any())),
	})
		.index("by_user", ["user_id"])
		.index("by_timestamp", ["timestamp"])
		.index("by_activity_type", ["activity_type"]),
});
