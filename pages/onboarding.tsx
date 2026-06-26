import { useEffect, useState } from "react";
import { Agent, APP_NAME, LIVENESS_MS, SDK_PACKAGE, stepsFor } from "@/lib/app";
import AddAgentModal from "@/components/AddAgentModal";
import Snippet from "@/components/Snippet";

// Onboarding hub: explains SDK enrollment, lists agents AWAITING their first
// telemetry separately from CONNECTED ones, and allows deleting either.
export default function Onboarding() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [pending, setPending] = useState<Agent[]>([]);
  const [err, setErr] = useState("");
  const [adding, setAdding] = useState(false);
  const [onboardAgent, setOnboardAgent] = useState<Agent | null>(null);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"agent" | "mcp">("agent");
  // Use the domain the dashboard is actually served from (dynamic), not a hardcode.
  const previewBase = (typeof window !== "undefined" ? window.location.origin : "") || "http://localhost:4000";

  async function load() {
    try {
      const r = await fetch("/api/agents");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setAgents(j.agents || []);
      setPending(j.pending || []);
      setErr("");
    } catch (e: any) { setErr(e.message); }
  }
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);

  async function del(a: Agent) {
    if (!confirm(`Delete agent "${a.name}"? This removes the agent, its enrollment token and all recorded queries. This cannot be undone.`)) return;
    setBusy(a.id);
    try {
      const r = await fetch(`/api/agents/${a.id}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Delete failed");
      await load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  const liveLabel = (a: Agent) =>
    a.last_seen && Date.now() - new Date(a.last_seen).getTime() < LIVENESS_MS ? "online" : "offline";

  const DeleteBtn = ({ a }: { a: Agent }) => (
    <button className="btn btn-danger" style={{ padding: "4px 8px", fontSize: "11px" }} disabled={busy === a.id} onClick={() => del(a)}>
      {busy === a.id ? "Deleting…" : "Delete"}
    </button>
  );

  return (
    <>
      <div className="toolbar">
        <div>
          <h1 className="page-title">Onboarding</h1>
          <div className="page-sub">Connect any agent to {APP_NAME} with the <code>{SDK_PACKAGE}</code> SDK. An agent joins the fleet only after it reports its first telemetry.</div>
        </div>
        <div className="spacer" />
        <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Add agent</button>
      </div>

      {err && <div className="empty" style={{ color: "var(--red)" }}>{err}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="toolbar" style={{ marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>How it works</h3>
          <div className="spacer" />
          <div className="seg">
            <button className={previewType === "agent" ? "active" : ""} onClick={() => setPreviewType("agent")}>Agent</button>
            <button className={previewType === "mcp" ? "active" : ""} onClick={() => setPreviewType("mcp")}>MCP</button>
          </div>
        </div>
        {previewType === "agent" ? (
          <ol className="muted" style={{ lineHeight: 1.9, margin: "0 0 12px", paddingLeft: 18 }}>
            <li><b style={{ color: "var(--text)" }}>Add agent</b> → {APP_NAME} mints an enrollment token + connect link. The agent is <b>not</b> shown in the fleet yet.</li>
            <li>The agent owner installs <code>{SDK_PACKAGE}</code>, sets <code>STRATOS_TOKEN</code> in their env, and runs with <code>--import {SDK_PACKAGE}/register</code>.</li>
            <li>On its first reported trace the agent moves to <b style={{ color: "var(--green)" }}>Connected</b> with live tokens, cost, prompts and tools — and goes <b>offline</b> automatically if it stops reporting.</li>
          </ol>
        ) : (
          <ol className="muted" style={{ lineHeight: 1.9, margin: "0 0 12px", paddingLeft: 18 }}>
            <li><b style={{ color: "var(--text)" }}>Add agent</b> (type <b>mcp</b>) → {APP_NAME} mints a token.</li>
            <li>Wrap the MCP server with <code>stratos-mcp-proxy</code> in your host config (Claude Desktop / Cursor / VS Code / Claude Code), then restart the host.</li>
            <li>Its <b>tool calls</b> + liveness stream into {APP_NAME}. The LLM runs inside the host, so tokens/cost aren't captured.</li>
          </ol>
        )}
        <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
          Config preview — replace the placeholders, or open a specific agent's connect link for real values:
        </div>
        {stepsFor(previewType, "<agent-name>", previewBase, "<token>").map((s, i) => <Snippet key={i} title={s.title} code={s.code} />)}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Awaiting connection <span className="muted">({pending.length})</span></h3>
        {pending.length === 0 ? (
          <div className="muted">Nothing pending. Add an agent to generate a connect link.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 12 }}>
                <th style={{ padding: "6px 8px" }}>Agent</th>
                <th style={{ padding: "6px 8px" }}>Type</th>
                <th style={{ padding: "6px 8px" }}>Budget</th>
                <th style={{ padding: "6px 8px" }}>Created</th>
                <th style={{ padding: "6px 8px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((a) => (
                <tr key={a.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: "8px" }}>
                    <span 
                      style={{ cursor: "pointer", color: "var(--accent)", fontWeight: 600, transition: "color 0.2s" }}
                      onClick={() => setOnboardAgent(a)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "var(--accent2)";
                        e.currentTarget.style.textDecoration = "underline";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--accent)";
                        e.currentTarget.style.textDecoration = "none";
                      }}
                    >
                      {a.name}
                    </span>
                    <span className="badge" style={{ marginLeft: 6 }}>pending</span>
                  </td>
                  <td style={{ padding: "8px" }}><span className="badge">{a.type}</span></td>
                  <td style={{ padding: "8px" }} className="muted">{a.cost_budget != null ? `$${a.cost_budget}` : "—"}</td>
                  <td style={{ padding: "8px" }} className="muted">{a.created_at ? new Date(a.created_at).toLocaleString() : "—"}</td>
                  <td style={{ padding: "8px", textAlign: "right" }}>
                    <button className="btn" style={{ marginRight: 6, padding: "4px 8px", fontSize: "11px" }} onClick={() => setEditAgent(a)}>Edit</button>
                    <DeleteBtn a={a} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Connected <span className="muted">({agents.length})</span></h3>
        {agents.length === 0 ? (
          <div className="muted">No connected agents yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 12 }}>
                <th style={{ padding: "6px 8px" }}>Agent</th>
                <th style={{ padding: "6px 8px" }}>Type</th>
                <th style={{ padding: "6px 8px" }}>Status</th>
                <th style={{ padding: "6px 8px" }}>Last seen</th>
                <th style={{ padding: "6px 8px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => {
                const live = liveLabel(a);
                return (
                  <tr key={a.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ padding: "8px" }}>{a.name}</td>
                    <td style={{ padding: "8px" }}><span className="badge">{a.type}</span></td>
                    <td style={{ padding: "8px" }}>
                      <span className="status"><span className={"dot " + (live === "online" ? "dot-green" : "dot-red")} />{live}</span>
                    </td>
                    <td style={{ padding: "8px" }} className="muted">{a.last_seen ? new Date(a.last_seen).toLocaleString() : "—"}</td>
                    <td style={{ padding: "8px", textAlign: "right" }}>
                      <button className="btn" style={{ marginRight: 6, padding: "4px 8px", fontSize: "11px" }} onClick={() => setEditAgent(a)}>Edit</button>
                      <DeleteBtn a={a} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {adding && <AddAgentModal mode="add" onClose={() => setAdding(false)} onSaved={load} />}
      {onboardAgent && <AddAgentModal mode="onboard" agent={onboardAgent} onClose={() => setOnboardAgent(null)} onSaved={load} />}
      {editAgent && <AddAgentModal mode="edit" agent={editAgent} onClose={() => setEditAgent(null)} onSaved={load} />}
    </>
  );
}
