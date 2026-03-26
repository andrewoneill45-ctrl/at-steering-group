import { useState, useCallback, useRef, useEffect } from "react";
import Missions from "./Missions.jsx";
import SchoolsTab from "./SchoolsTab.jsx";
import MissionDashboard from "./MissionDashboard.jsx";
import {
  ALL_MONTHS, TODAY_IDX, RAG, PALETTE, ZOOM_LEVELS, uid, ragWorst,
  POLICY_SUMMARIES, INITIAL_THEMES
} from "./data.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

const IS = { background:"#fff", border:"1px solid #e2e8f0", borderRadius:6, color:"#374151", padding:"5px 9px", fontSize:11, fontFamily:"inherit", outline:"none" };
const BS = bg => ({ background:bg+"18", border:`1px solid ${bg}66`, borderRadius:6, color:bg, cursor:"pointer", padding:"5px 12px", fontSize:11, fontFamily:"inherit", fontWeight:600 });
const LS = { fontSize:9, letterSpacing:"0.13em", textTransform:"uppercase", color:"#94a3b8", fontWeight:700 };

// ─── Detail Panel ────────────────────────────────────────────────────────────
function DetailPanel({ sel, themes, onClose, onUpdate, onDeletePhase, onDeleteProject, onDeleteTheme }) {
  if (!sel) return null;
  const theme = themes.find(t => t.id === sel.themeId);
  if (!theme) return null;

  if (sel.type === "theme") {
    return (
      <PanelShell title={theme.name} subtitle="Theme" color={theme.color} onClose={onClose}>
        <NameField value={theme.name} onChange={v => onUpdate("theme", sel.themeId, null, null, "name", v)} label="Theme Name" />
        <OwnerField value={theme.owner} onChange={v => onUpdate("theme", sel.themeId, null, null, "owner", v)} />
        <RagSelector value={theme.rag} onChange={v => onUpdate("theme", sel.themeId, null, null, "rag", v)} />
        <NotesField value={theme.notes} onChange={v => onUpdate("theme", sel.themeId, null, null, "notes", v)} label="Theme Notes" />
        <div style={{ marginTop:8, paddingTop:16, borderTop:"1px solid #f1f5f9" }}>
          <button onClick={() => onDeleteTheme(sel.themeId)} style={{ ...BS("#dc2626"), width:"100%", padding:"8px", fontSize:12 }}>
            🗑 Delete Theme &amp; All Projects
          </button>
        </div>
      </PanelShell>
    );
  }

  const proj = theme.projects.find(p => p.id === sel.projId);
  if (!proj) return null;

  if (sel.type === "project") {
    const summary = POLICY_SUMMARIES[proj.id];
    return (
      <PanelShell title={proj.name} subtitle={theme.name} color={theme.color} onClose={onClose}>
        <NameField value={proj.name} onChange={v => onUpdate("project", sel.themeId, sel.projId, null, "name", v)} label="Project Name" />
        <OwnerField value={proj.owner} onChange={v => onUpdate("project", sel.themeId, sel.projId, null, "owner", v)} />
        <RagSelector value={proj.rag} onChange={v => onUpdate("project", sel.themeId, sel.projId, null, "rag", v)} />
        {summary && (
          <div style={{ marginBottom:14, padding:"12px 14px", background:"#faf5ff", borderRadius:8, border:"1px solid #e9d5ff" }}>
            <div style={{ fontSize:9, fontWeight:700, color:"#7c3aed", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>📄 White Paper Summary</div>
            <div style={{ fontSize:12, color:"#4c1d95", lineHeight:1.7 }}>{summary}</div>
          </div>
        )}
        <div style={{ marginBottom:14 }}>
          <div style={LS}>Deliverables</div>
          <div style={{ fontSize:12, color:"#64748b", lineHeight:1.6, marginTop:5, padding:"10px 12px", background:"#f8fafc", borderRadius:8 }}>{proj.deliverables}</div>
        </div>
        {proj.funding && (
          <div style={{ marginBottom:14, padding:"10px 12px", background:"#f0fdf4", borderRadius:8, border:"1px solid #bbf7d0" }}>
            <div style={{ fontSize:9, fontWeight:700, color:"#15803d", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>💰 Funding Commitment</div>
            <div style={{ fontSize:12, color:"#166534", lineHeight:1.5 }}>{proj.funding}</div>
          </div>
        )}
        <NotesField value={proj.status} onChange={v => onUpdate("project", sel.themeId, sel.projId, null, "status", v)} label="Update / Status" rows={2} />
        <div style={{ marginBottom:14 }}>
          <div style={LS}>Phases</div>
          {proj.phases.map(ph => (
            <div key={ph.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 0", borderBottom:"1px solid #f1f5f9" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, cursor:"pointer", minWidth:0 }}
                onClick={() => onUpdate("__sel", sel.themeId, sel.projId, ph.id)}>
                <span style={{ width:10,height:10,borderRadius:2,background:ph.color,flexShrink:0 }}/>
                <span style={{ fontSize:12,color:"#374151",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{ph.name}</span>
                {ph.notes && <span title="Has notes" style={{ fontSize:11,color:"#f59e0b" }}>📝</span>}
                <RagDot rag={ph.rag} size={7} />
                <span style={{ fontSize:10,color:"#94a3b8",fontFamily:"monospace",flexShrink:0 }}>
                  {ALL_MONTHS[ph.start]}→{ALL_MONTHS[Math.min(ph.start+ph.duration-1,ALL_MONTHS.length-1)]}
                </span>
              </div>
            </div>
          ))}
        </div>
        <NotesField value={proj.notes} onChange={v => onUpdate("project", sel.themeId, sel.projId, null, "notes", v)} label="Notes" />
        <div style={{ paddingTop:8, paddingBottom:8 }}>
          <button onClick={() => onDeleteProject(sel.themeId, sel.projId)} style={{ ...BS("#dc2626"), width:"100%", padding:"8px", fontSize:12 }}>
            🗑 Delete Project
          </button>
        </div>
      </PanelShell>
    );
  }

  // ── Milestone panel ──
  if (sel.type === "milestone") {
    const ms = proj?.milestones?.find(m => m.id === sel.phaseId);
    if (!ms) return null;
    return (
      <PanelShell title={ms.name || "Milestone"} subtitle={`${theme.name} / ${proj.name}`} color={ms.color} onClose={onClose}>
        <NameField value={ms.name} onChange={v => onUpdate("milestone", sel.themeId, sel.projId, sel.phaseId, "name", v)} label="Milestone Name" />
        <div style={{ marginBottom:13 }}>
          <div style={LS}>Month</div>
          <select value={ms.month} onChange={e => onUpdate("milestone", sel.themeId, sel.projId, sel.phaseId, "month", +e.target.value)} style={{ ...IS,width:"100%",marginTop:5 }}>
            {ALL_MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:13 }}>
          <div style={LS}>Colour</div>
          <div style={{ display:"flex", gap:5, marginTop:5, flexWrap:"wrap" }}>
            {PALETTE.map(c => (
              <div key={c} onClick={() => onUpdate("milestone", sel.themeId, sel.projId, sel.phaseId, "color", c)}
                style={{ width:22,height:22,transform:"rotate(45deg)",background:c,cursor:"pointer",border:ms.color===c?"3px solid #0f172a":"2px solid transparent" }}/>
            ))}
          </div>
        </div>
        <NotesField value={ms.notes} onChange={v => onUpdate("milestone", sel.themeId, sel.projId, sel.phaseId, "notes", v)} label="Notes" rows={3} />
        <div style={{ marginTop:8, paddingTop:16, borderTop:"1px solid #f1f5f9" }}>
          <button onClick={() => onDeletePhase(sel.themeId, sel.projId, sel.phaseId, "milestone")}
            style={{ ...BS("#dc2626"), width:"100%", padding:"8px", fontSize:12 }}>
            🗑 Delete Milestone
          </button>
        </div>
      </PanelShell>
    );
  }

  const phase = proj?.phases.find(ph => ph.id === sel.phaseId);
  if (!phase) return null;

  return (
    <PanelShell title={phase.name} subtitle={`${theme.name} / ${proj.name}`} color={theme.color} onClose={onClose}>
      <NameField value={phase.name} onChange={v => onUpdate("phase", sel.themeId, sel.projId, sel.phaseId, "name", v)} label="Phase Name" />
      <RagSelector value={phase.rag} onChange={v => onUpdate("phase", sel.themeId, sel.projId, sel.phaseId, "rag", v)} />
      <div style={{ marginBottom:13 }}>
        <div style={LS}>Phase Colour</div>
        <div style={{ display:"flex", gap:5, marginTop:5, flexWrap:"wrap" }}>
          {PALETTE.map(c => (
            <div key={c} onClick={() => onUpdate("phase", sel.themeId, sel.projId, sel.phaseId, "color", c)}
              style={{ width:22,height:22,borderRadius:4,background:c,cursor:"pointer",border:phase.color===c?"3px solid #0f172a":"2px solid transparent" }}/>
          ))}
        </div>
      </div>
      <div style={{ marginBottom:13 }}>
        <div style={LS}>Start Month</div>
        <select value={phase.start} onChange={e => onUpdate("phase", sel.themeId, sel.projId, sel.phaseId, "start", +e.target.value)} style={{ ...IS,width:"100%",marginTop:5 }}>
          {ALL_MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
        </select>
      </div>
      <div style={{ marginBottom:13 }}>
        <div style={LS}>Duration (months)</div>
        <div style={{ display:"flex", gap:6, alignItems:"center", marginTop:5 }}>
          <input type="range" min={1} max={36} value={phase.duration}
            onChange={e => onUpdate("phase", sel.themeId, sel.projId, sel.phaseId, "duration", +e.target.value)}
            style={{ flex:1 }} />
          <span style={{ fontSize:13, fontWeight:700, color:"#0f172a", minWidth:28, textAlign:"center" }}>{phase.duration}</span>
          <div style={{ display:"flex", gap:4 }}>
            <button onClick={() => onUpdate("phase",sel.themeId,sel.projId,sel.phaseId,"duration",Math.max(1,phase.duration-1))} style={{ ...BS("#64748b"),padding:"3px 8px",fontSize:14 }}>−</button>
            <button onClick={() => onUpdate("phase",sel.themeId,sel.projId,sel.phaseId,"duration",Math.min(36,phase.duration+1))} style={{ ...BS("#64748b"),padding:"3px 8px",fontSize:14 }}>+</button>
          </div>
        </div>
      </div>
      <div style={{ background:"#f8fafc", borderRadius:8, padding:"10px 12px", marginBottom:14, fontSize:12, color:"#64748b", lineHeight:1.9 }}>
        <div>Start: <strong style={{ color:"#0f172a" }}>{ALL_MONTHS[phase.start]}</strong></div>
        <div>End: <strong style={{ color:"#0f172a" }}>{ALL_MONTHS[Math.min(phase.start+phase.duration-1,ALL_MONTHS.length-1)]}</strong></div>
        <div>Duration: <strong style={{ color:"#0f172a" }}>{phase.duration} month{phase.duration>1?"s":""}</strong></div>
      </div>
      <NotesField value={phase.notes||""} onChange={v => onUpdate("phase", sel.themeId, sel.projId, sel.phaseId, "notes", v)} label="Phase Notes" rows={3} />
      <div style={{ paddingTop:8, borderTop:"1px solid #f1f5f9" }}>
        <button onClick={() => onDeletePhase(sel.themeId, sel.projId, sel.phaseId)}
          style={{ ...BS("#dc2626"), width:"100%", padding:"9px", fontSize:12 }}>
          Delete Phase
        </button>
      </div>
    </PanelShell>
  );
}

function useWindowWidth() {
  const [w, setW] = useState(() => typeof window !== "undefined" ? window.innerWidth : 1200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useState(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  });
  return w;
}

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
        <div style={{ borderTop:`4px solid ${color||"#3b82f6"}`, padding:"20px 22px 16px", borderBottom:"1px solid #f1f5f9", flexShrink:0 }}>
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

function RagSelector({ value, onChange }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={LS}>RAG Status</div>
      <div style={{ display:"flex",gap:6,marginTop:6 }}>
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
    </div>
  );
}
function OwnerField({ value, onChange }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={LS}>DfE Director / Owner</div>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder="Enter name..."
        style={{ ...IS,width:"100%",marginTop:5 }} />
    </div>
  );
}
function NameField({ value, onChange, label="Name" }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={LS}>{label}</div>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder="Enter name..."
        style={{ ...IS,width:"100%",marginTop:5,fontSize:13,fontWeight:600 }} />
    </div>
  );
}
function NotesField({ value, onChange, label, rows=4 }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={LS}>{label}</div>
      <textarea value={value} onChange={e=>onChange(e.target.value)} rows={rows} placeholder="Add notes..."
        style={{ ...IS,width:"100%",marginTop:5,resize:"vertical",lineHeight:1.5 }} />
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ themes, onNavigateToProject }) {
  const w = useWindowWidth();
  const mobile  = w < 640;
  const tablet  = w < 900;

  // Collapsible state — themes keyed by id, panels by name
  const [collapsedThemes,   setCollapsedThemes]   = useState({});
  const [attentionOpen,     setAttentionOpen]     = useState(true);
  const [fundingOpen,       setFundingOpen]       = useState(true);

  const toggleThemeDash = id => setCollapsedThemes(p => ({ ...p, [id]: !p[id] }));

  const allProjects = themes.flatMap(t => t.projects);
  const allPhases   = allProjects.flatMap(p => p.phases);
  const c = (arr, r) => arr.filter(x => x === r).length;
  const projRags  = allProjects.map(p => p.rag);

  const redItems   = allProjects.filter(p => p.rag === "R");
  const amberItems = allProjects.filter(p => p.rag === "A");
  const atRisk = [...redItems, ...amberItems]
    .map(p => ({ ...p, themeId: themes.find(t => t.projects.some(x => x.id === p.id))?.id }));

  const onTrack  = c(projRags,"G");
  const atRiskN  = c(projRags,"A");
  const trouble  = c(projRags,"R");
  const total    = allProjects.length;
  const pctGood  = Math.round((onTrack / total) * 100);

  // Reusable collapsible panel header
  const SectionHeader = ({ label, badge, open, onToggle, danger }) => (
    <div onClick={onToggle} style={{
      padding:"13px 20px", borderBottom: open ? "1px solid #f1f5f9" : "none",
      display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer",
      userSelect:"none",
    }}
      onMouseEnter={e=>e.currentTarget.style.background="#fafbfc"}
      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
      <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color: danger?"#991b1b":"#0f172a" }}>{label}</span>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        {badge && <span style={{ fontSize:10, color:"#94a3b8" }}>{badge}</span>}
        <span style={{ fontSize:11, color:"#94a3b8", lineHeight:1 }}>{open ? "▲" : "▼"}</span>
      </div>
    </div>
  );

  return (
    <div style={{ padding: mobile ? "20px 16px" : tablet ? "24px 24px" : "32px 40px", maxWidth:1400, margin:"0 auto" }}>

      {/* ── Programme Status ── */}
      <div style={{ marginBottom: mobile ? 24 : 36 }}>
        <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color:"#94a3b8", marginBottom:16 }}>
          Programme Status — {new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}
        </div>

        {/* Metric cards row */}
        <div style={{ display:"grid", gridTemplateColumns: mobile ? "1fr 1fr" : "2fr 1fr 1fr 1fr", gap: mobile ? 10 : 14, marginBottom:16 }}>

          {/* Big % card */}
          <div style={{
            background:"linear-gradient(135deg,#0f172a 0%,#1e293b 100%)",
            borderRadius:14, padding: mobile ? "18px 20px" : "22px 28px",
            display:"flex", flexDirection:"column", justifyContent:"space-between",
            gridRow: mobile ? "1 / 3" : "auto",
            minHeight: mobile ? 130 : "auto",
          }}>
            <div style={{ fontSize:10, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color:"#64748b", marginBottom:8 }}>On Track</div>
            <div>
              <div style={{ fontSize: mobile ? 52 : 64, fontWeight:800, color:"#fff", lineHeight:1, letterSpacing:"-3px" }}>{pctGood}<span style={{ fontSize: mobile ? 28:36, letterSpacing:"-1px" }}>%</span></div>
              <div style={{ fontSize:11, color:"#64748b", marginTop:6 }}>{onTrack} of {total} projects</div>
            </div>
          </div>

          {/* On Track */}
          <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:14, padding: mobile ? "16px 18px" : "20px 22px" }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#16a34a", marginBottom:8 }}>On Track</div>
            <div style={{ fontSize: mobile ? 36 : 44, fontWeight:800, color:"#15803d", lineHeight:1, letterSpacing:"-2px" }}>{onTrack}</div>
            <div style={{ fontSize:10, color:"#16a34a", marginTop:6, opacity:0.8 }}>projects</div>
          </div>

          {/* At Risk */}
          <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:14, padding: mobile ? "16px 18px" : "20px 22px" }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#d97706", marginBottom:8 }}>At Risk</div>
            <div style={{ fontSize: mobile ? 36 : 44, fontWeight:800, color:"#92400e", lineHeight:1, letterSpacing:"-2px" }}>{atRiskN}</div>
            <div style={{ fontSize:10, color:"#d97706", marginTop:6, opacity:0.8 }}>projects</div>
          </div>

          {/* In Trouble */}
          <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:14, padding: mobile ? "16px 18px" : "20px 22px" }}>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#dc2626", marginBottom:8 }}>In Trouble</div>
            <div style={{ fontSize: mobile ? 36 : 44, fontWeight:800, color:"#991b1b", lineHeight:1, letterSpacing:"-2px" }}>{trouble}</div>
            <div style={{ fontSize:10, color:"#dc2626", marginTop:6, opacity:0.8 }}>projects</div>
          </div>
        </div>

        {/* Progress bar + meta */}
        <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e8ecf0", padding:"14px 20px", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
          <div style={{ display:"flex", gap:2, height:10, borderRadius:6, overflow:"hidden", background:"#f1f5f9", marginBottom:10 }}>
            <div style={{ width:`${(onTrack/total)*100}%`, background:"linear-gradient(90deg,#16a34a,#22c55e)", transition:"width 0.5s" }}/>
            <div style={{ width:`${(atRiskN/total)*100}%`, background:"linear-gradient(90deg,#d97706,#fbbf24)", transition:"width 0.5s" }}/>
            <div style={{ width:`${(trouble/total)*100}%`, background:"linear-gradient(90deg,#dc2626,#f87171)", transition:"width 0.5s" }}/>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
            <div style={{ display:"flex", gap:16 }}>
              {[{c:"#16a34a",l:"On Track"},{c:"#d97706",l:"At Risk"},{c:"#dc2626",l:"In Trouble"}].map(({c:col,l}) => (
                <div key={l} style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ width:8, height:8, borderRadius:2, background:col, display:"inline-block" }}/>
                  <span style={{ fontSize:10, color:"#64748b" }}>{l}</span>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:16 }}>
              <span style={{ fontSize:10, color:"#94a3b8" }}>{total} projects</span>
              <span style={{ fontSize:10, color:"#94a3b8" }}>{themes.length} themes</span>
              <span style={{ fontSize:10, color:"#94a3b8" }}>{allPhases.length} delivery phases</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns: tablet ? "1fr" : "1fr 360px", gap: mobile ? 16 : 28, alignItems:"start" }}>

        {/* ── Theme table ── */}
        <div>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#94a3b8", marginBottom:14 }}>Delivery Themes</div>
          <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e8ecf0", overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
            {/* Table header */}
            <div style={{ display:"grid", gridTemplateColumns: mobile ? "24px 1fr 60px" : "24px 1fr 80px 80px 80px 80px", padding:"10px 20px", borderBottom:"1px solid #f1f5f9", background:"#f8fafc" }}>
              <div/>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#94a3b8" }}>Theme</div>
              {!mobile && <>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#94a3b8", textAlign:"center" }}>On Track</div>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#94a3b8", textAlign:"center" }}>At Risk</div>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#94a3b8", textAlign:"center" }}>Trouble</div>
              </>}
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#94a3b8", textAlign:"center" }}>RAG</div>
            </div>

            {themes.map((theme, idx) => {
              const pRags = theme.projects.map(p => p.rag);
              const tg = c(pRags,"G"), ta = c(pRags,"A"), tr = c(pRags,"R");
              const worst = ragWorst([theme.rag, ...pRags]);
              const isLast = idx === themes.length - 1;
              const isCollapsed = !!collapsedThemes[theme.id];
              return (
                <div key={theme.id} style={{ borderBottom: isLast ? "none" : "1px solid #f1f5f9" }}>
                  {/* Theme row */}
                  <div style={{
                    display:"grid", gridTemplateColumns: mobile ? "24px 1fr 60px" : "24px 1fr 80px 80px 80px 80px",
                    padding: mobile ? "12px 16px" : "13px 20px",
                    background:"#fff", cursor:"pointer", userSelect:"none",
                  }}
                    onClick={() => toggleThemeDash(theme.id)}
                    onMouseEnter={e=>e.currentTarget.style.background="#fafbfc"}
                    onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                    {/* Collapse chevron */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <span style={{ fontSize:8, color:theme.color, fontWeight:700 }}>{isCollapsed ? "▶" : "▼"}</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:3, height:32, background:theme.color, borderRadius:2, flexShrink:0 }}/>
                      <div>
                        <div style={{ fontSize: mobile ? 13 : 12, fontWeight:700, color:"#0f172a" }}>{theme.name}</div>
                        {!mobile && <div style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>{theme.subtitle}</div>}
                      </div>
                    </div>
                    {!mobile && <>
                      <div style={{ textAlign:"center", alignSelf:"center" }}>
                        <span style={{ fontSize:15, fontWeight:700, color: tg>0?"#16a34a":"#cbd5e1" }}>{tg}</span>
                      </div>
                      <div style={{ textAlign:"center", alignSelf:"center" }}>
                        <span style={{ fontSize:15, fontWeight:700, color: ta>0?"#d97706":"#cbd5e1" }}>{ta}</span>
                      </div>
                      <div style={{ textAlign:"center", alignSelf:"center" }}>
                        <span style={{ fontSize:15, fontWeight:700, color: tr>0?"#dc2626":"#cbd5e1" }}>{tr}</span>
                      </div>
                    </>}
                    <div style={{ textAlign:"center", alignSelf:"center" }}>
                      <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:RAG[worst].color }}/>
                    </div>
                  </div>

                  {/* Project sub-rows — collapsible */}
                  {!isCollapsed && !mobile && theme.projects.map((p, pi) => (
                    <div key={p.id}
                      onClick={() => onNavigateToProject(theme.id, p.id)}
                      style={{ display:"grid", gridTemplateColumns:"24px 1fr 80px 80px 80px 80px",
                        padding:"9px 20px 9px 20px",
                        borderTop:"1px solid #f8fafc",
                        cursor:"pointer", transition:"background 0.1s",
                        background: pi%2===0 ? "#fafbfc" : "#fff" }}
                      onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"}
                      onMouseLeave={e=>e.currentTarget.style.background=pi%2===0?"#fafbfc":"#fff"}>
                      <div/>
                      <div style={{ display:"flex", alignItems:"center", gap:8, paddingLeft:28 }}>
                        <span style={{ width:5, height:5, borderRadius:"50%", background:RAG[p.rag].color, flexShrink:0 }}/>
                        <span style={{ fontSize:11, color:"#374151", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</span>
                        {p.funding && <span style={{ fontSize:10, color:"#94a3b8", flexShrink:0, marginLeft:4 }}>· {p.funding.split("—")[0].trim()}</span>}
                      </div>
                      <div style={{ gridColumn:"6", textAlign:"center", alignSelf:"center" }}>
                        <span style={{ display:"inline-block", width:7, height:7, borderRadius:"50%", background:RAG[p.rag].color }}/>
                      </div>
                    </div>
                  ))}
                  {!isCollapsed && mobile && theme.projects.map((p, pi) => (
                    <div key={p.id}
                      onClick={() => onNavigateToProject(theme.id, p.id)}
                      style={{ display:"flex", alignItems:"center", gap:10,
                        padding:"10px 16px 10px 44px",
                        borderTop:"1px solid #f8fafc",
                        cursor:"pointer", minHeight:44 }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:RAG[p.rag].color, flexShrink:0 }}/>
                      <span style={{ fontSize:12, color:"#374151", flex:1 }}>{p.name}</span>
                      <span style={{ fontSize:10, color:"#94a3b8" }}>→</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right column ── */}
        <div style={{ display:"flex", flexDirection:"column", gap: mobile ? 16 : 20 }}>

          {atRisk.length > 0 && (
            <div style={{ background:"#fff", borderRadius:12, border:"1px solid #fecaca", overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
              <SectionHeader
                label="Requires Attention"
                badge={`${trouble} red · ${atRiskN} amber`}
                open={attentionOpen}
                onToggle={() => setAttentionOpen(o => !o)}
                danger
              />
              {attentionOpen && (
                <div style={{ padding:"8px 0" }}>
                  {atRisk.slice(0, mobile ? 8 : 12).map((item, i) => (
                    <div key={i}
                      onClick={() => onNavigateToProject(item.themeId, item.id)}
                      style={{ display:"flex", alignItems:"center", gap:12, padding: mobile ? "11px 20px" : "9px 20px",
                        cursor:"pointer", transition:"background 0.1s", minHeight: mobile ? 48 : "auto",
                        borderLeft:`3px solid ${RAG[item.rag].color}`,
                        borderBottom: i < Math.min(atRisk.length, mobile?8:12)-1 ? "1px solid #f8fafc":"none" }}
                      onMouseEnter={e=>e.currentTarget.style.background="#fff8f8"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize: mobile ? 12 : 11, fontWeight:600, color:"#0f172a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</div>
                        <div style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>{themes.find(t=>t.id===item.themeId)?.name}</div>
                      </div>
                      <span style={{ fontSize:10, fontWeight:600, color:RAG[item.rag].color, flexShrink:0 }}>{RAG[item.rag].label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e8ecf0", overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
            <SectionHeader
              label="Largest Funding Commitments"
              open={fundingOpen}
              onToggle={() => setFundingOpen(o => !o)}
            />
            {fundingOpen && (
              <div style={{ padding:"8px 0" }}>
                {allProjects.filter(p=>p.funding).slice(0, mobile ? 6 : 8).map((p,i,arr) => {
                  const themeColor = themes.find(t=>t.projects.some(x=>x.id===p.id))?.color || "#94a3b8";
                  return (
                    <div key={p.id}
                      onClick={() => onNavigateToProject(themes.find(t=>t.projects.some(x=>x.id===p.id))?.id, p.id)}
                      style={{ display:"flex", alignItems:"center", gap:12, padding: mobile ? "11px 20px" : "9px 20px",
                        cursor:"pointer", transition:"background 0.1s", minHeight: mobile ? 48 : "auto",
                        borderBottom: i < arr.length-1 ? "1px solid #f8fafc":"none" }}
                      onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{ width:3, height:28, background:themeColor, borderRadius:2, flexShrink:0 }}/>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize: mobile ? 12 : 11, fontWeight:600, color:"#0f172a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                        <div style={{ fontSize:10, color:"#64748b", marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.funding}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function SteeringGroup({ themes, setThemes, syncStatus = "local", missions=[], setMissions=()=>{}, missionsSyncStatus="local", missionSchools=[], setMissionSchools=()=>{}, schoolsSyncStatus="local" }) {
  const [view, setView]             = useState("missiondash");
  const [sel, setSel]               = useState(null);
  const [filter, setFilter]         = useState("ALL");
  const [zoomIdx, setZoomIdx]       = useState(0);
  const [addingPhase, setAddingPhase]     = useState(null);
  const [newPhase, setNewPhase]           = useState({name:"",start:0,duration:3,rag:"G",color:"#3b82f6",notes:""});
  const [addingMilestone, setAddingMilestone] = useState(null);
  const [newMilestone, setNewMilestone]       = useState({name:"",month:0,color:"#f59e0b",notes:""});
  const [addingProject, setAddingProject] = useState(null);
  const [newProjName, setNewProjName]     = useState("");
  const [highlightProjId, setHighlightProjId] = useState(null);
  const highlightRef = useRef(null);

  const w = useWindowWidth();
  const mobile  = w < 640;
  const tablet  = w < 900;

  const zoom = ZOOM_LEVELS[zoomIdx];
  const MONTHS = ALL_MONTHS.slice(0, zoom.months);
  const COL = zoom.col;
  const ROW = 40;
  const LBL = mobile ? 160 : tablet ? 200 : 248;

  // ── Undo / Redo history ──
  const [history, setHistory] = useState([themes]);
  const [histIdx, setHistIdx] = useState(0);
  const histRef = useRef({ history:[themes], idx:0 });
  // Always holds latest themes so toggles never read stale state
  const themesRef = useRef(themes);
  useEffect(() => { themesRef.current = themes; }, [themes]);

  const pushThemes = useCallback((updater, skipHistory=false) => {
    // Always use functional updater so React resolves against true latest state
    setThemes(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      themesRef.current = next;
      if (!skipHistory) {
        const trimmed = histRef.current.history.slice(0, histRef.current.idx + 1);
        const newHist = [...trimmed, next].slice(-50);
        histRef.current.history = newHist;
        histRef.current.idx = newHist.length - 1;
        // Schedule state updates outside the setThemes call
        setTimeout(() => {
          setHistory([...newHist]);
          setHistIdx(newHist.length - 1);
        }, 0);
      }
      return next;
    });
  }, [setThemes]);

  const canUndo = histIdx > 0;
  const canRedo = histIdx < history.length - 1;

  const doUndo = useCallback(() => {
    if (histRef.current.idx <= 0) return;
    const newIdx = histRef.current.idx - 1;
    histRef.current.idx = newIdx;
    setHistIdx(newIdx);
    setThemes(histRef.current.history[newIdx]);
  }, [setThemes]);

  const doRedo = useCallback(() => {
    if (histRef.current.idx >= histRef.current.history.length - 1) return;
    const newIdx = histRef.current.idx + 1;
    histRef.current.idx = newIdx;
    setHistIdx(newIdx);
    setThemes(histRef.current.history[newIdx]);
  }, [setThemes]);

  // ── Navigate from dashboard → timelines and scroll to project
  const handleNavigateToProject = (themeId, projId) => {
    setView("timelines");
    setHighlightProjId(projId);
    // Ensure theme and project are expanded
    setThemes(prev => prev.map(t => t.id !== themeId ? t : {
      ...t, collapsed:false,
      projects: t.projects.map(p => p.id !== projId ? p : { ...p, collapsed:false })
    }));
    setTimeout(() => {
      if (highlightRef.current) highlightRef.current.scrollIntoView({ behavior:"smooth", block:"center" });
      setTimeout(() => setHighlightProjId(null), 2500);
    }, 150);
  };

  // ── Update dispatcher ──
  const handleUpdate = useCallback((type, themeId, projId, phaseId, field, value) => {
    if (type === "__sel") { setSel({type:"phase",themeId,projId,phaseId}); return; }
    pushThemes(prev => prev.map(t => {
      if (t.id !== themeId) return t;
      if (type === "theme") return { ...t,[field]:value };
      return { ...t, projects: t.projects.map(p => {
        if (p.id !== projId) return p;
        if (type === "project") return { ...p,[field]:value };
        if (type === "milestone") return { ...p, milestones:(p.milestones||[]).map(m=>m.id!==phaseId?m:{...m,[field]:value}) };
        return { ...p, phases: p.phases.map(ph => ph.id!==phaseId ? ph : {...ph,[field]:value}) };
      })};
    }));
    if (type==="phase") setSel(s => s?.phaseId===phaseId ? {...s} : s);
  }, [pushThemes]);

  // ── Drag (mouse + touch) ──
  const handleDrag = (e, themeId, projId, phase, mode) => {
    e.preventDefault(); e.stopPropagation();
    const orig = {start:phase.start, duration:phase.duration};
    const sx = e.touches ? e.touches[0].clientX : e.clientX;
    const onMove = ev => {
      const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const dm = Math.round((cx - sx) / COL);
      let ns=orig.start, nd=orig.duration;
      if (mode==="move")  ns=Math.max(0,Math.min(ALL_MONTHS.length-1,orig.start+dm));
      if (mode==="right") nd=Math.max(1,Math.min(ALL_MONTHS.length-orig.start,orig.duration+dm));
      if (mode==="left")  { const d=Math.min(dm,orig.duration-1); ns=Math.max(0,orig.start+d); nd=Math.max(1,orig.duration-d); }
      pushThemes(prev => prev.map(t => t.id!==themeId?t:{...t,projects:t.projects.map(p=>p.id!==projId?p:{...p,phases:p.phases.map(ph=>ph.id!==phase.id?ph:{...ph,start:ns,duration:nd})})}), true);
    };
    const onUp = () => {
      window.removeEventListener("mousemove",onMove); window.removeEventListener("mouseup",onUp);
      window.removeEventListener("touchmove",onMove); window.removeEventListener("touchend",onUp);
    };
    window.addEventListener("mousemove",onMove); window.addEventListener("mouseup",onUp);
    window.addEventListener("touchmove",onMove,{passive:false}); window.addEventListener("touchend",onUp);
  };

  const toggleTheme   = id => pushThemes(p=>p.map(t=>t.id===id?{...t,collapsed:!t.collapsed}:t), true);
  const toggleProject = (tid,pid) => pushThemes(p=>p.map(t=>t.id!==tid?t:{...t,projects:t.projects.map(p=>p.id!==pid?p:{...p,collapsed:!p.collapsed})}), true);

  const allCollapsed = themes.every(t => t.collapsed);
  const collapseAll  = () => pushThemes(p=>p.map(t=>({...t, collapsed:true,  projects:t.projects.map(p=>({...p,collapsed:true}))})),  true);
  const expandAll    = () => pushThemes(p=>p.map(t=>({...t, collapsed:false, projects:t.projects.map(p=>({...p,collapsed:false}))})), true);

  const doAddPhase = (themeId,projId) => {
    if (!newPhase.name.trim()) return;
    pushThemes(prev=>prev.map(t=>t.id!==themeId?t:{...t,projects:t.projects.map(p=>p.id!==projId?p:{...p,phases:[...p.phases,{...newPhase,id:uid()}]})}));
    setNewPhase({name:"",start:0,duration:3,rag:"G",color:"#3b82f6",notes:""}); setAddingPhase(null);
  };
  const doAddProject = (themeId) => {
    if (!newProjName.trim()) return;
    pushThemes(prev=>prev.map(t=>t.id!==themeId?t:{...t,projects:[...t.projects,{id:uid(),name:newProjName,owner:"",rag:"G",notes:"",status:"",funding:"",deliverables:"",collapsed:false,phases:[],milestones:[]}]}));
    setNewProjName(""); setAddingProject(null);
  };
  const doAddMilestone = (themeId, projId) => {
    if (!newMilestone.name.trim()) return;
    pushThemes(prev=>prev.map(t=>t.id!==themeId?t:{...t,projects:t.projects.map(p=>p.id!==projId?p:{...p,milestones:[...(p.milestones||[]),{...newMilestone,id:uid()}]})}));
    setNewMilestone({name:"",month:0,color:"#f59e0b",notes:""}); setAddingMilestone(null);
  };
  const doDeleteMilestone = (themeId, projId, msId) => {
    pushThemes(prev=>prev.map(t=>t.id!==themeId?t:{...t,projects:t.projects.map(p=>p.id!==projId?p:{...p,milestones:(p.milestones||[]).filter(m=>m.id!==msId)})}));
    setSel(null);
  };

  // ── Delete handlers ──
  const doDeletePhase = (themeId, projId, phaseId, kind="phase") => {
    if (kind === "milestone") {
      pushThemes(prev => prev.map(t => t.id!==themeId?t:{...t,projects:t.projects.map(p=>p.id!==projId?p:{...p,milestones:(p.milestones||[]).filter(m=>m.id!==phaseId)})}));
    } else {
      pushThemes(prev => prev.map(t => t.id!==themeId?t:{...t,projects:t.projects.map(p=>p.id!==projId?p:{...p,phases:p.phases.filter(ph=>ph.id!==phaseId)})}));
    }
    setSel(null);
  };
  const doDeleteProject = (themeId, projId) => {
    if (!window.confirm("Delete this project and all its phases? This can be undone.")) return;
    pushThemes(prev => prev.map(t => t.id!==themeId?t:{...t,projects:t.projects.filter(p=>p.id!==projId)}));
    setSel(null);
  };
  const doDeleteTheme = (themeId) => {
    if (!window.confirm("Delete this entire theme and all its projects? This can be undone.")) return;
    pushThemes(prev => prev.filter(t => t.id!==themeId));
    setSel(null);
  };

  const allPhases = themes.flatMap(t=>t.projects.flatMap(p=>p.phases));
  const ragCounts = {G:0,A:0,R:0};
  allPhases.forEach(ph=>ragCounts[ph.rag]++);

  const visThemes = filter==="ALL" ? themes :
    themes.map(t=>({...t,projects:t.projects.map(p=>({...p,phases:p.phases.filter(ph=>ph.rag===filter)})).filter(p=>p.phases.length>0)})).filter(t=>t.projects.length>0);

  return (
    <div style={{ fontFamily:"'Outfit','Segoe UI',sans-serif", background:"#f8fafc", minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:#f1f5f9; }
        ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:3px; }
        input[type=range] { accent-color:#3b82f6; }
      `}</style>

      {/* Header */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding: mobile ? "0 12px" : "0 24px",
        display:"flex", alignItems:"center", gap:0,
        height: mobile ? 50 : 58, flexShrink:0, boxShadow:"0 1px 3px rgba(0,0,0,0.05)" }}>

        {/* Logo + title */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginRight: mobile ? 12 : 24 }}>
          <div style={{ width: mobile?26:30, height: mobile?26:30, borderRadius:8,
            background:"linear-gradient(135deg,#3b82f6,#6366f1)",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"#fff", fontSize: mobile?11:13, fontWeight:700, flexShrink:0 }}>AT</div>
          {!mobile && (
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"#0f172a", lineHeight:1 }}>Missions</div>
              <div style={{ fontSize:10, color:"#94a3b8", lineHeight:1, marginTop:2 }}>Achieve & Thrive 2026</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <div style={{ display:"flex", gap:2 }}>
          {[
            { id:"missiondash", label:"Overview" },
            { id:"missions",    label:"Mission Planner" },
            { id:"schools",     label:"Schools", badge: missionSchools.length || null },
          ].map(({ id, label, badge }) => (
            <button key={id} onClick={()=>setView(id)} style={{
              padding: mobile ? "5px 10px" : "5px 14px", borderRadius:20, border:"none", cursor:"pointer",
              background:view===id?"#0f172a":"transparent",
              color:view===id?"#fff":"#64748b",
              fontSize: mobile ? 11 : 12, fontWeight:view===id?600:400, fontFamily:"inherit",
              display:"flex", alignItems:"center", gap:5,
            }}>
              {label}
              {badge ? (
                <span style={{ background:view===id?"#3b82f6":"#e2e8f0", color:view===id?"#fff":"#64748b",
                  borderRadius:10, fontSize:9, fontWeight:700, padding:"1px 6px", lineHeight:1.6 }}>
                  {badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>



        {/* Zoom — hidden on mobile */}
        {(view==="timelines"||view==="missions") && !mobile && (
          <div style={{ display:"flex", gap:4, alignItems:"center", marginLeft:14 }}>
            {!tablet && <span style={{ fontSize:10, color:"#94a3b8", fontWeight:600 }}>ZOOM</span>}
            {ZOOM_LEVELS.map((z,i) => (
              <button key={i} onClick={()=>setZoomIdx(i)} style={{
                padding:"3px 9px", borderRadius:16,
                border:`1px solid ${i===zoomIdx?"#3b82f6":"#e2e8f0"}`,
                background:i===zoomIdx?"#eff6ff":"#fff",
                color:i===zoomIdx?"#1d4ed8":"#64748b",
                fontSize:11, cursor:"pointer", fontFamily:"inherit", fontWeight:i===zoomIdx?700:400,
              }}>{z.label}</button>
            ))}
          </div>
        )}

                {view==="timelines" && !mobile && (
          <button onClick={allCollapsed ? expandAll : collapseAll} style={{
            marginLeft:10, padding:"3px 11px", borderRadius:16, cursor:"pointer",
            border:"1px solid #e2e8f0", background:"#fff", color:"#64748b",
            fontSize:11, fontFamily:"inherit", fontWeight:500,
            display:"flex", alignItems:"center", gap:5,
          }}>
            <span style={{ fontSize:10 }}>{allCollapsed ? "▼▼" : "▶▶"}</span>
            {allCollapsed ? "Expand all" : "Collapse all"}
          </button>
        )}

        {/* RAG filters */}
        <div style={{ display:"flex", gap: mobile?4:6, alignItems:"center", marginLeft:"auto" }}>
          {["G","A","R"].map(k=>(
            <button key={k} onClick={()=>setFilter(f=>f===k?"ALL":k)} style={{
              display:"flex", alignItems:"center", gap: mobile?3:5,
              padding: mobile ? "5px 8px" : "4px 11px", borderRadius:20,
              border:`1px solid ${filter===k?RAG[k].color:RAG[k].color+"44"}`,
              background:filter===k?RAG[k].light:"#fff",
              color:filter===k?RAG[k].text:"#64748b",
              cursor:"pointer", fontFamily:"inherit", fontSize:11, fontWeight:filter===k?700:400,
              minHeight: mobile ? 36 : "auto",
            }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:RAG[k].color, flexShrink:0 }}/>
              {!mobile && <span>{RAG[k].label}</span>}
              <strong>{ragCounts[k]}</strong>
            </button>
          ))}
          {!mobile && (
            <button onClick={()=>setFilter("ALL")} style={{
              padding:"4px 11px", borderRadius:20,
              border:`1px solid ${filter==="ALL"?"#3b82f6":"#e2e8f0"}`,
              background:filter==="ALL"?"#eff6ff":"#fff", color:filter==="ALL"?"#1d4ed8":"#64748b",
              cursor:"pointer", fontFamily:"inherit", fontSize:11, fontWeight:filter==="ALL"?700:400,
            }}>All ({allPhases.length})</button>
          )}
        </div>
      </div>

      {/* Mobile zoom bar */}
            {view==="missiondash" ? (
        <MissionDashboard missions={missions} missionSchools={missionSchools} themes={themes} />
      ) : view==="missions" ? (
        <Missions missions={missions} setMissions={setMissions} syncStatus={missionsSyncStatus} />
      ) : view==="schools" ? (
        <SchoolsTab missions={missions} missionSchools={missionSchools} setMissionSchools={setMissionSchools} schoolsSyncStatus={schoolsSyncStatus} />
      ) : (
        <div style={{ flex:1,overflowX:"auto",paddingBottom:60 }}>
          <div style={{ minWidth:LBL+MONTHS.length*COL+40 }}>

            {/* Month header */}
            <div style={{ display:"flex",position:"sticky",top:0,zIndex:20,background:"#fff",borderBottom:"2px solid #e2e8f0",boxShadow:"0 2px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ width:LBL,flexShrink:0,padding:"9px 14px",fontSize:10,color:"#94a3b8",letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:600 }}>Project / Swimlane</div>
              {MONTHS.map((m,i)=>(
                <div key={i} style={{
                  width:COL,flexShrink:0,textAlign:"center",padding:"9px 0",
                  borderLeft:"1px solid #f1f5f9",
                  color:i===TODAY_IDX?"#3b82f6":"#94a3b8",
                  fontWeight:i===TODAY_IDX?700:400,
                  background:i===TODAY_IDX?"#eff6ff":"transparent",
                  fontFamily:"monospace",
                  fontSize: COL < 36 ? 9 : 10,
                }}>
                  {COL < 32 ? m.replace(" ","'") : m}
                </div>
              ))}
            </div>

            {visThemes.map(theme => {
              return (
                <div key={theme.id}>
                  {/* Theme header */}
                  <div style={{ display:"flex",alignItems:"center",background:`${theme.color}0d`,borderBottom:`1px solid ${theme.color}33`,borderTop:`3px solid ${theme.color}`,cursor:"pointer" }}
                    onClick={()=>toggleTheme(theme.id)}>
                    <div style={{ width:LBL,flexShrink:0,padding:"9px 12px",display:"flex",alignItems:"center",gap:8 }}>
                      <span style={{ color:theme.color,fontSize:8,flexShrink:0 }}>{theme.collapsed?"▶":"▼"}</span>
                      <span style={{ width:10,height:10,borderRadius:2,background:theme.color,flexShrink:0 }}/>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:12,fontWeight:700,color:"#0f172a" }}>{theme.name}</div>
                        <div style={{ fontSize:10,color:"#64748b" }}>{theme.subtitle}</div>
                      </div>
                      <RagBadge rag={theme.rag} small />
                      <button onClick={e=>{e.stopPropagation();setSel({type:"theme",themeId:theme.id})}}
                        style={{ background:"none",border:"none",color:"#94a3b8",cursor:"pointer",padding:"2px 4px",fontSize:12,lineHeight:1,flexShrink:0 }}>✎</button>
                    </div>
                    {MONTHS.map((_,i)=>(
                      <div key={i} style={{ width:COL,height:40,flexShrink:0,borderLeft:`1px solid ${theme.color}22`,background:i===TODAY_IDX?theme.color+"11":"transparent" }}/>
                    ))}
                  </div>

                  {/* Projects */}
                  {!theme.collapsed && theme.projects.map(proj => {
                    const isAddingHere = addingPhase?.themeId===theme.id && addingPhase?.pid===proj.id;
                    const isHighlighted = proj.id === highlightProjId;
                    const hasNotes = proj.notes || proj.phases.some(ph=>ph.notes);

                    return (
                      <div key={proj.id} ref={isHighlighted ? highlightRef : null}
                        style={{ outline:isHighlighted?"3px solid #3b82f6":"none", outlineOffset:"-1px", transition:"outline 0.3s" }}>

                        {/* Project header row — clickable title opens panel */}
                        <div style={{ display:"flex", alignItems:"stretch", background:"#fafafa", borderBottom:"1px solid #f1f5f9",
                          transition:"background 0.15s", cursor:"pointer", position:"relative" }}
                          onClick={()=>setSel({type:"project",themeId:theme.id,projId:proj.id})}>
                          {/* Label column */}
                          <div style={{ width:LBL, flexShrink:0, padding:"7px 10px 7px 22px", display:"flex", alignItems:"center", gap:6, zIndex:2, minHeight:38 }}>
                            <span onClick={e=>{e.stopPropagation();toggleProject(theme.id,proj.id)}}
                              style={{ color:"#94a3b8",fontSize:8,flexShrink:0,cursor:"pointer",padding:"2px 4px" }}>
                              {proj.collapsed?"▶":"▼"}
                            </span>
                            <RagDot rag={proj.rag} size={7} />
                            <span style={{ fontSize:11,fontWeight:600,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1 }}>{proj.name}</span>
                            {hasNotes && <span title="Has notes" style={{ fontSize:11,flexShrink:0 }}>📝</span>}

                          </div>

                          {proj.collapsed ? (
                            /* Collapsed: summary text flows freely, row height is natural */
                            <div style={{ flex:1, minWidth:0, position:"relative", padding:"6px 12px 6px 8px", display:"flex", alignItems:"center" }}>
                              {/* Faint grid lines behind the text */}
                              <div style={{ position:"absolute", inset:0, display:"flex", pointerEvents:"none" }}>
                                {MONTHS.map((_,i)=>(
                                  <div key={i} style={{ width:COL, flexShrink:0, borderLeft:"1px solid #f1f5f9", height:"100%",
                                    background:i===TODAY_IDX?"#eff6ff":"transparent" }}/>
                                ))}
                              </div>
                              <p style={{
                                position:"relative", zIndex:1, margin:0,
                                fontSize:10.5, lineHeight:1.55, color:"#475569",
                                whiteSpace:"normal", wordBreak:"break-word",
                                pointerEvents:"none",
                              }}>
                                {proj.deliverables}
                                {proj.deliverables && proj.funding && (
                                  <span style={{ color:"#cbd5e1", margin:"0 7px" }}>·</span>
                                )}
                                {proj.funding && (
                                  <span style={{ color:"#b45309", fontWeight:600 }}>💰 {proj.funding}</span>
                                )}
                              </p>
                            </div>
                          ) : (
                            /* Expanded: plain grid cells, fixed height */
                            <div style={{ display:"flex", flex:1 }}>
                              {MONTHS.map((_,i)=>(
                                <div key={i} style={{ width:COL, flexShrink:0, height:38, borderLeft:"1px solid #f1f5f9",
                                  background:i===TODAY_IDX?"#eff6ff":"transparent" }}/>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Phase swimlane */}
                        {!proj.collapsed && (
                          <div style={{ display:"flex",alignItems:"center",borderBottom:"1px solid #f1f5f9",minHeight:ROW,background:"#fff" }}>
                            <div style={{ width:LBL,flexShrink:0,padding:"0 6px 0 30px",display:"flex",alignItems:"center",gap:4 }}>
                              <span style={{ fontSize:10,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                                {proj.owner
                                  ? <span style={{ color:"#64748b",fontWeight:500 }}>{proj.owner}</span>
                                  : <span style={{ color:"#cbd5e1",fontStyle:"italic" }}>phases</span>
                                }
                              </span>
                              <button title="Add phase"
                                onClick={()=>{setAddingPhase({themeId:theme.id,pid:proj.id});setNewPhase({name:"",start:0,duration:3,rag:"G",color:theme.color,notes:""});}}
                                style={{ background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:4,color:"#3b82f6",cursor:"pointer",fontSize:12,padding:"1px 7px",fontFamily:"monospace",lineHeight:1.5,flexShrink:0 }}>+</button>
                              <button title="Add milestone"
                                onClick={()=>{setAddingMilestone({themeId:theme.id,pid:proj.id});setNewMilestone({name:"",month:0,color:"#f59e0b",notes:""});}}
                                style={{ background:"#fffbeb",border:"1px solid #fde68a",borderRadius:4,color:"#d97706",cursor:"pointer",fontSize:12,padding:"1px 7px",fontFamily:"monospace",lineHeight:1.5,flexShrink:0 }}>◆</button>
                            </div>
                            <div style={{ position:"relative",display:"flex" }}>
                              {MONTHS.map((_,i)=>(
                                <div key={i} style={{ width:COL,height:ROW,flexShrink:0,borderLeft:"1px solid #f1f5f9",background:i===TODAY_IDX?"#eff6ff":"transparent" }}/>
                              ))}
                              {proj.phases.map(phase=>{
                                const isSel = sel?.type==="phase" && sel?.phaseId===phase.id;
                                if (phase.start>=MONTHS.length) return null;
                                const visEnd = Math.min(phase.start+phase.duration, MONTHS.length);
                                const bw = (visEnd - phase.start)*COL - 4;
                                const hasPhaseNote = !!phase.notes;
                                return (
                                  <div key={phase.id}
                                    title={`${phase.name}${phase.notes?" 📝 "+phase.notes:""} | ${ALL_MONTHS[phase.start]}→${ALL_MONTHS[Math.min(phase.start+phase.duration-1,ALL_MONTHS.length-1)]} | ${RAG[phase.rag].label}`}
                                    style={{
                                      position:"absolute",left:phase.start*COL+2,width:Math.max(bw,20),
                                      top: mobile ? 4 : 6, height: mobile ? ROW-8 : ROW-12,
                                      background:`linear-gradient(90deg,${phase.color}ee,${phase.color}99)`,
                                      border:`1px solid ${phase.color}`,
                                      borderLeft:`3px solid ${RAG[phase.rag].color}`,
                                      borderRadius:5, cursor:"grab",
                                      display:"flex", alignItems:"center", overflow:"hidden",
                                      boxShadow:isSel?`0 0 0 2px ${RAG[phase.rag].color},0 2px 8px rgba(0,0,0,0.12)`:"0 1px 3px rgba(0,0,0,0.1)",
                                      userSelect:"none", zIndex:isSel?5:1,
                                      touchAction:"none",
                                    }}
                                    onMouseDown={e=>handleDrag(e,theme.id,proj.id,phase,"move")}
                                    onTouchStart={e=>handleDrag(e,theme.id,proj.id,phase,"move")}
                                    onClick={e=>{e.stopPropagation();setSel(isSel?null:{type:"phase",themeId:theme.id,projId:proj.id,phaseId:phase.id});}}
                                  >
                                    <div
                                      onMouseDown={e=>{e.stopPropagation();handleDrag(e,theme.id,proj.id,phase,"left");}}
                                      onTouchStart={e=>{e.stopPropagation();handleDrag(e,theme.id,proj.id,phase,"left");}}
                                      style={{ position:"absolute",left:0,top:0,width: mobile?14:6,height:"100%",cursor:"ew-resize",zIndex:3,touchAction:"none" }}/>
                                    <span style={{ fontSize:10,color:"#fff",padding:"0 6px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",pointerEvents:"none",textShadow:"0 1px 2px rgba(0,0,0,0.3)",flex:1 }}>
                                      {phase.name}
                                    </span>
                                    {hasPhaseNote && (
                                      <span style={{ fontSize:9,marginRight:5,flexShrink:0,pointerEvents:"none",opacity:0.9 }} title={phase.notes}>📝</span>
                                    )}
                                    <div
                                      onMouseDown={e=>{e.stopPropagation();handleDrag(e,theme.id,proj.id,phase,"right");}}
                                      onTouchStart={e=>{e.stopPropagation();handleDrag(e,theme.id,proj.id,phase,"right");}}
                                      style={{ position:"absolute",right:0,top:0,width: mobile?14:6,height:"100%",cursor:"ew-resize",zIndex:3,touchAction:"none" }}/>

                                  </div>
                                );
                              })}
                              {/* Milestone diamonds */}
                              {(proj.milestones||[]).map(ms=>{
                                if (ms.month>=MONTHS.length) return null;
                                const isSel = sel?.type==="milestone" && sel?.phaseId===ms.id;
                                const sz = mobile ? 12 : 14;
                                const cx = ms.month*COL + COL/2;
                                return (
                                  <div key={ms.id}
                                    title={`◆ ${ms.name}${ms.notes?" — "+ms.notes:""} | ${ALL_MONTHS[ms.month]}`}
                                    onClick={e=>{e.stopPropagation();setSel(isSel?null:{type:"milestone",themeId:theme.id,projId:proj.id,phaseId:ms.id});}}
                                    style={{
                                      position:"absolute",
                                      left: cx - sz/2,
                                      top: ROW/2 - sz/2,
                                      width: sz, height: sz,
                                      transform:"rotate(45deg)",
                                      background: ms.color,
                                      border: isSel ? `2px solid #0f172a` : `2px solid ${ms.color}cc`,
                                      cursor:"pointer",
                                      zIndex:10,
                                      boxShadow: isSel ? `0 0 0 3px ${ms.color}66, 0 2px 8px rgba(0,0,0,0.2)` : "0 1px 4px rgba(0,0,0,0.2)",
                                    }}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Add phase form */}
                        {isAddingHere && (
                          <div style={{ display:"flex",flexWrap:"wrap",gap:6,padding:"8px 10px 8px 34px",background:"#eff6ff",borderBottom:"1px solid #bfdbfe" }}>
                            <input placeholder="Phase name" value={newPhase.name} onChange={e=>setNewPhase(n=>({...n,name:e.target.value}))} style={IS} autoFocus/>
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
                            <button onClick={()=>doAddPhase(theme.id,proj.id)} style={BS("#3b82f6")}>Add</button>
                            <button onClick={()=>setAddingPhase(null)} style={BS("#94a3b8")}>Cancel</button>
                          </div>
                        )}
                        {/* Add milestone form */}
                        {addingMilestone?.themeId===theme.id && addingMilestone?.pid===proj.id && (
                          <div style={{ display:"flex",flexWrap:"wrap",gap:6,padding:"8px 10px 8px 34px",background:"#fffbeb",borderBottom:"1px solid #fde68a" }}>
                            <input placeholder="Milestone name" value={newMilestone.name} onChange={e=>setNewMilestone(n=>({...n,name:e.target.value}))} style={IS} autoFocus/>
                            <select value={newMilestone.month} onChange={e=>setNewMilestone(n=>({...n,month:+e.target.value}))} style={IS}>
                              {ALL_MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
                            </select>
                            <div style={{ display:"flex",gap:4,alignItems:"center" }}>
                              {PALETTE.map(c=>(<div key={c} onClick={()=>setNewMilestone(n=>({...n,color:c}))} style={{ width:16,height:16,transform:"rotate(45deg)",background:c,cursor:"pointer",border:newMilestone.color===c?"2px solid #0f172a":"2px solid transparent" }}/>))}
                            </div>
                            <button onClick={()=>doAddMilestone(theme.id,proj.id)} style={BS("#d97706")}>Add ◆</button>
                            <button onClick={()=>setAddingMilestone(null)} style={BS("#94a3b8")}>Cancel</button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add project */}
                  {!theme.collapsed && (
                    <div style={{ borderBottom:`1px solid ${theme.color}22` }}>
                      {addingProject===theme.id ? (
                        <div style={{ padding:"7px 10px 7px 22px",display:"flex",gap:7,alignItems:"center",background:"#f8fafc" }}>
                          <input placeholder="New project name" value={newProjName} onChange={e=>setNewProjName(e.target.value)} style={IS} autoFocus onKeyDown={e=>e.key==="Enter"&&doAddProject(theme.id)}/>
                          <button onClick={()=>doAddProject(theme.id)} style={BS("#3b82f6")}>Add</button>
                          <button onClick={()=>setAddingProject(null)} style={BS("#94a3b8")}>Cancel</button>
                        </div>
                      ) : (
                        <div style={{ padding:"4px 10px 4px 22px" }}>
                          <button onClick={()=>setAddingProject(theme.id)} style={{ background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:11,fontFamily:"inherit" }}>+ Add project</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* Sync status chip */}
      {(view==="timelines"||view==="dashboard") && (
        <div style={{ position:"fixed",bottom:16,right: sel ? (mobile?"0":"356px") : "16px",
          fontSize:10,fontFamily:"monospace",background:"#fff",padding:"4px 10px",borderRadius:20,
          border:`1px solid ${syncStatus==="synced"?"#bbf7d0":syncStatus==="saving"?"#fde68a":syncStatus==="error"?"#fecaca":"#e2e8f0"}`,
          color:syncStatus==="synced"?"#15803d":syncStatus==="saving"?"#92400e":syncStatus==="error"?"#991b1b":"#94a3b8",
          boxShadow:"0 1px 3px rgba(0,0,0,0.1)", transition:"all 0.3s",
        }}>
          {syncStatus==="synced"?"✓ Saved":syncStatus==="saving"?"● Saving…":syncStatus==="error"?"✗ Offline":"○ Local"}
        </div>
      )}
      {/* Today chip */}
      {(view==="timelines"||view==="missions") && (
        <div style={{ position:"fixed",bottom:16,left:16,fontSize:10,color:"#3b82f6",fontFamily:"monospace",background:"#fff",padding:"4px 10px",borderRadius:20,border:"1px solid #bfdbfe",boxShadow:"0 1px 3px rgba(0,0,0,0.1)" }}>
          ◆ Today: {ALL_MONTHS[TODAY_IDX]??"—"}
        </div>
      )}

      <DetailPanel sel={sel} themes={themes} onClose={()=>setSel(null)} onUpdate={handleUpdate} onDeletePhase={doDeletePhase} onDeleteProject={doDeleteProject} onDeleteTheme={doDeleteTheme} />
    </div>
  );
}
