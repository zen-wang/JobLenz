# Resumx Integration Reference — For JobLenz

## What This Is
This document defines how Claude should output tailored resumes in Resumx-compatible
markdown format. The user can then render them with `resumx resume.md` to get a
perfectly formatted, auto-page-fitted PDF.

## Why Resumx Format
- Format stays identical across all tailored versions (same layout, fonts, spacing)
- `pages: 1` auto-fits any amount of content to exactly one page
- Tags ({.@role}) let the same file produce multiple variants
- AI-friendly: it's just markdown, no proprietary schema

---

## The Resumx Markdown Format (What Claude Must Output)

### Structure Rules
1. `# Name` — H1 is ALWAYS the candidate's full name
2. Contact line — immediately after H1, pipe-delimited links
3. `## Section` — H2 creates sections (Education, Experience, Projects, Skills)
4. `### Entry || Dates` — H3 creates entries, `||` pushes dates to the right
5. `_Role Title_` or `**_Role Title_**` — italic line under H3 for job titles
6. `- Bullet points` — standard markdown bullets for achievements
7. Skills use definition list syntax:
   ```
   Languages
   : Python, TypeScript, SQL
   ```

### Complete Template (What Claude Should Output)

```markdown
---
pages: 1
style:
  font-size: 11pt
---

# {candidate_name}

[{email}](mailto:{email}) | [{linkedin}]({linkedin_url}) | [{github}]({github_url})

{{ tagline }}

## Education

### {university} || {start_date} - {end_date}

**_{degree}_** || {location}

- GPA: {gpa}
- Relevant coursework: {courses}

## Work Experience

### {company} || {start_date} - {end_date}

_{job_title}_ || {location}

- {achievement_bullet_1}
- {achievement_bullet_2}
- {achievement_bullet_3}

## Projects

### {project_name}

- {project_description_with_tech_and_outcomes}
- [Demo]({url}) | [GitHub]({url})

## Technical Skills

Languages
: {languages_comma_separated}

Frameworks
: {frameworks_comma_separated}

Tools & Cloud
: {tools_comma_separated}

ML / AI
: {ml_tools_comma_separated}
```

### Key Formatting Rules Claude Must Follow

1. **Bullets MUST start with an action verb** (Built, Designed, Led, Implemented, etc.)
2. **Bullets SHOULD include metrics** ("improved X by Y%", "reduced latency from X to Y")
3. **Backticks around tech names** in bullets: `PyTorch`, `AWS`, `React`
4. **`||` for date alignment** — always use `||` between company/title and dates
5. **No blank lines between bullets** in the same entry
6. **One blank line between entries** (between the last bullet and the next `###`)
7. **Definition list syntax for skills** (term + `: values` on next line)
8. **Maximum ~6 bullets per entry** (for page fit)
9. **Maximum ~120 characters per bullet** (Resumx warns on long bullets)

### How Claude Should Tailor

Given the fit report data, Claude should:

**Reorder sections:** Put the most relevant section first. If the job emphasizes
projects over work experience, pin Projects above Experience using sections config:
```yaml
sections:
  pin: [projects, skills]
```

**Reorder bullets within entries:** Put the most relevant bullets first. If the job
requires distributed systems and the candidate has a distributed systems bullet
buried as #4, move it to #1.

**Adjust skill categories:** Match the job's terminology. If the job says "Cloud
Infrastructure" instead of "DevOps", rename the category.

**Add keywords from JD:** Incorporate specific technologies and terms from the job
description into existing bullets naturally. NEVER fabricate experience — only
reword existing experience to match JD terminology.

**Remove irrelevant content:** If the job is purely ML-focused, de-prioritize or
remove unrelated frontend projects.

### Tag Syntax for Multi-Variant Resumes (Advanced)

If the user wants one file that produces multiple tailored versions:

```markdown
- Built distributed systems serving 1M req/day {.@backend}
- Built interactive dashboards using `TypeScript` {.@frontend}
```

Then render with: `resumx resume.md --for backend`

Tags are prefixed with `@` inside `{.@tagname}` syntax.

---

## Claude System Prompt Addition (for Resume Tailoring)

Add this to the Claude prompt when the user requests resume tailoring:

```
You are a resume tailoring expert. Given a candidate's resume profile and a
target job description, produce a tailored resume in RESUMX MARKDOWN FORMAT.

RESUMX FORMAT RULES:
- Frontmatter: YAML block with `pages: 1` and optional style overrides
- H1 (#) = Candidate name (NEVER change)
- Contact line = pipe-delimited links after H1
- H2 (##) = Sections: Education, Work Experience, Projects, Technical Skills
- H3 (###) = Entries within sections, use `||` for date alignment
- Italic underscore for job titles: _Senior Engineer_
- Bullets (-) for achievements, MUST start with action verb
- Skills use definition list: `Category\n: item1, item2, item3`
- Backticks around technology names in bullets

TAILORING RULES:
1. NEVER fabricate experience. Only reword existing experience.
2. Reorder sections to put the most relevant first for this specific job.
3. Reorder bullets within entries to lead with the most relevant achievements.
4. Incorporate JD keywords naturally into existing bullet descriptions.
5. Match the job's terminology (e.g., "Cloud Infrastructure" not "DevOps" if that's what the JD says).
6. Remove irrelevant content that wastes space for this specific role.
7. Keep total content fitting on 1 page (max ~6 bullets per entry, ~120 chars per bullet).
8. Add a tagline variable after the contact line: {{ tagline }}
   Set the tagline value in the vars section of the frontmatter.

OUTPUT FORMAT:
Return ONLY the complete markdown file content, starting with the --- frontmatter
delimiter. No explanation before or after.
```

---

## Integration into JobLenz Pipeline

### Where It Fits
This is a P1/P2 feature — AFTER the fit report is generated.

```
User pastes URL → TinyFish enrichment → Claude fit report → [DONE for P0]
                                                           ↓
                                              "Tailor my resume" button (P1)
                                                           ↓
                                              Claude generates Resumx markdown
                                                           ↓
                                              User copies/downloads .md file
                                              Runs `resumx resume.md` locally → PDF
```

### API Addition

**POST /api/tailor**
```typescript
Request: {
  resume_profile: ResumeProfile,  // from /api/parse-resume
  job_details: JobDetails,        // from Agent 1 results
  fit_report: FitReport,          // from /api/analyze
}

Response: {
  tailored_markdown: string,  // Complete Resumx-compatible .md file
  changes_summary: {
    sections_reordered: string[],
    bullets_reordered: number,
    keywords_added: string[],
    content_removed: string[],
  }
}
```

### Frontend Addition

After the fit report renders, show:
- "Tailor my resume for this role" button
- When clicked, display the generated Resumx markdown in a code block
- "Copy to clipboard" button
- "Download as .md" button
- Instructions: "Save this file and run `resumx resume.md` to generate your PDF"
- Optional: render a preview using a simple markdown-to-HTML converter

---

## Example: Your Resume in Resumx Format

```markdown
---
pages: 1
style:
  font-size: 11pt
vars:
  tagline: 'ML Engineer specializing in multi-agent systems, RAG, and distributed computing'
---

# Wei-An (Zen) Wang

[zen.wang@asu.edu](mailto:zen.wang@asu.edu) | [linkedin.com/in/zen-wang](https://linkedin.com/in/zen-wang) | [github.com/zen-wang](https://github.com/zen-wang)

{{ tagline }}

## Education

### Arizona State University || Aug 2024 - May 2026

**_Master of Science in Computer Science_** || Tempe, AZ

- GPA: 3.78 | Relevant: Agentic AI (CSE 598), Distributed Systems, NLP

## Research Experience

### CIPS-AI Lab, Arizona State University || Jan 2025 - Present

_Graduate Research Assistant_

- Developed S²-NS neuro-symbolic legal AI system using `GraphSAGE` and contrastive learning
- Built symbolic reasoning layer for hallucination prevention in legal document analysis
- Benchmarked `Qwen3-14B-AWQ` on τ-Bench using ReAct, ACT, and Function Calling strategies

## Projects

### Spotify Million Playlist Recommendation Engine

- Built hybrid ensemble combining `ALS` and `Word2Vec` using `PySpark`, achieving 287.5% improvement over baseline
- Processed 1M playlists with distributed computing on multi-node cluster

### AWS Face Recognition System

- Designed custom autoscaling cloud app with `EC2`, `SQS`, `S3`, achieving 100% accuracy
- Handled 100 concurrent requests with <1.2s average latency

### JobLenz — Multi-Agent Job Intelligence

- Orchestrated 5 parallel `TinyFish` web agents for company intelligence enrichment
- Built interpretable fit reports with `Claude` synthesis, confidence scoring, and source attribution
- Deployed on `Vercel` with caching, observability panel, and graceful agent failure handling

## Technical Skills

Languages
: Python, TypeScript, JavaScript, SQL, Java

ML / AI
: PyTorch, HuggingFace, LangGraph, ChromaDB, PySpark, RAG, Multi-Agent Systems

Cloud & Tools
: AWS (EC2, SQS, S3), Docker, Git, Linux, Vercel

Frameworks
: Next.js, React, FastAPI, Flask, Tailwind CSS
```
