// Simple chat function for conversational responses

function SimpleChat(query: string) -> string {
  client OpenRouterGemini3Pro
  prompt #"
    You are MedLab AI, a medical assistant specializing in Sickle Cell Disease (SCD).

    Respond to the following query in a helpful, conversational manner:
    {{ query }}

    Provide clear, evidence-based information when discussing medical topics.
    Always remind users to consult healthcare providers for personal medical decisions.
  "#
}

// Test function
test simple_chat_test {
  functions [SimpleChat]
  args {
    query "What is sickle cell disease?"
  }
}