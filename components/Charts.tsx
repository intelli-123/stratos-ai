import { DailyPoint, AgentSpend, fmtCost } from "@/lib/app";

// Dependency-free, theme-aware bar charts (divs + CSS vars).

export function VBars({ data }: { data: DailyPoint[] }) {
  const max = Math.max(...data.map((d) => d.cost), 0.0000001);
  return (
    <div className="vbars">
      {data.map((d) => (
        <div key={d.date} className="vbar-col" title={`${d.date}: ${fmtCost(d.cost)}`}>
          <div className="vbar-track">
            <div className="vbar-fill" style={{ height: `${Math.max((d.cost / max) * 100, d.cost > 0 ? 4 : 0)}%` }} />
          </div>
          <div className="vbar-label">{d.date.slice(8, 10)}</div>
        </div>
      ))}
    </div>
  );
}

export function HBars({ data }: { data: AgentSpend[] }) {
  const max = Math.max(...data.map((d) => d.cost), 0.0000001);
  if (!data.length) return <div className="muted" style={{ padding: "8px 0" }}>No spend yet.</div>;
  return (
    <div className="hbars">
      {data.map((d) => (
        <div key={d.name} className="hbar-row">
          <div className="hbar-name" title={d.name}>{d.name}</div>
          <div className="hbar-track"><div className="hbar-fill" style={{ width: `${Math.max((d.cost / max) * 100, 4)}%` }} /></div>
          <div className="hbar-val">{fmtCost(d.cost)}</div>
        </div>
      ))}
    </div>
  );
}
