import { useEffect, useState, useMemo } from "react";
import { Agent, AgentType, FILTERS, liveStatus } from "@/lib/app";

const STATUS_FILTERS = ["all", "online", "offline"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];
import AgentCard from "@/components/AgentCard";
import AddAgentModal from "@/components/AddAgentModal";
import AgentDetailModal from "@/components/AgentDetailModal";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<"all" | AgentType>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<null | { mode: "add" | "edit"; agent?: Agent }>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  async function load() {
    setLoading(true); setErr("");
    try {
      const r = await fetch("/api/agents");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to load");
      setAgents(j.agents || []);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);

  const shown = useMemo(() => agents
    .filter((a) => filter === "all" || a.type === filter)
    .filter((a) => status === "all" || liveStatus(a) === status)
    .filter((a) => !q || (a.name + " " + (a.description || "") + " " + (a.team || "")).toLowerCase().includes(q.toLowerCase())),
    [agents, filter, status, q]);

  return (
    <>
      <div className="row">
        <div>
          <h1 className="page-title">Agents</h1>
          <div className="page-sub">{agents.length} registered across local, MCP and remote runtimes</div>
        </div>
        <div className="spacer" />
        <button className="btn btn-primary" onClick={() => setModal({ mode: "add" })}>+ Add Agent</button>
      </div>

      <div className="toolbar">
        <input placeholder="Filter by name…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="seg">
          {FILTERS.map((f) => (
            <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
        <div className="seg">
          {STATUS_FILTERS.map((sf) => (
            <button key={sf} className={status === sf ? "active" : ""} onClick={() => setStatus(sf)}>
              {sf !== "all" && <span className={"dot " + (sf === "online" ? "dot-green" : "dot-red")} style={{ marginRight: 6 }} />}
              {sf}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="empty">Loading agents…</div>
        : err ? <div className="empty" style={{ color: "var(--red)" }}>{err}</div>
        : shown.length === 0 ? (
          <div className="empty">
            No agents yet.<br />Click <b>+ Add Agent</b> to create one and get an onboarding link to connect it.
          </div>
        ) : (
          <div className="grid">
            {shown.map((a) => <AgentCard key={a.id} agent={a} onEdit={(ag) => setModal({ mode: "edit", agent: ag })} onOpen={(ag) => setDetailId(ag.id)} />)}
          </div>
        )}

      {modal && <AddAgentModal mode={modal.mode} agent={modal.agent} onClose={() => setModal(null)} onSaved={load} />}
      {detailId && <AgentDetailModal agentId={detailId} onClose={() => setDetailId(null)} />}
    </>
  );
}
