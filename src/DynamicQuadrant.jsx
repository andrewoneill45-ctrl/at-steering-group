/**
 * DynamicQuadrant.jsx — Achieve & Thrive 2026
 * Dynamic Schools quadrant: A8 trajectory vs Progress 8
 * Top-right = Rising Stars, Bottom-left = Schools in decline
 */
import { useState, useEffect, useMemo } from "react";

const QUADRANTS = [
  { label: "Rising Stars", desc: "Improving & strong value-added", color: "#16a34a", x: 1, y: 1 },
  { label: "High but Slowing", desc: "Good P8 but A8 declining", color: "#d97706", x: -1, y: 1 },
  { label: "Improving Fast", desc: "A8 rising but P8 below average", color: "#0ea5e9", x: 1, y: -1 },
  { label: "Need Support", desc: "Declining A8 and below average P8", color: "#dc2626", x: -1, y: -1 },
];

function getQuadrant(a8Change, p8) {
  if (a8Change == null || p8 == null) return null;
  const xPos = a8Change >= 0 ? 1 : -1;
  const yPos = p8 >= 0 ? 1 : -1;
  return QUADRANTS.find(q => q.x === xPos && q.y === yPos);
}

export default function DynamicQuadrant({ missionSchools, missions }) {
  const [allSchools, setAllSchools] = useState([]);
  const [tooltip, setTooltip] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState("all");

  useEffect(() => {
    fetch("/schools.json")
      .then(r => r.json())
      .then(d => setAllSchools(d))
      .catch(e => console.error("schools.json:", e));
  }, []);

  // Enrich mission schools with a8_prev, p8_prev from schools.json
  const enriched = useMemo(() => {
    if (!allSchools.length) return [];
    const lookup = {};
    allSchools.forEach(s => { lookup[String(s.urn)] = s; });
    return missionSchools.map(ms => {
      const full = lookup[String(ms.urn)] || {};
      const a8 = parseFloat(ms.attainment8 || full.attainment8);
      const a8prev = parseFloat(full.a8_prev);
      const p8 = parseFloat(full.p8_prev);
      const a8Change = (!isNaN(a8) && !isNaN(a8prev)) ? Math.round((a8 - a8prev) * 10) / 10 : null;
      const mission = missions.find(m => m.id === ms.missionId);
      return {
        ...ms,
        a8_full: a8,
        a8_prev: a8prev,
        p8_prev: p8,
        a8Change,
        missionColor: mission?.color || "#6366f1",
        missionName: mission?.name || "",
        quadrant: getQuadrant(a8Change, p8),
      };
    });
  }, [missionSchools, allSchools, missions]);

  const clusters = useMemo(() => ["all", ...new Set(enriched.map(s => s.cluster).filter(Boolean))], [enriched]);

  const filtered = selectedCluster === "all" ? enriched : enriched.filter(s => s.cluster === selectedCluster);
  const plottable = filtered.filter(s => s.a8Change != null && s.p8_prev != null);

  if (!allSchools.length) return (
    <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 12 }}>Loading school data…</div>
  );

  // Chart dimensions
  const W = 560, H = 400, PAD = 48;
  const xs = plottable.map(s => s.a8Change);
  const ys = plottable.map(s => s.p8_prev);
  const xMin = Math.min(-3, ...xs) - 0.5;
  const xMax = Math.max(3, ...xs) + 0.5;
  const yMin = Math.min(-2, ...ys) - 0.1;
  const yMax = Math.max(1, ...ys) + 0.1;
  const sx = x => PAD + (x - xMin) / (xMax - xMin) * (W - PAD * 2);
  const sy = y => H - PAD - (y - yMin) / (yMax - yMin) * (H - PAD * 2);
  const x0 = sx(0), y0 = sy(0);

  // Quadrant counts
  const qCounts = {};
  plottable.forEach(s => { if (s.quadrant) qCounts[s.quadrant.label] = (qCounts[s.quadrant.label] || 0) + 1; });

  return (
    <div style={{ fontFamily: "'Outfit','Segoe UI',sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>★ Dynamic Schools</div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
            A8 trajectory (2023→2024) vs Progress 8 (2024) · {plottable.length} of {missionSchools.length} schools plotted
          </div>
        </div>
        {/* Cluster filter */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {clusters.map(cl => (
            <button key={cl} onClick={() => setSelectedCluster(cl)} style={{
              padding: "4px 10px", borderRadius: 20, border: "1px solid",
              borderColor: selectedCluster === cl ? "#4f46e5" : "#e2e8f0",
              background: selectedCluster === cl ? "#4f46e5" : "#fff",
              color: selectedCluster === cl ? "#fff" : "#64748b",
              fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit"
            }}>{cl === "all" ? "All clusters" : cl}</button>
          ))}
        </div>
      </div>

      {/* Quadrant legend */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        {QUADRANTS.map(q => (
          <div key={q.label} style={{ display: "flex", alignItems: "center", gap: 6, background: `${q.color}0d`, border: `1px solid ${q.color}33`, borderRadius: 8, padding: "5px 10px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: q.color, flexShrink: 0 }}/>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: q.color }}>{q.label}</div>
              <div style={{ fontSize: 9, color: "#94a3b8" }}>{qCounts[q.label] || 0} schools</div>
            </div>
          </div>
        ))}
      </div>

      {plottable.length < 2 ? (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8ecf0", padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Insufficient data for this cluster</div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>Schools need both A8 (2023 & 2024) and P8 (2024) data</div>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8ecf0", padding: "16px", position: "relative" }}>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", display: "block" }}>
            {/* Quadrant backgrounds */}
            <rect x={x0} y={PAD} width={W - PAD - x0} height={y0 - PAD} fill="#16a34a08"/>
            <rect x={PAD} y={PAD} width={x0 - PAD} height={y0 - PAD} fill="#d9770608"/>
            <rect x={x0} y={y0} width={W - PAD - x0} height={H - PAD - y0} fill="#0ea5e908"/>
            <rect x={PAD} y={y0} width={x0 - PAD} height={H - PAD - y0} fill="#dc262608"/>

            {/* Grid lines */}
            <line x1={PAD} y1={y0} x2={W - PAD} y2={y0} stroke="#0f172a" strokeWidth={1.5} strokeOpacity={0.3}/>
            <line x1={x0} y1={PAD} x2={x0} y2={H - PAD} stroke="#0f172a" strokeWidth={1.5} strokeOpacity={0.3}/>

            {/* Axis labels */}
            <text x={W / 2} y={H - 8} fontSize={9} textAnchor="middle" fill="#94a3b8">A8 Change (2023 → 2024) →</text>
            <text x={12} y={H / 2} fontSize={9} textAnchor="middle" fill="#94a3b8" transform={`rotate(-90,12,${H / 2})`}>Progress 8 (2024) →</text>

            {/* Zero labels */}
            <text x={x0 + 4} y={H - PAD + 12} fontSize={8} fill="#94a3b8">0</text>
            <text x={PAD - 4} y={y0 + 3} fontSize={8} fill="#94a3b8" textAnchor="end">0</text>

            {/* Quadrant labels */}
            <text x={W - PAD - 4} y={PAD + 14} fontSize={9} textAnchor="end" fill="#16a34a" fontWeight="bold">Rising Stars ↗</text>
            <text x={PAD + 4} y={PAD + 14} fontSize={9} fill="#d97706" fontWeight="bold">High but Slowing ↘</text>
            <text x={W - PAD - 4} y={H - PAD - 6} fontSize={9} textAnchor="end" fill="#0ea5e9" fontWeight="bold">Improving Fast ↗</text>
            <text x={PAD + 4} y={H - PAD - 6} fontSize={9} fill="#dc2626" fontWeight="bold">Need Support ↙</text>

            {/* Data points */}
            {plottable.map((s, i) => {
              const cx = sx(s.a8Change), cy = sy(s.p8_prev);
              const col = s.quadrant?.color || "#6366f1";
              return (
                <g key={s.urn}
                  onMouseEnter={() => setTooltip({ s, cx, cy })}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: "pointer" }}>
                  <circle cx={cx} cy={cy} r={7} fill={col} fillOpacity={0.85} stroke="#fff" strokeWidth={1.5}/>
                  {plottable.length <= 12 && (
                    <text x={cx} y={cy - 10} fontSize={7} textAnchor="middle" fill="#374151">
                      {s.name?.split(" ")[0]}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Tooltip */}
          {tooltip && (
            <div style={{
              position: "absolute", top: tooltip.cy / H * 100 + "%", left: tooltip.cx / W * 100 + "%",
              transform: "translate(12px, -50%)", background: "#0f172a", color: "#fff",
              borderRadius: 8, padding: "8px 12px", fontSize: 10, pointerEvents: "none", zIndex: 10,
              whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
            }}>
              <div style={{ fontWeight: 700, marginBottom: 3 }}>{tooltip.s.name}</div>
              <div style={{ color: tooltip.s.quadrant?.color || "#94a3b8", fontWeight: 600 }}>{tooltip.s.quadrant?.label || "No quadrant"}</div>
              <div style={{ color: "#94a3b8", marginTop: 3 }}>
                A8: {tooltip.s.a8_full} (was {tooltip.s.a8_prev}) → {tooltip.s.a8Change > 0 ? "+" : ""}{tooltip.s.a8Change}
              </div>
              <div style={{ color: "#94a3b8" }}>P8: {tooltip.s.p8_prev}</div>
              <div style={{ color: "#94a3b8" }}>Cluster: {tooltip.s.cluster || "—"} · {tooltip.s.la}</div>
            </div>
          )}
        </div>
      )}

      {/* School table below chart */}
      <div style={{ marginTop: 16, background: "#fff", borderRadius: 12, border: "1px solid #e8ecf0", overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #f1f5f9", fontSize: 11, fontWeight: 700, color: "#0f172a" }}>
          School Detail — {selectedCluster === "all" ? "All clusters" : selectedCluster}
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["School", "Cluster", "LA", "A8 2024", "A8 2023", "Change", "P8 2024", "Quadrant"].map(h => (
                  <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: "#94a3b8", fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.sort((a, b) => (b.a8Change || 0) - (a.a8Change || 0)).map((s, i) => (
                <tr key={s.urn} style={{ borderTop: "1px solid #f8fafc", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "6px 10px", fontWeight: 600, color: "#0f172a", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</td>
                  <td style={{ padding: "6px 10px", color: "#6366f1", fontWeight: 700 }}>{s.cluster || "—"}</td>
                  <td style={{ padding: "6px 10px", color: "#64748b" }}>{s.la}</td>
                  <td style={{ padding: "6px 10px", fontWeight: 700, color: "#0f172a" }}>{s.a8_full ?? "—"}</td>
                  <td style={{ padding: "6px 10px", color: "#64748b" }}>{isNaN(s.a8_prev) ? "—" : s.a8_prev}</td>
                  <td style={{ padding: "6px 10px", fontWeight: 700, color: s.a8Change > 0 ? "#16a34a" : s.a8Change < 0 ? "#dc2626" : "#64748b" }}>
                    {s.a8Change != null ? (s.a8Change > 0 ? "+" : "") + s.a8Change : "—"}
                  </td>
                  <td style={{ padding: "6px 10px", fontWeight: 700, color: s.p8_prev > 0 ? "#16a34a" : s.p8_prev < 0 ? "#dc2626" : "#64748b" }}>
                    {s.p8_prev != null ? (s.p8_prev > 0 ? "+" : "") + s.p8_prev : "—"}
                  </td>
                  <td style={{ padding: "6px 10px" }}>
                    {s.quadrant ? (
                      <span style={{ background: `${s.quadrant.color}18`, color: s.quadrant.color, borderRadius: 10, padding: "2px 8px", fontWeight: 700, fontSize: 9 }}>
                        {s.quadrant.label}
                      </span>
                    ) : <span style={{ color: "#94a3b8" }}>No data</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
