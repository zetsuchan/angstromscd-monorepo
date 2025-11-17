/**
 * Collaborative Notes Functions
 *
 * Real-time collaborative note-taking on medical literature
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * List notes for a paper
 */
export const listByPaper = query({
	args: {
		paperId: v.string(),
	},
	handler: async (ctx, args) => {
		const notes = await ctx.db
			.query("collaborative_notes")
			.withIndex("by_paper", (q) => q.eq("paper_id", args.paperId))
			.order("desc")
			.collect();

		return notes;
	},
});

/**
 * Get a single note
 */
export const get = query({
	args: {
		noteId: v.id("collaborative_notes"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.noteId);
	},
});

/**
 * Create a new note
 */
export const create = mutation({
	args: {
		paperId: v.string(),
		content: v.string(),
		metadata: v.optional(
			v.object({
				tags: v.optional(v.array(v.string())),
				highlighted_text: v.optional(v.string()),
			}),
		),
	},
	handler: async (ctx, args) => {
		// Get authenticated user from Supabase/auth context
		// TODO: Implement proper auth integration with Supabase
		// For now, this is a placeholder that should be replaced with actual auth
		const userId = (ctx.auth as any)?.getUserIdentity?.()?.subject;
		if (!userId) {
			throw new Error("Not authenticated");
		}

		const now = Date.now();

		const noteId = await ctx.db.insert("collaborative_notes", {
			paper_id: args.paperId,
			author_id: userId, // Use authenticated user ID, not client-provided
			content: args.content,
			created_at: now,
			updated_at: now,
			metadata: args.metadata,
		});

		return noteId;
	},
});

/**
 * Update a note
 */
export const update = mutation({
	args: {
		noteId: v.id("collaborative_notes"),
		content: v.string(),
		metadata: v.optional(
			v.object({
				tags: v.optional(v.array(v.string())),
				highlighted_text: v.optional(v.string()),
			})
		),
	},
	handler: async (ctx, args) => {
		const { noteId, ...updates } = args;

		// Get the note to verify ownership
		const note = await ctx.db.get(noteId);
		if (!note) {
			throw new Error("Note not found");
		}

		// Get authenticated user from Supabase/auth context
		// TODO: Implement proper auth integration with Supabase
		// For now, this is a placeholder that should be replaced with actual auth
		const userId = (ctx.auth as any)?.getUserIdentity?.()?.subject;
		if (!userId) {
			throw new Error("Not authenticated");
		}

		// Verify the current user owns this note
		if (note.author_id !== userId) {
			throw new Error("Unauthorized: You can only update your own notes");
		}

		await ctx.db.patch(noteId, {
			...updates,
			updated_at: Date.now(),
		});

		return noteId;
	},
});

/**
 * Delete a note
 */
export const remove = mutation({
	args: {
		noteId: v.id("collaborative_notes"),
	},
	handler: async (ctx, args) => {
		// Get the note to verify ownership
		const note = await ctx.db.get(args.noteId);
		if (!note) {
			throw new Error("Note not found");
		}

		// Get authenticated user from Supabase/auth context
		// TODO: Implement proper auth integration with Supabase
		// For now, this is a placeholder that should be replaced with actual auth
		const userId = (ctx.auth as any)?.getUserIdentity?.()?.subject;
		if (!userId) {
			throw new Error("Not authenticated");
		}

		// Verify the current user owns this note
		if (note.author_id !== userId) {
			throw new Error("Unauthorized: You can only delete your own notes");
		}

		await ctx.db.delete(args.noteId);
		return true;
	},
});
