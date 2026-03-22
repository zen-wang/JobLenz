"use client";

import type { CompanyIntel } from "@/lib/types";

interface CompanyIntelPanelProps {
  intel: CompanyIntel;
}

function Unavailable({ label }: { label: string }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </h4>
      <p className="text-sm text-gray-400 italic">
        Data unavailable — agent did not return data
      </p>
    </div>
  );
}

export default function CompanyIntelPanel({ intel }: CompanyIntelPanelProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">
        Company Intelligence
      </h3>

      {/* H-1B */}
      {intel.h1b.status === "success" && intel.h1b.data ? (
        <div className="border border-gray-200 rounded-lg p-3 space-y-1">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            H-1B Visa Data
          </h4>
          <p className="text-sm text-gray-900">
            {intel.h1b.data.company_name}
          </p>
          {intel.h1b.data.total_applications != null && (
            <p className="text-xs text-gray-600">
              Applications: {intel.h1b.data.total_applications}
              {intel.h1b.data.approval_rate &&
                ` | Approval: ${intel.h1b.data.approval_rate}`}
            </p>
          )}
          {intel.h1b.data.common_titles.length > 0 && (
            <p className="text-xs text-gray-600">
              Common titles: {intel.h1b.data.common_titles.join(", ")}
            </p>
          )}
          {intel.h1b.data.salary_range && (
            <p className="text-xs text-gray-600">
              Salary range: {intel.h1b.data.salary_range}
            </p>
          )}
        </div>
      ) : (
        <Unavailable label="H-1B Visa Data" />
      )}

      {/* Values */}
      {intel.values.status === "success" && intel.values.data ? (
        <div className="border border-gray-200 rounded-lg p-3 space-y-1">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Company Values
          </h4>
          {intel.values.data.mission_statement && (
            <p className="text-sm text-gray-900 italic">
              &quot;{intel.values.data.mission_statement}&quot;
            </p>
          )}
          {intel.values.data.stated_values.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {intel.values.data.stated_values.map((v) => (
                <span
                  key={v}
                  className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 rounded"
                >
                  {v}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Unavailable label="Company Values" />
      )}

      {/* Salary */}
      {intel.salary.status === "success" && intel.salary.data ? (
        <div className="border border-gray-200 rounded-lg p-3 space-y-1">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Salary Context
          </h4>
          <p className="text-sm text-gray-900">
            {intel.salary.data.role_title}
            {intel.salary.data.location &&
              ` — ${intel.salary.data.location}`}
          </p>
          {intel.salary.data.salary_range && (
            <p className="text-xs text-gray-600">
              Range: {intel.salary.data.salary_range}
            </p>
          )}
          {intel.salary.data.median_salary && (
            <p className="text-xs text-gray-600">
              Median: {intel.salary.data.median_salary}
            </p>
          )}
        </div>
      ) : (
        <Unavailable label="Salary Context" />
      )}
    </div>
  );
}
