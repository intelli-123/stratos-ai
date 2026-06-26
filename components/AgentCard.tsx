import { Agent, fmtCost, fmtNum, LIVENESS_MS, agentKind, toolStyle } from "@/lib/app";

function liveStatus(a: Agent): "online" | "offline" | "degraded" {
  if (a.status === "degraded") return "degraded";
  if (a.last_seen) return Date.now() - new Date(a.last_seen).getTime() < LIVENESS_MS ? "online" : "offline";
  return a.status || "offline";
}

export default function AgentCard({ agent, onEdit, onOpen }: { agent: Agent; onEdit: (a: Agent) => void; onOpen: (a: Agent) => void }) {
  const st = liveStatus(agent);
  const dot = st === "online" ? "dot-green" : st === "degraded" ? "dot-amber" : "dot-red";
  const tools = agent.tools || [];
  return (
    <div className="card" style={{ padding: "14px" }}>
      <div className="card-head">
        <div 
          className="card-name" 
          style={{ cursor: "pointer", fontSize: "14px", fontWeight: 700 }} 
          onClick={() => onOpen(agent)}
        >
          {agent.name}
        </div>
        <span className="status" style={{ fontSize: "11px" }}>
          <span className={"dot " + dot} />
          {st[0].toUpperCase() + st.slice(1)}
        </span>
      </div>
      <div className="badges" style={{ margin: "8px 0", gap: "4px" }}>
        <span className="badge badge-type" style={{ fontSize: "10px", padding: "2px 6px" }}>
          {agentKind(agent) === "mcp" ? "⇄ MCP" : "● Agent"}
        </span>
        {agent.env && <span className="badge" style={{ fontSize: "10px", padding: "2px 6px" }}>{agent.env}</span>}
        {agent.team && <span className="badge" style={{ fontSize: "10px", padding: "2px 6px" }}>team: {agent.team}</span>}
      </div>
      {agent.description && <div className="card-desc" style={{ fontSize: "12px", margin: "6px 0" }}>{agent.description}</div>}
      <div className="kv" style={{ fontSize: "11px", lineHeight: 1.6 }}>
        {agent.model && <>model: <b>{agent.model}</b><br /></>}
        {agent.framework && <>framework: <b>{agent.framework}</b></>}
      </div>
      <div className="metrics-row" style={{ gap: "14px", margin: "8px 0 2px" }}>
        <div className="metric">
          <div className="v" style={{ fontSize: "13.5px" }}>{fmtNum(agent.tokens)}</div>
          <div className="l" style={{ fontSize: "9px" }}>Tokens</div>
        </div>
        <div className="metric">
          <div className="v" style={{ fontSize: "13.5px" }}>{fmtCost(agent.cost)}</div>
          <div className="l" style={{ fontSize: "9px" }}>Cost</div>
        </div>
        <div className="metric">
          <div className="v" style={{ fontSize: "13.5px" }}>{fmtNum(agent.queries)}</div>
          <div className="l" style={{ fontSize: "9px" }}>Queries</div>
        </div>
        <div className="metric">
          <div className="v" style={{ fontSize: "13.5px" }}>{tools.length}</div>
          <div className="l" style={{ fontSize: "9px" }}>Tools</div>
        </div>
      </div>
      {tools.length > 0 && (
        <div className="badges" style={{ marginTop: 6, gap: "4px", alignItems: "center" }}>
          <span className="l" style={{ fontSize: "9px", color: "var(--muted)", marginRight: 2 }}>tools:</span>
          {tools.slice(0, 6).map((t) => (
            <span key={t} className="badge" style={{ fontSize: "9px", padding: "1px 6px", ...toolStyle(t, agentKind(agent)) }}>{t}</span>
          ))}
          {tools.length > 6 && (
            <span className="badge" style={{ fontSize: "9px", padding: "1px 5px" }} title={tools.slice(6).join(", ")}>+{tools.length - 6}</span>
          )}
        </div>
      )}
    </div>
  );
}
