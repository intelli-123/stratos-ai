import { useEffect, useState } from "react";
import { Agent, APP_NAME, LIVENESS_MS } from "@/lib/app";
import AddAgentModal from "@/components/AddAgentModal";

// Onboarding hub: explains zero-code enrollment, lists agents AWAITING their
// first telemetry separately from CONNECTED ones. "Add agent" mints a
// token + install snippet; the agent only joins the fleet once it reports in.
export default function Onboarding() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [pending, setPending] = useState<Agent[]>([]);
  const [err, setErr] = useState("");
  const [adding, setAdding] = useState(false);

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

  const liveLabel = (a: Agent) =>
    a.last_seen && Date.now() - new Date(a.last_seen).getTime() < LIVENESS_MS ? "online" : "offline";

  return (
    <>
      <div className="toolbar">
        <div>
          <h1 className="page-title">Onboarding</h1>
          <div className="page-sub">Connect any agent to {APP_NAME} with OpenLLMetry — no code changes beyond initialization. An agent joins the fleet only after it reports its first telemetry.</div>
        </div>
        <div className="spacer" />
        <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Add agent</button>
      </div>

      {err && <div className="empty" style={{ color: "var(--red)" }}>{err}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>How it works</h3>
        <ol className="muted" style={{ lineHeight: 1.9, margin: 0, paddingLeft: 18 }}>
          <li><b style={{ color: "var(--text)" }}>Add agent</b> → {APP_NAME} mints an enrollment token and a connect link. The agent is <b>not</b> shown in the fleet yet.</li>
          <li>Share the link with the agent owner. They install <code>@traceloop/node-server-sdk</code> and initialize it with the token.</li>
          <li>On its first reported trace the agent moves to <b style={{ color: "var(--green)" }}>Connected</b> with live tokens, cost and tools — and goes <b>offline</b> automatically if it stops reporting.</li>
        </ol>
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
              </tr>
            </thead>
            <tbody>
              {pending.map((a) => (
                <tr key={a.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: "8px" }}>{a.name} <span className="badge" style={{ marginLeft: 6 }}>pending</span></td>
                  <td style={{ padding: "8px" }}><span className="badge">{a.type}</span></td>
                  <td style={{ padding: "8px" }} className="muted">{a.cost_budget != null ? `$${a.cost_budget}` : "—"}</td>
                  <td style={{ padding: "8px" }} className="muted">{a.created_at ? new Date(a.created_at).toLocaleString() : "—"}</td>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {adding && <AddAgentModal mode="add" onClose={() => setAdding(false)} onSaved={load} />}
    </>
  );
}
