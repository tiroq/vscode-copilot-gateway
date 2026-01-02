# Changelog

All notable changes to the "Copilot Gateway" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-02

### Added
- Initial release of Copilot Gateway extension
- OpenAI-compatible HTTP API server
- `/v1/models` endpoint to list available Copilot models
- `/v1/chat/completions` endpoint for chat completions
- Server-Sent Events (SSE) streaming support for chat completions
- Request queueing with configurable concurrency limits
- Retry mechanism with exponential backoff for failed requests
- Optional Bearer token authentication
- Status bar indicator showing server status
- Interactive webview dashboard with:
  - Real-time statistics (requests, uptime, queue status)
  - Configuration management
  - Server controls (start/stop/restart)
  - API documentation
- Commands:
  - `Copilot Gateway: Start Gateway Server`
  - `Copilot Gateway: Stop Gateway Server`
  - `Copilot Gateway: Restart Gateway Server`
  - `Copilot Gateway: Show Dashboard`
- Configuration options:
  - Port configuration (default: 8080)
  - Authentication token
  - Max concurrent requests (default: 5)
  - Retry attempts (default: 3)
  - Auto-start on activation (default: true)
- CORS support for local development
- Comprehensive documentation and examples
- Example scripts in Python, Node.js, and shell
