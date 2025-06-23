#!/bin/bash

# Test Apple Foundation Bridge Service

echo "Testing Apple Foundation Bridge Service..."

# Check health endpoint
echo -e "\n1. Testing health endpoint:"
curl -s http://localhost:3004/health | jq .

# Check models endpoint
echo -e "\n2. Testing models endpoint:"
curl -s http://localhost:3004/v1/models | jq .

# Test chat completion
echo -e "\n3. Testing chat completion:"
curl -s -X POST http://localhost:3004/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "apple-foundation-3b",
    "messages": [
      {"role": "system", "content": "You are a medical research assistant"},
      {"role": "user", "content": "What is sickle cell disease?"}
    ],
    "temperature": 0.7
  }' | jq .

# Test streaming
echo -e "\n4. Testing streaming:"
curl -N -X POST http://localhost:3004/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "apple-foundation-3b",
    "messages": [{"role": "user", "content": "Count to 5"}],
    "stream": true
  }'