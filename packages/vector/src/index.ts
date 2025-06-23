import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { VectorService } from "./services/vector-service"

const app = new Hono()
const vectorService = new VectorService()

// Initialize vector service on startup
await vectorService.initialize()

app.get('/', (c) => {
  return c.json({ message: 'AngstromSCD Vector Service' })
})

app.post("/embed", async (c) => {
  const body = await c.req.json()
  await vectorService.addDocuments({
    collection: body.collection,
    documents: body.documents,
    ids: body.ids,
    metadatas: body.metadatas,
  })
  return c.json({ inserted: body.ids.length })
})

app.post("/search", async (c) => {
  const body = await c.req.json()
  const results = await vectorService.query({
    collection: body.collection,
    query: body.query,
    nResults: body.nResults,
  })
  return c.json(results)
})

app.post("/similar", async (c) => {
  const body = await c.req.json()
  const results = await vectorService.similar({
    collection: body.collection,
    document: body.document,
    nResults: body.nResults,
  })
  return c.json(results)
})

app.post("/collections/create", async (c) => {
  const body = await c.req.json()
  const col = await vectorService.createCollection(body.name)
  return c.json(col)
})

app.get("/collections", async (c) => {
  const cols = await vectorService.listCollections()
  return c.json(cols)
})

const port = 3003
console.log(`Vector service running on port ${port}`)

serve({
  fetch: app.fetch,
  port,
})
