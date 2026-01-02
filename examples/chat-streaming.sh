#!/bin/bash
# Example: Chat completion with streaming

curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {
        "role": "user",
        "content": "Count from 1 to 10."
      }
    ],
    "stream": true
  }'
