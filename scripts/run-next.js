// Cross-platform launcher for Next. If a corporate CA bundle exists at
// certs/corporate-ca.pem, we set NODE_EXTRA_CA_CERTS before spawning Next so
// Node trusts a TLS-inspection proxy (e.g. for Supabase) WITHOUT disabling
// certificate verification. If the file is absent (e.g. a teammate without the
// proxy), this is a no-op and Next runs normally.
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const env = { ...process.env };
const caPath = path.join(__dirname, "..", "certs", "corporate-ca.pem");
if (fs.existsSync(caPath) && !env.NODE_EXTRA_CA_CERTS) {
  env.NODE_EXTRA_CA_CERTS = caPath;
  console.log("[run-next] trusting corporate CA:", caPath);
}

const args = process.argv.slice(2); // e.g. ["dev","-p","4000"]
const bin = path.join(__dirname, "..", "node_modules", ".bin", process.platform === "win32" ? "next.cmd" : "next");
const child = spawn(bin, args, { stdio: "inherit", env, shell: process.platform === "win32" });
child.on("exit", (code) => process.exit(code ?? 0));
