import { useEffect, useState } from "react";

// Day (light) / Night (dark) toggle. Persists to localStorage and flips the
// data-theme attribute that styles/globals.css keys the light palette off of.
export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("theme")) === "light" ? "light" : "dark";
    setTheme(saved);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem("theme", next); } catch {}
    if (next === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
  }

  return (
    <button className="btn" onClick={toggle} title="Toggle day / night theme" aria-label="Toggle theme">
      {theme === "dark" ? "☀ Day" : "☾ Night"}
    </button>
  );
}
