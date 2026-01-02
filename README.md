# Copilot Gateway

Expose GitHub Copilot as a **local OpenAI-compatible HTTP API** for agents, CLIs, and tools.

## Features

- 🚀 **OpenAI-Compatible API**: Full `/v1/models` and `/v1/chat/completions` endpoints
- 🔄 **SSE Streaming**: Server-Sent Events streaming for real-time responses
- 🔐 **Bearer Authentication**: Optional token-based security
- ⚡ **Request Queue**: Configurable concurrency and queue limits with 429 overflow handling
- 🔁 **Smart Retry**: Exponential backoff with jitter for transient errors
- 📊 **Dashboard**: Real-time statistics and configuration UI
- 📈 **Usage Tracking**: Optional plan tracking with daily/weekly/monthly limits
- 🎯 **Production-Ready**: TypeScript, proper error handling, VS Code best practices

## Installation

1. Install from VS Code Marketplace (search: "Copilot Gateway")
2. Ensure GitHub Copilot extension is installed and authenticated
3. Server is OFF by default - start manually

## Quick Start

### Starting the Server

1. Open Command Palette (`Cmd/Ctrl+Shift+P`)
2. Run: `Gateway: Start`
3. Server starts on `http://127.0.0.1:32123`

Or click the status bar item and use the dashboard controls.

### Basic Usage

```bash
# List models
curl http://127.0.0.1:32123/v1/models

# Chat completion
curl http://127.0.0.1:32123/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# Streaming
curl http://127.0.0.1:32123/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Write a poem"}],
    "stream": true
  }'
```

## Configuration

Access via VS Code Settings or Dashboard:

| Setting | Default | Description |
|---------|---------|-------------|
| `host` | `127.0.0.1` | Server bind address |
| `port` | `32123` | HTTP server port |
| `authToken` | `""` | Bearer token (empty = disabled) |
| `maxConcurrent` | `1` | Max concurrent requests (1-4) |
| `maxQueue` | `50` | Max queue size |
| `maxRetries` | `6` | Retry attempts for transient errors |
| `backoffBaseMs` | `400` | Base backoff delay |
| `backoffMaxMs` | `15000` | Max backoff delay |
| `backoffJitter` | `0.2` | Backoff jitter factor |
| `plan.enabled` | `true` | Enable usage tracking |
| `plan.period` | `daily` | Period: daily, weekly, monthly |
| `plan.limitRequests` | `2000` | Request limit per period |
| `plan.resetAt` | `00:00` | Period reset time (HH:MM) |

## Commands

- `Gateway: Start` - Start the server
- `Gateway: Stop` - Stop the server
- `Gateway: Restart` - Restart the server
- `Gateway: Toggle` - Toggle server on/off
- `Gateway: Dashboard` - Open dashboard
- `Gateway: Generate Token` - Generate & copy auth token
- `Gateway: Copy Examples` - Copy cURL examples

## Authentication

Generate a secure token:

1. Run `Gateway: Generate Token` command
2. Token is auto-copied to clipboard
3. Add to requests: `Authorization: Bearer <token>`

```bash
curl http://127.0.0.1:32123/v1/chat/completions \
  -H "Authorization: Bearer your_token_here" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4", "messages": [{"role": "user", "content": "Hi"}]}'
```

## Dashboard

Open via Command Palette or status bar click.

Features:
- Real-time statistics
- Queue and request metrics
- Usage plan tracking
- Configuration management
- Server controls
- API documentation

## Usage Tracking

The extension tracks Gateway usage (NOT official Copilot quota):

- **Counters**: Total, success, failed, retries, stream, queue overflow, auth failures
- **Latency**: EWMA and max
- **Plan**: Optional period-based limits (visual/statistical only)

**Note**: Usage tracking is a manual estimate, not official Copilot quota.

## Architecture

- **Server**: Node.js HTTP with 127.0.0.1 bind
- **Queue**: FIFO with configurable concurrency (1-4) and max queue (50)
- **Retry**: Exponential backoff with jitter for transient errors
- **Models**: Via `vscode.lm` API (vendor: copilot)
- **Messages**: System messages merged into first user message
- **Streaming**: SSE starts after retry loop succeeds
- **Cancellation**: Client disconnect detection via CancellationToken

## Security Notes

- **Local Only**: Binds to localhost by default
- **Bearer Auth**: Optional token authentication
- **No Data Persistence**: Requests/responses not stored
- **Token Security**: Tokens never logged

## Requirements

- VS Code 1.85.0 or higher
- Active GitHub Copilot subscription
- GitHub Copilot extension installed and authenticated

## Troubleshooting

### Port Already in Use
Change `copilot-gateway.port` in settings.

### Authentication Failures
Verify token matches `Authorization: Bearer` header.

### Copilot Model Not Available
Ensure GitHub Copilot is installed, activated, and signed in.

### Request Timeouts
Increase `maxRetries` or check Copilot connection.

### Queue Overflow (429)
Increase `maxQueue` or reduce request rate.

## Use Cases

- **Local Development**: Test OpenAI apps with Copilot
- **API Compatibility**: Use Copilot with OpenAI-compatible tools
- **Cost Savings**: Leverage existing Copilot subscription
- **Agent Integration**: Connect AI agents to Copilot

## License

MIT License - see [LICENSE](LICENSE) file.

## Contributing

Contributions welcome! Please submit issues or pull requests.

## Repository

https://github.com/tiroq/vscode-copilot-gateway
