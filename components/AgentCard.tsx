import { Agent, fmtCost, fmtNum, LIVENESS_MS, agentKind } from "@/lib/app";

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
    <div className="card">
      <div className="card-head">
        <div className="card-name" style={{ cursor: "pointer" }} onClick={() => onOpen(agent)}>{agent.name}</div>
        <span className="status"><span className={"dot " + dot} />{st[0].toUpperCase() + st.slice(1)}</span>
      </div>
      <div className="badges">
        <span className="badge badge-type">
          {agentKind(agent) === "mcp" ? "⇄ MCP" : "● Agent"}
        </span>
        {agent.env && <span className="badge">{agent.env}</span>}
        {agent.team && <span className="badge">team: {agent.team}</span>}
      </div>
      {agent.description && <div className="card-desc">{agent.description}</div>}
      <div className="kv">
        {agent.model && <>model: <b>{agent.model}</b><br /></>}
        {agent.framework && <>framework: <b>{agent.framework}</b></>}
      </div>
      <div className="metrics-row">
        <div className="metric"><div className="v">{fmtNum(agent.tokens)}</div><div className="l">Tokens</div></div>
        <div className="metric"><div className="v">{fmtCost(agent.cost)}</div><div className="l">Cost</div></div>
        <div className="metric"><div className="v">{fmtNum(agent.queries)}</div><div className="l">Queries</div></div>
        <div className="metric"><div className="v">{tools.length}</div><div className="l">Tools</div></div>
      </div>
      {tools.length > 0 && (
        <div className="badges" style={{ marginTop: 8 }}>
          {tools.slice(0, 5).map((t) => <span key={t} className="badge">{t}</span>)}
          {tools.length > 5 && <span className="badge">+{tools.length - 5}</span>}
        </div>
      )}
      <div className="card-actions">
        <button className="btn" onClick={() => onOpen(agent)}>Open</button>
        <button className="btn" onClick={() => onEdit(agent)}>Edit</button>
      </div>
    </div>
  );
}
