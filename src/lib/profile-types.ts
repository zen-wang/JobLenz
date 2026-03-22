/**
 * User profile types — mirrors ApplyPilot's profile.json structure.
 * Used for deterministic scoring, filtering, and tailoring constraints.
 */

export interface UserProfile {
  personal: {
    full_name: string;
    preferred_name: string;
    email: string;
    phone: string;
    city: string;
    province_state: string;
    country: string;
    postal_code: string;
    linkedin_url: string;
    github_url: string;
    portfolio_url: string;
    website_url: string;
  };
  work_authorization: {
    legally_authorized_to_work: boolean;
    require_sponsorship: boolean;
    work_permit_type: string;
  };
  compensation: {
    salary_expectation: string;
    salary_currency: string;
    salary_range_min: string;
    salary_range_max: string;
  };
  experience: {
    years_of_experience_total: string;
    education_level: string;
    current_title: string;
    target_role: string;
  };
  skills_boundary: {
    programming_languages: string[];
    frameworks: string[];
    tools: string[];
  };
  resume_facts: {
    preserved_companies: string[];
    preserved_projects: string[];
    preserved_school: string;
    real_metrics: string[];
  };
  eeo_voluntary: {
    gender: string;
    race_ethnicity: string;
    veteran_status: string;
    disability_status: string;
  };
  availability: {
    earliest_start_date: string;
  };
}

export const EMPTY_PROFILE: UserProfile = {
  personal: {
    full_name: "",
    preferred_name: "",
    email: "",
    phone: "",
    city: "",
    province_state: "",
    country: "",
    postal_code: "",
    linkedin_url: "",
    github_url: "",
    portfolio_url: "",
    website_url: "",
  },
  work_authorization: {
    legally_authorized_to_work: true,
    require_sponsorship: false,
    work_permit_type: "",
  },
  compensation: {
    salary_expectation: "",
    salary_currency: "USD",
    salary_range_min: "",
    salary_range_max: "",
  },
  experience: {
    years_of_experience_total: "",
    education_level: "",
    current_title: "",
    target_role: "",
  },
  skills_boundary: {
    programming_languages: [],
    frameworks: [],
    tools: [],
  },
  resume_facts: {
    preserved_companies: [],
    preserved_projects: [],
    preserved_school: "",
    real_metrics: [],
  },
  eeo_voluntary: {
    gender: "Decline to self-identify",
    race_ethnicity: "Decline to self-identify",
    veteran_status: "Decline to self-identify",
    disability_status: "Decline to self-identify",
  },
  availability: {
    earliest_start_date: "",
  },
};

export const PROFILE_STORAGE_KEY = "joblenz_user_profile";

export function loadProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function clearProfile(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROFILE_STORAGE_KEY);
}
