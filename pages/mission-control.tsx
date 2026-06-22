import { useEffect, useState } from "react";
import { Agent, fmtCost, fmtNum, LIVENESS_MS } from "@/lib/app";
export default function MissionControl() {
  const [agents, setAgents] = useState<Agent[]>([]);
  useEffect(() => {
    const load = async () => { const r = await fetch("/api/agents"); const j = await r.json(); setAgents(j.agents || []); };
    load(); const t = setInterval(load, 15000); return () => clearInterval(t);
  }, []);
  const online = agents.filter((a) => a.last_seen && Date.now() - new Date(a.last_seen).getTime() < LIVENESS_MS).length;
  const tokens = agents.reduce((s, a) => s + (a.tokens || 0), 0);
  const cost = agents.reduce((s, a) => s + (a.cost || 0), 0);
  const queries = agents.reduce((s, a) => s + (a.queries || 0), 0);
  return (
    <>
      <h1 className="page-title">Mission Control</h1>
      <div className="page-sub">Live overview across local, MCP and remote runtimes</div>
      <div className="kpis">
        <div className="kpi"><div className="l">Agents online</div><div className="v">{online}<span style={{ fontSize: 16, color: "var(--dim)" }}>/{agents.length}</span></div></div>
        <div className="kpi"><div className="l">Total tokens</div><div className="v">{fmtNum(tokens)}</div></div>
        <div className="kpi"><div className="l">Total spend</div><div className="v">{fmtCost(cost)}</div></div>
        <div className="kpi"><div className="l">Queries</div><div className="v">{fmtNum(queries)}</div></div>
      </div>
    </>
  );
}
