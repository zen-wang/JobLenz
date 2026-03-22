"use client";

import { useState } from "react";

interface CompanyInputProps {
  onSubmit: (data: {
    company_url: string;
    role_query: string;
    resume_text: string;
  }) => void;
  disabled: boolean;
}

export default function CompanyInput({ onSubmit, disabled }: CompanyInputProps) {
  const [companyUrl, setCompanyUrl] = useState("");
  const [roleQuery, setRoleQuery] = useState("");
  const [resumeText, setResumeText] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyUrl.trim() || !roleQuery.trim() || !resumeText.trim()) return;
    onSubmit({
      company_url: companyUrl.trim(),
      role_query: roleQuery.trim(),
      resume_text: resumeText.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="company-url"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Company Careers URL
          </label>
          <input
            id="company-url"
            type="text"
            placeholder="https://anthropic.com/careers"
            value={companyUrl}
            onChange={(e) => setCompanyUrl(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>
        <div>
          <label
            htmlFor="role-query"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Role Query
          </label>
          <input
            id="role-query"
            type="text"
            placeholder="machine learning engineer"
            value={roleQuery}
            onChange={(e) => setRoleQuery(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="resume-text"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Resume (paste text)
        </label>
        <textarea
          id="resume-text"
          rows={6}
          placeholder="Paste your resume text here..."
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 resize-y"
        />
      </div>

      <button
        type="submit"
        disabled={
          disabled ||
          !companyUrl.trim() ||
          !roleQuery.trim() ||
          !resumeText.trim()
        }
        className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {disabled ? "Analyzing..." : "Analyze"}
      </button>
    </form>
  );
}
