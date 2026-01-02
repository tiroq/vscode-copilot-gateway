# Copilot Gateway Examples

This directory contains usage examples for the Copilot Gateway API.

## Prerequisites

- Copilot Gateway extension installed and running
- Server running on port 8080 (or your configured port)
- GitHub Copilot enabled in VS Code

## Shell Examples

### List Models
```bash
chmod +x examples/list-models.sh
./examples/list-models.sh
```

### Chat Completion
```bash
chmod +x examples/chat-completion.sh
./examples/chat-completion.sh
```

### Streaming Chat
```bash
chmod +x examples/chat-streaming.sh
./examples/chat-streaming.sh
```

### Authenticated Chat
```bash
# First set your token in VS Code settings
chmod +x examples/chat-with-auth.sh
./examples/chat-with-auth.sh
```

## Python Example

```bash
# Install dependencies
pip install requests

# Run example
python examples/python-example.py
```

## Node.js Example

```bash
# Install dependencies
npm install axios

# Run example
node examples/node-example.js
```

## Using with OpenAI Client Libraries

The API is compatible with OpenAI client libraries. Just point them to your local server:

### Python (openai library)
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8080/v1",
    api_key="not-needed"  # or your configured auth token
)

response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)

print(response.choices[0].message.content)
```

### Node.js (openai library)
```javascript
const OpenAI = require('openai');

const openai = new OpenAI({
    baseURL: 'http://localhost:8080/v1',
    apiKey: 'not-needed'  // or your configured auth token
});

async function main() {
    const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
            { role: 'user', content: 'Hello!' }
        ]
    });
    
    console.log(completion.choices[0].message.content);
}

main();
```

## Notes

- Replace `localhost:8080` with your configured port
- If authentication is enabled, include the Bearer token in the Authorization header
- The `model` parameter can be any Copilot model ID (check /v1/models endpoint)
