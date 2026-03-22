# JobLenz

Multi-agent job intelligence pipeline. HackASU 2026, AI Tooling track.

## Stack
Next.js 14 (App Router) + TypeScript + Tailwind CSS + Railway

## External APIs
- TinyFish REST API: `https://agent.tinyfish.ai/v1/automation/run`
  - Auth: `X-API-Key` header from `process.env.TINYFISH_API_KEY`
- Anthropic Claude API: `https://api.anthropic.com/v1/messages`
  - Auth: `x-api-key` header from `process.env.ANTHROPIC_API_KEY`

## Architecture (read docs/architecture-spec.md for full details)
- 5-stage pipeline: Discover → Enrich → Score → Tailor → Cover Letter
- Discovery uses "scout-then-scrape": TinyFish navigates + filters career pages,
  hardcoded scraper bulk-extracts job URLs from the resulting page
- Enrichment: TinyFish parallel agents (JD extract, H-1B, values, salary)
  via Promise.allSettled — graceful failure is expected and displayed
- Scoring: Claude generates interpretable fit reports with confidence levels
- All TinyFish results are cached by SHA-256(url + goal)

## Key Decisions
- Railway deploy: `output: 'standalone'` in next.config.js
- Start script: `next start -p ${PORT:-3000}`
- Never put TinyFish in sync user-blocking path without cache check first
- Show "DATA UNAVAILABLE" when agents fail — never hallucinate

## Build Order
Follow checkpoints in docs/architecture-spec.md sequentially.
Each checkpoint should be testable before starting the next.

## Code Style
- TypeScript strict mode
- All TinyFish/Claude calls in lib/ modules, not directly in route handlers
- API routes are thin orchestrators that call lib/ functions
- Every API response includes metrics (latency, cache status)



