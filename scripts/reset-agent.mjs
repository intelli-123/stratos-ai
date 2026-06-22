// One-off: wipe an agent's accumulated test telemetry via the PostgREST API.
// Usage:
//   NODE_EXTRA_CA_CERTS=certs/corporate-ca.pem node --env-file=.env.local scripts/reset-agent.mjs weather-agent
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const name = process.argv[2] || "weather-agent";
const h = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

const found = await fetch(`${url}/rest/v1/agents?name=eq.${encodeURIComponent(name)}&select=id,name`, { headers: h }).then((r) => r.json());
if (!Array.isArray(found) || !found.length) { console.log("no such agent:", name, found); process.exit(1); }
const id = found[0].id;

const del = await fetch(`${url}/rest/v1/agent_queries?agent_id=eq.${id}`, { method: "DELETE", headers: { ...h, Prefer: "return=minimal" } });
const upd = await fetch(`${url}/rest/v1/agents?id=eq.${id}`, { method: "PATCH", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify({ tokens: 0, cost: 0, queries: 0, tools: [] }) });
console.log(`reset ${name} ${id} | delete ${del.status} | update ${upd.status}`);
