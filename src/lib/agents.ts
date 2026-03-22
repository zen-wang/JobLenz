/**
 * TinyFish goal definitions for each pipeline stage.
 * Goals are template strings — interpolate user-provided values before sending.
 */

export function buildScoutGoal(roleQuery: string, location?: string): string {
  const locationInstruction = location
    ? `If there is a location filter, set it to "${location}" or "Remote" if available.`
    : `If there is a location filter, set it to "Remote" if available.`;

  return `Navigate to this company careers page.
Look for a search box, filter, or job category selector.
If found, search for roles matching "${roleQuery}".
${locationInstruction}

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
}`;
}

export function buildJDExtractionGoal(): string {
  return `Extract the full job description from this job posting page.

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
}`;
}

export function buildH1BGoal(): string {
  return `Extract H-1B visa sponsorship data from this page.

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
}`;
}

export function buildMyVisaJobsGoal(): string {
  return `Extract H-1B visa sponsorship data from this MyVisaJobs employer page.

Look for:
- Total LCA (Labor Condition Application) filings count
- USCIS petition approval and denial counts (if shown in a table or chart by fiscal year)
- Approval rate percentage
- Green Card / PERM filing count (if shown)
- Average offered salary
- Most recent fiscal year of data

If the page shows "No records found" or redirects to search, return:
{ "company_name": "unknown", "lca_filings": null, "note": "No records found on MyVisaJobs" }

If a cookie banner or popup appears, close it first.

Return as JSON:
{
  "company_name": "string",
  "lca_filings": number or null,
  "uscis_approvals": number or null,
  "uscis_denials": number or null,
  "approval_rate": "string or null",
  "green_card_filings": number or null,
  "avg_salary": "string or null",
  "most_recent_year": "string or null"
}`;
}

export function buildValuesGoal(): string {
  return `Extract the company's mission, values, and recent information from this page.

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
}`;
}

export function buildJobSearchGoal(): string {
  return `Extract all visible job listings from this job search results page.

For each listing extract:
- Job title as displayed
- Company name
- Location if shown
- The URL/link to the full job posting (the href from the job title link)

Do NOT click into individual job postings.
Do NOT click any Apply buttons.
If a cookie banner or popup appears, close it first.
If there are multiple pages, only extract from the first page.
Scroll down to load more results if the page uses infinite scroll.

Return as JSON:
{
  "filtered_url": "the current page URL",
  "url_changed": false,
  "jobs": [
    { "title": "Machine Learning Engineer", "url": "https://...", "location": "San Francisco, CA", "company": "Anthropic" }
  ]
}`;
}

export function buildSalaryGoal(): string {
  return `Extract salary information from this page.

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
}`;
}
