import { Hono } from "hono"
import { z } from "zod"
import { supabase } from "../lib/db"

export const router = new Hono()

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

