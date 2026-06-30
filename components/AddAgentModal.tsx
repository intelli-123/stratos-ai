import { useEffect, useState } from "react";
import { Agent, AgentType, APP_NAME, EnrollStep } from "@/lib/app";
import Snippet from "@/components/Snippet";

type Enroll = { token: string; enroll_url: string; steps: EnrollStep[]; snippet: string };

export default function AddAgentModal(
  { mode, agent, onClose, onSaved }:
  { mode: "add" | "edit" | "onboard"; agent?: Agent | null; onClose: () => void; onSaved: () => void }
) {
  const [f, setF] = useState<Partial<Agent>>(agent || { type: "agent", env: "prod" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [enroll, setEnroll] = useState<Enroll | null>(null);
  const set = (k: keyof Agent, v: any) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (mode === "onboard" && agent?.id) {
      setBusy(true);
      setErr("");
      fetch(`/api/agents/${agent.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.enroll) {
            setEnroll(data.enroll);
          } else {
            setErr("No onboarding details found for this agent.");
          }
        })
        .catch((err) => setErr(err.message))
        .finally(() => setBusy(false));
    }
  }, [mode, agent]);

  async function save() {
    if (
      !f.name || 
      !f.description || 
      !f.type || 
      !f.env || 
      !f.team || 
      f.cost_budget === null ||
      f.cost_budget === undefined
    ) {
      setErr("Please fill name, description, type, environment, team and budget.");
      return;
    }
    setBusy(true); setErr("");
    try {
      if (mode === "add") {
        const r = await fetch("/api/agents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed");
        setEnroll(j.enroll);          // show the enrollment link/snippet
      } else {
        const r = await fetch(`/api/agents/${agent!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed");
        onSaved(); onClose();
      }
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        {!enroll ? (
          mode === "onboard" ? (
            <>
              <h3>Loading onboarding details...</h3>
              {err && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 8 }}>{err}</div>}
              <div className="row">
                <div className="spacer" />
                <button className="btn" onClick={onClose}>Close</button>
              </div>
            </>
          ) : (
            <>
              <h3>{mode === "add" ? "Add agent" : "Edit agent"}</h3>
              <div className="field"><label>Name *</label><input value={f.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="e.g. billing-agent" /></div>
              <div className="field"><label>Description *</label><input value={f.description || ""} onChange={(e) => set("description", e.target.value)} /></div>
            <div className="row">
              <div className="field" style={{ flex: 1 }}><label>Type *</label>
                <select value={f.type} onChange={(e) => set("type", e.target.value as AgentType)}>
                  <option value="agent">agent</option><option value="mcp">mcp</option>
                </select></div>
              <div className="field" style={{ flex: 1 }}><label>Environment *</label><input value={f.env || ""} onChange={(e) => set("env", e.target.value)} placeholder="prod" /></div>
            </div>
            <div className="row">
              <div className="field" style={{ flex: 1 }}><label>Team *</label><input value={f.team || ""} onChange={(e) => set("team", e.target.value)} /></div>
              <div className="field" style={{ flex: 1 }}><label>Cost budget (USD/mo) *</label><input type="number" value={f.cost_budget ?? ""} onChange={(e) => set("cost_budget", e.target.value === "" ? null : Number(e.target.value))} /></div>
            </div>
            <div className="field">
              <label>Model &amp; Framework</label>
              <div className="muted" style={{ fontSize: 12, padding: "6px 0" }}>
                ✨ Auto-detected by the SDK once the agent connects — no need to enter them.
              </div>
            </div>
            {err && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 8 }}>{err}</div>}
            <div className="row">
              <div className="spacer" />
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? "Saving…" : mode === "add" ? "Create & get link" : "Save"}</button>
            </div>
          </>
        )) : (
          <>
            <h3>Connect “{f.name}”</h3>
            <p className="muted">Share these steps with the agent owner — installing the SDK streams telemetry into {APP_NAME}. The agent appears once it reports in.</p>
            <Snippet title="Onboarding link" code={enroll.enroll_url} />
            {enroll.steps.map((s, i) => <Snippet key={i} title={s.title} code={s.code} />)}
            <div className="row"><div className="spacer" /><button className="btn btn-primary" onClick={() => { onSaved(); onClose(); }}>Done</button></div>
          </>
        )}
      </div>
    </div>
  );
}
