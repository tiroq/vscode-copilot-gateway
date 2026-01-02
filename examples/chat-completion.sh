#!/bin/bash
# Example: Chat completion (non-streaming)

curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {
        "role": "user",
        "content": "Explain what a VS Code extension is in one sentence."
      }
    ]
  }'
