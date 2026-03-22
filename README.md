# JobLenz

AI-powered job intelligence pipeline that discovers, enriches, and scores job listings against your resume.

## What It Does

JobLenz runs a 5-stage pipeline:

1. **Discover** — TinyFish AI agent navigates company career pages, then a hardcoded scraper bulk-extracts job URLs
2. **Enrich** — Parallel TinyFish agents extract full job descriptions + company intelligence (H-1B data, company values, salary context)
3. **Score** — LLM generates interpretable fit reports with 5-dimension scoring, confidence levels, and source attribution
4. **Tailor** — LLM produces a tailored resume in Resumx markdown format, optimized for the specific role
5. **Cover Letter** — LLM generates a targeted cover letter referencing company values and job requirements

Key design: agents fail gracefully — missing data shows "DATA UNAVAILABLE" instead of hallucinated content.

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **AI Agents:** TinyFish REST API (web navigation + data extraction)
- **LLM:** Anthropic Claude / Google Gemini (provider-agnostic, auto-detected)
- **Deploy:** Railway (standalone output, no serverless timeouts)
- **Caching:** SHA-256 content-addressed cache (memory + disk)

## Run Locally

```bash
git clone https://github.com/your-username/joblenz.git
cd joblenz
npm install
```

Create `.env.local`:

```
TINYFISH_API_KEY=your_tinyfish_key
ANTHROPIC_API_KEY=your_anthropic_key
# Or use Gemini instead:
# GEMINI_API_KEY=your_gemini_key
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Seed cache data is included for offline development without API keys.

## Screenshots

<!-- Add screenshots here -->

## Built For

HackASU 2026 — AI Tooling Track
