const axios = require('axios');

// Example: Using the Copilot Gateway with axios

const BASE_URL = 'http://localhost:8080';

async function listModels() {
    const response = await axios.get(`${BASE_URL}/v1/models`);
    console.log('Available models:', response.data);
    return response.data;
}

async function chatCompletion(message) {
    const response = await axios.post(`${BASE_URL}/v1/chat/completions`, {
        model: 'gpt-4',
        messages: [
            { role: 'user', content: message }
        ]
    });
    
    console.log('Response:', response.data.choices[0].message.content);
    return response.data;
}

async function chatCompletionStreaming(message) {
    const response = await axios.post(`${BASE_URL}/v1/chat/completions`, {
        model: 'gpt-4',
        messages: [
            { role: 'user', content: message }
        ],
        stream: true
    }, {
        responseType: 'stream'
    });
    
    response.data.on('data', chunk => {
        const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data !== '[DONE]') {
                    const parsed = JSON.parse(data);
                    if (parsed.choices[0].delta.content) {
                        process.stdout.write(parsed.choices[0].delta.content);
                    }
                }
            }
        }
    });
    
    return new Promise((resolve) => {
        response.data.on('end', () => {
            console.log('\n');
            resolve();
        });
    });
}

// Main execution
(async () => {
    try {
        console.log('=== Testing Copilot Gateway ===\n');
        
        // List models
        console.log('1. Listing models...');
        await listModels();
        console.log('\n');
        
        // Non-streaming chat
        console.log('2. Non-streaming chat completion...');
        await chatCompletion('What is VS Code?');
        console.log('\n');
        
        // Streaming chat
        console.log('3. Streaming chat completion...');
        await chatCompletionStreaming('Count from 1 to 5');
        
    } catch (error) {
        console.error('Error:', error.message);
    }
})();
