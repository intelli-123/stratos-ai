export default function Stub({ title, sub, points }: { title: string; sub: string; points: string[] }) {
  return (
    <>
      <h1 className="page-title">{title}</h1>
      <div className="page-sub">{sub}</div>
      <div className="empty" style={{ textAlign: "left", marginTop: 18 }}>
        <b style={{ color: "var(--text)" }}>Coming next.</b> This view will surface:
        <ul style={{ marginTop: 10, lineHeight: 1.9 }}>
          {points.map((p) => <li key={p}>{p}</li>)}
        </ul>
      </div>
    </>
  );
}
