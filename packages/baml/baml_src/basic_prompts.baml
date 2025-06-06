function SimpleCompletion(prompt: string) -> string {
  client "openai/gpt-4o"
  prompt #"
    {{ prompt }}
  "#
}

function AnthropicCompletion(prompt: string) -> string {
  client "anthropic/claude-3-haiku-20240307"
  prompt #"
    {{ prompt }}
  "#
}

// Tests to run in the BAML playground
// test openai_connection {
//   functions [SimpleCompletion]
//   args { prompt "Ping" }
// }
// test anthropic_connection {
//   functions [AnthropicCompletion]
//   args { prompt "Ping" }
// }
