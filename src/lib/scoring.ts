import type {
  VisaAssessment,
  ATSKeywordMatch,
  CompensationAssessment,
  LocationAssessment,
  EducationAssessment,
  DeterministicScores,
  FitDimension,
  JobDetails,
  H1BData,
  CompanyIntel,
  ResumeProfile,
  SalaryData,
} from "./types";

// ── Visa ──

export function assessVisa(
  h1bData: H1BData | undefined,
  jobDetails: JobDetails,
  resumeProfile: ResumeProfile,
): VisaAssessment {
  const visaStatus = resumeProfile.visa_status;
  const candidateNeedsVisa = visaStatus != null
    ? !["us citizen", "citizen", "permanent resident", "green card"].some((s) =>
        visaStatus.toLowerCase().includes(s),
      )
    : null;

  if (candidateNeedsVisa === false) {
    return {
      status: "not_needed",
      company_sponsors: null,
      candidate_needs_visa: false,
      h1b_applications: h1bData?.total_applications ?? null,
    };
  }

  const jobSaysYes = jobDetails.visa_sponsorship === true;
  const h1bActive =
    h1bData?.total_applications != null && h1bData.total_applications > 0;

  let status: VisaAssessment["status"] = "sponsor_unknown";
  if (jobSaysYes || h1bActive) {
    status = jobSaysYes ? "sponsor_confirmed" : "sponsor_likely";
  }

  return {
    status,
    company_sponsors: jobSaysYes ? true : h1bActive ? true : null,
    candidate_needs_visa: candidateNeedsVisa,
    h1b_applications: h1bData?.total_applications ?? null,
  };
}

// ── Compensation ──

function parseSalaryMidpoint(range: string | null | undefined): number | null {
  if (!range) return null;
  const nums = range.match(/[\d,]+/g);
  if (!nums || nums.length === 0) return null;
  const values = nums.map((n) => parseInt(n.replace(/,/g, ""), 10)).filter((n) => !isNaN(n));
  if (values.length === 0) return null;
  if (values.length === 1) return values[0];
  return Math.round((values[0] + values[values.length - 1]) / 2);
}

export function assessCompensation(
  jobDetails: JobDetails,
  salaryData: SalaryData | undefined,
): CompensationAssessment {
  const jobMid = parseSalaryMidpoint(jobDetails.salary_range);
  const marketMid = parseSalaryMidpoint(salaryData?.salary_range ?? salaryData?.median_salary);

  if (jobMid == null && marketMid == null) {
    return {
      status: "data_unavailable",
      job_range: jobDetails.salary_range,
      market_range: salaryData?.salary_range ?? null,
    };
  }

  if (jobMid != null && marketMid != null) {
    const ratio = jobMid / marketMid;
    const status: CompensationAssessment["status"] =
      ratio >= 1.1 ? "above_market" : ratio >= 0.9 ? "competitive" : "below_market";
    return {
      status,
      job_range: jobDetails.salary_range,
      market_range: salaryData?.salary_range ?? null,
    };
  }

  return {
    status: "data_unavailable",
    job_range: jobDetails.salary_range,
    market_range: salaryData?.salary_range ?? null,
  };
}

// ── ATS Keywords ──

export function assessATSKeywords(
  jobDetails: JobDetails,
  resumeProfile: ResumeProfile,
): ATSKeywordMatch {
  const jdKeywords = new Set(
    [
      ...jobDetails.required_qualifications,
      ...jobDetails.preferred_qualifications,
      ...jobDetails.tech_stack,
    ]
      .flatMap((s) => s.toLowerCase().split(/[,;/]+/))
      .map((s) => s.trim())
      .filter((s) => s.length > 1),
  );

  const resumeKeywords = new Set(
    [
      ...resumeProfile.skills.languages,
      ...resumeProfile.skills.frameworks,
      ...resumeProfile.skills.tools,
      ...resumeProfile.skills.cloud,
      ...resumeProfile.skills.ml,
      ...resumeProfile.experience.flatMap((e) => e.highlights),
      ...resumeProfile.projects.flatMap((p) => p.tech),
    ]
      .flatMap((s) => s.toLowerCase().split(/[,;/]+/))
      .map((s) => s.trim())
      .filter((s) => s.length > 1),
  );

  const matched: string[] = [];
  const missing: string[] = [];

  for (const kw of jdKeywords) {
    const found = [...resumeKeywords].some((rk) => {
      if (rk === kw) return true;
      // Only allow substring matching for tokens >= 3 chars to avoid
      // false positives from short tokens like "go", "r", "c"
      if (rk.length >= 3 && kw.includes(rk)) return true;
      if (kw.length >= 3 && rk.includes(kw)) return true;
      return false;
    });
    if (found) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  }

  const total = matched.length + missing.length;
  return {
    match_percentage: total > 0 ? Math.round((matched.length / total) * 100) : 0,
    matched_keywords: matched,
    missing_keywords: missing,
  };
}

// ── Location ──

export function assessLocation(
  jobDetails: JobDetails,
): LocationAssessment {
  const loc = jobDetails.location?.toLowerCase() ?? "";
  if (loc.includes("remote")) return { status: "remote" };
  if (!loc || loc === "n/a") return { status: "unknown" };
  // ResumeProfile has no location field, so we can't compare
  return { status: "unknown" };
}

// ── Education ──

const EDU_HIERARCHY: Record<string, number> = {
  "high school": 1,
  "associate": 2,
  "bachelor": 3,
  "master": 4,
  "phd": 5,
  "doctorate": 5,
};

function parseEduLevel(text: string): number {
  const lower = text.toLowerCase();
  for (const [key, level] of Object.entries(EDU_HIERARCHY)) {
    if (lower.includes(key)) return level;
  }
  // Also check abbreviations
  if (/\bb\.?s\.?\b/.test(lower)) return 3;
  if (/\bm\.?s\.?\b/.test(lower) || lower.includes("mba")) return 4;
  return 0;
}

export function assessEducation(
  jobDetails: JobDetails,
  resumeProfile: ResumeProfile,
): EducationAssessment {
  const requiredLevel = parseEduLevel(jobDetails.education);
  const candidateLevel = resumeProfile.education.length > 0
    ? Math.max(...resumeProfile.education.map((e) => parseEduLevel(e.degree)))
    : 0;

  const candidateDegree = resumeProfile.education[0]?.degree ?? null;

  if (requiredLevel === 0 || candidateLevel === 0) {
    return {
      status: "unknown",
      required: jobDetails.education || null,
      candidate: candidateDegree,
    };
  }

  const status: EducationAssessment["status"] =
    candidateLevel > requiredLevel
      ? "exceeds"
      : candidateLevel === requiredLevel
        ? "meets"
        : "below";

  return {
    status,
    required: jobDetails.education || null,
    candidate: candidateDegree,
  };
}

// ── Orchestrators ──

export function computeDeterministicScores(
  jobDetails: JobDetails,
  companyIntel: CompanyIntel,
  resumeProfile: ResumeProfile,
): DeterministicScores {
  return {
    visa: assessVisa(companyIntel.h1b.data, jobDetails, resumeProfile),
    ats_keywords: assessATSKeywords(jobDetails, resumeProfile),
    compensation: assessCompensation(
      jobDetails,
      companyIntel.salary.data,
    ),
    location: assessLocation(jobDetails),
    education: assessEducation(jobDetails, resumeProfile),
  };
}

const WEIGHTS = {
  technical_fit: 0.35,
  experience: 0.30,
  culture: 0.15,
  ats: 0.10,
  education: 0.05,
  location: 0.05,
};

function atsScore(match: ATSKeywordMatch): number {
  return Math.round(match.match_percentage / 10);
}

function educationScore(edu: EducationAssessment): number {
  switch (edu.status) {
    case "exceeds": return 10;
    case "meets": return 8;
    case "below": return 4;
    default: return 5;
  }
}

function locationScore(loc: LocationAssessment): number {
  switch (loc.status) {
    case "match": return 10;
    case "remote": return 9;
    case "partial": return 6;
    default: return 5;
  }
}

const EXPECTED_DIMENSIONS: Record<string, string[]> = {
  technical: ["technical fit", "technical"],
  experience: ["experience alignment", "experience"],
  culture: ["culture alignment", "culture"],
};

function findDimension(
  dims: FitDimension[],
  candidates: string[],
): FitDimension | undefined {
  const name = dims.find((d) => {
    const lower = d.name.toLowerCase();
    return candidates.some((c) => lower === c);
  });
  return name;
}

export function computeOverallScore(
  llmDimensions: FitDimension[],
  deterministic: DeterministicScores,
): number {
  const techDim = findDimension(llmDimensions, EXPECTED_DIMENSIONS.technical);
  const expDim = findDimension(llmDimensions, EXPECTED_DIMENSIONS.experience);
  const cultureDim = findDimension(llmDimensions, EXPECTED_DIMENSIONS.culture);

  if (!techDim || !expDim || !cultureDim) {
    console.warn(
      "[scoring] Missing expected LLM dimensions. Got:",
      llmDimensions.map((d) => d.name),
    );
  }

  const techScore = techDim?.score ?? 5;
  const expScore = expDim?.score ?? 5;
  const cultureScore = cultureDim?.score ?? 5;
  const atsVal = atsScore(deterministic.ats_keywords);
  const eduVal = educationScore(deterministic.education);
  const locVal = locationScore(deterministic.location);

  const weighted =
    techScore * WEIGHTS.technical_fit +
    expScore * WEIGHTS.experience +
    cultureScore * WEIGHTS.culture +
    atsVal * WEIGHTS.ats +
    eduVal * WEIGHTS.education +
    locVal * WEIGHTS.location;

  return Math.round(weighted * 10) / 10;
}
