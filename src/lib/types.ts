// === Discovery ===

export type DiscoverSSEEvent =
  | { type: "progress"; message: string; sub_stage: string; detail?: string }
  | { type: "result"; data: DiscoverResult }
  | { type: "error"; message: string };

export interface ScoutResult {
  filtered_url: string;
  url_changed: boolean;
  jobs: { title: string; url: string; location?: string }[];
}

// === Enrichment ===

export interface JobDetails {
  title: string;
  company: string;
  location: string;
  salary_range: string | null;
  required_qualifications: string[];
  preferred_qualifications: string[];
  responsibilities: string[];
  visa_sponsorship: boolean | null;
  education: string;
  experience_years: string;
  tech_stack: string[];
  source_url: string;
}

export interface H1BData {
  company_name: string;
  total_applications: number | null;
  approval_rate: string | null;
  common_titles: string[];
  salary_range: string | null;
  most_recent_year: string | null;
  source_url: string;
}

export interface ValuesData {
  mission_statement: string | null;
  stated_values: string[];
  recent_news: string[];
  blog_topics: string[];
  source_url: string;
}

export interface SalaryData {
  role_title: string;
  location: string;
  salary_range: string | null;
  median_salary: string | null;
  source_url: string;
}

export interface CompanyIntel {
  h1b: { status: "success" | "failed"; data?: H1BData; latency_ms: number };
  values: {
    status: "success" | "failed";
    data?: ValuesData;
    latency_ms: number;
  };
  salary: {
    status: "success" | "failed";
    data?: SalaryData;
    latency_ms: number;
  };
}

// === Resume ===

export interface ResumeProfile {
  name: string;
  email: string;
  education: {
    degree: string;
    institution: string;
    gpa?: string;
    graduation?: string;
  }[];
  skills: {
    languages: string[];
    frameworks: string[];
    tools: string[];
    cloud: string[];
    ml: string[];
  };
  experience: {
    company: string;
    role: string;
    dates: string;
    highlights: string[];
  }[];
  projects: { name: string; tech: string[]; outcomes: string[] }[];
  visa_status?: string;
}

// === Filter ===

export interface FilterStats {
  total_raw: number;
  total_filtered: number;
  removed_count: number;
}

// === Scoring ===

export interface FitDimension {
  name: string;
  score: number;
  reasoning: string;
  sources: string[];
  confidence: "high" | "medium" | "low";
  confidence_reason: string;
}

export interface Evidence {
  text: string;
  evidence: string;
  source: string;
}

export interface FitReport {
  overall_score: number;
  dimensions: FitDimension[];
  strengths: Evidence[];
  concerns: Evidence[];
  next_steps: string;
}

// === Deterministic Scoring ===

export interface VisaAssessment {
  status: "sponsor_confirmed" | "sponsor_likely" | "sponsor_unknown" | "not_needed";
  company_sponsors: boolean | null;
  candidate_needs_visa: boolean | null;
  h1b_applications: number | null;
}

export interface ATSKeywordMatch {
  match_percentage: number;
  matched_keywords: string[];
  missing_keywords: string[];
}

export interface CompensationAssessment {
  status: "competitive" | "above_market" | "below_market" | "data_unavailable";
  job_range: string | null;
  market_range: string | null;
}

export interface LocationAssessment {
  status: "match" | "partial" | "remote" | "unknown";
}

export interface EducationAssessment {
  status: "exceeds" | "meets" | "below" | "unknown";
  required: string | null;
  candidate: string | null;
}

export interface DeterministicScores {
  visa: VisaAssessment;
  ats_keywords: ATSKeywordMatch;
  compensation: CompensationAssessment;
  location: LocationAssessment;
  education: EducationAssessment;
}

export interface MissingRequirements {
  required: string[];
  preferred: string[];
}

// === Metrics ===

export interface AgentMetrics {
  agent_id: string;
  status: "success" | "failed" | "cached";
  latency_ms: number;
  steps_used: number | null;
  cached: boolean;
  error?: string;
}

// === Pipeline State ===

// === Tailor ===

export interface TailorResult {
  tailored_markdown: string;
  changes_summary: {
    sections_reordered: string[];
    bullets_reordered: number;
    keywords_added: string[];
    content_removed: string[];
  };
}

// === Cover Letter ===

export interface CoverLetterResult {
  cover_letter: string;
  key_points: string[];
}

// === Pipeline State ===

export type PipelineStage =
  | "idle"
  | "discovering"
  | "enriching"
  | "scoring"
  | "tailoring"
  | "cover_letter"
  | "complete"
  | "error";

export interface PipelineState {
  stage: PipelineStage;
  discover_result: DiscoverResult | null;
  enrich_result: EnrichResult | null;
  score_result: ScoreResult | null;
  resume_profile: ResumeProfile | null;
  error: string | null;
}

// === API Request/Response Types ===

export interface DiscoverRequest {
  company_url: string;
  role_query: string;
  location?: string;
}

export interface DiscoverResult {
  company: {
    name: string;
    domain: string;
    careers_url: string;
  };
  jobs: {
    title: string;
    url: string;
    location?: string;
  }[];
  scout_metadata: {
    filtered_url: string;
    url_changed: boolean;
    method: "scout+scraper" | "scout_only";
    scout_latency_ms: number;
    scout_steps: number;
    scraper_latency_ms: number;
    total_jobs_found: number;
    filter_stats?: FilterStats;
  };
}

export interface EnrichRequest {
  jobs: { title: string; url: string }[];
  company_name: string;
  company_domain: string;
  max_jobs?: number;
}

export interface EnrichResult {
  enriched_jobs: {
    url: string;
    title: string;
    details: JobDetails | null;
    extraction_status: "success" | "failed";
    latency_ms: number;
  }[];
  company_intel: CompanyIntel;
  metrics: {
    total_latency_ms: number;
    sequential_estimate_ms: number;
    tinyfish_steps_total: number;
    agents_succeeded: number;
    agents_failed: number;
    cache_hits: number;
  };
}

export interface ScoreResult {
  scored_jobs: {
    url: string;
    title: string;
    overall_score: number;
    dimensions: FitDimension[];
    strengths: Evidence[];
    concerns: Evidence[];
    next_steps: string;
    deterministic?: DeterministicScores;
    missing_requirements?: MissingRequirements;
  }[];
}
