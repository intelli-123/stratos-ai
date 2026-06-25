import { useEffect, useState, Fragment } from "react";
import { fmtCost, fmtNum } from "@/lib/app";

interface Trace {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_type: string;
  agent_team: string;
  agent_model: string;
  agent_framework: string;
  task: string;
  prompt?: string | null;
  response?: string | null;
  model: string;
  tokens: number;
  cost: number;
  latency_ms: number;
  created_at: string;
  trace_id?: string | null;
}

export default function Traces() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  // Filters state
  const [q, setQ] = useState("");
  const [selAgent, setSelAgent] = useState("all");
  const [selType, setSelType] = useState("all");
  const [selTeam, setSelTeam] = useState("all");
  const [selModel, setSelModel] = useState("all");
  const [selFramework, setSelFramework] = useState("all");

  // Sorting state
  const [sortField, setSortField] = useState<"created_at" | "cost" | "latency_ms" | "tokens">("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  async function load() {
    try {
      const r = await fetch("/api/traces");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to load traces");
      setTraces(j.traces || []);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  // Compute distinct filter options from live data
  const agentsList = Array.from(new Set(traces.map((t) => t.agent_name).filter(Boolean))).sort();
  const typesList = Array.from(new Set(traces.map((t) => t.agent_type).filter(Boolean))).sort();
  const teamsList = Array.from(new Set(traces.map((t) => t.agent_team).filter((x) => x && x !== "—"))).sort();
  const modelsList = Array.from(new Set(traces.map((t) => t.model).filter((x) => x && x !== "—"))).sort();
  const frameworksList = Array.from(new Set(traces.map((t) => t.agent_framework).filter((x) => x && x !== "—"))).sort();

  // Filter traces
  const filtered = traces.filter((t) => {
    const matchesSearch =
      !q ||
      (t.prompt || "").toLowerCase().includes(q.toLowerCase()) ||
      (t.response || "").toLowerCase().includes(q.toLowerCase()) ||
      (t.task || "").toLowerCase().includes(q.toLowerCase());
    const matchesAgent = selAgent === "all" || t.agent_name === selAgent;
    const matchesType = selType === "all" || t.agent_type === selType;
    const matchesTeam = selTeam === "all" || t.agent_team === selTeam;
    const matchesModel = selModel === "all" || t.model === selModel;
    const matchesFramework = selFramework === "all" || t.agent_framework === selFramework;

    return matchesSearch && matchesAgent && matchesType && matchesTeam && matchesModel && matchesFramework;
  });

  // Sorting helper functions
  const toggleSort = (field: "created_at" | "cost" | "latency_ms" | "tokens") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const renderSortIcon = (field: "created_at" | "cost" | "latency_ms" | "tokens") => {
    if (sortField !== field) return <span style={{ color: "var(--dim)", marginLeft: "4px" }}>↕</span>;
    return sortAsc ? <span style={{ color: "var(--accent)", marginLeft: "4px" }}>▲</span> : <span style={{ color: "var(--accent)", marginLeft: "4px" }}>▼</span>;
  };

  // Sort traces
  const sorted = [...filtered].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (valA === undefined || valA === null) valA = 0;
    if (valB === undefined || valB === null) valB = 0;

    if (sortField === "created_at") {
      const timeA = new Date(valA as string).getTime();
      const timeB = new Date(valB as string).getTime();
      return sortAsc ? timeA - timeB : timeB - timeA;
    } else {
      return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    }
  });

  return (
    <>
      <div className="toolbar" style={{ border: "none", background: "transparent", padding: 0, margin: "0 0 16px" }}>
        <div>
          <h1 className="page-title">Traces</h1>
          <div className="page-sub">Per-query traces across agents</div>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="card" style={{ marginBottom: "20px", padding: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          
          {/* Search Prompt */}
          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: "11px", marginBottom: "4px" }}>Search Prompt Content</label>
            <input 
              placeholder="Search text or task..." 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
              style={{ padding: "6px 10px", fontSize: "12.5px" }}
            />
          </div>

          {/* Filter by Agent Name */}
          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: "11px", marginBottom: "4px" }}>Agent Name</label>
            <select 
              value={selAgent} 
              onChange={(e) => setSelAgent(e.target.value)}
              style={{ padding: "6px 10px", fontSize: "12.5px" }}
            >
              <option value="all">All Agents</option>
              {agentsList.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Filter by Type */}
          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: "11px", marginBottom: "4px" }}>Agent Type</label>
            <select 
              value={selType} 
              onChange={(e) => setSelType(e.target.value)}
              style={{ padding: "6px 10px", fontSize: "12.5px" }}
            >
              <option value="all">All Types</option>
              {typesList.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Filter by Team */}
          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: "11px", marginBottom: "4px" }}>Team</label>
            <select 
              value={selTeam} 
              onChange={(e) => setSelTeam(e.target.value)}
              style={{ padding: "6px 10px", fontSize: "12.5px" }}
            >
              <option value="all">All Teams</option>
              {teamsList.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Filter by Model */}
          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: "11px", marginBottom: "4px" }}>Model</label>
            <select 
              value={selModel} 
              onChange={(e) => setSelModel(e.target.value)}
              style={{ padding: "6px 10px", fontSize: "12.5px" }}
            >
              <option value="all">All Models</option>
              {modelsList.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Filter by Framework */}
          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: "11px", marginBottom: "4px" }}>Framework</label>
            <select 
              value={selFramework} 
              onChange={(e) => setSelFramework(e.target.value)}
              style={{ padding: "6px 10px", fontSize: "12.5px" }}
            >
              <option value="all">All Frameworks</option>
              {frameworksList.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

        </div>
      </div>

      {/* Traces Table Card */}
      <div className="card" style={{ padding: "16px" }}>
        {loading ? (
          <div className="empty">Loading trace history...</div>
        ) : err ? (
          <div className="empty" style={{ color: "var(--red)" }}>{err}</div>
        ) : filtered.length === 0 ? (
          <div className="empty">No traces match your filters.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 11, borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "10px 8px", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }} onClick={() => toggleSort("created_at")}>
                    <div style={{ display: "inline-flex", alignItems: "center" }}>
                      Time {renderSortIcon("created_at")}
                    </div>
                  </th>
                  <th style={{ padding: "10px 8px" }}>Agent</th>
                  <th style={{ padding: "10px 8px" }}>Span/Task</th>
                  <th style={{ padding: "10px 8px", maxWidth: "340px" }}>Prompt Preview</th>
                  <th style={{ padding: "10px 8px" }}>Model</th>
                  <th style={{ padding: "10px 8px", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", textAlign: "right" }} onClick={() => toggleSort("tokens")}>
                    <div style={{ display: "inline-flex", alignItems: "center" }}>
                      Tokens {renderSortIcon("tokens")}
                    </div>
                  </th>
                  <th style={{ padding: "10px 8px", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", textAlign: "right" }} onClick={() => toggleSort("cost")}>
                    <div style={{ display: "inline-flex", alignItems: "center" }}>
                      Cost {renderSortIcon("cost")}
                    </div>
                  </th>
                  <th style={{ padding: "10px 8px", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", textAlign: "right" }} onClick={() => toggleSort("latency_ms")}>
                    <div style={{ display: "inline-flex", alignItems: "center" }}>
                      Latency {renderSortIcon("latency_ms")}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => {
                  const isOpen = openId === t.id;
                  const previewText = t.prompt || t.response || "—";
                  return (
                    <Fragment key={t.id}>
                      <tr 
                        style={{ borderBottom: "1px solid var(--border)", cursor: "pointer", fontSize: "12.5px" }}
                        onClick={() => setOpenId(isOpen ? null : t.id)}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.01)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }} className="muted">
                          <span style={{ display: "inline-block", width: 12, color: "var(--dim)" }}>{isOpen ? "▾" : "▸"}</span>
                          {t.created_at ? new Date(t.created_at).toLocaleString() : "—"}
                        </td>
                        <td style={{ padding: "10px 8px", fontWeight: 600 }}>
                          {t.agent_name}
                          <span className="badge badge-type" style={{ fontSize: "9px", padding: "1px 4px", marginLeft: "6px" }}>{t.agent_type}</span>
                        </td>
                        <td style={{ padding: "10px 8px" }}>
                          <span className="badge" style={{ fontSize: "10px", padding: "2px 6px" }}>{t.task}</span>
                        </td>
                        <td style={{ padding: "10px 8px", maxWidth: "340px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} className="muted">
                          {previewText}
                        </td>
                        <td style={{ padding: "10px 8px" }} className="muted">{t.model}</td>
                        <td style={{ padding: "10px 8px", textAlign: "right" }}>{fmtNum(t.tokens)}</td>
                        <td style={{ padding: "10px 8px", textAlign: "right" }}>{fmtCost(t.cost)}</td>
                        <td style={{ padding: "10px 8px", textAlign: "right" }} className="muted">{t.latency_ms}ms</td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={8} style={{ padding: "12px 14px", background: "rgba(0,0,0,0.05)" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                              
                              {/* Metadata grid */}
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
                                <div><span style={{ fontSize: "10px", color: "var(--dim)" }}>AGENT TEAM</span><div style={{ fontSize: "12px", fontWeight: 600 }}>{t.agent_team}</div></div>
                                <div><span style={{ fontSize: "10px", color: "var(--dim)" }}>FRAMEWORK</span><div style={{ fontSize: "12px", fontWeight: 600 }}>{t.agent_framework}</div></div>
                                <div><span style={{ fontSize: "10px", color: "var(--dim)" }}>LATENCY</span><div style={{ fontSize: "12px", fontWeight: 600 }}>{t.latency_ms}ms</div></div>
                                <div><span style={{ fontSize: "10px", color: "var(--dim)" }}>COST</span><div style={{ fontSize: "12px", fontWeight: 600 }}>{fmtCost(t.cost)}</div></div>
                                {t.trace_id && <div style={{ gridColumn: "span 2" }}><span style={{ fontSize: "10px", color: "var(--dim)" }}>TRACE ID</span><div style={{ fontSize: "11px", fontFamily: "var(--mono)" }}>{t.trace_id}</div></div>}
                              </div>

                              {/* I/O Blocks */}
                              {t.prompt && (
                                <div>
                                  <b style={{ fontSize: "12px" }}>Input Prompt</b>
                                  <div className="snippet" style={{ marginTop: 4, maxHeight: "200px", overflowY: "auto" }}>{t.prompt}</div>
                                </div>
                              )}
                              {t.response && (
                                <div>
                                  <b style={{ fontSize: "12px" }}>Output Response</b>
                                  <div className="snippet" style={{ marginTop: 4, maxHeight: "200px", overflowY: "auto", color: "var(--green)" }}>{t.response}</div>
                                </div>
                              )}

                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
