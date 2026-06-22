import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = req.query.id as string;

  if (req.method === "PATCH") {
    const b = req.body || {};
    const patch: Record<string, any> = {};
    for (const k of ["name", "description", "type", "env", "team", "model", "framework", "cost_budget", "status"]) {
      if (k in b) patch[k] = b[k];
    }
    const { data, error } = await supabaseAdmin.from("agents").update(patch).eq("id", id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ agent: data });
  }

  if (req.method === "DELETE") {
    const { error } = await supabaseAdmin.from("agents").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  res.setHeader("Allow", "PATCH, DELETE");
  res.status(405).end();
}
