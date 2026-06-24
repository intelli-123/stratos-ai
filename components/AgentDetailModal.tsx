import { useEffect, useState, useCallback, Fragment } from "react";
import { Agent, Execution, fmtCost, fmtNum, liveStatus } from "@/lib/app";

type Resp = {
  agent: Agent;
  executions: Execution[];
  summary: { count: number; tokens: number; cost: number; avg_latency: number };
};

const RANGES = [{ k: "today", label: "Today" }, { k: "7d", label: "7 days" }, { k: "30d", label: "30 days" }];
const SORTS = [{ k: "recent", label: "Newest" }, { k: "cost_desc", label: "Cost: high → low" }, { k: "cost_asc", label: "Cost: low → high" }];

export default function AgentDetailModal({ agentId, onClose }: { agentId: string; onClose: () => void }) {
  const [range, setRange] = useState("30d");
  const [sort, setSort] = useState("recent");
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/agents/${agentId}?range=${range}&sort=${sort}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setData(j); setErr("");
    } catch (e: any) { setErr(e.message); }
  }, [agentId, range, sort]);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const a = data?.agent;
  const st = a ? liveStatus(a) : "offline";
  const dot = st === "online" ? "dot-green" : st === "degraded" ? "dot-amber" : "dot-red";
  const s = data?.summary;

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal modal-wide">
        <div className="row" style={{ alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h3 style={{ margin: 0 }}>{a?.name || "Agent"}</h3>
              {a && <span className="status"><span className={"dot " + dot} />{st[0].toUpperCase() + st.slice(1)}</span>}
            </div>
            {a && (
              <div className="page-sub" style={{ marginTop: 4 }}>
                <span className="badge">{a.type}</span>{a.env && <> · {a.env}</>}{a.team && <> · team {a.team}</>}
                {a.model && <> · {a.model}</>}{a.last_seen && <> · last seen {new Date(a.last_seen).toLocaleString()}</>}
              </div>
            )}
          </div>
          <div className="spacer" />
          <a className="btn btn-primary" href={`/api/agents/${agentId}?range=${range}&sort=${sort}&format=csv`}>⬇ Export</a>
          <button className="modal-close" onClick={onClose} aria-label="Close" style={{ marginLeft: 8 }}>×</button>
        </div>

        {err ? <div className="empty" style={{ color: "var(--red)" }}>{err}</div>
          : !data ? <div className="empty">Loading…</div>
          : (
          <div className="modal-body">
            <div className="kpis" style={{ margin: "14px 0" }}>
              <div className="kpi"><div className="l">Executions ({range})</div><div className="v">{fmtNum(s!.count)}</div></div>
              <div className="kpi"><div className="l">Tokens</div><div className="v">{fmtNum(s!.tokens)}</div></div>
              <div className="kpi"><div className="l">Cost</div><div className="v">{fmtCost(s!.cost)}</div></div>
              <div className="kpi"><div className="l">Avg latency</div><div className="v">{s!.avg_latency}<span style={{ fontSize: 14, color: "var(--dim)" }}>ms</span></div></div>
            </div>

            <div className="toolbar">
              <div className="seg">{RANGES.map((r) => <button key={r.k} className={range === r.k ? "active" : ""} onClick={() => setRange(r.k)}>{r.label}</button>)}</div>
              <div className="spacer" />
              <div className="seg">{SORTS.map((o) => <button key={o.k} className={sort === o.k ? "active" : ""} onClick={() => setSort(o.k)}>{o.label}</button>)}</div>
            </div>

            {data.executions.length === 0 ? (
              <div className="empty">No activity in this window. Run the agent to see prompts, cost and latency here.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 12 }}>
                    <th style={{ padding: "10px 8px" }}>Time</th>
                    <th style={{ padding: "10px 8px" }}>Prompt</th>
                    <th style={{ padding: "10px 8px" }}>Model</th>
                    <th style={{ padding: "10px 8px", textAlign: "right" }}>Tokens</th>
                    <th style={{ padding: "10px 8px", textAlign: "right" }}>Cost</th>
                    <th style={{ padding: "10px 8px", textAlign: "right" }}>Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {data.executions.map((e) => {
                    const isOpen = open === e.id;
                    const text = e.prompt || "—";
                    return (
                      <Fragment key={e.id}>
                        <tr style={{ borderTop: "1px solid var(--line)", cursor: "pointer" }}
                          onClick={() => setOpen(isOpen ? null : e.id)}>
                          <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }} className="muted">
                            <span style={{ display: "inline-block", width: 12, color: "var(--dim)" }}>{isOpen ? "▾" : "▸"}</span>
                            {e.started_at ? new Date(e.started_at).toLocaleString() : "—"}
                          </td>
                          <td style={{ padding: "10px 8px", maxWidth: 360 }}>
                            <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{text}</div>
                          </td>
                          <td style={{ padding: "10px 8px" }} className="muted">{e.model || "—"}</td>
                          <td style={{ padding: "10px 8px", textAlign: "right" }}>{fmtNum(e.tokens)}</td>
                          <td style={{ padding: "10px 8px", textAlign: "right" }}>{fmtCost(e.cost)}</td>
                          <td style={{ padding: "10px 8px", textAlign: "right" }} className="muted">{e.latency_ms}ms</td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={6} style={{ padding: "0 8px 14px 20px" }}>
                              <div className="exec-detail">
                                {e.prompt && <div className="exec-prompt"><b>Prompt</b><div className="snippet" style={{ marginTop: 4 }}>{e.prompt}</div></div>}
                                <div style={{ margin: "10px 0 6px", color: "var(--muted)", fontSize: 12 }}><b>Execution steps ({e.steps.length})</b></div>
                                {e.steps.map((sp, i) => (
                                  <div key={sp.id || i} className="exec-step">
                                    <div className="exec-step-head">
                                      <span className="badge">{sp.task || "step"}</span>
                                      {sp.model && <span className="muted">{sp.model}</span>}
                                      <span className="spacer" />
                                      <span className="muted">{fmtNum(sp.tokens)} tok · {fmtCost(sp.cost)} · {sp.latency_ms ?? 0}ms</span>
                                    </div>
                                    {sp.prompt && <div className="muted exec-io"><b>↳ in:</b> {sp.prompt}</div>}
                                    {sp.response && <div className="muted exec-io"><b>↳ out:</b> {sp.response}</div>}
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
