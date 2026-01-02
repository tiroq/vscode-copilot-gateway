# Changelog

All notable changes to the Copilot Gateway extension will be documented in this file.

## [0.1.0] - 2026-01-02

### Added
- Initial release of Copilot Gateway
- OpenAI-compatible HTTP API (`/v1/models` and `/v1/chat/completions`)
- Server-Sent Events (SSE) streaming support
- Bearer token authentication with secure token generation
- Request queue with configurable concurrency (1-4) and max queue (50)
- Exponential backoff retry with jitter for transient errors
- Comprehensive statistics tracking (requests, retries, latency, queue overflow, auth failures)
- Usage plan tracking with daily/weekly/monthly periods
- Real-time dashboard with statistics and configuration
- Status bar integration with server state (OFF/ON/BUSY/ERR)
- Commands: Start, Stop, Restart, Toggle, Dashboard, Generate Token, Copy Examples
- Client disconnect detection and request cancellation
- System message merging into first user message
- OpenAI-style error responses (401, 429, 500)
- Configurable retry settings (maxRetries: 6, backoffBaseMs: 400, backoffMaxMs: 15000, jitter: 0.2)
- Plan statistics with off-limit calculation
- Statistics persistence via VS Code globalState
- CORS support for local development

### Configuration
- `host`: Server bind address (default: 127.0.0.1)
- `port`: HTTP server port (default: 32123)
- `authToken`: Optional Bearer authentication token
- `maxConcurrent`: Max concurrent requests (default: 1, max: 4)
- `maxQueue`: Max queue size (default: 50)
- `maxRetries`: Retry attempts for transient errors (default: 6)
- `backoffBaseMs`: Base backoff delay (default: 400ms)
- `backoffMaxMs`: Max backoff delay (default: 15000ms)
- `backoffJitter`: Backoff jitter factor (default: 0.2)
- `plan.enabled`: Enable usage tracking (default: true)
- `plan.period`: Period for tracking (default: daily)
- `plan.limitRequests`: Request limit per period (default: 2000)
- `plan.resetAt`: Period reset time (default: 00:00)
- `plan.offLimitMode`: Off-limit mode (default: soft)

### Requirements
- VS Code 1.85.0 or higher
- Active GitHub Copilot subscription
- GitHub Copilot extension installed and authenticated

### Notes
- Server is OFF by default (manual start required)
- Usage tracking is local estimate, not official Copilot quota
- Tokens are never logged for security
- Binds to localhost (127.0.0.1) by default for security
