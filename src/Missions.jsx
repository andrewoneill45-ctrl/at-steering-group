import { useState, useRef, useCallback, useEffect } from "react";
import { ALL_MONTHS, TODAY_IDX, RAG, PALETTE, ZOOM_LEVELS, uid } from "./data.js";

// ─── Shared style constants ───────────────────────────────────────────────────
const IS = { background:"#fff", border:"1px solid #e2e8f0", borderRadius:6, color:"#374151", padding:"5px 9px", fontSize:11, fontFamily:"inherit", outline:"none" };
const BS = bg => ({ background:bg+"18", border:`1px solid ${bg}66`, borderRadius:6, color:bg, cursor:"pointer", padding:"5px 12px", fontSize:11, fontFamily:"inherit", fontWeight:600 });
const LS = { fontSize:9, letterSpacing:"0.13em", textTransform:"uppercase", color:"#94a3b8", fontWeight:700 };

const MISSION_COLORS = ["#6366f1","#0ea5e9","#059669","#d97706","#dc2626","#7c3aed","#0891b2","#65a30d"];

// ─── Initial mission data ─────────────────────────────────────────────────────
export const INITIAL_MISSIONS = [
  {
    id: "m1",
    name: "Mission North East",
    subtitle: "Place-based school improvement",
    color: "#6366f1",
    rag: "G",
    owner: "",
    notes: "",
    collapsed: false,
    swimlanes: [
      { id: "sl1", name: "DfE & Policy", color: "#6366f1", phases: [], milestones: [], textRows: [] },
      { id: "sl2", name: "Schools & Trusts", color: "#0ea5e9", phases: [], milestones: [], textRows: [] },
      { id: "sl3", name: "Local Authority", color: "#059669", phases: [], milestones: [], textRows: [] },
      { id: "sl4", name: "Community & Partners", color: "#d97706", phases: [], milestones: [], textRows: [] },
    ],
    dependencies: [],
  }
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

const RagDot = ({ rag, size=9 }) => (
  <span style={{ display:"inline-block", width:size, height:size, borderRadius:"50%", background:RAG[rag].color, flexShrink:0 }}/>
);
const RagBadge = ({ rag, small }) => (
  <span style={{
    display:"inline-flex", alignItems:"center", gap:4,
    background:RAG[rag].light, color:RAG[rag].text,
    border:`1px solid ${RAG[rag].border}`,
    borderRadius:20, padding: small ? "2px 8px" : "3px 10px",
    fontSize: small ? 10 : 11, fontWeight:600, whiteSpace:"nowrap", flexShrink:0,
  }}>
    <span style={{ width:6, height:6, borderRadius:"50%", background:RAG[rag].color }}/>
    {RAG[rag].label}
  </span>
);

// ─── Panel Shell ──────────────────────────────────────────────────────────────
function PanelShell({ title, subtitle, color, onClose, children }) {
  const w = useWindowWidth();
  const mobile = w < 640;
  return (
    <>
      {mobile && <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:99 }}/>}
      <div style={{
        position:"fixed", right:0, top:0, bottom:0,
        width: mobile ? "100%" : 340,
        background:"#fff", borderLeft: mobile ? "none" : "1px solid #e2e8f0",
        overflowY:"auto", zIndex:100,
        boxShadow:"-4px 0 24px rgba(0,0,0,0.12)",
        display:"flex", flexDirection:"column",
      }}>
        <div style={{ borderTop:`4px solid ${color||"#6366f1"}`, padding:"20px 22px 16px", borderBottom:"1px solid #f1f5f9", flexShrink:0 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
            <div style={{ flex:1,paddingRight:10 }}>
              <div style={{ fontSize:10,color:"#94a3b8",fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4 }}>{subtitle}</div>
              <h2 style={{ margin:0,fontSize:15,fontWeight:700,color:"#0f172a",lineHeight:1.3 }}>{title}</h2>
            </div>
            <button onClick={onClose} style={{ background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:26,padding:"0 2px",lineHeight:1,flexShrink:0,minWidth:44,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>
          </div>
        </div>
        <div style={{ padding:"18px 22px",flex:1 }}>{children}</div>
      </div>
    </>
  );
}

// ─── Field components ─────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={LS}>{label}</div>
      <div style={{ marginTop:5 }}>{children}</div>
    </div>
  );
}
function TextField({ label, value, onChange, placeholder="", rows=1 }) {
  return (
    <Field label={label}>
      {rows > 1
        ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
            style={{ ...IS,width:"100%",resize:"vertical",lineHeight:1.5 }}/>
        : <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
            style={{ ...IS,width:"100%" }}/>
      }
    </Field>
  );
}
function RagSelector({ value, onChange }) {
  return (
    <Field label="RAG Status">
      <div style={{ display:"flex",gap:6 }}>
        {["G","A","R"].map(k => (
          <button key={k} onClick={() => onChange(k)} style={{
            flex:1, padding:"8px 4px", borderRadius:8, cursor:"pointer",
            border: value===k ? `2px solid ${RAG[k].color}` : "1px solid #e2e8f0",
            background: value===k ? RAG[k].light : "#fff",
            color: value===k ? RAG[k].text : "#94a3b8",
            fontFamily:"inherit", fontSize:11, fontWeight:value===k?"700":"400",
          }}>{RAG[k].label}</button>
        ))}
      </div>
    </Field>
  );
}
function ColorPicker({ value, onChange, diamond=false }) {
  return (
    <Field label="Colour">
      <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
        {PALETTE.map(c => (
          <div key={c} onClick={() => onChange(c)}
            style={{ width:22,height:22,borderRadius:diamond?0:4,transform:diamond?"rotate(45deg)":undefined,
              background:c,cursor:"pointer",border:value===c?"3px solid #0f172a":"2px solid transparent" }}/>
        ))}
      </div>
    </Field>
  );
}

// ─── Dependency drawing ───────────────────────────────────────────────────────
function DependencyLines({ missions, activeMissionId, COL, ROW, LBL, zoomMonths }) {
  const mission = missions.find(m => m.id === activeMissionId);
  if (!mission) return null;

  const deps = mission.dependencies || [];
  if (!deps.length) return null;

  // Build a lookup: phaseId → { swimlaneIndex, phase }
  const lookup = {};
  mission.swimlanes.forEach((sl, slIdx) => {
    (sl.phases || []).forEach(ph => { lookup[ph.id] = { slIdx, ph }; });
    (sl.milestones || []).forEach(ms => { lookup[ms.id] = { slIdx, ms, isMilestone:true }; });
  });

  const lines = deps.map(dep => {
    const from = lookup[dep.fromId];
    const to   = lookup[dep.toId];
    if (!from || !to) return null;

    let x1, y1, x2, y2;
    if (from.isMilestone) {
      x1 = LBL + from.ms.month * COL + COL / 2;
      y1 = from.slIdx * ROW + ROW / 2;
    } else {
      const end = Math.min(from.ph.start + from.ph.duration, zoomMonths);
      x1 = LBL + end * COL;
      y1 = from.slIdx * ROW + ROW / 2;
    }
    if (to.isMilestone) {
      x2 = LBL + to.ms.month * COL + COL / 2;
      y2 = to.slIdx * ROW + ROW / 2;
    } else {
      x2 = LBL + to.ph.start * COL;
      y2 = to.slIdx * ROW + ROW / 2;
    }

    const mx = (x1 + x2) / 2;
    return (
      <g key={dep.id}>
        <path d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
          fill="none" stroke={dep.color||"#94a3b8"} strokeWidth={1.5}
          strokeDasharray="4 3" markerEnd={`url(#arrow-${dep.id})`} opacity={0.7}/>
        <defs>
          <marker id={`arrow-${dep.id}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill={dep.color||"#94a3b8"} opacity={0.7}/>
          </marker>
        </defs>
      </g>
    );
  }).filter(Boolean);

  return (
    <svg style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:20 }}
      width="100%" height="100%">
      {lines}
    </svg>
  );
}

// ─── Main Missions Component ──────────────────────────────────────────────────
export default function Missions({ missions, setMissions, syncStatus }) {
  const w = useWindowWidth();
  const mobile  = w < 640;
  const tablet  = w < 900;

  const [zoomIdx, setZoomIdx]   = useState(0);
  const [sel, setSel]           = useState(null); // { type, missionId, swimlaneId?, itemId? }
  const [addingPhase, setAddingPhase]         = useState(null); // { missionId, swimlaneId }
  const [newPhase, setNewPhase]               = useState({ name:"", start:0, duration:3, rag:"G", color:"#6366f1", notes:"" });
  const [addingMilestone, setAddingMilestone] = useState(null);
  const [newMilestone, setNewMilestone]       = useState({ name:"", month:0, color:"#f59e0b", notes:"" });
  const [addingText, setAddingText]           = useState(null);
  const [newText, setNewText]                 = useState("");
  const [addingDep, setAddingDep]             = useState(null); // { missionId, fromId }
  const [addingMission, setAddingMission]     = useState(false);
  const [newMissionName, setNewMissionName]   = useState("");
  const [addingSwimlane, setAddingSwimlane]   = useState(null); // missionId
  const [newSwimlaneName, setNewSwimlaneName] = useState("");

  const zoom   = ZOOM_LEVELS[zoomIdx];
  const MONTHS = ALL_MONTHS.slice(0, zoom.months);
  const COL    = zoom.col;
  const ROW    = 44;
  const LBL    = mobile ? 140 : tablet ? 180 : 220;

  // ── Updater helpers ──
  const updateMission = (missionId, fn) =>
    setMissions(prev => prev.map(m => m.id !== missionId ? m : fn(m)));

  const updateSwimlane = (missionId, swimlaneId, fn) =>
    updateMission(missionId, m => ({
      ...m, swimlanes: m.swimlanes.map(sl => sl.id !== swimlaneId ? sl : fn(sl))
    }));

  // ── Add mission ──
  const doAddMission = () => {
    if (!newMissionName.trim()) return;
    const idx = missions.length % MISSION_COLORS.length;
    setMissions(prev => [...prev, {
      id: uid(), name: newMissionName.trim(), subtitle: "",
      color: MISSION_COLORS[idx], rag:"G", owner:"", notes:"",
      collapsed:false, swimlanes:[], dependencies:[],
    }]);
    setNewMissionName(""); setAddingMission(false);
  };

  // ── Add swimlane ──
  const doAddSwimlane = (missionId) => {
    if (!newSwimlaneName.trim()) return;
    const mission = missions.find(m => m.id === missionId);
    const idx = (mission?.swimlanes?.length || 0) % MISSION_COLORS.length;
    updateMission(missionId, m => ({
      ...m, swimlanes: [...m.swimlanes, {
        id: uid(), name: newSwimlaneName.trim(),
        color: MISSION_COLORS[idx], phases:[], milestones:[], textRows:[],
      }]
    }));
    setNewSwimlaneName(""); setAddingSwimlane(null);
  };

  // ── Add phase ──
  const doAddPhase = (missionId, swimlaneId) => {
    if (!newPhase.name.trim()) return;
    updateSwimlane(missionId, swimlaneId, sl => ({
      ...sl, phases: [...sl.phases, { ...newPhase, id: uid() }]
    }));
    setNewPhase({ name:"", start:0, duration:3, rag:"G", color:"#6366f1", notes:"" });
    setAddingPhase(null);
  };

  // ── Add milestone ──
  const doAddMilestone = (missionId, swimlaneId) => {
    if (!newMilestone.name.trim()) return;
    updateSwimlane(missionId, swimlaneId, sl => ({
      ...sl, milestones: [...sl.milestones, { ...newMilestone, id: uid() }]
    }));
    setNewMilestone({ name:"", month:0, color:"#f59e0b", notes:"" });
    setAddingMilestone(null);
  };

  // ── Add text row ──
  const doAddText = (missionId, swimlaneId) => {
    if (!newText.trim()) return;
    updateSwimlane(missionId, swimlaneId, sl => ({
      ...sl, textRows: [...(sl.textRows||[]), { id: uid(), text: newText.trim(), color:"#64748b" }]
    }));
    setNewText(""); setAddingText(null);
  };

  // ── Add dependency ──
  const doAddDep = (missionId, toId) => {
    if (!addingDep || addingDep.fromId === toId) { setAddingDep(null); return; }
    updateMission(missionId, m => ({
      ...m, dependencies: [...(m.dependencies||[]), {
        id: uid(), fromId: addingDep.fromId, toId, color:"#94a3b8"
      }]
    }));
    setAddingDep(null);
  };

  // ── Generic field update ──
  const handleUpdate = (type, missionId, swimlaneId, itemId, field, value) => {
    if (type === "mission") {
      updateMission(missionId, m => ({ ...m, [field]: value }));
    } else if (type === "swimlane") {
      updateSwimlane(missionId, swimlaneId, sl => ({ ...sl, [field]: value }));
    } else if (type === "phase") {
      updateSwimlane(missionId, swimlaneId, sl => ({
        ...sl, phases: sl.phases.map(ph => ph.id !== itemId ? ph : { ...ph, [field]: value })
      }));
    } else if (type === "milestone") {
      updateSwimlane(missionId, swimlaneId, sl => ({
        ...sl, milestones: sl.milestones.map(ms => ms.id !== itemId ? ms : { ...ms, [field]: value })
      }));
    } else if (type === "textrow") {
      updateSwimlane(missionId, swimlaneId, sl => ({
        ...sl, textRows: (sl.textRows||[]).map(tr => tr.id !== itemId ? tr : { ...tr, [field]: value })
      }));
    } else if (type === "dep") {
      updateMission(missionId, m => ({
        ...m, dependencies: (m.dependencies||[]).map(d => d.id !== itemId ? d : { ...d, [field]: value })
      }));
    }
  };

  // ── Delete helpers ──
  const doDelete = (type, missionId, swimlaneId, itemId) => {
    if (type === "mission") {
      if (!window.confirm("Delete this mission and all its data?")) return;
      setMissions(prev => prev.filter(m => m.id !== missionId));
    } else if (type === "swimlane") {
      if (!window.confirm("Delete this swimlane and all its phases?")) return;
      updateMission(missionId, m => ({ ...m, swimlanes: m.swimlanes.filter(sl => sl.id !== swimlaneId) }));
    } else if (type === "phase") {
      updateSwimlane(missionId, swimlaneId, sl => ({ ...sl, phases: sl.phases.filter(ph => ph.id !== itemId) }));
    } else if (type === "milestone") {
      updateSwimlane(missionId, swimlaneId, sl => ({ ...sl, milestones: sl.milestones.filter(ms => ms.id !== itemId) }));
    } else if (type === "textrow") {
      updateSwimlane(missionId, swimlaneId, sl => ({ ...sl, textRows: (sl.textRows||[]).filter(tr => tr.id !== itemId) }));
    } else if (type === "dep") {
      updateMission(missionId, m => ({ ...m, dependencies: (m.dependencies||[]).filter(d => d.id !== itemId) }));
    }
    setSel(null);
  };

  // ── Drag phases ──
  const handleDrag = (e, missionId, swimlaneId, phase, mode) => {
    e.preventDefault(); e.stopPropagation();
    const orig = { start: phase.start, duration: phase.duration };
    const sx = e.touches ? e.touches[0].clientX : e.clientX;
    const onMove = ev => {
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const dm = Math.round((cx - sx) / COL);
      updateSwimlane(missionId, swimlaneId, sl => ({
        ...sl, phases: sl.phases.map(ph => {
          if (ph.id !== phase.id) return ph;
          if (mode === "move") return { ...ph, start: Math.max(0, orig.start + dm) };
          if (mode === "left")  return { ...ph, start: Math.max(0, orig.start + dm), duration: Math.max(1, orig.duration - dm) };
          if (mode === "right") return { ...ph, duration: Math.max(1, orig.duration + dm) };
          return ph;
        })
      }));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onUp);
    };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive:false }); window.addEventListener("touchend", onUp);
  };

  // ── Render detail panel ──
  const renderPanel = () => {
    if (!sel) return null;
    const mission = missions.find(m => m.id === sel.missionId);
    if (!mission) return null;

    if (sel.type === "mission") {
      return (
        <PanelShell title={mission.name} subtitle="Mission" color={mission.color} onClose={() => setSel(null)}>
          <TextField label="Mission Name" value={mission.name} onChange={v => handleUpdate("mission", sel.missionId, null, null, "name", v)} />
          <TextField label="Subtitle" value={mission.subtitle||""} onChange={v => handleUpdate("mission", sel.missionId, null, null, "subtitle", v)} />
          <TextField label="Owner" value={mission.owner} onChange={v => handleUpdate("mission", sel.missionId, null, null, "owner", v)} placeholder="Enter name..." />
          <RagSelector value={mission.rag} onChange={v => handleUpdate("mission", sel.missionId, null, null, "rag", v)} />
          <TextField label="Notes" value={mission.notes} onChange={v => handleUpdate("mission", sel.missionId, null, null, "notes", v)} rows={4} placeholder="Mission notes..." />
          <ColorPicker value={mission.color} onChange={v => handleUpdate("mission", sel.missionId, null, null, "color", v)} />
          {/* Dependencies list */}
          {(mission.dependencies||[]).length > 0 && (
            <Field label="Dependencies">
              {(mission.dependencies||[]).map(dep => {
                const allItems = mission.swimlanes.flatMap(sl => [
                  ...(sl.phases||[]).map(ph => ({ id:ph.id, name:ph.name, lane:sl.name })),
                  ...(sl.milestones||[]).map(ms => ({ id:ms.id, name:ms.name, lane:sl.name })),
                ]);
                const from = allItems.find(x => x.id === dep.fromId);
                const to   = allItems.find(x => x.id === dep.toId);
                return (
                  <div key={dep.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 0", borderBottom:"1px solid #f1f5f9", fontSize:11 }}>
                    <span style={{ flex:1, color:"#374151" }}>{from?.name||"?"} → {to?.name||"?"}</span>
                    <button onClick={() => doDelete("dep", sel.missionId, null, dep.id)} style={{ background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:13 }}>×</button>
                  </div>
                );
              })}
            </Field>
          )}
          <div style={{ marginTop:8, paddingTop:16, borderTop:"1px solid #f1f5f9" }}>
            <button onClick={() => doDelete("mission", sel.missionId)} style={{ ...BS("#dc2626"), width:"100%", padding:"8px" }}>
              🗑 Delete Mission
            </button>
          </div>
        </PanelShell>
      );
    }

    const swimlane = mission.swimlanes.find(sl => sl.id === sel.swimlaneId);

    if (sel.type === "swimlane" && swimlane) {
      return (
        <PanelShell title={swimlane.name} subtitle={mission.name} color={swimlane.color} onClose={() => setSel(null)}>
          <TextField label="Swimlane Name" value={swimlane.name} onChange={v => handleUpdate("swimlane", sel.missionId, sel.swimlaneId, null, "name", v)} />
          <ColorPicker value={swimlane.color} onChange={v => handleUpdate("swimlane", sel.missionId, sel.swimlaneId, null, "color", v)} />
          <div style={{ marginTop:8, paddingTop:16, borderTop:"1px solid #f1f5f9" }}>
            <button onClick={() => doDelete("swimlane", sel.missionId, sel.swimlaneId)} style={{ ...BS("#dc2626"), width:"100%", padding:"8px" }}>
              🗑 Delete Swimlane
            </button>
          </div>
        </PanelShell>
      );
    }

    if (sel.type === "phase" && swimlane) {
      const phase = swimlane.phases.find(ph => ph.id === sel.itemId);
      if (!phase) return null;
      return (
        <PanelShell title={phase.name} subtitle={`${mission.name} / ${swimlane.name}`} color={swimlane.color} onClose={() => setSel(null)}>
          <TextField label="Phase Name" value={phase.name} onChange={v => handleUpdate("phase", sel.missionId, sel.swimlaneId, sel.itemId, "name", v)} />
          <RagSelector value={phase.rag} onChange={v => handleUpdate("phase", sel.missionId, sel.swimlaneId, sel.itemId, "rag", v)} />
          <ColorPicker value={phase.color} onChange={v => handleUpdate("phase", sel.missionId, sel.swimlaneId, sel.itemId, "color", v)} />
          <Field label="Start Month">
            <select value={phase.start} onChange={e => handleUpdate("phase", sel.missionId, sel.swimlaneId, sel.itemId, "start", +e.target.value)} style={{ ...IS,width:"100%" }}>
              {ALL_MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </Field>
          <Field label="Duration (months)">
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input type="range" min={1} max={36} value={phase.duration}
                onChange={e => handleUpdate("phase", sel.missionId, sel.swimlaneId, sel.itemId, "duration", +e.target.value)}
                style={{ flex:1 }}/>
              <span style={{ fontSize:13, fontWeight:600, color:"#374151", minWidth:32 }}>{phase.duration}mo</span>
            </div>
          </Field>
          <TextField label="Notes" value={phase.notes} onChange={v => handleUpdate("phase", sel.missionId, sel.swimlaneId, sel.itemId, "notes", v)} rows={3} />
          {/* Add dependency from this phase */}
          <Field label="Add Dependency">
            <button
              onClick={() => { setAddingDep({ missionId: sel.missionId, fromId: sel.itemId }); setSel(null); }}
              style={{ ...BS("#6366f1"), width:"100%" }}>
              ⬡ Draw arrow from this phase
            </button>
            {addingDep?.fromId === sel.itemId && (
              <div style={{ fontSize:11, color:"#6366f1", marginTop:6 }}>Now click a phase or milestone to connect to…</div>
            )}
          </Field>
          <div style={{ marginTop:8, paddingTop:16, borderTop:"1px solid #f1f5f9" }}>
            <button onClick={() => doDelete("phase", sel.missionId, sel.swimlaneId, sel.itemId)} style={{ ...BS("#dc2626"), width:"100%", padding:"8px" }}>
              🗑 Delete Phase
            </button>
          </div>
        </PanelShell>
      );
    }

    if (sel.type === "milestone" && swimlane) {
      const ms = swimlane.milestones.find(m => m.id === sel.itemId);
      if (!ms) return null;
      return (
        <PanelShell title={ms.name||"Milestone"} subtitle={`${mission.name} / ${swimlane.name}`} color={ms.color} onClose={() => setSel(null)}>
          <TextField label="Milestone Name" value={ms.name} onChange={v => handleUpdate("milestone", sel.missionId, sel.swimlaneId, sel.itemId, "name", v)} />
          <Field label="Month">
            <select value={ms.month} onChange={e => handleUpdate("milestone", sel.missionId, sel.swimlaneId, sel.itemId, "month", +e.target.value)} style={{ ...IS,width:"100%" }}>
              {ALL_MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </Field>
          <ColorPicker value={ms.color} onChange={v => handleUpdate("milestone", sel.missionId, sel.swimlaneId, sel.itemId, "color", v)} diamond />
          <TextField label="Notes" value={ms.notes} onChange={v => handleUpdate("milestone", sel.missionId, sel.swimlaneId, sel.itemId, "notes", v)} rows={3} />
          <Field label="Add Dependency">
            <button onClick={() => { setAddingDep({ missionId: sel.missionId, fromId: sel.itemId }); setSel(null); }}
              style={{ ...BS("#6366f1"), width:"100%" }}>
              ⬡ Draw arrow from this milestone
            </button>
          </Field>
          <div style={{ marginTop:8, paddingTop:16, borderTop:"1px solid #f1f5f9" }}>
            <button onClick={() => doDelete("milestone", sel.missionId, sel.swimlaneId, sel.itemId)} style={{ ...BS("#dc2626"), width:"100%", padding:"8px" }}>
              🗑 Delete Milestone
            </button>
          </div>
        </PanelShell>
      );
    }

    if (sel.type === "textrow" && swimlane) {
      const tr = (swimlane.textRows||[]).find(t => t.id === sel.itemId);
      if (!tr) return null;
      return (
        <PanelShell title="Text Note" subtitle={`${mission.name} / ${swimlane.name}`} color={swimlane.color} onClose={() => setSel(null)}>
          <TextField label="Text" value={tr.text} onChange={v => handleUpdate("textrow", sel.missionId, sel.swimlaneId, sel.itemId, "text", v)} rows={3} />
          <ColorPicker value={tr.color} onChange={v => handleUpdate("textrow", sel.missionId, sel.swimlaneId, sel.itemId, "color", v)} />
          <div style={{ marginTop:8, paddingTop:16, borderTop:"1px solid #f1f5f9" }}>
            <button onClick={() => doDelete("textrow", sel.missionId, sel.swimlaneId, sel.itemId)} style={{ ...BS("#dc2626"), width:"100%", padding:"8px" }}>
              🗑 Delete Note
            </button>
          </div>
        </PanelShell>
      );
    }

    return null;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex:1, overflowX:"auto", overflowY:"auto", position:"relative" }}>

      {/* Zoom controls */}
      <div style={{ position:"sticky", top:0, zIndex:30, background:"#f8fafc", borderBottom:"1px solid #e2e8f0",
        padding:"6px 16px", display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:10, color:"#94a3b8", fontWeight:600, letterSpacing:"0.1em" }}>ZOOM</span>
        {ZOOM_LEVELS.map((z,i) => (
          <button key={i} onClick={() => setZoomIdx(i)} style={{
            padding:"3px 10px", borderRadius:16,
            border:`1px solid ${i===zoomIdx?"#6366f1":"#e2e8f0"}`,
            background:i===zoomIdx?"#eef2ff":"#fff",
            color:i===zoomIdx?"#4f46e5":"#64748b",
            fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:i===zoomIdx?700:400,
          }}>{z.label}</button>
        ))}
        <div style={{ marginLeft:"auto", fontSize:11, color:"#94a3b8" }}>
          {addingDep ? <span style={{ color:"#6366f1", fontWeight:600 }}>⬡ Click a phase or milestone to connect →</span> : ""}
        </div>
        {addingDep && (
          <button onClick={() => setAddingDep(null)} style={{ ...BS("#94a3b8"), padding:"3px 10px" }}>Cancel</button>
        )}
      </div>

      {/* Missions */}
      {missions.map((mission, mIdx) => {
        const totalRows = mission.swimlanes.length;
        const boardH = totalRows * ROW;

        return (
          <div key={mission.id} style={{ marginBottom:32 }}>

            {/* Mission header */}
            <div style={{
              display:"flex", alignItems:"center", gap:10,
              padding:"10px 16px", background:`${mission.color}0d`,
              borderTop:`3px solid ${mission.color}`,
              borderBottom:`1px solid ${mission.color}33`,
              cursor:"pointer",
            }} onClick={() => updateMission(mission.id, m => ({ ...m, collapsed:!m.collapsed }))}>
              <span style={{ color:mission.color, fontSize:9 }}>{mission.collapsed ? "▶" : "▼"}</span>
              <div style={{ width:12, height:12, borderRadius:3, background:mission.color, flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <span style={{ fontSize:14, fontWeight:700, color:"#0f172a" }}>{mission.name}</span>
                {mission.subtitle && <span style={{ fontSize:11, color:"#64748b", marginLeft:10 }}>{mission.subtitle}</span>}
              </div>
              {mission.owner && <span style={{ fontSize:11, color:"#64748b" }}>{mission.owner}</span>}
              <RagBadge rag={mission.rag} small />
              <button onClick={e => { e.stopPropagation(); setSel({ type:"mission", missionId:mission.id }); }}
                style={{ background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:14, padding:"2px 6px" }} title="Edit mission">✎</button>
            </div>

            {/* Board */}
            {!mission.collapsed && (
              <div style={{ overflowX:"auto" }}>
                <div style={{ minWidth: LBL + MONTHS.length * COL + 2, position:"relative" }}>

                  {/* Month header */}
                  <div style={{ display:"flex", position:"sticky", top:42, zIndex:25, background:"#fff",
                    borderBottom:"2px solid #e2e8f0", height:28 }}>
                    <div style={{ width:LBL, flexShrink:0, background:"#fff", borderRight:"2px solid #e2e8f0",
                      display:"flex", alignItems:"center", padding:"0 12px",
                      fontSize:10, fontWeight:700, color:"#64748b" }}>
                      SWIMLANE
                    </div>
                    {MONTHS.map((m,i) => (
                      <div key={i} style={{
                        width:COL, flexShrink:0, fontSize:9, color: i===TODAY_IDX?"#3b82f6":"#94a3b8",
                        fontWeight:i===TODAY_IDX?700:400, display:"flex", alignItems:"center",
                        justifyContent:"center", borderLeft:"1px solid #f1f5f9",
                        background:i===TODAY_IDX?"#eff6ff":"transparent",
                      }}>{m}</div>
                    ))}
                  </div>

                  {/* Swimlane rows — all in one relative container for SVG overlay */}
                  <div style={{ position:"relative" }}>
                    <DependencyLines
                      missions={missions} activeMissionId={mission.id}
                      COL={COL} ROW={ROW} LBL={LBL} zoomMonths={MONTHS.length}
                    />

                    {mission.swimlanes.map((sl, slIdx) => {
                      const isAddingPhaseHere      = addingPhase?.missionId === mission.id && addingPhase?.swimlaneId === sl.id;
                      const isAddingMilestoneHere  = addingMilestone?.missionId === mission.id && addingMilestone?.swimlaneId === sl.id;
                      const isAddingTextHere       = addingText?.missionId === mission.id && addingText?.swimlaneId === sl.id;

                      return (
                        <div key={sl.id}>
                          {/* Swimlane row */}
                          <div style={{ display:"flex", alignItems:"stretch",
                            borderBottom:"1px solid #f1f5f9", minHeight:ROW, background:"#fff" }}>

                            {/* Label */}
                            <div style={{
                              width:LBL, flexShrink:0,
                              borderRight:`2px solid ${sl.color}44`,
                              borderLeft:`3px solid ${sl.color}`,
                              padding:"0 6px 0 10px",
                              display:"flex", alignItems:"center", gap:5,
                              background:`${sl.color}06`,
                            }}>
                              <span style={{ fontSize:11, fontWeight:600, color:"#374151", flex:1,
                                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{sl.name}</span>
                              <button onClick={() => setSel({ type:"swimlane", missionId:mission.id, swimlaneId:sl.id })}
                                style={{ background:"none",border:"none",color:"#cbd5e1",cursor:"pointer",fontSize:12,padding:"1px 3px",flexShrink:0 }} title="Edit swimlane">✎</button>
                              {/* Add buttons */}
                              <button title="Add phase"
                                onClick={() => { setAddingPhase({ missionId:mission.id, swimlaneId:sl.id }); setNewPhase({ name:"",start:0,duration:3,rag:"G",color:sl.color,notes:"" }); }}
                                style={{ background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:4,color:"#3b82f6",cursor:"pointer",fontSize:11,padding:"1px 6px",fontFamily:"monospace",lineHeight:1.5,flexShrink:0 }}>+</button>
                              <button title="Add milestone"
                                onClick={() => { setAddingMilestone({ missionId:mission.id, swimlaneId:sl.id }); setNewMilestone({ name:"",month:0,color:"#f59e0b",notes:"" }); }}
                                style={{ background:"#fffbeb",border:"1px solid #fde68a",borderRadius:4,color:"#d97706",cursor:"pointer",fontSize:11,padding:"1px 5px",fontFamily:"monospace",lineHeight:1.5,flexShrink:0 }}>◆</button>
                              <button title="Add text note"
                                onClick={() => { setAddingText({ missionId:mission.id, swimlaneId:sl.id }); setNewText(""); }}
                                style={{ background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:4,color:"#16a34a",cursor:"pointer",fontSize:11,padding:"1px 5px",lineHeight:1.5,flexShrink:0 }}>T</button>
                            </div>

                            {/* Timeline area */}
                            <div style={{ position:"relative", display:"flex", flex:1 }}>
                              {/* Grid */}
                              {MONTHS.map((_,i) => (
                                <div key={i} style={{ width:COL, height:"100%", flexShrink:0,
                                  borderLeft:"1px solid #f1f5f9",
                                  background:i===TODAY_IDX?"#eff6ff08":"transparent" }}/>
                              ))}

                              {/* Phase bars */}
                              {(sl.phases||[]).map(phase => {
                                if (phase.start >= MONTHS.length) return null;
                                const isSel = sel?.type==="phase" && sel?.itemId===phase.id;
                                const isDepFrom = addingDep?.fromId === phase.id;
                                const visEnd = Math.min(phase.start + phase.duration, MONTHS.length);
                                const bw = (visEnd - phase.start) * COL - 4;
                                return (
                                  <div key={phase.id}
                                    title={`${phase.name} | ${ALL_MONTHS[phase.start]}→${ALL_MONTHS[Math.min(phase.start+phase.duration-1,ALL_MONTHS.length-1)]} | ${RAG[phase.rag].label}`}
                                    style={{
                                      position:"absolute", left:phase.start*COL+2, width:Math.max(bw,20),
                                      top:6, height:ROW-12,
                                      background:`linear-gradient(90deg,${phase.color}ee,${phase.color}99)`,
                                      border:`1px solid ${phase.color}`,
                                      borderLeft:`3px solid ${RAG[phase.rag].color}`,
                                      borderRadius:5, cursor: addingDep ? "crosshair" : "grab",
                                      display:"flex", alignItems:"center", overflow:"hidden",
                                      boxShadow: isSel ? `0 0 0 2px ${RAG[phase.rag].color},0 2px 8px rgba(0,0,0,0.12)` :
                                                 isDepFrom ? `0 0 0 3px #6366f1` : "0 1px 3px rgba(0,0,0,0.1)",
                                      userSelect:"none", zIndex:isSel?5:1, touchAction:"none",
                                    }}
                                    onMouseDown={e => { if (addingDep) return; handleDrag(e, mission.id, sl.id, phase, "move"); }}
                                    onTouchStart={e => { if (addingDep) return; handleDrag(e, mission.id, sl.id, phase, "move"); }}
                                    onClick={e => {
                                      e.stopPropagation();
                                      if (addingDep && addingDep.missionId === mission.id) { doAddDep(mission.id, phase.id); return; }
                                      setSel(isSel ? null : { type:"phase", missionId:mission.id, swimlaneId:sl.id, itemId:phase.id });
                                    }}
                                  >
                                    <div onMouseDown={e=>{e.stopPropagation();if(!addingDep)handleDrag(e,mission.id,sl.id,phase,"left");}}
                                      style={{ position:"absolute",left:0,top:0,width:mobile?14:6,height:"100%",cursor:"ew-resize",zIndex:3,touchAction:"none" }}/>
                                    <span style={{ fontSize:10,color:"#fff",padding:"0 6px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",pointerEvents:"none",textShadow:"0 1px 2px rgba(0,0,0,0.3)",flex:1 }}>
                                      {phase.name}
                                    </span>
                                    <div onMouseDown={e=>{e.stopPropagation();if(!addingDep)handleDrag(e,mission.id,sl.id,phase,"right");}}
                                      style={{ position:"absolute",right:0,top:0,width:mobile?14:6,height:"100%",cursor:"ew-resize",zIndex:3,touchAction:"none" }}/>
                                  </div>
                                );
                              })}

                              {/* Milestone diamonds */}
                              {(sl.milestones||[]).map(ms => {
                                if (ms.month >= MONTHS.length) return null;
                                const isSel = sel?.type==="milestone" && sel?.itemId===ms.id;
                                const sz = 13;
                                const cx = ms.month * COL + COL/2;
                                return (
                                  <div key={ms.id}
                                    title={`◆ ${ms.name}${ms.notes?" — "+ms.notes:""} | ${ALL_MONTHS[ms.month]}`}
                                    onClick={e => {
                                      e.stopPropagation();
                                      if (addingDep && addingDep.missionId === mission.id) { doAddDep(mission.id, ms.id); return; }
                                      setSel(isSel ? null : { type:"milestone", missionId:mission.id, swimlaneId:sl.id, itemId:ms.id });
                                    }}
                                    style={{
                                      position:"absolute", left:cx - sz/2, top:ROW/2 - sz/2,
                                      width:sz, height:sz, transform:"rotate(45deg)",
                                      background:ms.color, border:isSel?"2px solid #0f172a":`2px solid ${ms.color}cc`,
                                      cursor: addingDep ? "crosshair" : "pointer", zIndex:10,
                                      boxShadow:isSel?`0 0 0 3px ${ms.color}66,0 2px 8px rgba(0,0,0,0.2)`:"0 1px 4px rgba(0,0,0,0.2)",
                                    }}
                                  />
                                );
                              })}

                              {/* Text rows */}
                              {(sl.textRows||[]).map(tr => (
                                <div key={tr.id}
                                  onClick={e => { e.stopPropagation(); setSel({ type:"textrow", missionId:mission.id, swimlaneId:sl.id, itemId:tr.id }); }}
                                  style={{
                                    position:"absolute", left:8, top: ROW/2 - 10,
                                    fontSize:11, color:tr.color||"#64748b",
                                    background:"#fff", border:`1px solid ${tr.color||"#e2e8f0"}88`,
                                    borderRadius:4, padding:"2px 8px", cursor:"pointer",
                                    maxWidth: MONTHS.length * COL - 16,
                                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                                    boxShadow:"0 1px 3px rgba(0,0,0,0.06)",
                                  }}>{tr.text}</div>
                              ))}
                            </div>
                          </div>

                          {/* Add phase inline form */}
                          {isAddingPhaseHere && (
                            <div style={{ display:"flex",flexWrap:"wrap",gap:6,padding:"8px 10px 8px 24px",background:"#eff6ff",borderBottom:"1px solid #bfdbfe" }}>
                              <input placeholder="Phase name" value={newPhase.name} onChange={e=>setNewPhase(n=>({...n,name:e.target.value}))} style={IS} autoFocus onKeyDown={e=>e.key==="Enter"&&doAddPhase(mission.id,sl.id)}/>
                              <select value={newPhase.start} onChange={e=>setNewPhase(n=>({...n,start:+e.target.value}))} style={IS}>
                                {ALL_MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
                              </select>
                              <select value={newPhase.duration} onChange={e=>setNewPhase(n=>({...n,duration:+e.target.value}))} style={IS}>
                                {Array.from({length:24},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}mo</option>)}
                              </select>
                              <select value={newPhase.rag} onChange={e=>setNewPhase(n=>({...n,rag:e.target.value}))} style={IS}>
                                <option value="G">On Track</option><option value="A">At Risk</option><option value="R">In Trouble</option>
                              </select>
                              <div style={{ display:"flex",gap:4,alignItems:"center" }}>
                                {PALETTE.map(c=>(<div key={c} onClick={()=>setNewPhase(n=>({...n,color:c}))} style={{ width:16,height:16,borderRadius:3,background:c,cursor:"pointer",border:newPhase.color===c?"2px solid #0f172a":"2px solid transparent" }}/>))}
                              </div>
                              <button onClick={()=>doAddPhase(mission.id,sl.id)} style={BS("#3b82f6")}>Add</button>
                              <button onClick={()=>setAddingPhase(null)} style={BS("#94a3b8")}>Cancel</button>
                            </div>
                          )}

                          {/* Add milestone inline form */}
                          {isAddingMilestoneHere && (
                            <div style={{ display:"flex",flexWrap:"wrap",gap:6,padding:"8px 10px 8px 24px",background:"#fffbeb",borderBottom:"1px solid #fde68a" }}>
                              <input placeholder="Milestone name" value={newMilestone.name} onChange={e=>setNewMilestone(n=>({...n,name:e.target.value}))} style={IS} autoFocus onKeyDown={e=>e.key==="Enter"&&doAddMilestone(mission.id,sl.id)}/>
                              <select value={newMilestone.month} onChange={e=>setNewMilestone(n=>({...n,month:+e.target.value}))} style={IS}>
                                {ALL_MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
                              </select>
                              <div style={{ display:"flex",gap:4,alignItems:"center" }}>
                                {PALETTE.map(c=>(<div key={c} onClick={()=>setNewMilestone(n=>({...n,color:c}))} style={{ width:16,height:16,transform:"rotate(45deg)",background:c,cursor:"pointer",border:newMilestone.color===c?"2px solid #0f172a":"2px solid transparent" }}/>))}
                              </div>
                              <button onClick={()=>doAddMilestone(mission.id,sl.id)} style={BS("#d97706")}>Add ◆</button>
                              <button onClick={()=>setAddingMilestone(null)} style={BS("#94a3b8")}>Cancel</button>
                            </div>
                          )}

                          {/* Add text inline form */}
                          {isAddingTextHere && (
                            <div style={{ display:"flex",gap:6,padding:"8px 10px 8px 24px",background:"#f0fdf4",borderBottom:"1px solid #bbf7d0" }}>
                              <input placeholder="Note text" value={newText} onChange={e=>setNewText(e.target.value)} style={{ ...IS,flex:1 }} autoFocus onKeyDown={e=>e.key==="Enter"&&doAddText(mission.id,sl.id)}/>
                              <button onClick={()=>doAddText(mission.id,sl.id)} style={BS("#16a34a")}>Add</button>
                              <button onClick={()=>setAddingText(null)} style={BS("#94a3b8")}>Cancel</button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Today line */}
                    {TODAY_IDX < MONTHS.length && (
                      <div style={{
                        position:"absolute", left:LBL + TODAY_IDX * COL + COL/2,
                        top:0, bottom:0, width:2,
                        background:"#3b82f688", pointerEvents:"none", zIndex:15,
                      }}/>
                    )}
                  </div>

                  {/* Add swimlane row */}
                  <div style={{ padding:"6px 12px", background:"#f8fafc", borderTop:"1px solid #f1f5f9" }}>
                    {addingSwimlane === mission.id ? (
                      <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                        <input placeholder="Swimlane name" value={newSwimlaneName} onChange={e=>setNewSwimlaneName(e.target.value)}
                          style={{ ...IS,flex:1 }} autoFocus onKeyDown={e=>e.key==="Enter"&&doAddSwimlane(mission.id)}/>
                        <button onClick={()=>doAddSwimlane(mission.id)} style={BS("#6366f1")}>Add</button>
                        <button onClick={()=>setAddingSwimlane(null)} style={BS("#94a3b8")}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={()=>setAddingSwimlane(mission.id)}
                        style={{ background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:11,fontFamily:"inherit" }}>
                        + Add swimlane
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add mission */}
      <div style={{ padding:"12px 16px", background:"#f8fafc", borderTop:"1px solid #e2e8f0" }}>
        {addingMission ? (
          <div style={{ display:"flex",gap:8,alignItems:"center",maxWidth:500 }}>
            <input placeholder="Mission name (e.g. Mission Coastal)" value={newMissionName}
              onChange={e=>setNewMissionName(e.target.value)} style={{ ...IS,flex:1,fontSize:13 }}
              autoFocus onKeyDown={e=>e.key==="Enter"&&doAddMission()}/>
            <button onClick={doAddMission} style={BS("#6366f1")}>Add Mission</button>
            <button onClick={()=>setAddingMission(false)} style={BS("#94a3b8")}>Cancel</button>
          </div>
        ) : (
          <button onClick={()=>setAddingMission(true)}
            style={{ background:"none",border:"1px dashed #cbd5e1",borderRadius:8,color:"#94a3b8",
              cursor:"pointer",fontSize:12,fontFamily:"inherit",padding:"8px 20px" }}>
            + Add Mission
          </button>
        )}
      </div>

      {/* Sync chip */}
      <div style={{ position:"fixed",bottom:16,right:sel?"356px":"16px",
        fontSize:10,fontFamily:"monospace",background:"#fff",padding:"4px 10px",borderRadius:20,
        border:`1px solid ${syncStatus==="synced"?"#bbf7d0":syncStatus==="saving"?"#fde68a":syncStatus==="error"?"#fecaca":"#e2e8f0"}`,
        color:syncStatus==="synced"?"#15803d":syncStatus==="saving"?"#92400e":syncStatus==="error"?"#991b1b":"#94a3b8",
        boxShadow:"0 1px 3px rgba(0,0,0,0.1)", transition:"all 0.3s", zIndex:50,
      }}>
        {syncStatus==="synced"?"✓ Saved":syncStatus==="saving"?"● Saving…":syncStatus==="error"?"✗ Offline":"○ Local"}
      </div>

      {/* Detail panel */}
      {renderPanel()}
    </div>
  );
}
