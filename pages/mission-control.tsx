import { useEffect, useState } from "react";
import { Agent, DailyPoint, AgentSpend, fmtCost, fmtNum, LIVENESS_MS } from "@/lib/app";
import { VBars, HBars } from "@/components/Charts";

export default function MissionControl() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [byAgent, setByAgent] = useState<AgentSpend[]>([]);
  useEffect(() => {
    const load = async () => {
      const [a, m] = await Promise.all([
        fetch("/api/agents").then((r) => r.json()).catch(() => ({})),
        fetch("/api/metrics").then((r) => r.json()).catch(() => ({})),
      ]);
      setAgents(a.agents || []);
      setDaily(m.daily || []);
      setByAgent(m.byAgent || []);
    };
    load(); const t = setInterval(load, 15000); return () => clearInterval(t);
  }, []);
  const online = agents.filter((a) => a.last_seen && Date.now() - new Date(a.last_seen).getTime() < LIVENESS_MS).length;
  const tokens = agents.reduce((s, a) => s + (a.tokens || 0), 0);
  const cost = agents.reduce((s, a) => s + (a.cost || 0), 0);
  const queries = agents.reduce((s, a) => s + (a.queries || 0), 0);
  const weekSpend = daily.reduce((s, d) => s + d.cost, 0);
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

      <div className="chart-grid">
        <div className="card">
          <div className="chart-head"><h3>Daily spend</h3><span className="muted">{fmtCost(weekSpend)} · 7d</span></div>
          <VBars data={daily} />
        </div>
        <div className="card">
          <div className="chart-head"><h3>Spend by agent</h3><span className="muted">est. USD</span></div>
          <HBars data={byAgent} />
        </div>
      </div>
    </>
  );
}
