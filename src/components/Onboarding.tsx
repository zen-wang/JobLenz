"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { SearchPreferences } from "@/lib/types";

// ── Autocomplete suggestion data ──

const ROLE_SUGGESTIONS = [
  "Software Engineer",
  "Machine Learning Engineer",
  "Data Scientist",
  "AI Engineer",
  "Backend Engineer",
  "Frontend Engineer",
  "Full Stack Engineer",
  "DevOps Engineer",
  "Cloud Engineer",
  "Data Engineer",
  "Research Engineer",
  "Site Reliability Engineer",
  "iOS Engineer",
  "Android Engineer",
  "Product Manager",
  "Technical Program Manager",
  "Security Engineer",
  "QA Engineer",
  "Embedded Systems Engineer",
  "Platform Engineer",
  "Solutions Architect",
  "Systems Engineer",
  "NLP Engineer",
  "Computer Vision Engineer",
  "Robotics Engineer",
];

const LOCATION_SUGGESTIONS = [
  "United States",
  "Remote",
  "San Francisco, CA",
  "New York, NY",
  "Seattle, WA",
  "Austin, TX",
  "Los Angeles, CA",
  "Chicago, IL",
  "Boston, MA",
  "Denver, CO",
  "San Jose, CA",
  "Washington, DC",
  "Atlanta, GA",
  "Dallas, TX",
  "Portland, OR",
  "Miami, FL",
  "San Diego, CA",
  "Palo Alto, CA",
  "Mountain View, CA",
  "Phoenix, AZ",
  "Tempe, AZ",
  "Raleigh, NC",
  "Pittsburgh, PA",
  "Ann Arbor, MI",
  "Toronto, Canada",
  "Vancouver, Canada",
  "London, UK",
  "Berlin, Germany",
  "Singapore",
  "Bangalore, India",
];

// ── Autocomplete input component ──

function AutocompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  className,
  style,
  multiToken,
  onSelect,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  multiToken?: boolean;
  onSelect?: (v: string) => void;
  onEnter?: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // For multi-token (comma-separated), match against the current token
  const currentToken = multiToken
    ? (value.split(",").pop() ?? "").trimStart()
    : value;

  const filtered = currentToken.length > 0
    ? suggestions.filter((s) =>
        s.toLowerCase().includes(currentToken.toLowerCase())
      ).slice(0, 6)
    : [];

  const showDropdown = open && filtered.length > 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectSuggestion(suggestion: string) {
    if (onSelect) {
      onSelect(suggestion);
    } else if (multiToken) {
      const parts = value.split(",");
      parts.pop();
      const prefix = parts.length > 0 ? parts.join(",") + ", " : "";
      onChange(prefix + suggestion);
    } else {
      onChange(suggestion);
    }
    setOpen(false);
    setActiveIdx(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (showDropdown && activeIdx >= 0) {
        selectSuggestion(filtered[activeIdx]);
      } else if (onEnter && value.trim()) {
        onEnter(value.trim());
      }
      return;
    }
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? filtered.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActiveIdx(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        style={style}
        autoComplete="off"
      />
      {showDropdown && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 rounded-lg overflow-hidden"
          style={{
            background: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {filtered.map((s, i) => {
            const matchStart = s.toLowerCase().indexOf(currentToken.toLowerCase());
            const before = s.slice(0, matchStart);
            const match = s.slice(matchStart, matchStart + currentToken.length);
            const after = s.slice(matchStart + currentToken.length);
            return (
              <div
                key={s}
                onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                onMouseEnter={() => setActiveIdx(i)}
                className="px-3 py-1.5 cursor-pointer text-[12px] transition-colors"
                style={{
                  color: i === activeIdx ? "var(--text-primary)" : "var(--text-secondary)",
                  background: i === activeIdx ? "rgba(59,130,246,0.15)" : "transparent",
                }}
              >
                {before}<span style={{ color: "var(--accent-blue)", fontWeight: 600 }}>{match}</span>{after}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface OnboardingProps {
  onStart: (data: { search_preferences: SearchPreferences; resume_text: string }) => void;
}

const COMPANY_SUGGESTIONS = [
  "Apple", "Google", "Meta", "Amazon", "Microsoft", "Anthropic", "OpenAI",
  "Spotify", "Netflix", "Nvidia", "Tesla", "Stripe", "Coinbase", "Databricks",
  "Snowflake", "Airbnb", "Uber", "Lyft", "DoorDash", "Pinterest", "Snap",
  "Adobe", "Salesforce", "Oracle", "IBM", "Intel", "AMD", "Qualcomm",
  "Bloomberg", "Goldman Sachs", "JPMorgan", "Citadel", "Two Sigma",
  "Palantir", "Scale AI", "Figma", "Notion", "Vercel", "Supabase",
  "Cloudflare", "Twilio", "Datadog", "Elastic", "MongoDB", "Redis",
];

const VISA_OPTIONS = [
  { value: "", label: "Select visa status..." },
  { value: "F-1 OPT (need sponsorship)", label: "F-1 OPT (need sponsorship)" },
  { value: "H-1B", label: "H-1B" },
  { value: "Green Card / Citizen", label: "Green Card / Citizen" },
  { value: "Other", label: "Other" },
];

const EXP_OPTIONS = [
  { value: "", label: "Select experience..." },
  { value: "New grad / entry", label: "New grad / entry" },
  { value: "Mid-level (2-5 yrs)", label: "Mid-level (2-5 yrs)" },
  { value: "Senior (5+ yrs)", label: "Senior (5+ yrs)" },
  { value: "Staff+", label: "Staff+" },
];

const RECENCY_OPTIONS = [
  { value: "0", label: "Any time" },
  { value: "24", label: "Past 24 hours" },
  { value: "72", label: "Past 3 days" },
  { value: "168", label: "Past week" },
  { value: "336", label: "Past 2 weeks" },
];

const ACCEPTED_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  // .md files sometimes lack MIME
  "",
];
const ACCEPTED_EXTENSIONS = [".pdf", ".txt", ".md"];

async function extractTextFromPdf(file: File): Promise<string> {
  // Send PDF to server-side extraction endpoint to avoid
  // pdfjs worker loading issues in the browser
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/extract-pdf", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("PDF extraction failed");
  }

  const { text } = await res.json();
  return text;
}

async function readFileAsText(file: File): Promise<string> {
  const ext = file.name.toLowerCase().split(".").pop();

  if (ext === "pdf") {
    return extractTextFromPdf(file);
  }

  // .txt, .md — read as plain text
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

export default function Onboarding({ onStart }: OnboardingProps) {
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [roles, setRoles] = useState("Machine Learning Engineer, Data Scientist, AI Engineer");
  const [location, setLocation] = useState("");
  const [companyInput, setCompanyInput] = useState("");
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
  const [visa, setVisa] = useState("");
  const [experience, setExperience] = useState("");
  const [recency, setRecency] = useState("168");
  const [skipCache, setSkipCache] = useState(false);

  const addCompany = useCallback((name: string) => {
    const trimmed = name.trim();
    if (trimmed && !targetCompanies.includes(trimmed)) {
      setTargetCompanies((prev) => [...prev, trimmed]);
    }
    setCompanyInput("");
  }, [targetCompanies]);

  const removeCompany = useCallback((name: string) => {
    setTargetCompanies((prev) => prev.filter((c) => c !== name));
  }, []);

  const positions = roles.split(",").map((r) => r.trim()).filter(Boolean);
  const canSubmit = resumeText.trim() && positions.length > 0 && !fileLoading;

  const handleFile = useCallback(async (file: File) => {
    const ext = `.${file.name.toLowerCase().split(".").pop()}`;
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setFileError("Unsupported file type. Please upload .pdf, .txt, or .md");
      return;
    }

    setFileLoading(true);
    setFileError(null);
    setFileName(file.name);

    try {
      const text = await readFileAsText(file);
      if (!text.trim()) {
        setFileError("File appears empty. Try pasting your resume text instead.");
        setFileName(null);
      } else {
        setResumeText(text);
      }
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to read file");
      setFileName(null);
    } finally {
      setFileLoading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onStart({
      search_preferences: {
        positions,
        location: location.trim(),
        posting_hours: parseInt(recency, 10) || undefined,
        work_authorization: visa || undefined,
        experience_years: experience || undefined,
        skip_cache: skipCache || undefined,
        target_companies: targetCompanies.length > 0 ? targetCompanies : undefined,
      },
      resume_text: resumeText.trim(),
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ position: "relative", zIndex: 1 }}>
      <form onSubmit={handleSubmit} className="glass-card p-7 w-full max-w-[560px] space-y-5 glass-animate-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm" style={{ background: "rgba(59,130,246,0.2)", color: "var(--accent-blue)" }}>
              JL
            </div>
            <span className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>JobLenz</span>
            <span className="glass-badge glass-badge-blue px-2 py-0.5 rounded text-[9px]">AI tooling</span>
          </div>
          <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
            Job search intelligence. See why each job fits, not just a score.
          </p>
        </div>

        {/* Resume upload + paste */}
        <div>
          <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>Resume</label>

          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="glass-inner rounded-lg p-4 text-center cursor-pointer transition-all"
            style={{
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: dragOver
                ? "var(--accent-blue)"
                : fileName
                  ? "var(--accent-green)"
                  : "rgba(255,255,255,0.15)",
              background: dragOver ? "rgba(59,130,246,0.05)" : undefined,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md"
              onChange={handleFileInput}
              className="hidden"
            />

            {fileLoading ? (
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="animate-spin w-4 h-4 border-2 rounded-full" style={{ borderColor: "var(--accent-blue)", borderTopColor: "transparent" }} />
                <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>Reading {fileName}...</span>
              </div>
            ) : fileName ? (
              <div className="py-1">
                <div className="flex items-center justify-center gap-1.5">
                  <span style={{ color: "var(--accent-green)" }}>✓</span>
                  <span className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>{fileName}</span>
                </div>
                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                  Click or drop to replace
                </p>
              </div>
            ) : (
              <div className="py-2">
                <p className="text-[12px] font-medium" style={{ color: "var(--text-secondary)" }}>
                  Drop your resume here or click to browse
                </p>
                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                  Accepts .pdf, .txt, .md
                </p>
              </div>
            )}
          </div>

          {fileError && (
            <p className="text-[11px] mt-1.5" style={{ color: "var(--accent-red)" }}>{fileError}</p>
          )}

          {/* Or divider */}
          <div className="flex items-center gap-3 my-2.5">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
            <span className="text-[10px] font-label" style={{ color: "var(--text-muted)" }}>or paste text</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
          </div>

          {/* Text area */}
          <textarea
            rows={5}
            value={resumeText}
            onChange={(e) => { setResumeText(e.target.value); if (!e.target.value) setFileName(null); }}
            placeholder="Paste your resume text here..."
            className="w-full glass-input font-mono text-[11px]"
            style={{ resize: "vertical" }}
          />
        </div>

        {/* Target roles */}
        <div>
          <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>Target roles</label>
          <AutocompleteInput
            value={roles}
            onChange={setRoles}
            suggestions={ROLE_SUGGESTIONS}
            placeholder="ML Engineer, AI Engineer, Data Scientist"
            className="w-full glass-input"
            multiToken
          />
          <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>Comma-separated. Up to 3 roles.</p>
        </div>

        {/* Target companies (optional) */}
        <div>
          <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>
            Companies <span className="font-normal" style={{ color: "var(--text-muted)" }}>(optional)</span>
          </label>

          {/* Chips */}
          {targetCompanies.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {targetCompanies.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium"
                  style={{ background: "rgba(59,130,246,0.15)", color: "var(--accent-blue)", border: "1px solid rgba(59,130,246,0.25)" }}
                >
                  {c}
                  <button
                    type="button"
                    onClick={() => removeCompany(c)}
                    className="hover:opacity-60 ml-0.5 text-[13px] leading-none"
                    style={{ color: "var(--accent-blue)" }}
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Input with autocomplete */}
          <AutocompleteInput
            value={companyInput}
            onChange={setCompanyInput}
            suggestions={COMPANY_SUGGESTIONS.filter((s) => !targetCompanies.includes(s))}
            placeholder="Type a company name and press Enter"
            className="w-full glass-input"
            style={{ fontSize: 12 }}
            onSelect={addCompany}
            onEnter={addCompany}
          />

          {/* Quick-add suggestion chips */}
          {targetCompanies.length < 3 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {COMPANY_SUGGESTIONS.filter((s) => !targetCompanies.includes(s)).slice(0, 8).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addCompany(s)}
                  className="px-2 py-0.5 rounded-lg text-[10px] cursor-pointer transition-colors hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  + {s}
                </button>
              ))}
            </div>
          )}
          <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
            Add specific companies to search. Leave empty to auto-discover.
          </p>
        </div>

        {/* Location + Recency */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-label text-[10px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Location</label>
            <AutocompleteInput
              value={location}
              onChange={setLocation}
              suggestions={LOCATION_SUGGESTIONS}
              placeholder="e.g. San Francisco, CA"
              className="w-full glass-input"
              style={{ fontSize: 12 }}
            />
          </div>
          <div>
            <label className="block font-label text-[10px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Posted within</label>
            <select value={recency} onChange={(e) => setRecency(e.target.value)} className="w-full glass-input" style={{ fontSize: 12 }}>
              {RECENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Visa + Experience */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-label text-[10px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Visa status</label>
            <select value={visa} onChange={(e) => setVisa(e.target.value)} className="w-full glass-input" style={{ fontSize: 12 }}>
              {VISA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-label text-[10px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>Experience level</label>
            <select value={experience} onChange={(e) => setExperience(e.target.value)} className="w-full glass-input" style={{ fontSize: 12 }}>
              {EXP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* What happens next + cache toggle */}
        <div className="glass-inner p-3 space-y-2.5">
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            <strong style={{ color: "var(--text-secondary)" }}>What happens next:</strong> JobLenz searches for up to 10 companies hiring your target roles, dispatches AI agents to scout each career page and enrich jobs with company intel (H-1B data, salary context), then uses Claude to score how well each job fits your profile with full explanations and source attribution.
          </p>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>Skip cache</span>
              <span className="text-[10px] ml-1.5" style={{ color: "var(--text-muted)" }}>Force live scraping</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={skipCache}
              onClick={() => setSkipCache((v) => !v)}
              className="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200"
              style={{
                background: skipCache ? "var(--accent-blue)" : "rgba(255,255,255,0.1)",
                border: "1px solid",
                borderColor: skipCache ? "var(--accent-blue)" : "rgba(255,255,255,0.15)",
              }}
            >
              <span
                className="inline-block h-3.5 w-3.5 rounded-full transition-transform duration-200"
                style={{
                  background: "var(--text-primary)",
                  transform: skipCache ? "translateX(16px)" : "translateX(2px)",
                  marginTop: 2,
                }}
              />
            </button>
          </div>
        </div>

        {/* CTA */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-3 glass-btn glass-btn-primary text-[14px] font-semibold rounded-xl"
        >
          {fileLoading ? "Reading resume..." : "Start scanning"}
        </button>
      </form>
    </div>
  );
}
