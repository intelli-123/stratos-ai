import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { APP_NAME } from "@/lib/app";

export default function Onboard() {
  const { query } = useRouter();
  const token = query.token as string | undefined;
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!token) return;
    fetch(`/api/enroll/${token}`).then(async (r) => {
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setData(j);
    }).catch((e) => setErr(e.message));
  }, [token]);

  return (
    <>
      <h1 className="page-title">Connect to {APP_NAME}</h1>
      {err ? <div className="empty" style={{ color: "var(--red)" }}>{err}</div>
        : !data ? <div className="empty">Loading…</div>
        : (
          <div style={{ maxWidth: 640 }}>
            <div className="page-sub">Agent <b style={{ color: "var(--text)" }}>{data.agent.name}</b> ({data.agent.type}). Run the steps below in that agent — no code changes beyond initialization.</div>
            <div className="field" style={{ marginTop: 16 }}><label>Install & initialize</label><div className="snippet">{data.snippet}</div></div>
            <p className="muted">Once it starts emitting traces, the agent goes <b style={{ color: "var(--green)" }}>online</b> here with live tokens, cost and tools.</p>
          </div>
        )}
    </>
  );
}
