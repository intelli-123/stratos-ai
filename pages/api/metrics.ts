import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Mission Control charts: 7-day daily spend + spend-by-agent.
export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Supabase connection is not initialized. Please verify that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set." });
    }

    const days = 7;
    const since = new Date(Date.now() - (days - 1) * 86400_000); since.setUTCHours(0, 0, 0, 0);

    // Daily spend: bucket agent_queries cost by UTC day (low volume → aggregate in JS).
    const { data: rows } = await supabaseAdmin
      .from("agent_queries").select("cost,created_at").gte("created_at", since.toISOString()).limit(5000);
    const byDay = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(since.getTime() + i * 86400_000).toISOString().slice(0, 10);
      byDay.set(d, 0);
    }
    for (const r of rows || []) {
      const d = String(r.created_at).slice(0, 10);
      if (byDay.has(d)) byDay.set(d, byDay.get(d)! + (r.cost || 0));
    }
    const daily = Array.from(byDay.entries()).map(([date, cost]) => ({ date, cost: +cost.toFixed(6) }));

    // Spend by agent: from the agent rollup (descending), top 8.
    const { data: agents } = await supabaseAdmin.from("agents").select("name,cost").order("cost", { ascending: false });
    const byAgent = (agents || []).filter((a) => (a.cost || 0) > 0).slice(0, 8)
      .map((a) => ({ name: a.name, cost: +(a.cost || 0).toFixed(6) }));

    return res.json({ daily, byAgent });
  } catch (e: any) {
    return res.status(502).json({ error: e?.message || String(e) });
  }
}
