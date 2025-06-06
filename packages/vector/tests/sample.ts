import { VectorService } from "../src/services/chroma-service"

const service = new VectorService()

async function run() {
  try {
    const col = await service.createCollection("sample")
    console.log("collection", col)
    await service.addDocuments({
      collection: "sample",
      documents: ["hello world", "vector databases are cool"],
      ids: ["1", "2"],
    })
    const res = await service.query({
      collection: "sample",
      query: "hello",
    })
    console.log(JSON.stringify(res, null, 2))
  } catch (err) {
    console.error("test error", err)
  }
}

run()
