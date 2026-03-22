"use client";

import type { CompanyIntel } from "@/lib/types";

interface CompanyIntelPanelProps {
  intel: CompanyIntel;
}

function Unavailable({ label }: { label: string }) {
  return (
    <div className="glass-inner p-3">
      <h4 className="text-xs font-semibold font-label uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </h4>
      <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>
        Data unavailable
      </p>
    </div>
  );
}

export default function CompanyIntelPanel({ intel }: CompanyIntelPanelProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        Company Intelligence
      </h3>

      {intel.h1b.status === "success" && intel.h1b.data ? (
        <div className="glass-inner p-3 space-y-1">
          <h4 className="text-xs font-semibold font-label uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            H-1B Visa Data
          </h4>
          <p className="text-sm" style={{ color: "var(--text-primary)" }}>
            {intel.h1b.data.company_name}
          </p>
          {intel.h1b.data.total_applications != null && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Applications: {intel.h1b.data.total_applications}
              {intel.h1b.data.approval_rate &&
                ` | Approval: ${intel.h1b.data.approval_rate}`}
            </p>
          )}
          {intel.h1b.data.common_titles.length > 0 && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Common titles: {intel.h1b.data.common_titles.join(", ")}
            </p>
          )}
          {intel.h1b.data.salary_range && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Salary range: {intel.h1b.data.salary_range}
            </p>
          )}
        </div>
      ) : (
        <Unavailable label="H-1B Visa Data" />
      )}

      {intel.values.status === "success" && intel.values.data ? (
        <div className="glass-inner p-3 space-y-1">
          <h4 className="text-xs font-semibold font-label uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Company Values
          </h4>
          {intel.values.data.mission_statement && (
            <p className="text-sm italic" style={{ color: "var(--text-secondary)" }}>
              &quot;{intel.values.data.mission_statement}&quot;
            </p>
          )}
          {intel.values.data.stated_values.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {intel.values.data.stated_values.map((v) => (
                <span
                  key={v}
                  className="px-2 py-0.5 text-xs glass-badge glass-badge-blue rounded"
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

      {intel.salary.status === "success" && intel.salary.data ? (
        <div className="glass-inner p-3 space-y-1">
          <h4 className="text-xs font-semibold font-label uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Salary Context
          </h4>
          <p className="text-sm" style={{ color: "var(--text-primary)" }}>
            {intel.salary.data.role_title}
            {intel.salary.data.location &&
              ` — ${intel.salary.data.location}`}
          </p>
          {intel.salary.data.salary_range && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Range: {intel.salary.data.salary_range}
            </p>
          )}
          {intel.salary.data.median_salary && (
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
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
