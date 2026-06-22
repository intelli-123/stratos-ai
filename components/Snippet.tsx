import { useState } from "react";

// A code/command block with a copy button. Used for onboarding steps.
export default function Snippet({ code, title }: { code: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true); setTimeout(() => setCopied(false), 1400);
    } catch {/* clipboard blocked — ignore */}
  }
  return (
    <div className="field" style={{ marginBottom: 12 }}>
      {title && <label>{title}</label>}
      <div className="snippet-wrap">
        <pre className="snippet" style={{ margin: 0 }}>{code}</pre>
        <button className="copy-btn" onClick={copy} aria-label="Copy">{copied ? "✓ Copied" : "⧉ Copy"}</button>
      </div>
    </div>
  );
}
