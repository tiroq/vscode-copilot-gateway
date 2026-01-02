import requests
import json

# Example: Using the Copilot Gateway with Python requests

BASE_URL = "http://localhost:8080"

def list_models():
    """List available models"""
    response = requests.get(f"{BASE_URL}/v1/models")
    response.raise_for_status()
    data = response.json()
    print("Available models:", json.dumps(data, indent=2))
    return data

def chat_completion(message):
    """Non-streaming chat completion"""
    response = requests.post(
        f"{BASE_URL}/v1/chat/completions",
        json={
            "model": "gpt-4",
            "messages": [
                {"role": "user", "content": message}
            ]
        }
    )
    response.raise_for_status()
    data = response.json()
    print("Response:", data["choices"][0]["message"]["content"])
    return data

def chat_completion_streaming(message):
    """Streaming chat completion"""
    response = requests.post(
        f"{BASE_URL}/v1/chat/completions",
        json={
            "model": "gpt-4",
            "messages": [
                {"role": "user", "content": message}
            ],
            "stream": True
        },
        stream=True
    )
    response.raise_for_status()
    
    for line in response.iter_lines():
        if line:
            line = line.decode('utf-8')
            if line.startswith('data: '):
                data = line[6:]
                if data != '[DONE]':
                    chunk = json.loads(data)
                    content = chunk["choices"][0]["delta"].get("content", "")
                    if content:
                        print(content, end="", flush=True)
    print()

def chat_with_auth(message, token):
    """Chat completion with authentication"""
    headers = {
        "Authorization": f"Bearer {token}"
    }
    response = requests.post(
        f"{BASE_URL}/v1/chat/completions",
        headers=headers,
        json={
            "model": "gpt-4",
            "messages": [
                {"role": "user", "content": message}
            ]
        }
    )
    response.raise_for_status()
    data = response.json()
    print("Response:", data["choices"][0]["message"]["content"])
    return data

if __name__ == "__main__":
    print("=== Testing Copilot Gateway ===\n")
    
    try:
        # List models
        print("1. Listing models...")
        list_models()
        print()
        
        # Non-streaming chat
        print("2. Non-streaming chat completion...")
        chat_completion("What is VS Code?")
        print()
        
        # Streaming chat
        print("3. Streaming chat completion...")
        chat_completion_streaming("Count from 1 to 5")
        print()
        
        # Uncomment to test authentication (set your token first)
        # print("4. Chat with authentication...")
        # chat_with_auth("Hello!", "your-secret-token-here")
        
    except Exception as e:
        print(f"Error: {e}")
