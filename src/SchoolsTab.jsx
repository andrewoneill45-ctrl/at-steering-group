/**
 * SchoolsTab.jsx
 * Embedded school mapping tool for Achieve & Thrive 2026 Steering Group
 * Allows selection of schools, assignment to missions, and cluster analysis
 *
 * Requires in package.json:
 *   "react-map-gl": "^7.x",
 *   "mapbox-gl": "^2.x"
 *
 * Requires env vars:
 *   VITE_MAPBOX_TOKEN
 *   VITE_ANTHROPIC_KEY
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// ─── Config ───────────────────────────────────────────────────────────────────
const MAPBOX_TOKEN  = import.meta.env.VITE_MAPBOX_TOKEN  || "";
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY || "";

const RAG_COLS = { G:"#16a34a", A:"#d97706", R:"#dc2626" };
const IS = { background:"#fff", border:"1px solid #e2e8f0", borderRadius:6, color:"#374151", padding:"5px 9px", fontSize:11, fontFamily:"inherit", outline:"none" };
const BS = bg => ({ background:bg+"18", border:`1px solid ${bg}66`, borderRadius:6, color:bg, cursor:"pointer", padding:"5px 12px", fontSize:11, fontFamily:"inherit", fontWeight:600 });
const LS = { fontSize:9, letterSpacing:"0.13em", textTransform:"uppercase", color:"#94a3b8", fontWeight:700, marginBottom:5 };

// Ofsted colours
const ofstedColor = r => ({
  "Outstanding":"#6366f1", "Good":"#16a34a",
  "Requires improvement":"#d97706", "Inadequate":"#dc2626"
}[r] || "#94a3b8");

// Phase shapes on map
const phaseColor = p => ({
  "Secondary":"#3b82f6", "Primary":"#10b981",
  "Special":"#f59e0b", "All-through":"#8b5cf6"
}[p] || "#94a3b8");

// ─── AI helpers ───────────────────────────────────────────────────────────────
async function callClaude(system, userMsg, maxTokens=800) {
  if (!ANTHROPIC_KEY) return "(No API key — set VITE_ANTHROPIC_KEY)";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version":"2023-06-01",
      "anthropic-dangerous-direct-browser-access":"true",
    },
    body: JSON.stringify({
      model:"claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system, messages:[{ role:"user", content:userMsg }],
    }),
  });
  const d = await res.json();
  return d.content?.map(c=>c.text||"").join("") || "";
}

async function aiParseSearch(query, schools) {
  const sampleLAs = [...new Set(schools.map(s=>s.la).filter(Boolean))].slice(0,40);
  const system = `You are a search filter parser for English schools data. Convert the query into a JSON filter object.

Keys: phase ("Primary"|"Secondary"|"Special"|"All-through"), ofsted ("Outstanding"|"Good"|"Requires improvement"|"Inadequate"), 
la (LA name, lowercase, partial match), minFSM, maxFSM (0-100), minAttainment8, maxAttainment8 (0-80), 
minProgress8, maxProgress8 (-3 to 3), minPupils, maxPupils, name (school name partial match).

Sample LAs: ${sampleLAs.join(", ")}.
Return ONLY valid JSON, no markdown.`;
  const raw = await callClaude(system, query, 300);
  try { return JSON.parse(raw.replace(/```json?|```/g,"")); } catch { return { name: query }; }
}

async function aiClusterAnalysis(clusterName, schools, allMissionSchools) {
  const stats = summariseSchools(schools);
  const benchStats = summariseSchools(allMissionSchools);
  const system = `You are a senior DfE education analyst. Write a concise analytical paragraph (150-200 words) about this cluster of schools for a ministerial briefing. Be specific, evidence-based, and note both strengths and areas for development. Reference the benchmark data where relevant. Use high-performance language appropriate for a policy audience. Do not use bullet points.`;
  const msg = `Cluster: "${clusterName}" (${schools.length} schools)

Cluster stats:
- Phases: ${stats.phases}
- FSM average: ${stats.avgFSM}%
- Attainment 8 avg: ${stats.avgAtt8}
- Progress 8 avg: ${stats.avgP8}
- Ofsted: ${stats.ofsted}
- SEN avg: ${stats.avgSEN}%
- Average pupils: ${stats.avgPupils}

Benchmark (all mission schools, n=${allMissionSchools.length}):
- FSM avg: ${benchStats.avgFSM}%
- Attainment 8 avg: ${benchStats.avgAtt8}
- Progress 8 avg: ${benchStats.avgP8}`;
  return callClaude(system, msg, 500);
}

// ─── Stats helper ─────────────────────────────────────────────────────────────
function summariseSchools(schools) {
  if (!schools.length) return { phases:"—", avgFSM:"—", avgAtt8:"—", avgP8:"—", ofsted:"—", avgSEN:"—", avgPupils:"—" };
  const avg = (arr, key) => {
    const vals = arr.map(s=>+s[key]).filter(n=>!isNaN(n));
    return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) : "n/a";
  };
  const phases = [...new Set(schools.map(s=>s.phase).filter(Boolean))].join(", ");
  const ofstedCounts = schools.reduce((acc,s)=>{ if(s.ofsted) acc[s.ofsted]=(acc[s.ofsted]||0)+1; return acc; },{});
  const ofsted = Object.entries(ofstedCounts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}:${v}`).join(", ");
  return {
    phases, ofsted,
    avgFSM: avg(schools,"fsm_pct"),
    avgAtt8: avg(schools,"attainment8"),
    avgP8: avg(schools,"progress8"),
    avgSEN: avg(schools,"sen_pct"),
    avgPupils: avg(schools,"pupils"),
  };
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatPill({ label, value, color="#6366f1" }) {
  return (
    <div style={{ background:`${color}12`, border:`1px solid ${color}33`, borderRadius:8, padding:"8px 12px", minWidth:70, textAlign:"center" }}>
      <div style={{ fontSize:16, fontWeight:800, color, lineHeight:1 }}>{value??<span style={{color:"#cbd5e1"}}>—</span>}</div>
      <div style={{ fontSize:9, color:"#94a3b8", marginTop:3, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase" }}>{label}</div>
    </div>
  );
}

// ─── School card (popup) ──────────────────────────────────────────────────────
function SchoolPopup({ school, missionSchools, onAdd, onRemove, onClose }) {
  const assigned = missionSchools.find(ms => ms.urn === school.urn);
  return (
    <div style={{ width:260, fontFamily:"'Outfit','Segoe UI',sans-serif", fontSize:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <div style={{ flex:1, paddingRight:6 }}>
          <div style={{ fontWeight:700, color:"#0f172a", fontSize:13, lineHeight:1.3 }}>{school.name}</div>
          <div style={{ color:"#64748b", fontSize:10, marginTop:2 }}>{school.la} · {school.phase}</div>
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:18, padding:"0 2px", lineHeight:1 }}>×</button>
      </div>

      {/* Ofsted badge */}
      {school.ofsted && (
        <div style={{ display:"inline-flex", alignItems:"center", gap:4, background:`${ofstedColor(school.ofsted)}18`, border:`1px solid ${ofstedColor(school.ofsted)}44`, borderRadius:20, padding:"2px 8px", fontSize:10, fontWeight:600, color:ofstedColor(school.ofsted), marginBottom:10 }}>
          <span style={{ width:5, height:5, borderRadius:"50%", background:ofstedColor(school.ofsted), display:"inline-block" }}/>
          {school.ofsted}
        </div>
      )}

      {/* Key stats */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
        {school.attainment8 != null && <StatPill label="Att8" value={school.attainment8} color="#3b82f6"/>}
        {school.progress8   != null && <StatPill label="P8"   value={school.progress8 > 0 ? `+${school.progress8}`:school.progress8} color={school.progress8>=0?"#16a34a":"#dc2626"}/>}
        {school.fsm_pct     != null && <StatPill label="FSM%" value={`${school.fsm_pct}%`} color="#d97706"/>}
        {school.pupils      != null && <StatPill label="Pupils" value={school.pupils} color="#6366f1"/>}
      </div>

      {school.address && <div style={{ fontSize:10, color:"#94a3b8", marginBottom:10 }}>{school.address}</div>}

      {assigned ? (
        <div>
          <div style={{ fontSize:10, color:"#16a34a", fontWeight:600, marginBottom:6 }}>
            ✓ Mission school · Cluster: <em>{assigned.cluster || "Unassigned"}</em>
          </div>
          <button onClick={() => onRemove(school.urn)} style={{ ...BS("#dc2626"), width:"100%", padding:"6px" }}>Remove from Mission</button>
        </div>
      ) : (
        <button onClick={() => onAdd(school)} style={{ ...BS("#6366f1"), width:"100%", padding:"6px" }}>+ Add to Mission Schools</button>
      )}
    </div>
  );
}

// ─── Cluster panel ────────────────────────────────────────────────────────────
function ClusterPanel({ missionSchools, setMissionSchools, missions, selectedMissionId, setSelectedMissionId }) {
  const [analysis, setAnalysis]       = useState({});
  const [analysing, setAnalysing]     = useState({});
  const [newClusterName, setNewClusterName] = useState("");
  const [addingCluster, setAddingCluster]   = useState(false);

  const clusters = useMemo(() => {
    const map = {};
    missionSchools.forEach(s => {
      const k = s.cluster || "__unassigned";
      if (!map[k]) map[k] = [];
      map[k].push(s);
    });
    return map;
  }, [missionSchools]);

  const allClusters = [...new Set(missionSchools.map(s=>s.cluster).filter(Boolean))];

  const assignCluster = (urn, cluster) => {
    setMissionSchools(p => p.map(s => s.urn===urn ? {...s, cluster} : s));
  };

  const runAnalysis = async (clusterName) => {
    setAnalysing(p=>({...p,[clusterName]:true}));
    const schools = clusters[clusterName] || [];
    const text = await aiClusterAnalysis(clusterName, schools, missionSchools);
    setAnalysis(p=>({...p,[clusterName]:text}));
    setAnalysing(p=>({...p,[clusterName]:false}));
  };

  const addCluster = () => {
    if (!newClusterName.trim()) return;
    // Cluster exists by name — nothing to create in data, just name it
    setAddingCluster(false); setNewClusterName("");
  };

  if (!missionSchools.length) return (
    <div style={{ padding:20, color:"#94a3b8", fontSize:12, textAlign:"center" }}>
      <div style={{ fontSize:32, marginBottom:8 }}>🏫</div>
      No mission schools selected yet.<br/>Search and click schools on the map to add them.
    </div>
  );

  return (
    <div style={{ padding:"16px 0" }}>

      {/* Mission selector */}
      <div style={{ padding:"0 16px 14px" }}>
        <div style={LS}>Filter by Mission</div>
        <select value={selectedMissionId||""} onChange={e=>setSelectedMissionId(e.target.value||null)} style={{...IS,width:"100%"}}>
          <option value="">All Missions</option>
          {missions.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {/* Summary stats bar */}
      <div style={{ padding:"10px 16px", background:"#f8fafc", borderTop:"1px solid #f1f5f9", borderBottom:"1px solid #f1f5f9", marginBottom:14 }}>
        {(() => {
          const s = summariseSchools(missionSchools);
          return (
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <StatPill label="Schools" value={missionSchools.length} color="#6366f1"/>
              <StatPill label="Avg Att8" value={s.avgAtt8} color="#3b82f6"/>
              <StatPill label="Avg P8" value={s.avgP8} color={parseFloat(s.avgP8)>=0?"#16a34a":"#dc2626"}/>
              <StatPill label="Avg FSM" value={`${s.avgFSM}%`} color="#d97706"/>
              <StatPill label="Avg SEN" value={`${s.avgSEN}%`} color="#8b5cf6"/>
            </div>
          );
        })()}
      </div>

      {/* Add cluster */}
      <div style={{ padding:"0 16px 12px" }}>
        {addingCluster ? (
          <div style={{ display:"flex", gap:6 }}>
            <input placeholder="Cluster name…" value={newClusterName} onChange={e=>setNewClusterName(e.target.value)} style={{...IS,flex:1}} autoFocus onKeyDown={e=>e.key==="Enter"&&addCluster()}/>
            <button onClick={addCluster} style={BS("#6366f1")}>Add</button>
            <button onClick={()=>setAddingCluster(false)} style={BS("#94a3b8")}>×</button>
          </div>
        ) : (
          <button onClick={()=>setAddingCluster(true)} style={{ background:"none", border:"1px dashed #cbd5e1", borderRadius:8, color:"#94a3b8", cursor:"pointer", fontSize:11, fontFamily:"inherit", padding:"5px 14px", width:"100%" }}>+ New Cluster</button>
        )}
      </div>

      {/* Unassigned schools */}
      {clusters["__unassigned"]?.length > 0 && (
        <div style={{ marginBottom:14 }}>
          <div style={{ padding:"8px 16px", background:"#fffbeb", borderTop:"1px solid #fde68a", borderBottom:"1px solid #fde68a", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:11, fontWeight:700, color:"#92400e" }}>⚠ Unassigned ({clusters["__unassigned"].length})</span>
          </div>
          {clusters["__unassigned"].map(s=>(
            <SchoolRow key={s.urn} school={s} clusters={allClusters} onAssign={assignCluster} onRemove={urn=>setMissionSchools(p=>p.filter(x=>x.urn!==urn))}/>
          ))}
        </div>
      )}

      {/* Cluster groups */}
      {allClusters.map(cl => {
        const schools = clusters[cl] || [];
        const stats = summariseSchools(schools);
        return (
          <div key={cl} style={{ marginBottom:16, border:"1px solid #f1f5f9", borderRadius:10, overflow:"hidden", margin:"0 0 14px 16px", marginRight:16 }}>
            <div style={{ padding:"10px 14px", background:"#f8fafc", borderBottom:"1px solid #f1f5f9", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:"#0f172a" }}>{cl}</div>
                <div style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>{schools.length} schools · FSM {stats.avgFSM}% · Att8 {stats.avgAtt8} · P8 {stats.avgP8}</div>
              </div>
              <button onClick={()=>runAnalysis(cl)} disabled={analysing[cl]}
                style={{ ...BS("#6366f1"), padding:"4px 10px", opacity:analysing[cl]?0.6:1 }}>
                {analysing[cl]?"…":"AI Analysis"}
              </button>
            </div>

            {/* AI analysis */}
            {analysis[cl] && (
              <div style={{ padding:"10px 14px", background:"#f0f4ff", borderBottom:"1px solid #e0e7ff", fontSize:11, color:"#3730a3", lineHeight:1.7 }}>
                {analysis[cl]}
              </div>
            )}

            {/* School rows */}
            {schools.map(s=>(
              <SchoolRow key={s.urn} school={s} clusters={allClusters} currentCluster={cl} onAssign={assignCluster} onRemove={urn=>setMissionSchools(p=>p.filter(x=>x.urn!==urn))}/>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function SchoolRow({ school, clusters, currentCluster, onAssign, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ borderBottom:"1px solid #f8fafc" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", cursor:"pointer" }}
        onClick={()=>setExpanded(e=>!e)}
        onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        <span style={{ width:8, height:8, borderRadius:"50%", background:ofstedColor(school.ofsted), flexShrink:0 }}/>
        <span style={{ flex:1, fontSize:11, fontWeight:600, color:"#0f172a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{school.name}</span>
        <span style={{ fontSize:10, color:"#94a3b8", flexShrink:0 }}>{school.la}</span>
        <span style={{ fontSize:9, color:"#cbd5e1" }}>{expanded?"▲":"▼"}</span>
      </div>
      {expanded && (
        <div style={{ padding:"8px 14px 12px 30px", background:"#fafbfc" }}>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
            {school.attainment8!=null&&<StatPill label="Att8" value={school.attainment8} color="#3b82f6"/>}
            {school.progress8!=null&&<StatPill label="P8" value={school.progress8>0?`+${school.progress8}`:school.progress8} color={school.progress8>=0?"#16a34a":"#dc2626"}/>}
            {school.fsm_pct!=null&&<StatPill label="FSM" value={`${school.fsm_pct}%`} color="#d97706"/>}
            {school.pupils!=null&&<StatPill label="Pupils" value={school.pupils} color="#6366f1"/>}
            {school.sen_pct!=null&&<StatPill label="SEN" value={`${school.sen_pct}%`} color="#8b5cf6"/>}
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
            <div style={{...LS, marginBottom:0}}>Cluster:</div>
            <select value={currentCluster||""} onChange={e=>onAssign(school.urn,e.target.value||null)} style={{...IS,flex:1,minWidth:120}}>
              <option value="">Unassigned</option>
              {clusters.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={()=>onRemove(school.urn)} style={{ ...BS("#dc2626"), padding:"4px 8px" }}>Remove</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main SchoolsTab ──────────────────────────────────────────────────────────
export default function SchoolsTab({ missions, missionSchools, setMissionSchools }) {
  const [schools, setSchools]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filtered, setFiltered]         = useState([]);
  const [popup, setPopup]               = useState(null);
  const [searchQuery, setSearchQuery]   = useState("");
  const [aiSearching, setAiSearching]   = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const [selectedMissionId, setSelectedMissionId] = useState(null);
  const [rightPanel, setRightPanel]     = useState("clusters"); // "clusters" | "search"
  const [viewState, setViewState]       = useState({ latitude:54.5, longitude:-1.5, zoom:6 });
  const searchRef = useRef(null);

  // Load school data from public folder (same JSON as standalone app)
  useEffect(() => {
    fetch("/schools.json")
      .then(r => r.json())
      .then(data => {
        setSchools(data);
        setFiltered(data.slice(0, 2000)); // Initial: first 2000 for performance
        setLoading(false);
      })
      .catch(() => {
        // Fallback: try the school-profile repo path
        fetch("https://raw.githubusercontent.com/andrewoneill45-ctrl/school-profile/main/public/schools.json")
          .then(r=>r.json())
          .then(data => { setSchools(data); setFiltered(data.slice(0,2000)); setLoading(false); })
          .catch(() => { setLoading(false); });
      });
  }, []);

  // Apply filters
  const applyFilters = useCallback((fs, allSchools) => {
    let result = allSchools;
    if (fs.phase)      result = result.filter(s => s.phase === fs.phase);
    if (fs.ofsted)     result = result.filter(s => s.ofsted === fs.ofsted);
    if (fs.la)         result = result.filter(s => s.la?.toLowerCase().includes(fs.la));
    if (fs.name)       result = result.filter(s => s.name?.toLowerCase().includes(fs.name.toLowerCase()));
    if (fs.minFSM != null)        result = result.filter(s => +s.fsm_pct >= fs.minFSM);
    if (fs.maxFSM != null)        result = result.filter(s => +s.fsm_pct <= fs.maxFSM);
    if (fs.minAttainment8 != null) result = result.filter(s => +s.attainment8 >= fs.minAttainment8);
    if (fs.maxAttainment8 != null) result = result.filter(s => +s.attainment8 <= fs.maxAttainment8);
    if (fs.minProgress8 != null)  result = result.filter(s => +s.progress8 >= fs.minProgress8);
    if (fs.maxProgress8 != null)  result = result.filter(s => +s.progress8 <= fs.maxProgress8);
    if (fs.minPupils != null)     result = result.filter(s => +s.pupils >= fs.minPupils);
    if (fs.maxPupils != null)     result = result.filter(s => +s.pupils <= fs.maxPupils);
    return result.slice(0, 3000); // Cap at 3000 markers
  }, []);

  const doSearch = async () => {
    if (!searchQuery.trim()) { setFiltered(schools.slice(0,2000)); setActiveFilters({}); return; }
    setAiSearching(true);
    const fs = await aiParseSearch(searchQuery, schools);
    setActiveFilters(fs);
    setFiltered(applyFilters(fs, schools));
    setAiSearching(false);
  };

  const addToMission = (school) => {
    if (missionSchools.find(ms => ms.urn === school.urn)) return;
    setMissionSchools(p => [...p, {
      urn: school.urn,
      name: school.name,
      la_name: school.la,
      phase: school.phase,
      ofsted: school.ofsted,
      fsm_pct: school.fsm_pct,
      attainment8: school.attainment8,
      progress8: school.progress8,
      sen_pct: school.sen_pct,
      pupils: school.pupils,
      lat: school.latitude,
      lon: school.longitude,
      address: school.address,
      cluster: null,
      missionId: selectedMissionId,
    }]);
    setPopup(null);
  };

  const removeFromMission = (urn) => {
    setMissionSchools(p => p.filter(s => s.urn !== urn));
  };

  // Markers to show — filtered set, with mission schools highlighted
  const missionUrns = new Set(missionSchools.map(s=>s.urn));

  if (!MAPBOX_TOKEN) return (
    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, color:"#64748b" }}>
      <div style={{ fontSize:32 }}>🗺</div>
      <div style={{ fontWeight:700, color:"#0f172a" }}>Mapbox token required</div>
      <div style={{ fontSize:12 }}>Add <code>VITE_MAPBOX_TOKEN</code> to your <code>.env</code> file</div>
    </div>
  );

  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* ── Toolbar ── */}
      <div style={{ padding:"8px 16px", borderBottom:"1px solid #e2e8f0", background:"#f8fafc", display:"flex", alignItems:"center", gap:8, flexShrink:0, flexWrap:"wrap" }}>
        <div style={{ display:"flex", flex:1, minWidth:260, gap:0, border:"1px solid #e2e8f0", borderRadius:8, overflow:"hidden", background:"#fff" }}>
          <input
            ref={searchRef}
            placeholder="AI search: e.g. 'secondary schools in Sunderland with high FSM'…"
            value={searchQuery}
            onChange={e=>setSearchQuery(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&doSearch()}
            style={{ flex:1, padding:"7px 12px", fontSize:11, border:"none", outline:"none", fontFamily:"inherit", color:"#374151" }}
          />
          <button onClick={doSearch} disabled={aiSearching} style={{ padding:"7px 14px", background:"#6366f1", border:"none", color:"#fff", fontSize:11, cursor:aiSearching?"wait":"pointer", fontFamily:"inherit", fontWeight:600 }}>
            {aiSearching ? "…" : "Search"}
          </button>
        </div>
        {Object.keys(activeFilters).length > 0 && (
          <button onClick={()=>{ setActiveFilters({}); setFiltered(schools.slice(0,2000)); setSearchQuery(""); }}
            style={{ ...BS("#94a3b8"), padding:"5px 10px" }}>✕ Clear</button>
        )}
        <div style={{ fontSize:10, color:"#94a3b8", whiteSpace:"nowrap" }}>{filtered.length.toLocaleString()} schools shown</div>
        <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
          <button onClick={()=>setRightPanel("clusters")}
            style={{ ...BS(rightPanel==="clusters"?"#6366f1":"#94a3b8"), padding:"4px 10px" }}>
            Clusters ({missionSchools.length})
          </button>
        </div>
      </div>

      {/* Active filter pills */}
      {Object.keys(activeFilters).length > 0 && (
        <div style={{ padding:"4px 16px", background:"#eef2ff", borderBottom:"1px solid #e0e7ff", display:"flex", gap:6, flexWrap:"wrap" }}>
          {Object.entries(activeFilters).map(([k,v])=>(
            <span key={k} style={{ fontSize:10, background:"#6366f1", color:"#fff", borderRadius:12, padding:"2px 8px", fontWeight:600 }}>
              {k}: {String(v)}
            </span>
          ))}
        </div>
      )}

      {/* ── Body: Map + Right Panel ── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* Map */}
        <div style={{ flex:1, position:"relative" }}>
          {loading && (
            <div style={{ position:"absolute", inset:0, background:"rgba(255,255,255,0.9)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10, flexDirection:"column", gap:8 }}>
              <div style={{ fontSize:14, fontWeight:600, color:"#6366f1" }}>Loading school data…</div>
              <div style={{ fontSize:11, color:"#94a3b8" }}>26,000+ schools</div>
            </div>
          )}
          <Map
            {...viewState}
            onMove={e=>setViewState(e.viewState)}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle="mapbox://styles/mapbox/light-v11"
            style={{ width:"100%", height:"100%" }}
          >
            <NavigationControl position="top-right"/>

            {/* Regular school markers */}
            {filtered.map(school => {
              if (!school.latitude || !school.longitude) return null;
              const isMission = missionUrns.has(school.urn);
              const color = isMission ? "#6366f1" : phaseColor(school.phase);
              const size  = isMission ? 12 : 6;
              return (
                <Marker
                  key={school.urn}
                  latitude={+school.latitude}
                  longitude={+school.longitude}
                  onClick={e => { e.originalEvent.stopPropagation(); setPopup(school); }}
                >
                  <div style={{
                    width:size, height:size,
                    borderRadius:"50%",
                    background:color,
                    border: isMission ? "2px solid #fff" : "1px solid rgba(255,255,255,0.5)",
                    cursor:"pointer",
                    boxShadow: isMission ? "0 0 0 2px #6366f1" : "0 1px 2px rgba(0,0,0,0.2)",
                    transition:"transform 0.1s",
                  }}
                    onMouseEnter={e=>e.currentTarget.style.transform="scale(1.5)"}
                    onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
                  />
                </Marker>
              );
            })}

            {/* Popup */}
            {popup && (
              <Popup
                latitude={+popup.latitude}
                longitude={+popup.longitude}
                onClose={() => setPopup(null)}
                closeButton={false}
                closeOnClick={false}
                anchor="bottom"
                offset={10}
              >
                <SchoolPopup
                  school={popup}
                  missionSchools={missionSchools}
                  onAdd={addToMission}
                  onRemove={removeFromMission}
                  onClose={()=>setPopup(null)}
                />
              </Popup>
            )}
          </Map>

          {/* Legend */}
          <div style={{ position:"absolute", bottom:20, left:16, background:"rgba(255,255,255,0.95)", borderRadius:8, padding:"8px 12px", fontSize:10, boxShadow:"0 2px 8px rgba(0,0,0,0.12)" }}>
            {[["Secondary","#3b82f6"],["Primary","#10b981"],["Special","#f59e0b"],["Mission School","#6366f1"]].map(([l,c])=>(
              <div key={l} style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3 }}>
                <span style={{ width:8, height:8, borderRadius:"50%", background:c, display:"inline-block", border:l==="Mission School"?"2px solid #fff":"none", boxShadow:l==="Mission School"?"0 0 0 1px #6366f1":"none" }}/>
                <span style={{ color:"#374151" }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right panel: Clusters ── */}
        <div style={{ width:340, borderLeft:"1px solid #e2e8f0", overflowY:"auto", background:"#fff", flexShrink:0 }}>
          <div style={{ padding:"12px 16px 10px", borderBottom:"1px solid #f1f5f9", background:"#f8fafc", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:12, fontWeight:700, color:"#0f172a" }}>Mission Schools & Clusters</span>
            <span style={{ fontSize:10, color:"#94a3b8" }}>{missionSchools.length} selected</span>
          </div>
          <ClusterPanel
            missionSchools={missionSchools}
            setMissionSchools={setMissionSchools}
            missions={missions}
            selectedMissionId={selectedMissionId}
            setSelectedMissionId={setSelectedMissionId}
          />
        </div>
      </div>
    </div>
  );
}
