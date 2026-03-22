import type {
  AssessmentDimension,
  CompanyIntel,
  JobDetails,
  H1BData,
  MyVisaJobsData,
  ResumeProfile,
} from "./types";
import type { UserProfile } from "./profile-types";

// ── Skills Match (weight: 40%) ── deterministic keyword matching ──

// Common filler words to ignore when extracting tech tokens from JD phrases
const STOP_WORDS = new Set([
  // determiners & pronouns
  "the", "and", "or", "of", "in", "to", "a", "an", "with", "for", "on", "at",
  "by", "is", "are", "was", "were", "be", "been", "has", "have", "had", "do",
  "does", "did", "will", "would", "could", "should", "may", "might", "can",
  "not", "no", "but", "if", "than", "that", "this", "these", "those", "such",
  "so", "as", "from", "into", "about", "between", "through", "during", "before",
  "after", "above", "below", "up", "down", "out", "over", "under", "again",
  "then", "once", "when", "where", "why", "how", "all", "each", "every", "both",
  "few", "more", "most", "other", "some", "any", "only", "own", "same", "too",
  "very", "just", "also", "well", "etc", "our", "you", "your", "we", "us",
  "its", "their", "they", "them", "what", "which", "who", "whom",
  // JD filler — these inflate token count without being real skills
  "experience", "strong", "knowledge", "ability", "understanding", "familiarity",
  "proficiency", "proficient", "years", "year", "work", "working", "required",
  "preferred", "minimum", "plus", "using", "including", "related", "based",
  "must", "able", "proven", "track", "record", "skills", "skill", "least",
  "new", "being", "having", "doing", "like", "good", "great", "excellent",
  "deep", "across", "within", "ensure", "develop", "support", "provide",
  "manage", "create", "build", "design", "implement", "maintain", "collaborate",
  "team", "teams", "role", "position", "join", "help", "lead", "drive",
  "responsible", "opportunity", "looking", "ideal", "candidate", "qualifications",
  "requirements", "equivalent", "relevant", "degree", "bachelor", "master",
  "phd", "computer", "science", "engineering", "technical", "technologies",
  "environment", "environments", "solutions", "complex", "multiple", "high",
  "large", "scale", "level", "senior", "junior", "mid", "entry", "staff",
  "principal", "cross", "functional", "fast", "paced", "hands", "attention",
  "detail", "problem", "solving", "communication", "written", "verbal",
  "stakeholders", "business", "product", "products", "company", "customers",
  "internal", "external", "best", "practices", "industry", "standards",
]);

/** Extract meaningful tech-like tokens from an array of text strings. */
function extractTokens(texts: string[]): Set<string> {
  return new Set(
    texts
      .flatMap((s) => s.toLowerCase().split(/[\s,;/()[\]{}<>:•|]+/))
      .map((s) => s.replace(/[^a-z0-9+#.\-]/g, "").trim())
      .filter((s) => s.length > 1 && !STOP_WORDS.has(s)),
  );
}

export function computeSkillsMatch(
  jobDetails: JobDetails,
  resumeProfile: ResumeProfile,
  userProfile?: UserProfile | null,
): AssessmentDimension {
  // Extract individual tech tokens from JD (not full phrases)
  const jdTokens = extractTokens([
    ...jobDetails.required_qualifications,
    ...jobDetails.preferred_qualifications,
    ...jobDetails.tech_stack,
  ]);

  const profileSkills = userProfile?.skills_boundary
    ? [
        ...userProfile.skills_boundary.programming_languages,
        ...userProfile.skills_boundary.frameworks,
        ...userProfile.skills_boundary.tools,
      ]
    : [];

  // Extract tokens from resume (skills + experience highlights + project tech)
  const resumeTokens = extractTokens([
    ...resumeProfile.skills.languages,
    ...resumeProfile.skills.frameworks,
    ...resumeProfile.skills.tools,
    ...resumeProfile.skills.cloud,
    ...resumeProfile.skills.ml,
    ...resumeProfile.experience.flatMap((e) => e.highlights),
    ...resumeProfile.projects.flatMap((p) => [...p.tech, ...p.outcomes]),
    ...profileSkills,
  ]);

  const matched: string[] = [];
  const missing: string[] = [];
  const resumeArr = [...resumeTokens];

  for (const kw of jdTokens) {
    const found = resumeArr.some((rk) => {
      if (rk === kw) return true;
      // Substring matching for tokens >= 3 chars (avoid "go", "r", "c" false positives)
      if (rk.length >= 3 && kw.includes(rk)) return true;
      if (kw.length >= 3 && rk.includes(kw)) return true;
      return false;
    });
    if (found) matched.push(kw);
    else missing.push(kw);
  }

  const total = matched.length + missing.length;
  const rawScore = total > 0 ? Math.round((matched.length / total) * 100) : 60;
  // Floor at 40 — if the job passed relevance filtering, there's baseline overlap
  // Boost: any match at all means the candidate is in the right ballpark
  const boost = matched.length > 0 ? Math.min(matched.length * 3, 15) : 0;
  const score = Math.min(Math.max(rawScore + boost, 40), 100);

  const dataPoints: string[] = [];
  if (matched.length > 0) dataPoints.push(`Matched: ${matched.slice(0, 10).join(", ")}`);
  if (missing.length > 0) dataPoints.push(`Missing: ${missing.slice(0, 8).join(", ")}`);

  return {
    score,
    reasoning: `${matched.length} of ${total} skill tokens matched. ${missing.length > 0 ? `Key gaps: ${missing.slice(0, 4).join(", ")}${missing.length > 4 ? "..." : ""}.` : "Strong skill overlap."}`,
    data_points: dataPoints,
  };
}

// ── Visa Compatibility (weight: 25%) ── deterministic from H-1B + MyVisaJobs data ──

export function computeVisaScore(
  companyIntel: CompanyIntel | null,
  jobDetails: JobDetails,
  resumeProfile: ResumeProfile,
  userProfile?: UserProfile | null,
): AssessmentDimension {
  let candidateNeedsVisa: boolean | null = null;
  if (userProfile?.work_authorization) {
    candidateNeedsVisa = userProfile.work_authorization.require_sponsorship;
  } else {
    const visaStatus = resumeProfile.visa_status;
    candidateNeedsVisa = visaStatus != null
      ? !["us citizen", "citizen", "permanent resident", "green card"].some((s) =>
          visaStatus.toLowerCase().includes(s),
        )
      : null;
  }

  if (candidateNeedsVisa === false) {
    return {
      score: 100,
      reasoning: "Candidate does not require visa sponsorship.",
      data_points: ["No sponsorship needed"],
    };
  }

  const h1bData = companyIntel?.h1b?.data;
  const mvjData = companyIntel?.myvisajobs?.data;
  const jdSaysYes = jobDetails.visa_sponsorship === true;

  // Merge petition counts from both sources — take the higher / more complete picture
  const h1bCount = h1bData?.total_applications ?? 0;
  const mvjLCA = mvjData?.lca_filings ?? 0;
  const mvjApprovals = mvjData?.uscis_approvals ?? 0;
  const bestPetitionCount = Math.max(h1bCount, mvjLCA, mvjApprovals);
  const hasAnyData = h1bCount > 0 || mvjLCA > 0 || mvjApprovals > 0;

  const dataPoints: string[] = [];
  if (h1bCount > 0) {
    dataPoints.push(`h1bdata.info: ${h1bCount} petitions${h1bData?.most_recent_year ? ` (${h1bData.most_recent_year})` : ""}`);
  }
  if (mvjLCA > 0 || mvjApprovals > 0) {
    const parts: string[] = [];
    if (mvjLCA > 0) parts.push(`${mvjLCA} LCA filings`);
    if (mvjApprovals > 0) parts.push(`${mvjApprovals} USCIS approvals`);
    if (mvjData?.approval_rate) parts.push(`${mvjData.approval_rate} approval rate`);
    dataPoints.push(`MyVisaJobs: ${parts.join(", ")}`);
  }
  if (h1bData?.approval_rate) dataPoints.push(`Approval rate (h1bdata): ${h1bData.approval_rate}`);
  if (jdSaysYes) dataPoints.push("JD confirms visa sponsorship");

  let score: number;
  let reasoning: string;

  if (jdSaysYes && bestPetitionCount > 50) {
    score = 95;
    reasoning = `Company confirmed sponsor with ${bestPetitionCount}+ H-1B petitions across sources.`;
  } else if (jdSaysYes) {
    score = 90;
    reasoning = "JD explicitly mentions visa sponsorship.";
  } else if (bestPetitionCount > 100) {
    score = 90;
    reasoning = `Company has ${bestPetitionCount}+ H-1B petitions — strong sponsorship track record.`;
  } else if (bestPetitionCount > 50) {
    score = 85;
    reasoning = `Company has ${bestPetitionCount}+ H-1B petitions — likely sponsors.`;
  } else if (bestPetitionCount > 10) {
    score = 75;
    reasoning = `Company has ${bestPetitionCount} H-1B petitions — moderate sponsorship history.`;
  } else if (bestPetitionCount > 0) {
    score = 65;
    reasoning = `Company has limited H-1B history (${bestPetitionCount} petitions).`;
  } else {
    // Neither source found data — mark as uncertain, don't penalize heavily
    score = 75;
    reasoning = "Uncertain — no H-1B records found. Many companies sponsor without public records.";
    dataPoints.push("No records in h1bdata.info or MyVisaJobs");
  }

  return { score, reasoning, data_points: dataPoints };
}

// ── Overall Score ──

export function computeOverallScore(
  skills: AssessmentDimension,
  experience: AssessmentDimension,
  visa: AssessmentDimension,
  domain: AssessmentDimension,
): number {
  return Math.round(
    skills.score * 0.25 +
    experience.score * 0.30 +
    visa.score * 0.25 +
    domain.score * 0.20,
  );
}
