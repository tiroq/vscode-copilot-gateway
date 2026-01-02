#!/bin/bash
# Example: Chat completion with authentication

# First, set your auth token in VS Code settings:
# "copilot-gateway.authToken": "your-secret-token-here"

curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token-here" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {
        "role": "user",
        "content": "Hello, authenticated world!"
      }
    ]
  }'
