#!/usr/bin/env node

// Test script to verify BAML integration is working

const testCases = [
  {
    name: "Visualization Request",
    message: "Create a bar chart showing VOE frequency by month",
    expectedTools: ["E2B_CODE_INTERPRETER"]
  },
  {
    name: "Medical Literature Query", 
    message: "What are the latest treatments for pediatric SCD patients?",
    expectedTools: ["PUBMED_SEARCH"]
  },
  {
    name: "General Medical Query",
    message: "Explain hydroxyurea dosing for sickle cell disease",
    expectedTools: []
  }
];

async function testBAMLIntegration() {
  console.log("🧪 Testing BAML Integration...\n");
  
  for (const test of testCases) {
    console.log(`\n📝 Test: ${test.name}`);
    console.log(`Message: "${test.message}"`);
    
    try {
      const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: test.message,
          model: "meditron:latest"
        })
      });
      
      if (!response.ok) {
        console.error(`❌ API request failed: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      // Check if BAML was used (look for structured response indicators)
      console.log("✅ Response received");
      console.log(`- Has reply: ${!!data.reply}`);
      console.log(`- Has visualizations: ${!!data.visualizations}`);
      console.log(`- Has citations: ${!!data.citations}`);
      console.log(`- Model used: ${data.model}`);
      
      if (data.visualizations) {
        console.log(`- Visualization count: ${data.visualizations.length}`);
      }
      
      // Preview response
      if (data.reply) {
        console.log(`\nResponse preview: "${data.reply.substring(0, 100)}..."`);
      }
      
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
    }
  }
  
  console.log("\n\n🎯 To verify BAML is being used, check the API logs for:");
  console.log("- 'Using BAML tool detection for model:'");
  console.log("- 'BAML tool analysis result:'");
  console.log("- 'Calling BAML MedicalChat with model:'");
  console.log("- 'BAML MedicalChat response:'");
}

// Check if API is running
fetch("http://localhost:3001/api/health")
  .then(res => {
    if (res.ok) {
      console.log("✅ API is running on port 3001");
      testBAMLIntegration();
    } else {
      console.error("❌ API is not responding properly");
    }
  })
  .catch(() => {
    console.error("❌ API is not running. Please start it with 'bun run dev'");
  });