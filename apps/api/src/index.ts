import { Hono } from "hono"
import { cors } from "hono/cors"
import { serve } from "@hono/node-server"

import { router } from "./routes/index"

const app = new Hono()

// global middleware
app.use("/*", cors())

// root route
app.get("/", (c) => c.json({ message: "AngstromSCD API" }))

// register routes
app.route("/", router)

const port = Number(process.env.PORT ?? 3001)
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port,
})
