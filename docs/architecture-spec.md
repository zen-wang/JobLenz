# JobLenz — Final Architecture Spec (v3)
# Feed this entire document to Claude Code to scaffold and build the project.

## Overview
JobLenz is a 5-stage job intelligence pipeline with a web UI:
1. **Discover** — TinyFish scouts career pages + hardcoded scraper bulk-extracts job URLs
2. **Enrich** — TinyFish extracts full JDs + company intelligence (H-1B, values, salary) in parallel
3. **Score** — Claude produces interpretable fit reports with confidence scores and source attribution
4. **Tailor** — Claude generates a tailored resume in Resumx markdown format
5. **Cover Letter** — Claude generates a targeted cover letter

**Track:** AI Tooling (HackASU 2026)
**Stack:** Next.js 14+ (App Router) + TypeScript + Tailwind CSS + Railway
**External APIs:** TinyFish REST API, Anthropic Claude API

---

## Core Innovation: Scout-Then-Scrape Pattern

The key architectural insight: TinyFish is slow but smart. Hardcoded scrapers are fast but dumb.
We use each where it's strongest:

```
TinyFish (slow, smart, ~15 steps, ~20s):
  → Navigate to company careers page
  → Find search/filter UI (every site is different)
  → Apply user's filters (role, location, etc.)
  → Return: filtered URL + all visible job URLs

Hardcoded Scraper (fast, dumb, ~50ms per page, 0 credits):
  → fetch(filtered_url) or fetch(each job_url)
  → Parse HTML/JSON for job data
  → Extract titles, locations, links at scale
  → Fully parallel, no API credits consumed
```

This is 15 TinyFish steps per company instead of 200+.
It's also the pitch: "AI does reasoning, deterministic tools do execution."

---

## Pipeline Data Flow

```
User inputs: company URL (or name) + role query + resume text
    │
    ▼
━━━ STAGE 1: DISCOVER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    │
    ├─► TinyFish Scout (1 call per company)
    │     Goal: navigate careers page, apply filters, return:
    │       - filtered_url (bookmarkable URL after search)
    │       - url_changed (bool: can hardcoded scraper use this URL?)
    │       - jobs[] (title + URL for each visible listing)
    │
    ├─► IF url_changed: Hardcoded Scraper hits filtered_url
    │     Parse HTML for additional job URLs (pagination, etc.)
    │   ELSE: use TinyFish's jobs[] directly
    │
    ▼
    Result: Array of { title, url, location?, company } for all discovered jobs
    │
━━━ STAGE 2: ENRICH ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    │
    ├─► For each job URL (or top N jobs):
    │     TinyFish Agent: extract full JD (requirements, salary, visa, tech stack)
    │     (parallel via Promise.allSettled, ~5-10 steps each)
    │
    ├─► Company Intelligence (1 set per company, runs in parallel with JD extraction):
    │     TinyFish Agent: H-1B lookup (h1bdata.info)
    │     TinyFish Agent: Company about/values page
    │     TinyFish Agent: Salary context (levels.fyi)
    │
    ▼
    Result: Enriched jobs with full JDs + company context
    │
━━━ STAGE 3: SCORE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    │
    ├─► Claude: resume profile + enriched job data + company intel
    │     → Fit report per job:
    │       - Overall score (1-10)
    │       - Dimension scores (Technical, Experience, Visa, Culture, Compensation)
    │       - Reasoning traces with source attribution
    │       - Confidence levels (HIGH/MEDIUM/LOW)
    │       - Top strengths + concerns with evidence
    │
    ▼
    Result: Scored + ranked jobs with interpretable fit reports
    │
━━━ STAGE 4: TAILOR (on user request, per job) ━━━━━━━━━
    │
    ├─► Claude: resume + job details + fit report
    │     → Tailored resume in Resumx markdown format
    │     → Changes summary (what was reordered, keywords added)
    │
    ▼
    Result: Downloadable .md file, user runs `resumx resume.md` → PDF
    │
━━━ STAGE 5: COVER LETTER (on user request, per job) ━━━
    │
    ├─► Claude: resume + job details + company values + fit report
    │     → Targeted cover letter
    │
    ▼
    Result: Downloadable cover letter text
```

---

## API Route Contracts

### POST /api/discover
Dispatches TinyFish scout + hardcoded scraper.

**Request:**
```typescript
{
  company_url: string       // e.g., "https://anthropic.com/careers" or "anthropic.com"
  role_query: string        // e.g., "machine learning engineer"
  location?: string         // e.g., "San Francisco" or "Remote"
}
```

**Response:**
```typescript
{
  company: {
    name: string            // "Anthropic"
    domain: string          // "anthropic.com"
    careers_url: string     // URL TinyFish navigated to
  }
  jobs: {
    title: string
    url: string
    location?: string
  }[]
  scout_metadata: {
    filtered_url: string
    url_changed: boolean
    method: "scout+scraper" | "scout_only"  // which path was used
    scout_latency_ms: number
    scout_steps: number
    scraper_latency_ms: number   // 0 if scout_only
    total_jobs_found: number
  }
}
```

### POST /api/enrich
Enriches discovered jobs with full JDs + company intelligence.

**Request:**
```typescript
{
  jobs: { title: string, url: string }[]   // from /api/discover
  company_name: string
  company_domain: string
  max_jobs?: number                         // default: 5 (limit TinyFish calls)
}
```

**Response:**
```typescript
{
  enriched_jobs: {
    url: string
    title: string
    details: JobDetails | null       // null if extraction failed
    extraction_status: "success" | "failed"
    latency_ms: number
  }[]
  company_intel: {
    h1b: { status: "success"|"failed", data?: H1BData, latency_ms: number }
    values: { status: "success"|"failed", data?: ValuesData, latency_ms: number }
    salary: { status: "success"|"failed", data?: SalaryData, latency_ms: number }
  }
  metrics: {
    total_latency_ms: number
    sequential_estimate_ms: number
    tinyfish_steps_total: number
    agents_succeeded: number
    agents_failed: number
    cache_hits: number
  }
}
```

### POST /api/score
Claude generates fit reports for enriched jobs.

**Request:**
```typescript
{
  enriched_jobs: EnrichedJob[]      // from /api/enrich
  company_intel: CompanyIntel       // from /api/enrich
  resume_profile: ResumeProfile     // from /api/parse-resume
}
```

**Response:**
```typescript
{
  scored_jobs: {
    url: string
    title: string
    overall_score: number
    dimensions: FitDimension[]
    strengths: Evidence[]
    concerns: Evidence[]
    next_steps: string
  }[]
}
```

### POST /api/parse-resume
Claude parses resume text into structured profile.

**Request:** `{ resume_text: string }`
**Response:** `ResumeProfile` (see types below)

### POST /api/tailor
Claude generates Resumx-compatible tailored resume.

**Request:**
```typescript
{
  resume_profile: ResumeProfile
  job_details: JobDetails
  fit_report: FitReport
}
```

**Response:**
```typescript
{
  tailored_markdown: string        // Complete Resumx .md file content
  changes_summary: {
    sections_reordered: string[]
    bullets_reordered: number
    keywords_added: string[]
    content_removed: string[]
  }
}
```

### POST /api/cover-letter
Claude generates a targeted cover letter.

**Request:**
```typescript
{
  resume_profile: ResumeProfile
  job_details: JobDetails
  company_intel: CompanyIntel
  fit_report: FitReport
}
```

**Response:**
```typescript
{
  cover_letter: string             // Plain text cover letter
  key_points: string[]             // Main points addressed
}
```

---

## TypeScript Interfaces (lib/types.ts)

```typescript
// === Discovery ===

export interface ScoutResult {
  filtered_url: string
  url_changed: boolean
  jobs: { title: string; url: string; location?: string }[]
}

// === Enrichment ===

export interface JobDetails {
  title: string
  company: string
  location: string
  salary_range: string | null
  required_qualifications: string[]
  preferred_qualifications: string[]
  responsibilities: string[]
  visa_sponsorship: boolean | null
  education: string
  experience_years: string
  tech_stack: string[]
  source_url: string
}

export interface H1BData {
  company_name: string
  total_applications: number | null
  approval_rate: string | null
  common_titles: string[]
  salary_range: string | null
  most_recent_year: string | null
  source_url: string
}

export interface ValuesData {
  mission_statement: string | null
  stated_values: string[]
  recent_news: string[]
  blog_topics: string[]
  source_url: string
}

export interface SalaryData {
  role_title: string
  location: string
  salary_range: string | null
  median_salary: string | null
  source_url: string
}

export interface CompanyIntel {
  h1b: { status: "success" | "failed"; data?: H1BData; latency_ms: number }
  values: { status: "success" | "failed"; data?: ValuesData; latency_ms: number }
  salary: { status: "success" | "failed"; data?: SalaryData; latency_ms: number }
}

// === Resume ===

export interface ResumeProfile {
  name: string
  email: string
  education: { degree: string; institution: string; gpa?: string; graduation?: string }[]
  skills: { languages: string[]; frameworks: string[]; tools: string[]; cloud: string[]; ml: string[] }
  experience: { company: string; role: string; dates: string; highlights: string[] }[]
  projects: { name: string; tech: string[]; outcomes: string[] }[]
  visa_status?: string
}

// === Scoring ===

export interface FitDimension {
  name: string
  score: number
  reasoning: string
  sources: string[]
  confidence: "high" | "medium" | "low"
  confidence_reason: string
}

export interface Evidence {
  text: string
  evidence: string
  source: string
}

export interface FitReport {
  overall_score: number
  dimensions: FitDimension[]
  strengths: Evidence[]
  concerns: Evidence[]
  next_steps: string
}

// === Metrics ===

export interface AgentMetrics {
  agent_id: string
  status: "success" | "failed" | "cached"
  latency_ms: number
  steps_used: number | null
  cached: boolean
  error?: string
}

// === Pipeline State ===

export type PipelineStage =
  | "idle"
  | "discovering"
  | "enriching"
  | "scoring"
  | "complete"
  | "error"

export interface PipelineState {
  stage: PipelineStage
  discover_result: DiscoverResult | null
  enrich_result: EnrichResult | null
  score_result: ScoreResult | null
  resume_profile: ResumeProfile | null
  error: string | null
}
```

---

## TinyFish Goals

### Scout Goal (Stage 1 — Discovery)
```
Navigate to this company careers page.
Look for a search box, filter, or job category selector.
If found, search for roles matching "{role_query}".
If there is a location filter, set it to "{location}" or "Remote" if available.

After searching/filtering (or if no search is available), extract:
1. The current page URL after filtering
2. Whether the URL changed after you searched (true/false)
3. All visible job listings on the page — for each:
   - Job title as displayed
   - The URL/link to the full job posting
   - Location if shown next to the listing

Do NOT click into individual job postings.
Do NOT click any Apply buttons.
If a cookie banner or popup appears, close it first.
If there are multiple pages of results, only extract from the first page.

Return as JSON:
{
  "filtered_url": "https://...",
  "url_changed": true,
  "jobs": [
    { "title": "Machine Learning Engineer", "url": "https://...", "location": "San Francisco" }
  ]
}
```
**Estimated:** 10-20 steps, 15-30 seconds

### JD Extraction Goal (Stage 2 — Enrich, per job)
```
Extract the full job description from this job posting page.

Extract:
- Job title
- Company name
- Location
- Salary range if shown, otherwise null
- Required qualifications (as array of strings)
- Preferred qualifications (as array of strings)
- Key responsibilities (as array of strings)
- Visa sponsorship mentioned (true/false/null if not mentioned)
- Education requirement
- Experience requirement (years)
- Tech stack / tools mentioned (as array of strings)

If a cookie or popup appears, close it first.
Do not click any Apply buttons.

Return as JSON:
{
  "title": "string",
  "company": "string",
  "location": "string",
  "salary_range": "string or null",
  "required_qualifications": ["string"],
  "preferred_qualifications": ["string"],
  "responsibilities": ["string"],
  "visa_sponsorship": true/false/null,
  "education": "string",
  "experience_years": "string",
  "tech_stack": ["string"]
}
```
**Estimated:** 5-10 steps, 5-15 seconds

### H-1B Lookup Goal (Stage 2 — Company Intel)
```
Extract H-1B visa sponsorship data from this page.

Extract:
- Company name as shown
- Number of H-1B applications listed (count rows, or extract if shown)
- Approval rate if calculable
- Most common job titles sponsored (first 5)
- Salary range across listings
- Most recent year of data

If no data is found, return:
{ "company_name": "...", "total_applications": null, "note": "No H-1B records found" }

Return as JSON:
{
  "company_name": "string",
  "total_applications": number or null,
  "approval_rate": "string or null",
  "common_titles": ["string"],
  "salary_range": "string or null",
  "most_recent_year": "string or null"
}
```
**Estimated:** 5-8 steps, 5-10 seconds

### Company Values Goal (Stage 2 — Company Intel)
```
Extract the company's mission, values, and recent information from this page.

Extract:
- Mission statement or tagline (string or null)
- Stated company values (as array of strings)
- Any recent news or announcements (as array, max 3)
- Blog topics or engineering blog themes if linked (as array)

If the page is not found or empty, return null values.
If a cookie banner appears, close it first.

Return as JSON:
{
  "mission_statement": "string or null",
  "stated_values": ["string"],
  "recent_news": ["string"],
  "blog_topics": ["string"]
}
```
**Estimated:** 8-12 steps, 10-15 seconds

### Salary Context Goal (Stage 2 — Company Intel)
```
Extract salary information from this page.

Extract:
- Role title(s) shown
- Location if filtered
- Salary range (base, total comp if shown)
- Median or average salary if shown

If the page shows no data, return null values.

Return as JSON:
{
  "role_title": "string",
  "location": "string",
  "salary_range": "string or null",
  "median_salary": "string or null"
}
```
**Estimated:** 8-12 steps, 10-15 seconds. Use `stealth` browser profile.

---

## Credit Budget (1,650 steps)

| Activity | Steps per | Count | Total |
|---|---|---|---|
| Scout (discovery) | ~15 | ~8 companies | ~120 |
| JD extraction (enrich) | ~8 | ~20 jobs | ~160 |
| H-1B lookup | ~6 | ~8 companies | ~48 |
| Company values | ~10 | ~8 companies | ~80 |
| Salary context | ~10 | ~8 companies | ~80 |
| **Development/testing** | — | — | **~400** |
| **Pre-cache demo data** | — | — | **~400** |
| **Live demo reserve** | — | — | **~300** |
| **Buffer** | — | — | **~62** |
| **TOTAL** | | | **~1,650** |

---

## File Structure

```
joblenz/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  # Main pipeline dashboard
│   ├── globals.css
│   └── api/
│       ├── discover/route.ts     # Stage 1: TinyFish scout + scraper
│       ├── enrich/route.ts       # Stage 2: TinyFish JD + company intel
│       ├── score/route.ts        # Stage 3: Claude fit reports
│       ├── parse-resume/route.ts # Claude resume parsing
│       ├── tailor/route.ts       # Stage 4: Claude → Resumx markdown
│       └── cover-letter/route.ts # Stage 5: Claude cover letter
├── components/
│   ├── CompanyInput.tsx          # URL/name + role query input
│   ├── ResumeUpload.tsx          # Resume paste/upload
│   ├── PipelineProgress.tsx      # Shows all 5 stages with status
│   ├── StageIndicator.tsx        # Single stage: pending/running/done/failed
│   ├── DiscoverResults.tsx       # List of discovered jobs
│   ├── JobCard.tsx               # Single job with score + actions
│   ├── FitReport.tsx             # Detailed fit report for selected job
│   ├── DimensionCard.tsx         # Score dimension with reasoning trace
│   ├── ConfidenceBadge.tsx       # HIGH/MEDIUM/LOW pill
│   ├── CompanyIntelPanel.tsx     # H-1B, values, salary sidebar
│   ├── ObservabilityPanel.tsx    # Metrics: latency, steps, cache
│   ├── TailorView.tsx            # Tailored resume markdown display
│   ├── CoverLetterView.tsx       # Cover letter display
│   └── HowItWorks.tsx           # Architecture + limitations
├── lib/
│   ├── tinyfish.ts               # TinyFish: scout, extract, parallel dispatch
│   ├── scraper.ts                # Hardcoded HTML scraper (fetch + parse)
│   ├── claude.ts                 # Claude: parse, score, tailor, cover letter
│   ├── agents.ts                 # TinyFish goal definitions
│   ├── prompts.ts                # All Claude system prompts
│   ├── cache.ts                  # Hash-based caching
│   ├── types.ts                  # All TypeScript interfaces
│   └── utils.ts                  # URL parsing, domain extraction
├── data/
│   └── cache/                    # Pre-cached results (JSON)
├── next.config.js                # output: 'standalone' for Railway
├── .env.local                    # TINYFISH_API_KEY, ANTHROPIC_API_KEY
├── .gitignore
├── tailwind.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## Build Order (Implementation Sequence)

### Checkpoint 1: TinyFish Scout Works (~3 hrs)
1. `npx create-next-app@latest joblenz --typescript --tailwind --app`
2. Add `output: 'standalone'` to next.config.js
3. Update package.json start script: `next start -p ${PORT:-3000}`
4. Create lib/types.ts with all interfaces
5. Create lib/agents.ts with scout goal + enrichment goals
6. Create lib/tinyfish.ts — runScout() function
7. Create lib/cache.ts — simple in-memory + file cache
8. Create app/api/discover/route.ts — calls runScout()
9. **TEST:** curl POST /api/discover with a company URL → get job list back

### Checkpoint 2: Hardcoded Scraper Works (~1 hr)
10. Create lib/scraper.ts — fetch filtered_url, parse HTML for job links
11. Integrate into /api/discover: scout → check url_changed → scraper if yes
12. **TEST:** discover returns jobs from both scout and scraper paths

### Checkpoint 3: Enrichment Works (~3 hrs)
13. Add parallel JD extraction to lib/tinyfish.ts — runEnrichment()
14. Add company intel agents (H-1B, values, salary) — runCompanyIntel()
15. Create app/api/enrich/route.ts — orchestrates JD + company intel in parallel
16. Implement Promise.allSettled for graceful failure handling
17. **TEST:** /api/enrich returns enriched jobs + company intel JSON

### Checkpoint 4: Claude Scoring Works (~2 hrs)
18. Create lib/prompts.ts — all Claude system prompts
19. Create lib/claude.ts — parseResume() + generateFitReport()
20. Create app/api/parse-resume/route.ts
21. Create app/api/score/route.ts
22. **TEST:** cached enrichment data + resume text → fit report JSON

### Checkpoint 5: Basic UI Works (~4 hrs)
23. Build page.tsx with CompanyInput + ResumeUpload + PipelineProgress
24. Build DiscoverResults — list of found jobs
25. Build FitReport + DimensionCard + ConfidenceBadge
26. Build CompanyIntelPanel (H-1B, values, salary sidebar)
27. Wire all stages together with pipeline state machine
28. **TEST:** end-to-end in browser: input → discover → enrich → score → report

### Checkpoint 6: Tailor + Cover Letter (~2 hrs)
29. Create app/api/tailor/route.ts — Claude outputs Resumx markdown
30. Create app/api/cover-letter/route.ts
31. Build TailorView with "Copy" + "Download .md" buttons
32. Build CoverLetterView
33. **TEST:** click "Tailor" on a scored job → see Resumx markdown

### Checkpoint 7: Polish + Deploy (~3 hrs)
34. Build ObservabilityPanel (latency, steps, cache metrics)
35. Build HowItWorks transparency section
36. Pre-cache 3-4 companies for demo
37. Deploy to Railway
38. Test deployed version end-to-end

### Checkpoint 8: Deliverables (~2 hrs)
39. Write README.md
40. Record YouTube video (2-3 min)
41. LinkedIn/X post mentioning TinyFish
42. Final testing

---

## Key Architecture Decisions

**Promise.allSettled, not Promise.all:** We want ALL agent results even if some fail.

**Scout-then-scrape:** TinyFish does reasoning (navigation, filtering). Hardcoded scraper does bulk extraction (fast, no credits). Each tool plays to its strength.

**Graceful degradation is a feature:** When agents fail, the report says "DATA UNAVAILABLE." This demonstrates trustworthiness — better than hallucinating.

**Separation of extraction and intelligence:** TinyFish extracts raw data. Claude reasons about it. The UI shows both layers clearly.

**Cache everything:** Cache key = SHA-256(url + goal). Pre-cache demo data. Show "cached" vs "live" badges (transparency).

**Resumx for tailoring output:** Claude outputs Resumx-compatible markdown. User downloads .md and runs `resumx resume.md` locally for PDF. No Chromium dependency on server.

**Railway deployment:** `output: 'standalone'` in next.config.js. No function timeout limits. Start script: `next start -p ${PORT:-3000}`.

---

## Resumx Output Format (for Stage 4 — Tailor)

Claude must output resumes matching this exact markdown structure:

```markdown
---
pages: 1
style:
  font-size: 11pt
vars:
  tagline: 'Tailored tagline for this specific role'
---

# Candidate Name

email | linkedin | github

{{ tagline }}

## Education

### University || Start - End
**_Degree_** || Location
- GPA, coursework, honors

## Work Experience

### Company || Start - End
_Role_ || Location
- Achievement bullet starting with action verb, including `Tech` names
- Quantified outcome (X% improvement, Y users, $Z saved)

## Projects

### Project Name
- Description with `tech stack` and measurable outcomes

## Technical Skills

Languages
: Python, TypeScript, SQL

Frameworks
: React, PyTorch, FastAPI
```

Key rules: H1=name, H2=sections, H3=entries, `||` for date alignment,
bullets start with action verbs, backticks around tech names,
definition lists for skills. Never fabricate experience.
