#!/usr/bin/env bun
import { VectorProviderFactory } from './src/services/vector-provider-factory'
import { VectorProviderConfig } from './src/interfaces/vector-provider.interface'

async function testProvider(config: VectorProviderConfig) {
  console.log(`\n🧪 Testing ${config.provider} provider...`)
  
  try {
    const provider = await VectorProviderFactory.create(config)
    await provider.initialize()
    console.log('✅ Provider initialized')
    
    // Create test collection
    const collectionName = `test_${config.provider}_${Date.now()}`
    await provider.createCollection(collectionName)
    console.log(`✅ Created collection: ${collectionName}`)
    
    // Add test documents
    const testDocs = [
      'The patient presented with severe vaso-occlusive crisis',
      'Hydroxyurea treatment has shown significant benefits',
      'Sickle cell disease affects hemoglobin production',
    ]
    
    await provider.addDocuments({
      collection: collectionName,
      documents: testDocs,
      ids: ['doc1', 'doc2', 'doc3'],
      metadatas: [
        { type: 'clinical' },
        { type: 'treatment' },
        { type: 'education' },
      ],
    })
    console.log('✅ Added test documents')
    
    // Query test
    const results = await provider.query({
      collection: collectionName,
      query: 'hydroxyurea treatment benefits',
      nResults: 2,
    })
    console.log('✅ Query results:', results.documents[0].slice(0, 2))
    
    // List collections
    const collections = await provider.listCollections()
    console.log('✅ Collections:', collections.filter(c => c.name.includes('test')))
    
    // Clean up
    await provider.deleteCollection(collectionName)
    console.log('✅ Cleaned up test collection')
    
  } catch (error) {
    console.error(`❌ Error testing ${config.provider}:`, error)
  }
}

async function main() {
  const providers = process.argv.slice(2)
  
  if (providers.length === 0) {
    console.log('Usage: bun test-providers.ts [chroma|qdrant|pgvector]...')
    console.log('Example: bun test-providers.ts qdrant pgvector')
    return
  }
  
  for (const provider of providers) {
    const config = VectorProviderFactory.getProviderFromEnv()
    config.provider = provider as any
    await testProvider(config)
  }
}

main().catch(console.error)