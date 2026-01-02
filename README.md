# Copilot Gateway

Use your GitHub Copilot subscription as a local OpenAI-compatible HTTP API server.

## Features

- 🚀 **OpenAI-Compatible API**: Exposes `/v1/models` and `/v1/chat/completions` endpoints
- 🔄 **SSE Streaming**: Full support for Server-Sent Events streaming responses
- 🔐 **Optional Authentication**: Secure your API with Bearer token authentication
- ⚡ **Request Queueing**: Built-in request queue with configurable concurrency limits
- 🔁 **Retry Logic**: Automatic retry with exponential backoff for failed requests
- 📊 **Dashboard**: Real-time statistics and configuration via webview UI
- 📈 **Status Bar**: Quick server status indicator in VS Code
- 🎯 **Production-Ready**: Built with TypeScript, proper error handling, and VS Code best practices

## Installation

1. Install the extension from the VS Code marketplace
2. Make sure you have GitHub Copilot installed and activated
3. The server will auto-start by default (configurable)

## Usage

### Starting the Server

The server starts automatically when VS Code launches (if `autoStart` is enabled). You can also:

- Use Command Palette: `Copilot Gateway: Start Gateway Server`
- Click the status bar item and use the dashboard controls
- Configure auto-start in settings

### API Endpoints

Once running, the following OpenAI-compatible endpoints are available:

#### GET /v1/models

List available Copilot models.

```bash
curl http://localhost:8080/v1/models
```

#### POST /v1/chat/completions

Create a chat completion (supports streaming).

**Non-streaming example:**
```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

**Streaming example:**
```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

**With authentication:**
```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Dashboard

Access the dashboard via:
- Command Palette: `Copilot Gateway: Show Dashboard`
- Click the status bar item

The dashboard provides:
- Real-time server statistics (requests, uptime, queue status)
- Configuration management
- Server controls (start/stop/restart)
- API endpoint documentation

## Configuration

All settings are available through VS Code settings or the dashboard:

| Setting | Default | Description |
|---------|---------|-------------|
| `copilot-gateway.port` | `8080` | HTTP server port (1024-65535) |
| `copilot-gateway.authToken` | `""` | Bearer token for authentication (empty = disabled) |
| `copilot-gateway.maxConcurrentRequests` | `5` | Maximum concurrent requests (1-50) |
| `copilot-gateway.retryAttempts` | `3` | Maximum retry attempts for failed requests (0-10) |
| `copilot-gateway.autoStart` | `true` | Auto-start server on extension activation |

## Commands

- `Copilot Gateway: Start Gateway Server` - Start the HTTP server
- `Copilot Gateway: Stop Gateway Server` - Stop the HTTP server
- `Copilot Gateway: Restart Gateway Server` - Restart the HTTP server
- `Copilot Gateway: Show Dashboard` - Open the dashboard webview

## Use Cases

- **Local Development**: Test OpenAI-compatible applications locally using your Copilot subscription
- **API Compatibility**: Use tools and libraries designed for OpenAI API with Copilot
- **Cost Savings**: Leverage your existing Copilot subscription instead of separate API costs
- **Offline-First**: Use Copilot models through a local API when internet connectivity is limited

## Requirements

- VS Code version 1.85.0 or higher
- Active GitHub Copilot subscription
- GitHub Copilot extension installed and authenticated

## Architecture

The extension implements:

1. **HTTP Server**: Built on Node.js `http` module with OpenAI-compatible endpoints
2. **Request Queue**: FIFO queue with configurable concurrency limits
3. **VS Code Language Model API**: Direct integration with `vscode.lm` API (vendor: "copilot")
4. **Retry Mechanism**: Exponential backoff for transient failures
5. **SSE Streaming**: Proper Server-Sent Events implementation for streaming responses
6. **Status Management**: Real-time status updates via status bar and dashboard
7. **Configuration**: Reactive configuration with VS Code settings API

## Security Notes

- **Bearer Authentication**: Enable `authToken` setting to require authentication
- **Local Only**: Server binds to localhost by default
- **CORS Enabled**: Allows local cross-origin requests for development
- **No Data Persistence**: No request/response data is stored

## Troubleshooting

### Port Already in Use
Change the port in settings or stop the conflicting service.

### Authentication Failures
Verify your `authToken` matches the `Authorization: Bearer` header.

### Copilot Model Not Available
Ensure GitHub Copilot extension is installed, activated, and you're signed in.

### Request Timeouts
Increase `retryAttempts` or reduce `maxConcurrentRequests` in settings.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Support

For issues and feature requests, please use the [GitHub repository](https://github.com/tiroq/vscode-copilot-gateway).
