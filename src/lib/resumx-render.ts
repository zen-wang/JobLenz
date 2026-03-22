/**
 * Renders Resumx markdown into a self-contained HTML string
 * styled as a one-page resume with fixed layout.
 */

interface ResumxFrontmatter {
  pages?: number;
  vars?: Record<string, string>;
}

function parseFrontmatter(md: string): { frontmatter: ResumxFrontmatter; body: string } {
  const fmMatch = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!fmMatch) return { frontmatter: {}, body: md };

  const fmBlock = fmMatch[1];
  const body = fmMatch[2];
  const frontmatter: ResumxFrontmatter = {};

  // Simple YAML parsing for pages and vars
  for (const line of fmBlock.split("\n")) {
    const pagesMatch = line.match(/^pages:\s*(\d+)/);
    if (pagesMatch) frontmatter.pages = parseInt(pagesMatch[1], 10);
  }

  // Parse vars block
  const varsMatch = fmBlock.match(/vars:\s*\n((?:\s+\w+:.*\n?)*)/);
  if (varsMatch) {
    frontmatter.vars = {};
    for (const vline of varsMatch[1].split("\n")) {
      const kv = vline.match(/^\s+(\w+):\s*(.+)/);
      if (kv) frontmatter.vars[kv[1]] = kv[2].trim();
    }
  }

  return { frontmatter, body };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineFormat(text: string): string {
  let result = escapeHtml(text);
  // Bold
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic with underscore
  result = result.replace(/_([^_]+)_/g, "<em>$1</em>");
  // Backtick code
  result = result.replace(/`([^`]+)`/g, '<span class="tech">$1</span>');
  // Links [text](url)
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2">$1</a>',
  );
  return result;
}

export function renderResumxToHtml(markdown: string): string {
  const { frontmatter, body } = parseFrontmatter(markdown);

  // Apply vars (e.g., {{ tagline }})
  let processedBody = body;
  if (frontmatter.vars) {
    for (const [key, val] of Object.entries(frontmatter.vars)) {
      processedBody = processedBody.replace(
        new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"),
        val,
      );
    }
  }

  const lines = processedBody.split("\n");
  const htmlParts: string[] = [];
  let inList = false;
  let inDefList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      if (inList) { htmlParts.push("</ul>"); inList = false; }
      if (inDefList) { htmlParts.push("</dl>"); inDefList = false; }
      continue;
    }

    // H1 — Name
    if (trimmed.startsWith("# ") && !trimmed.startsWith("## ")) {
      const name = trimmed.slice(2).trim();
      htmlParts.push(`<h1>${escapeHtml(name)}</h1>`);
      continue;
    }

    // H2 — Section
    if (trimmed.startsWith("## ")) {
      if (inList) { htmlParts.push("</ul>"); inList = false; }
      if (inDefList) { htmlParts.push("</dl>"); inDefList = false; }
      const section = trimmed.slice(3).trim();
      htmlParts.push(`<h2>${escapeHtml(section)}</h2>`);
      continue;
    }

    // H3 — Entry with optional || date
    if (trimmed.startsWith("### ")) {
      if (inList) { htmlParts.push("</ul>"); inList = false; }
      if (inDefList) { htmlParts.push("</dl>"); inDefList = false; }
      const raw = trimmed.slice(4).trim();
      if (raw.includes("||")) {
        const [left, right] = raw.split("||").map((s) => s.trim());
        htmlParts.push(
          `<h3><span>${inlineFormat(left)}</span><span class="date">${escapeHtml(right)}</span></h3>`,
        );
      } else {
        htmlParts.push(`<h3>${inlineFormat(raw)}</h3>`);
      }
      continue;
    }

    // Contact line (pipe-delimited, right after H1)
    if (trimmed.includes(" | ") && trimmed.includes("[")) {
      htmlParts.push(`<div class="contact">${inlineFormat(trimmed)}</div>`);
      continue;
    }

    // Tagline line ({{ tagline }} already replaced)
    if (
      htmlParts.length > 0 &&
      !trimmed.startsWith("-") &&
      !trimmed.startsWith(":") &&
      !trimmed.startsWith("#") &&
      htmlParts[htmlParts.length - 1]?.includes("contact")
    ) {
      htmlParts.push(`<div class="tagline">${inlineFormat(trimmed)}</div>`);
      continue;
    }

    // Definition list (Category\n: items)
    if (trimmed.startsWith(": ")) {
      if (!inDefList) { htmlParts.push("<dl>"); inDefList = true; }
      htmlParts.push(`<dd>${inlineFormat(trimmed.slice(2).trim())}</dd>`);
      continue;
    }

    // Check if next line starts with ": " — this line is a dt
    if (i + 1 < lines.length && lines[i + 1].trim().startsWith(": ")) {
      if (!inDefList) { htmlParts.push("<dl>"); inDefList = true; }
      htmlParts.push(`<dt>${escapeHtml(trimmed)}</dt>`);
      continue;
    }

    // Bullet
    if (trimmed.startsWith("- ")) {
      if (!inList) { htmlParts.push("<ul>"); inList = true; }
      htmlParts.push(`<li>${inlineFormat(trimmed.slice(2).trim())}</li>`);
      continue;
    }

    // Italic line (job title)
    if (trimmed.startsWith("_") && trimmed.endsWith("_")) {
      htmlParts.push(`<p class="role">${inlineFormat(trimmed)}</p>`);
      continue;
    }

    // Fallback paragraph
    htmlParts.push(`<p>${inlineFormat(trimmed)}</p>`);
  }

  if (inList) htmlParts.push("</ul>");
  if (inDefList) htmlParts.push("</dl>");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Resume</title>
<style>
  @page {
    size: letter;
    margin: 0.5in 0.6in;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.35;
    color: #1a1a1a;
    max-width: 7.5in;
    margin: 0 auto;
    padding: 0.5in 0.6in;
  }
  @media print {
    body { padding: 0; }
  }
  h1 {
    font-size: 20pt;
    font-weight: 700;
    text-align: center;
    margin-bottom: 2pt;
    letter-spacing: 0.5pt;
  }
  .contact {
    text-align: center;
    font-size: 9pt;
    color: #444;
    margin-bottom: 2pt;
  }
  .contact a { color: #444; text-decoration: none; }
  .contact a:hover { text-decoration: underline; }
  .tagline {
    text-align: center;
    font-size: 9.5pt;
    font-style: italic;
    color: #555;
    margin-bottom: 8pt;
  }
  h2 {
    font-size: 10.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1pt;
    border-bottom: 1.5pt solid #1a1a1a;
    padding-bottom: 1pt;
    margin-top: 8pt;
    margin-bottom: 4pt;
  }
  h3 {
    font-size: 10pt;
    font-weight: 700;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-top: 5pt;
    margin-bottom: 1pt;
  }
  h3 .date {
    font-weight: 400;
    font-size: 9pt;
    color: #555;
    white-space: nowrap;
  }
  .role {
    font-style: italic;
    font-size: 9.5pt;
    color: #333;
    margin-bottom: 2pt;
  }
  ul {
    list-style: none;
    padding-left: 0;
    margin-bottom: 2pt;
  }
  li {
    padding-left: 12pt;
    text-indent: -10pt;
    margin-bottom: 1pt;
    font-size: 9.5pt;
  }
  li::before {
    content: "\\2022";
    color: #555;
    margin-right: 5pt;
  }
  .tech {
    font-family: 'Menlo', 'Consolas', monospace;
    font-size: 8.5pt;
    background: #f3f4f6;
    padding: 0 2pt;
    border-radius: 2pt;
  }
  @media print { .tech { background: none; } }
  dl {
    margin-bottom: 2pt;
  }
  dt {
    font-weight: 700;
    font-size: 9.5pt;
    margin-top: 2pt;
  }
  dd {
    font-size: 9.5pt;
    padding-left: 4pt;
  }
  p { margin-bottom: 2pt; font-size: 9.5pt; }
  a { color: #2563eb; text-decoration: none; }
</style>
</head>
<body>
${htmlParts.join("\n")}
</body>
</html>`;
}
