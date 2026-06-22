import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Agent, AgentQuery, fmtCost, fmtNum, LIVENESS_MS } from "@/lib/app";

type Resp = {
  agent: Agent;
  queries: (AgentQuery & { prompt?: string; response?: string; model?: string; task?: string })[];
  summary: { count: number; tokens: number; cost: number; avg_latency: number };
};

const RANGES = [
  { k: "today", label: "Today" },
  { k: "7d", label: "7 days" },
  { k: "30d", label: "30 days" },
];
const SORTS = [
  { k: "recent", label: "Newest" },
  { k: "cost_desc", label: "Cost: high → low" },
  { k: "cost_asc", label: "Cost: low → high" },
];

function liveStatus(a: Agent): "online" | "offline" | "degraded" {
  if (a.status === "degraded") return "degraded";
  if (a.last_seen) return Date.now() - new Date(a.last_seen).getTime() < LIVENESS_MS ? "online" : "offline";
  return (a.status as any) === "online" ? "online" : "offline";
}

export default function AgentDetail() {
  const { query } = useRouter();
  const id = query.id as string | undefined;
  const [range, setRange] = useState("30d");
  const [sort, setSort] = useState("recent");
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await fetch(`/api/agents/${id}?range=${range}&sort=${sort}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setData(j); setErr("");
    } catch (e: any) { setErr(e.message); }
  }, [id, range, sort]);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  if (err) return <div className="empty" style={{ color: "var(--red)" }}>{err}</div>;
  if (!data) return <div className="empty">Loading…</div>;

  const a = data.agent;
  const st = liveStatus(a);
  const dot = st === "online" ? "dot-green" : st === "degraded" ? "dot-amber" : "dot-red";
  const s = data.summary;

  return (
    <>
      <div className="row">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 className="page-title" style={{ margin: 0 }}>{a.name}</h1>
            <span className="status"><span className={"dot " + dot} />{st[0].toUpperCase() + st.slice(1)}</span>
          </div>
          <div className="page-sub">
            <span className="badge">{a.type}</span>{a.env && <> · {a.env}</>}{a.team && <> · team {a.team}</>}
            {a.model && <> · model {a.model}</>}{a.framework && <> · {a.framework}</>}
            {a.last_seen && <> · last seen {new Date(a.last_seen).toLocaleString()}</>}
          </div>
        </div>
        <div className="spacer" />
        <Link href="/agents" className="btn">← Agents</Link>
        <a className="btn btn-primary" href={`/api/agents/${id}?range=${range}&sort=${sort}&format=csv`}>⬇ Export report</a>
      </div>

      <div className="kpis" style={{ marginTop: 14 }}>
        <div className="kpi"><div className="l">Queries ({range})</div><div className="v">{fmtNum(s.count)}</div></div>
        <div className="kpi"><div className="l">Tokens</div><div className="v">{fmtNum(s.tokens)}</div></div>
        <div className="kpi"><div className="l">Cost</div><div className="v">{fmtCost(s.cost)}</div></div>
        <div className="kpi"><div className="l">Avg latency</div><div className="v">{s.avg_latency}<span style={{ fontSize: 14, color: "var(--dim)" }}>ms</span></div></div>
      </div>

      <div className="toolbar" style={{ marginTop: 16 }}>
        <div className="seg">
          {RANGES.map((r) => <button key={r.k} className={range === r.k ? "active" : ""} onClick={() => setRange(r.k)}>{r.label}</button>)}
        </div>
        <div className="spacer" />
        <div className="seg">
          {SORTS.map((o) => <button key={o.k} className={sort === o.k ? "active" : ""} onClick={() => setSort(o.k)}>{o.label}</button>)}
        </div>
      </div>

      {data.queries.length === 0 ? (
        <div className="empty">No activity in this window. Run the agent to see prompts, cost and latency here.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 12 }}>
                <th style={{ padding: "10px 12px" }}>Time</th>
                <th style={{ padding: "10px 12px" }}>Prompt</th>
                <th style={{ padding: "10px 12px" }}>Model</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Tokens</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Cost</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Latency</th>
              </tr>
            </thead>
            <tbody>
              {data.queries.map((r) => {
                const isOpen = open === r.id;
                const text = r.prompt || (r.task ? `(${r.task})` : "—");
                return (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--line)", cursor: r.prompt || r.response ? "pointer" : "default" }}
                    onClick={() => (r.prompt || r.response) && setOpen(isOpen ? null : r.id)}>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }} className="muted">{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</td>
                    <td style={{ padding: "10px 12px", maxWidth: 420 }}>
                      <div style={{ whiteSpace: isOpen ? "pre-wrap" : "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{text}</div>
                      {isOpen && r.response && <div className="muted" style={{ marginTop: 6, whiteSpace: "pre-wrap", borderTop: "1px dashed var(--line)", paddingTop: 6 }}><b>↳ response:</b> {r.response}</div>}
                    </td>
                    <td style={{ padding: "10px 12px" }} className="muted">{r.model || "—"}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmtNum(r.tokens)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>{fmtCost(r.cost)}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }} className="muted">{r.latency_ms ?? 0}ms</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
