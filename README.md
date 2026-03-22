# JobLenz

**Multi-agent job intelligence pipeline that discovers, enriches, scores, and tailors job applications — all from a single resume upload.**

Built for **HackASU 2026** (AI Tooling Track) and the **Claude Builder Club Hackathon**.

## What It Does

Upload your resume, pick target roles, and JobLenz deploys a fleet of AI agents to:

1. Find companies hiring for your roles
2. Scrape their career pages in real-time (with live browser views)
3. Score every job against your background with a transparent, traceable formula
4. Generate tailored resumes and cover letters for the jobs you pick

No black-box scores. Every number traces back to specific data — matched skills, H-1B petition counts, years of experience compared, project-to-domain overlap.

## Pipeline

```
Resume + Preferences
        │
        ▼
┌─── DISCOVER ───────────────────────────────────────────────┐
│  Serper web search → find companies hiring target roles     │
│  User can also specify companies (Apple, Anthropic, etc.)   │
│  TinyFish agents scout each company's careers page          │
│  3 concurrent live browser streams with slot rotation        │
│  Relevance filter removes non-matching job titles            │
└────────────────────────────────────────────────────────────┘
        │ filtered jobs (typically 40-80)
        ▼
┌─── ENRICH ─────────────────────────────────────────────────┐
│  Per job: TinyFish extracts full JD (quals, tech stack,     │
│           salary, visa sponsorship mention)                  │
│  Per company: 4 parallel intel agents                        │
│    • h1bdata.info → H-1B petition counts & salary data      │
│    • MyVisaJobs   → USCIS approval/denial rates              │
│    • Company /about page → mission, values, domain           │
│    • Levels.fyi → market salary data                         │
│  All results cached by SHA-256(url + goal)                   │
└────────────────────────────────────────────────────────────┘
        │ enriched jobs + company intel
        ▼
┌─── SCORE ──────────────────────────────────────────────────┐
│  4-dimension assessment per job:                             │
│                                                              │
│  Skills Match (25%)  — deterministic keyword matching         │
│    resume skills ∩ JD requirements, with stopword filtering  │
│                                                              │
│  Experience Fit (30%) — Claude LLM                           │
│    years, education, project complexity vs JD requirements   │
│                                                              │
│  Visa Compatibility (25%) — deterministic                    │
│    H-1B petitions from h1bdata.info + MyVisaJobs USCIS data │
│                                                              │
│  Domain Relevance (20%) — Claude LLM                         │
│    candidate projects vs company product domain              │
│                                                              │
│  Overall = skills×0.25 + exp×0.30 + visa×0.25 + domain×0.20│
└────────────────────────────────────────────────────────────┘
        │ scored jobs grouped by company
        ▼
┌─── TAILOR + COVER LETTER ──────────────────────────────────┐
│  Per job (on-demand, user clicks):                           │
│    • Claude rewrites resume in Resumx markdown format        │
│      (reorder sections, add JD keywords, trim irrelevant)   │
│    • Download as PDF via browser print                       │
│    • Claude generates targeted cover letter                  │
│      (references company values, H-1B data, fit report)     │
└────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS |
| AI Agents | [TinyFish](https://tinyfish.ai) — browser automation for web scraping |
| LLM | Anthropic Claude API (resume parsing, scoring, tailoring, cover letters) |
| Search | Serper API (Google search for company discovery) |
| Visa Data | h1bdata.info + MyVisaJobs.com (dual-source H-1B lookup) |
| Caching | SHA-256 content-addressed disk cache (zero-cost repeated lookups) |
| Deploy | Railway (`output: 'standalone'`) |

## Installation

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
git clone https://github.com/zen-wang/JobLenz.git
cd JobLenz
npm install
```

### Environment Variables

Create `.env.local` in the project root:

```env
# Required — TinyFish agent API for web scraping
TINYFISH_API_KEY=your_tinyfish_key

# Required — Claude API for resume parsing + scoring + tailoring
ANTHROPIC_API_KEY=your_anthropic_key

# Required — Serper API for company discovery via Google search
SERPER_API_KEY=your_serper_key

# Optional — use Gemini instead of Claude
# GEMINI_API_KEY=your_gemini_key
```

Get API keys:
- **TinyFish**: [tinyfish.ai](https://tinyfish.ai)
- **Anthropic**: [console.anthropic.com](https://console.anthropic.com)
- **Serper**: [serper.dev](https://serper.dev)

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Seed cache data is included — the app works with cached results even without API keys for demo purposes.

### Build for Production

```bash
npm run build
npm start
```

## Key Features

- **Live agent streams** — watch up to 3 TinyFish browser agents scrape career pages simultaneously, with automatic slot rotation as agents finish
- **Company targeting** — optionally specify companies to search (45+ suggestions including Apple, Spotify, OpenAI, Anthropic), merged with auto-discovered results
- **Transparent scoring** — every dimension shows its formula, data points, and reasoning. No hidden weights.
- **Dual H-1B sources** — cross-references h1bdata.info (LCA filings) and MyVisaJobs (USCIS approval/denial rates) for visa compatibility
- **Stop/retry** — AbortController on all fetch calls, stop mid-pipeline and retry with modified inputs
- **Graceful failure** — agents fail independently via `Promise.allSettled`. Missing data shows as "uncertain" or "data unavailable", never hallucinated.
- **On-demand tailoring** — generate tailored resume (PDF download) and cover letter only for jobs you're interested in

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main pipeline orchestrator
│   └── api/
│       ├── discover/         # SSE endpoint — company search + career page scouting
│       ├── enrich/           # JD extraction + company intel (parallel agents)
│       ├── score/            # 4-dimension scoring (deterministic + LLM)
│       ├── tailor/           # Resume tailoring via Claude
│       ├── cover-letter/     # Cover letter generation via Claude
│       ├── parse-resume/     # Resume → structured JSON via Claude
│       └── extract-pdf/      # PDF → text via unpdf
├── components/
│   ├── Onboarding.tsx        # Search form with autocomplete + company targeting
│   ├── PipelineView.tsx      # Live progress, streaming iframes, stop/retry
│   ├── JobDashboard.tsx      # Results grouped by company, expand/collapse
│   ├── FitReport.tsx         # 4-dimension scoring display with formula
│   ├── TailorView.tsx        # Tailored resume download (PDF/markdown)
│   └── CoverLetterView.tsx   # Generated cover letter display
├── lib/
│   ├── tinyfish.ts           # TinyFish API client (sync + SSE + caching)
│   ├── llm.ts                # Claude/Gemini provider-agnostic LLM client
│   ├── scoring.ts            # Deterministic scoring (skills match, visa)
│   ├── agents.ts             # TinyFish goal definitions per pipeline stage
│   ├── prompts.ts            # All LLM system prompts
│   ├── company-search.ts     # Serper-based company discovery
│   ├── filter.ts             # Job title relevance filtering
│   ├── cache.ts              # SHA-256 content-addressed disk cache
│   └── types.ts              # All TypeScript interfaces
└── data/
    └── cache/                # Seed cache for offline development
```

## Team

Built by Wei-An (Zen) Wang — MS CS @ Arizona State University

## License

MIT
