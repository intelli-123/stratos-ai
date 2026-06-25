import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode } from "react";
import { APP_NAME, APP_TAGLINE, APP_VENDOR, APP_BLURB } from "@/lib/app";
import ThemeToggle from "@/components/ThemeToggle";

const NAV = [
  { section: "Operate", items: [
    { href: "/mission-control", label: "Mission Control", ic: "▦" },
    { href: "/agents", label: "Agents", ic: "◆" },
    { href: "/traces", label: "Traces", ic: "≡" },
    { href: "/mcp-proxy", label: "MCP Proxy", ic: "⇄" },
  ]},
  { section: "Govern", items: [
    { href: "/token-economy", label: "Token Economy", ic: "⊚" },
    { href: "/incidents", label: "Incidents", ic: "⚠" },
    { href: "/ask", label: `Ask ${APP_NAME}`, ic: "✦" },
  ]},
  { section: "Connect", items: [
    { href: "/onboarding", label: "Onboarding", ic: "↧" },
  ]},
  { section: "Administer", items: [
    { href: "/users", label: "Users & Access", ic: "⊙" },
  ]},
];

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useRouter();
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/" className="brand" style={{ cursor: "pointer" }}>
          <div className="logo">◇</div>
          <div>
            <div className="name">{APP_NAME}</div>
            <div className="sub">{APP_TAGLINE}</div>
          </div>
        </Link>
        {NAV.map((grp) => (
          <div key={grp.section}>
            <div className="nav-section">{grp.section}</div>
            {grp.items.map((it) => (
              <Link key={it.href} href={it.href}
                className={"nav-item" + (pathname === it.href ? " active" : "")}>
                <span className="ic">{it.ic}</span>{it.label}
              </Link>
            ))}
          </div>
        ))}
        <div className="side-foot">{APP_NAME} v0.1</div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div className="search"><input placeholder="Search traces, models, agents…" /></div>
          <div className="topbar-right">
            <span className="pill"><span className="dot dot-green" />Live</span>
            <span className="pill">admin</span>
            <ThemeToggle />
            <button className="btn">Profile</button>
            <button className="btn">Logout</button>
          </div>
        </div>
        <div className="content">{children}</div>
        <div className="footer">
          <span>{APP_NAME} · {APP_BLURB}</span>
          <span>© 2026 · {APP_VENDOR}</span>
        </div>
      </div>
    </div>
  );
}
