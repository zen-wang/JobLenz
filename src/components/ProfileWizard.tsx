"use client";

import { useState, useCallback } from "react";
import type { UserProfile } from "@/lib/profile-types";
import { EMPTY_PROFILE } from "@/lib/profile-types";

interface ProfileWizardProps {
  initial: UserProfile | null;
  onSave: (profile: UserProfile) => void;
  onSkip: () => void;
}

const STEPS = [
  "Personal",
  "Work Auth",
  "Compensation",
  "Experience",
  "Skills",
  "Resume Facts",
] as const;

type Step = (typeof STEPS)[number];

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-0.5 block w-full glass-input rounded-md px-2.5 py-1.5 text-sm"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-blue-600" : "bg-slate-700"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
            checked ? "translate-x-4 ml-0.5" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
    </label>
  );
}

function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setInput("");
  };

  return (
    <label className="block">
      <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
      <div className="mt-0.5 flex flex-wrap gap-1 min-h-[32px] glass-input rounded-md px-2 py-1.5">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 glass-badge glass-badge-blue rounded text-xs"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="font-bold"
              style={{ color: "var(--accent-blue)" }}
            >
              x
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag();
            }
          }}
          onBlur={addTag}
          placeholder={values.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[100px] text-sm outline-none bg-transparent"
          style={{ color: "var(--text-secondary)", "--tw-placeholder-opacity": 1 } as React.CSSProperties}
        />
      </div>
      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Press Enter or comma to add</span>
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 block w-full glass-input rounded-md px-2.5 py-1.5 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ── Step renderers ──

function PersonalStep({
  profile,
  update,
}: {
  profile: UserProfile;
  update: (p: UserProfile) => void;
}) {
  const p = profile.personal;
  const set = (field: keyof typeof p, value: string) =>
    update({ ...profile, personal: { ...p, [field]: value } });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <TextInput label="Full Name *" value={p.full_name} onChange={(v) => set("full_name", v)} />
      <TextInput label="Preferred Name" value={p.preferred_name} onChange={(v) => set("preferred_name", v)} placeholder="Leave blank to use first name" />
      <TextInput label="Email *" value={p.email} onChange={(v) => set("email", v)} type="email" />
      <TextInput label="Phone" value={p.phone} onChange={(v) => set("phone", v)} />
      <TextInput label="City" value={p.city} onChange={(v) => set("city", v)} />
      <TextInput label="State/Province" value={p.province_state} onChange={(v) => set("province_state", v)} />
      <TextInput label="Country" value={p.country} onChange={(v) => set("country", v)} placeholder="e.g. United States" />
      <TextInput label="Postal Code" value={p.postal_code} onChange={(v) => set("postal_code", v)} />
      <TextInput label="LinkedIn URL" value={p.linkedin_url} onChange={(v) => set("linkedin_url", v)} />
      <TextInput label="GitHub URL" value={p.github_url} onChange={(v) => set("github_url", v)} />
    </div>
  );
}

function WorkAuthStep({ profile, update }: { profile: UserProfile; update: (p: UserProfile) => void }) {
  const w = profile.work_authorization;
  return (
    <div className="space-y-4">
      <Toggle
        label="Legally authorized to work in your target country?"
        checked={w.legally_authorized_to_work}
        onChange={(v) =>
          update({ ...profile, work_authorization: { ...w, legally_authorized_to_work: v } })
        }
      />
      <Toggle
        label="Will you need visa sponsorship (now or in the future)?"
        checked={w.require_sponsorship}
        onChange={(v) =>
          update({ ...profile, work_authorization: { ...w, require_sponsorship: v } })
        }
      />
      <TextInput
        label="Work permit type (e.g. F-1 OPT, H-1B, Green Card, Citizen)"
        value={w.work_permit_type}
        onChange={(v) =>
          update({ ...profile, work_authorization: { ...w, work_permit_type: v } })
        }
      />
    </div>
  );
}

function CompensationStep({ profile, update }: { profile: UserProfile; update: (p: UserProfile) => void }) {
  const c = profile.compensation;
  const set = (field: keyof typeof c, value: string) =>
    update({ ...profile, compensation: { ...c, [field]: value } });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <TextInput label="Expected Salary" value={c.salary_expectation} onChange={(v) => set("salary_expectation", v)} placeholder="e.g. 120000" />
      <SelectInput
        label="Currency"
        value={c.salary_currency}
        onChange={(v) => set("salary_currency", v)}
        options={[
          { value: "USD", label: "USD" },
          { value: "EUR", label: "EUR" },
          { value: "GBP", label: "GBP" },
          { value: "CAD", label: "CAD" },
          { value: "AUD", label: "AUD" },
        ]}
      />
      <TextInput label="Range Min" value={c.salary_range_min} onChange={(v) => set("salary_range_min", v)} placeholder="e.g. 110000" />
      <TextInput label="Range Max" value={c.salary_range_max} onChange={(v) => set("salary_range_max", v)} placeholder="e.g. 150000" />
    </div>
  );
}

function ExperienceStep({ profile, update }: { profile: UserProfile; update: (p: UserProfile) => void }) {
  const e = profile.experience;
  const set = (field: keyof typeof e, value: string) =>
    update({ ...profile, experience: { ...e, [field]: value } });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <TextInput label="Years of Experience" value={e.years_of_experience_total} onChange={(v) => set("years_of_experience_total", v)} placeholder="e.g. 3" />
      <SelectInput
        label="Education Level"
        value={e.education_level}
        onChange={(v) => set("education_level", v)}
        options={[
          { value: "", label: "Select..." },
          { value: "High School", label: "High School" },
          { value: "Associate's", label: "Associate's" },
          { value: "Bachelor's", label: "Bachelor's" },
          { value: "Master's", label: "Master's" },
          { value: "PhD", label: "PhD" },
          { value: "Self-taught", label: "Self-taught" },
        ]}
      />
      <TextInput label="Current Title" value={e.current_title} onChange={(v) => set("current_title", v)} placeholder="e.g. Research Assistant" />
      <TextInput label="Target Role" value={e.target_role} onChange={(v) => set("target_role", v)} placeholder="e.g. Machine Learning Engineer" />
    </div>
  );
}

function SkillsStep({ profile, update }: { profile: UserProfile; update: (p: UserProfile) => void }) {
  const s = profile.skills_boundary;
  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Define the skills you actually have. The AI will never claim skills outside this boundary.
      </p>
      <TagInput
        label="Programming Languages"
        values={s.programming_languages}
        onChange={(v) => update({ ...profile, skills_boundary: { ...s, programming_languages: v } })}
        placeholder="e.g. Python, TypeScript, SQL"
      />
      <TagInput
        label="Frameworks & Libraries"
        values={s.frameworks}
        onChange={(v) => update({ ...profile, skills_boundary: { ...s, frameworks: v } })}
        placeholder="e.g. PyTorch, React, FastAPI"
      />
      <TagInput
        label="Tools & Platforms"
        values={s.tools}
        onChange={(v) => update({ ...profile, skills_boundary: { ...s, tools: v } })}
        placeholder="e.g. Docker, AWS, Git"
      />
    </div>
  );
}

function ResumeFactsStep({ profile, update }: { profile: UserProfile; update: (p: UserProfile) => void }) {
  const r = profile.resume_facts;
  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        These facts are preserved exactly during tailoring — the AI will never change them.
      </p>
      <TagInput
        label="Companies to Preserve"
        values={r.preserved_companies}
        onChange={(v) => update({ ...profile, resume_facts: { ...r, preserved_companies: v } })}
        placeholder="e.g. Google, CIPS-AI Lab"
      />
      <TagInput
        label="Projects to Preserve"
        values={r.preserved_projects}
        onChange={(v) => update({ ...profile, resume_facts: { ...r, preserved_projects: v } })}
        placeholder="e.g. TrendScout AI"
      />
      <TextInput
        label="School Name"
        value={r.preserved_school}
        onChange={(v) => update({ ...profile, resume_facts: { ...r, preserved_school: v } })}
      />
      <TagInput
        label="Real Metrics (numbers that cannot be inflated)"
        values={r.real_metrics}
        onChange={(v) => update({ ...profile, resume_facts: { ...r, real_metrics: v } })}
        placeholder="e.g. 95% accuracy, 3x speedup"
      />
    </div>
  );
}

// ── Profile Summary ──

function ProfileSummary({
  profile,
  onEdit,
  onClear,
}: {
  profile: UserProfile;
  onEdit: () => void;
  onClear: () => void;
}) {
  const allSkills = [
    ...profile.skills_boundary.programming_languages,
    ...profile.skills_boundary.frameworks.slice(0, 3),
  ];

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1 text-xs min-w-0" style={{ color: "var(--text-secondary)" }}>
        <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{profile.personal.full_name || "No name set"}</p>
        {profile.experience.target_role && (
          <p>Target: {profile.experience.target_role}</p>
        )}
        {profile.personal.city && (
          <p>
            {profile.personal.city}
            {profile.personal.province_state ? `, ${profile.personal.province_state}` : ""}
          </p>
        )}
        {profile.work_authorization.require_sponsorship && (
          <p style={{ color: "var(--accent-orange)" }}>
            Needs sponsorship{profile.work_authorization.work_permit_type ? ` (${profile.work_authorization.work_permit_type})` : ""}
          </p>
        )}
        {allSkills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {allSkills.map((s) => (
              <span key={s} className="px-1.5 py-0.5 glass-badge glass-badge-blue rounded text-[10px]">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onEdit}
          className="text-xs hover:opacity-80 underline underline-offset-2 transition-colors"
          style={{ color: "var(--accent-blue)" }}
        >
          Edit
        </button>
        <button
          onClick={onClear}
          className="text-xs hover:opacity-80 underline underline-offset-2 transition-colors"
          style={{ color: "var(--accent-red)" }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

// ── Main Component ──

export default function ProfileWizard({ initial, onSave, onSkip }: ProfileWizardProps) {
  const [profile, setProfile] = useState<UserProfile>(initial ?? EMPTY_PROFILE);
  const [stepIdx, setStepIdx] = useState(0);
  const [editing, setEditing] = useState(!initial);

  const currentStep = STEPS[stepIdx];

  const handleSave = useCallback(() => {
    onSave(profile);
    setEditing(false);
  }, [profile, onSave]);

  if (initial && !editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Your Profile</h3>
        </div>
        <ProfileSummary
          profile={initial}
          onEdit={() => {
            setProfile(initial);
            setStepIdx(0);
            setEditing(true);
          }}
          onClear={() => {
            onSave(EMPTY_PROFILE);
            setProfile(EMPTY_PROFILE);
            setEditing(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Setup Profile</h3>
        {!initial && (
          <button
            onClick={onSkip}
            className="text-xs hover:opacity-80 underline underline-offset-2 transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            Skip for now
          </button>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => setStepIdx(i)}
            className={`flex-1 py-1 text-[10px] font-medium rounded-md transition-all ${
              i === stepIdx
                ? "glass-btn-primary"
                : i < stepIdx
                  ? "glass-badge glass-badge-blue"
                  : "glass-badge glass-badge-gray"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="min-h-[200px]">
        {currentStep === "Personal" && <PersonalStep profile={profile} update={setProfile} />}
        {currentStep === "Work Auth" && <WorkAuthStep profile={profile} update={setProfile} />}
        {currentStep === "Compensation" && <CompensationStep profile={profile} update={setProfile} />}
        {currentStep === "Experience" && <ExperienceStep profile={profile} update={setProfile} />}
        {currentStep === "Skills" && <SkillsStep profile={profile} update={setProfile} />}
        {currentStep === "Resume Facts" && <ResumeFactsStep profile={profile} update={setProfile} />}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-2 border-t border-blue-900/30">
        <button
          onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
          disabled={stepIdx === 0}
          className="px-3 py-1.5 text-xs font-medium hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          style={{ color: "var(--text-muted)" }}
        >
          Back
        </button>
        <div className="flex gap-2">
          {stepIdx < STEPS.length - 1 ? (
            <button
              onClick={() => setStepIdx((i) => i + 1)}
              className="px-4 py-1.5 text-xs glass-btn glass-btn-primary"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs glass-btn glass-btn-green"
            >
              Save Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
