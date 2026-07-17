import { ImageResponse } from "next/og";
import { getWrapped } from "@/lib/github";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  let d;
  try { d = await getWrapped(username); } catch { d = null; }

  const bg = "linear-gradient(135deg,#7c3aed 0%,#db2777 100%)";
  if (!d) {
    return new ImageResponse(
      (<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: bg, color: "white", fontSize: 48 }}>GitWrapped</div>),
      { width: 1200, height: 630 }
    );
  }
  const top = d.languages[0];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: bg, color: "white", padding: 64, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <img src={d.avatarUrl} width={96} height={96} style={{ borderRadius: 48 }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 40, fontWeight: 700 }}>@{d.username}</span>
            <span style={{ fontSize: 28, opacity: 0.85 }}>Retrospecto {d.year} em código</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 48, marginTop: 56 }}>
          <Stat label="Contribuições" value={String(d.totalContributions)} />
          <Stat label="Maior streak" value={`${d.longestStreakDays} dias`} />
          <Stat label="Top linguagem" value={top ? `${top.name} ${top.pct}%` : "—"} />
        </div>
        <div style={{ display: "flex", marginTop: "auto", fontSize: 44, fontWeight: 700 }}>
          {d.personality.emoji} {d.personality.label}
        </div>
        <div style={{ display: "flex", fontSize: 22, opacity: 0.7, marginTop: 12 }}>gitwrapped</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontSize: 52, fontWeight: 800 }}>{value}</span>
      <span style={{ fontSize: 24, opacity: 0.8 }}>{label}</span>
    </div>
  );
}
