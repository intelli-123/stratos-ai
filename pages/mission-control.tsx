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

  // Compute dynamic tooltips
  const onlineAgentsList = agents.filter(a => a.last_seen && (Date.now() - new Date(a.last_seen).getTime() < LIVENESS_MS));
  const offlineAgentsList = agents.filter(a => !(a.last_seen && (Date.now() - new Date(a.last_seen).getTime() < LIVENESS_MS)));
  
  let onlineStatusText = "Active Agents:\n";
  if (onlineAgentsList.length > 0) {
    onlineStatusText += "● Online:\n" + onlineAgentsList.map(a => `  - ${a.name} (${a.type}${a.model ? `, ${a.model}` : ""})`).join("\n") + "\n\n";
  } else {
    onlineStatusText += "● Online:\n  - None\n\n";
  }
  if (offlineAgentsList.length > 0) {
    onlineStatusText += "○ Offline:\n" + offlineAgentsList.map(a => `  - ${a.name} (${a.type})`).join("\n");
  } else {
    onlineStatusText += "○ Offline:\n  - None";
  }

  const sortedByTokens = [...agents].sort((a, b) => (b.tokens || 0) - (a.tokens || 0));
  const tokensText = "Token Consumption by Agent:\n" + sortedByTokens.map(a => {
    const share = tokens > 0 ? Math.round(((a.tokens || 0) / tokens) * 100) : 0;
    return `  - ${a.name}: ${fmtNum(a.tokens)} (${share}%)`;
  }).join("\n");

  const sortedByCost = [...agents].sort((a, b) => (b.cost || 0) - (a.cost || 0));
  const costText = "Cost Breakdown by Agent:\n" + sortedByCost.map(a => {
    const share = cost > 0 ? Math.round(((a.cost || 0) / cost) * 100) : 0;
    return `  - ${a.name}: ${fmtCost(a.cost)} (${share}%)`;
  }).join("\n");

  const sortedByQueries = [...agents].sort((a, b) => (b.queries || 0) - (a.queries || 0));
  const queriesText = "Query Count by Agent:\n" + sortedByQueries.map(a => {
    const share = queries > 0 ? Math.round(((a.queries || 0) / queries) * 100) : 0;
    return `  - ${a.name}: ${fmtNum(a.queries)} (${share}%)`;
  }).join("\n");

  const dailyWithTooltips = daily.map(d => {
    const topAgents = [...agents]
      .filter(a => (a.cost || 0) > 0)
      .sort((a, b) => (b.cost || 0) - (a.cost || 0))
      .slice(0, 3);
    let tooltip = `Date: ${d.date}\nDaily Spend: ${fmtCost(d.cost)}\n\nTop overall cost drivers:\n`;
    if (topAgents.length > 0) {
      tooltip += topAgents.map((a, i) => `  ${i+1}. ${a.name} (${fmtCost(a.cost)})`).join("\n");
    } else {
      tooltip += "  No active spenders";
    }
    return { ...d, tooltip };
  });

  const byAgentWithTooltips = byAgent.map(ba => {
    const agentInfo = agents.find(a => a.name === ba.name);
    const share = cost > 0 ? Math.round((ba.cost / cost) * 100) : 0;
    let tooltip = ba.name;
    if (agentInfo) {
      const tokenShare = tokens > 0 ? Math.round(((agentInfo.tokens || 0) / tokens) * 100) : 0;
      const queryShare = queries > 0 ? Math.round(((agentInfo.queries || 0) / queries) * 100) : 0;
      tooltip += ` (${agentInfo.type})\n  - Model: ${agentInfo.model || 'N/A'}\n  - Cost: ${fmtCost(ba.cost)} (${share}%)\n  - Tokens: ${fmtNum(agentInfo.tokens)} (${tokenShare}%)\n  - Queries: ${fmtNum(agentInfo.queries)} (${queryShare}%)`;
    } else {
      tooltip += `\n  - Cost: ${fmtCost(ba.cost)} (${share}%)`;
    }
    return { ...ba, tooltip };
  });

  return (
    <>
      <h1 className="page-title">Mission Control</h1>
      <div className="page-sub">Live overview across local, MCP and remote runtimes</div>
      <div className="kpis">
        <div className="kpi" data-tooltip={onlineStatusText}>
          <div className="l">Agents online</div>
          <div className="v">{online}<span style={{ fontSize: 16, color: "var(--dim)" }}>/{agents.length}</span></div>
        </div>
        <div className="kpi" data-tooltip={tokensText}>
          <div className="l">Total tokens</div>
          <div className="v">{fmtNum(tokens)}</div>
        </div>
        <div className="kpi" data-tooltip={costText}>
          <div className="l">Total spend</div>
          <div className="v">{fmtCost(cost)}</div>
        </div>
        <div className="kpi" data-tooltip={queriesText}>
          <div className="l">Queries</div>
          <div className="v">{fmtNum(queries)}</div>
        </div>
      </div>

      <div className="chart-grid">
        <div className="card">
          <div className="chart-head"><h3>Daily spend</h3><span className="muted">{fmtCost(weekSpend)} · 7d</span></div>
          <VBars data={dailyWithTooltips} />
        </div>
        <div className="card">
          <div className="chart-head"><h3>Spend by agent</h3><span className="muted">est. USD</span></div>
          <HBars data={byAgentWithTooltips} />
        </div>
      </div>
    </>
  );
}
