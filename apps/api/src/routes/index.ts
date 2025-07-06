import { Hono } from "hono"
import { z } from "zod"
import { supabase } from "../lib/db"
import { EnhancedChatService } from "../services/enhanced-chat-service"
import { searchPubMed } from "../services/pubmed-service"

export const router = new Hono()

// Initialize enhanced chat service
const chatService = new EnhancedChatService()

// health endpoint
router.get("/health", (c) => c.json({ status: "ok" }))

router.get("/health/db", async (c) => {
const { error } = await supabase.from("messages").select("id").limit(1)
if (error) {
return c.json({ status: "error", error: error.message }, 500)
}
return c.json({ status: "ok" })
})

// user signup
router.post("/auth/signup", async (c) => {
const body = await c.req.json()
const schema = z.object({ email: z.string().email(), password: z.string() })
const parsed = schema.safeParse(body)
if (!parsed.success) {
return c.json({ error: parsed.error.message }, 400)
}

const { data, error } = await supabase.auth.signUp({
email: parsed.data.email,
password: parsed.data.password,
})
if (error) {
return c.json({ error: error.message }, 400)
}
return c.json({ user: data.user })
})

// user login
router.post("/auth/login", async (c) => {
const body = await c.req.json()
const schema = z.object({ email: z.string().email(), password: z.string() })
const parsed = schema.safeParse(body)
if (!parsed.success) {
return c.json({ error: parsed.error.message }, 400)
}

const { data, error } = await supabase.auth.signInWithPassword({
email: parsed.data.email,
password: parsed.data.password,
})
if (error) {
return c.json({ error: error.message }, 400)
}
return c.json({ session: data.session, user: data.user })
})

// create message
router.post("/api/messages", async (c) => {
const body = await c.req.json()
const schema = z.object({
content: z.string(),
thread_id: z.string().optional(),
user_id: z.string().optional(),
})
const parsed = schema.safeParse(body)
if (!parsed.success) {
return c.json({ error: parsed.error.message }, 400)
}

const { data, error } = await supabase
.from("messages")
.insert(parsed.data)
.select()
.single()

if (error) {
return c.json({ error: error.message }, 400)
}

return c.json({ message: data })
})

// list messages
router.get("/api/messages", async (c) => {
const { data, error } = await supabase
.from("messages")
.select("*")
.order("created_at")

if (error) {
return c.json({ error: error.message }, 400)
}

return c.json({ messages: data })
})

// Enhanced chat endpoint with Meditron and PubMed
router.post("/api/chat", async (c) => {
	try {
		const body = await c.req.json()
		const schema = z.object({
			message: z.string(),
			model: z.string().optional(),
		})
		const parsed = schema.safeParse(body)
		if (!parsed.success) {
			return c.json({ error: parsed.error.message }, 400)
		}

		const response = await chatService.processMessage(
			parsed.data.message,
			parsed.data.model
		)

		return c.json(response)
	} catch (error) {
		console.error("Chat error:", error)
		return c.json({ error: "Failed to process chat message" }, 500)
	}
})

// PubMed search endpoint
router.get("/api/pubmed/search", async (c) => {
	try {
		const query = c.req.query("q")
		const limit = Number(c.req.query("limit")) || 5

		if (!query) {
			return c.json({ error: "Query parameter 'q' is required" }, 400)
		}

		const results = await searchPubMed(query, limit)
		return c.json(results)
	} catch (error) {
		console.error("PubMed search error:", error)
		return c.json({ error: "Failed to search PubMed" }, 500)
	}
})

// Test Meditron connection
router.get("/api/chat/health", async (c) => {
	try {
		const isConnected = await chatService.testConnection()
		return c.json({ 
			status: isConnected ? "ok" : "error",
			meditron: isConnected
		})
	} catch (error) {
		return c.json({ status: "error", meditron: false }, 500)
	}
})

