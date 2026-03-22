"use client";

import { useState, useEffect } from "react";
import type { SearchPreferences } from "@/lib/types";
import type { UserProfile } from "@/lib/profile-types";

interface SearchInputProps {
  onSubmit: (data: { search_preferences: SearchPreferences; resume_text: string }) => void;
  disabled: boolean;
  userProfile: UserProfile | null;
}

const RECENCY_OPTIONS = [
  { value: "0", label: "Any time" },
  { value: "24", label: "Past 24 hours" },
  { value: "72", label: "Past 3 days" },
  { value: "168", label: "Past week" },
  { value: "336", label: "Past 2 weeks" },
  { value: "720", label: "Past month" },
];

const EDUCATION_OPTIONS = [
  { value: "", label: "Any" },
  { value: "High School", label: "High School" },
  { value: "Associate's", label: "Associate's" },
  { value: "Bachelor's", label: "Bachelor's" },
  { value: "Master's", label: "Master's" },
  { value: "PhD", label: "PhD" },
];

const WORK_AUTH_OPTIONS = [
  { value: "", label: "Any" },
  { value: "citizen", label: "No sponsorship" },
  { value: "visa_required", label: "Need sponsorship" },
];

export default function SearchInput({ onSubmit, disabled, userProfile }: SearchInputProps) {
  const [positions, setPositions] = useState<string[]>([""]);
  const [location, setLocation] = useState("");
  const [postingHours, setPostingHours] = useState("0");
  const [workAuth, setWorkAuth] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (!userProfile || prefilled) return;
    const { personal, work_authorization, compensation, experience } = userProfile;
    if (personal.city) setLocation([personal.city, personal.province_state].filter(Boolean).join(", "));
    if (experience.target_role) setPositions([experience.target_role]);
    if (work_authorization.require_sponsorship) setWorkAuth("visa_required");
    else if (work_authorization.legally_authorized_to_work) setWorkAuth("citizen");
    if (compensation.salary_range_min) setSalaryMin(compensation.salary_range_min);
    if (compensation.salary_range_max) setSalaryMax(compensation.salary_range_max);
    if (experience.education_level) setEducationLevel(experience.education_level);
    if (experience.years_of_experience_total) setExperienceYears(experience.years_of_experience_total);
    setPrefilled(true);
  }, [userProfile, prefilled]);

  const addPosition = () => { if (positions.length < 3) setPositions([...positions, ""]); };
  const updatePosition = (idx: number, v: string) => { const u = [...positions]; u[idx] = v; setPositions(u); };
  const removePosition = (idx: number) => { if (positions.length > 1) setPositions(positions.filter((_, i) => i !== idx)); };
  const validPositions = positions.filter((p) => p.trim());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validPositions.length === 0 || !resumeText.trim()) return;
    onSubmit({
      search_preferences: {
        positions: validPositions.map((p) => p.trim()),
        location: location.trim(),
        posting_hours: parseInt(postingHours, 10) || undefined,
        work_authorization: workAuth || undefined,
        salary_min: salaryMin || undefined,
        salary_max: salaryMax || undefined,
        education_level: educationLevel || undefined,
        experience_years: experienceYears || undefined,
      },
      resume_text: resumeText.trim(),
    });
  }

  const labelStyle = { color: "var(--text-primary)", fontSize: 12, fontWeight: 600 } as const;
  const smallLabelStyle = { color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 500 } as const;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label style={labelStyle}>Position Preferences (up to 3)</label>
          {positions.length < 3 && (
            <button type="button" onClick={addPosition} className="font-label text-[11px]" style={{ color: "var(--accent-blue)" }}>
              + Add
            </button>
          )}
        </div>
        <div className="space-y-2">
          {positions.map((pos, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={pos}
                onChange={(e) => updatePosition(idx, e.target.value)}
                placeholder={idx === 0 ? "e.g. Machine Learning Engineer" : idx === 1 ? "e.g. Data Scientist" : "e.g. Research Engineer"}
                disabled={disabled}
                className="flex-1 glass-input"
              />
              {positions.length > 1 && (
                <button type="button" onClick={() => removePosition(idx)} style={{ color: "var(--text-muted)", padding: "0 8px" }}>x</button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label style={labelStyle} className="block mb-1">Job Location</label>
          <input type="text" placeholder="e.g. San Francisco, CA" value={location} onChange={(e) => setLocation(e.target.value)} disabled={disabled} className="w-full glass-input" />
        </div>
        <div>
          <label style={labelStyle} className="block mb-1">Posted Within</label>
          <select value={postingHours} onChange={(e) => setPostingHours(e.target.value)} disabled={disabled} className="w-full glass-input">
            {RECENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label style={smallLabelStyle} className="block mb-1">Work Auth</label>
          <select value={workAuth} onChange={(e) => setWorkAuth(e.target.value)} disabled={disabled} className="w-full glass-input" style={{ fontSize: 11 }}>
            {WORK_AUTH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label style={smallLabelStyle} className="block mb-1">Salary Range</label>
          <div className="flex gap-1">
            <input type="text" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="Min" disabled={disabled} className="w-full glass-input" style={{ fontSize: 11 }} />
            <input type="text" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder="Max" disabled={disabled} className="w-full glass-input" style={{ fontSize: 11 }} />
          </div>
        </div>
        <div>
          <label style={smallLabelStyle} className="block mb-1">Education</label>
          <select value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} disabled={disabled} className="w-full glass-input" style={{ fontSize: 11 }}>
            {EDUCATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label style={smallLabelStyle} className="block mb-1">Experience (yrs)</label>
          <input type="text" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} placeholder="e.g. 3" disabled={disabled} className="w-full glass-input" style={{ fontSize: 11 }} />
        </div>
      </div>

      <div>
        <label style={labelStyle} className="block mb-1">Resume (paste text)</label>
        <textarea rows={6} placeholder="Paste your resume text here..." value={resumeText} onChange={(e) => setResumeText(e.target.value)} disabled={disabled} className="w-full glass-input font-mono" style={{ resize: "vertical" }} />
      </div>

      <button
        type="submit"
        disabled={disabled || validPositions.length === 0 || !resumeText.trim()}
        className="glass-btn glass-btn-primary px-6 py-2.5"
        style={{ fontSize: 13 }}
      >
        {disabled ? "Searching..." : "Search Jobs"}
      </button>
    </form>
  );
}
