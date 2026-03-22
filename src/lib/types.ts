// === Discovery ===

export type DiscoverSSEEvent =
  | { type: "progress"; message: string; sub_stage: string; detail?: string }
  | { type: "result"; data: DiscoverResult }
  | { type: "error"; message: string }
  | { type: "streaming_url"; url: string; company: string; slot: number }
  | { type: "slot_done"; slot: number }
  | { type: "agent_progress"; message: string };

export interface ScoutResult {
  filtered_url: string;
  url_changed: boolean;
  jobs: { title: string; url: string; location?: string; company?: string }[];
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

export interface MyVisaJobsData {
  company_name: string;
  lca_filings: number | null;
  uscis_approvals: number | null;
  uscis_denials: number | null;
  approval_rate: string | null;
  green_card_filings: number | null;
  avg_salary: string | null;
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
  myvisajobs: { status: "success" | "failed"; data?: MyVisaJobsData; latency_ms: number };
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

// === Assessment (4-dimension scoring) ===

export interface AssessmentDimension {
  score: number; // 0-100
  reasoning: string;
  data_points: string[];
}

export interface FitReport {
  overall_score: number; // 0-100
  skills_match: AssessmentDimension;
  experience_fit: AssessmentDimension;
  visa_compatibility: AssessmentDimension;
  domain_relevance: AssessmentDimension;
  next_steps: string;
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
  | "stopped"
  | "error";

export interface PipelineState {
  stage: PipelineStage;
  discover_result: DiscoverResult | null;
  enrich_result: EnrichResult | null;
  score_result: ScoreResult | null;
  resume_profile: ResumeProfile | null;
  error: string | null;
}

// === Search Preferences ===

export interface SearchPreferences {
  positions: string[];
  location: string;
  posting_hours?: number;
  work_authorization?: string;
  salary_min?: string;
  salary_max?: string;
  education_level?: string;
  experience_years?: string;
  skip_cache?: boolean;
  target_companies?: string[];
}

// === API Request/Response Types ===

export interface DiscoverRequest {
  search_preferences: SearchPreferences;
}

export interface DiscoverResult {
  search_context: {
    positions: string[];
    location: string;
    source: string;
  };
  jobs: {
    title: string;
    url: string;
    location?: string;
    company?: string;
  }[];
  scout_metadata: {
    method: "job_search";
    scout_latency_ms: number;
    scout_steps: number;
    total_jobs_found: number;
    filter_stats?: FilterStats;
  };
}

export interface EnrichRequest {
  jobs: { title: string; url: string }[];
  company_name?: string;
  company_domain?: string;
  max_jobs?: number;
  skip_cache?: boolean;
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
    company: string;
    overall_score: number;
    skills_match: AssessmentDimension;
    experience_fit: AssessmentDimension;
    visa_compatibility: AssessmentDimension;
    domain_relevance: AssessmentDimension;
    next_steps: string;
  }[];
}
