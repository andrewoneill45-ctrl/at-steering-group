/**
 * SchoolsTab.jsx — Achieve & Thrive 2026
 * Full England school map · GeoJSON layers · Rich popup cards · AI search
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Map, { Source, Layer, Popup, NavigationControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN  = import.meta.env.VITE_MAPBOX_TOKEN  || "";
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY || "";

const IS = { background:"#fff", border:"1px solid #e2e8f0", borderRadius:6, color:"#374151", padding:"5px 9px", fontSize:11, fontFamily:"inherit", outline:"none" };
const BS = bg => ({ background:bg+"18", border:`1px solid ${bg}66`, borderRadius:6, color:bg, cursor:"pointer", padding:"5px 12px", fontSize:11, fontFamily:"inherit", fontWeight:600 });
const LS = { fontSize:9, letterSpacing:"0.13em", textTransform:"uppercase", color:"#94a3b8", fontWeight:700, marginBottom:5 };

const PHASE_COLORS = { "Secondary":"#3b82f6","Primary":"#10b981","Special":"#f59e0b","All-through":"#8b5cf6","default":"#94a3b8" };
const OFSTED_COLORS = { "Outstanding":"#6366f1","Good":"#16a34a","Requires improvement":"#d97706","Inadequate":"#dc2626" };

// ─── Claude API ───────────────────────────────────────────────────────────────
async function callClaude(system, userMsg, maxTokens=800) {
  if (!ANTHROPIC_KEY) return null;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{ "Content-Type":"application/json","x-api-key":ANTHROPIC_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true" },
    body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:maxTokens, system, messages:[{role:"user",content:userMsg}] }),
  });
  const d = await res.json();
  return d.content?.map(c=>c.text||"").join("") || "";
}

// ─── AI Search parser ─────────────────────────────────────────────────────────
async function aiParseSearch(query, schools) {
  const sampleLAs    = [...new Set(schools.map(s=>s.la).filter(Boolean))].slice(0,60).join(", ");
  const sampleTrusts = [...new Set(schools.map(s=>s.trust_name||s.trust).filter(Boolean))].slice(0,30).join(", ");

  const system = `You are a search filter parser for an English schools explorer covering all 26,000+ state schools in England. Convert the natural language query into a JSON filter object.

AVAILABLE FILTER KEYS:
- phase: "Primary" | "Secondary" | "Special" | "All-through" | "Nursery"
- ofsted: "Outstanding" | "Good" | "Requires improvement" | "Inadequate"
- ofstedMulti: array of ofsted strings (e.g. ["Requires improvement","Inadequate"])
- la: LA name string, lowercase, partial match OK. Sample LAs: ${sampleLAs}
- trust: trust name partial match, lowercase
- name: school name partial match
- minFSM / maxFSM: 0–100 (% free school meals — whole school)
- minAttainment8 / maxAttainment8: 0–80 (KS4 Attainment 8 score)
- minProgress8 / maxProgress8: -3 to +3 (KS4 Progress 8)
- minKS2 / maxKS2: 0–100 (KS2 RWM % expected)
- minPupils / maxPupils: number of pupils
- minSEN / maxSEN: 0–100 (% SEN support or EHCP)
- region: "North East" | "North West" | "Yorkshire and The Humber" | "East Midlands" | "West Midlands" | "East of England" | "London" | "South East" | "South West"
- type: "Academy" | "Free school" | "Community" | "Voluntary aided" | "Voluntary controlled" | "Foundation"

INTERPRETATION RULES:
- "struggling" or "underperforming" = minFSM:30 + (ofstedMulti:["Requires improvement","Inadequate"] OR maxProgress8:-0.5)
- "high disadvantage" or "deprived" = minFSM:35
- "coastal" areas: map to relevant LAs (e.g. Hartlepool, Redcar and Cleveland, Scarborough, Thanet area)
- "north east" = region:"North East"
- "coasting" schools = maxProgress8:0 (flat progress)
- Be generous with partial LA name matches

Return ONLY valid JSON object, no markdown, no explanation.
Examples:
"secondary schools in sunderland with high fsm" → {"phase":"Secondary","la":"sunderland","minFSM":30}
"struggling primaries north east" → {"phase":"Primary","region":"North East","ofstedMulti":["Requires improvement","Inadequate"]}
"outstanding schools with below average progress 8" → {"ofsted":"Outstanding","maxProgress8":0}
"large secondary academies london" → {"phase":"Secondary","region":"London","type":"Academy","minPupils":1000}`;

  const raw = await callClaude(system, query, 400);
  if (!raw) return null;
  try {
    const cleaned = raw.replace(/```json?|```/g,"").trim();
    return JSON.parse(cleaned);
  } catch { return null; }
}

// ─── Built-in search (no API key needed) ──────────────────────────────────────
function builtInSearch(query, schools) {
  const q = query.toLowerCase().trim();
  const f = {};

  // Phase
  if (/\bprimary\b/.test(q))       f.phase = "Primary";
  if (/\bsecondary\b/.test(q))     f.phase = "Secondary";
  if (/\bspecial\b/.test(q))       f.phase = "Special";
  if (/all.through/.test(q))       f.phase = "All-through";

  // Ofsted
  if (/outstanding/.test(q))                    f.ofsted = "Outstanding";
  if (/\bgood\b/.test(q))                       f.ofsted = "Good";
  if (/requires improvement|ri\b/.test(q))      f.ofsted = "Requires improvement";
  if (/inadequate|special measures/.test(q))    f.ofsted = "Inadequate";
  if (/struggling|underperform/.test(q))        f.ofstedMulti = ["Requires improvement","Inadequate"];

  // FSM
  const fsmAbove = q.match(/(?:above|over|>|≥)\s*(\d+)%?\s*fsm|fsm\s*(?:above|over|>)\s*(\d+)|(\d+)%\s*fsm/i);
  const fsmBelow = q.match(/(?:below|under|<)\s*(\d+)%?\s*fsm|fsm\s*(?:below|under|<)\s*(\d+)/i);
  if (fsmAbove) f.minFSM = +(fsmAbove[1]||fsmAbove[2]||fsmAbove[3]);
  if (fsmBelow) f.maxFSM = +(fsmBelow[1]||fsmBelow[2]);
  if (/high.?fsm|most disadvantaged|deprived/.test(q) && !f.minFSM) f.minFSM = 35;
  if (/disadvantaged/.test(q) && !f.minFSM) f.minFSM = 30;

  // Progress 8
  const p8a = q.match(/p(?:rogress)?8?\s*(?:above|>|≥)\s*([+-]?\d+\.?\d*)/i);
  const p8b = q.match(/p(?:rogress)?8?\s*(?:below|<)\s*([+-]?\d+\.?\d*)/i);
  if (p8a) f.minProgress8 = +p8a[1];
  if (p8b) f.maxProgress8 = +p8b[1];
  if (/coasting/.test(q)) f.maxProgress8 = 0;

  // Region
  const regions = {
    "north east":"North East","north west":"North West","yorkshire":"Yorkshire and The Humber",
    "east midlands":"East Midlands","west midlands":"West Midlands","east of england":"East of England",
    "london":"London","south east":"South East","south west":"South West",
  };
  for (const [k,v] of Object.entries(regions)) { if (q.includes(k)) { f.region = v; break; } }

  // LA — try matching against known LAs
  const knownLAs = [...new Set(schools.map(s=>s.la).filter(Boolean))];
  const stopWords = /primary|secondary|special|all.through|outstanding|good|requires improvement|inadequate|high fsm|disadvantaged|above|below|over|under|fsm|progress\s*8|p8|schools?|struggling|deprived|coastal|coasting|region|north|south|east|west|london|midlands|yorkshire/gi;
  const locationQ = q.replace(stopWords,"").replace(/\s+/g," ").trim();
  if (locationQ.length > 2) {
    const matched = knownLAs.find(la => la.toLowerCase().includes(locationQ) || locationQ.includes(la.toLowerCase().split(/[\s,]+/)[0]));
    if (matched) f.la = matched.toLowerCase();
    else {
      for (const word of locationQ.split(/\s+/).filter(w=>w.length>3)) {
        const m = knownLAs.find(la => la.toLowerCase().includes(word));
        if (m) { f.la = m.toLowerCase(); break; }
      }
    }
  }

  return Object.keys(f).length ? f : null;
}

// ─── Apply filters ────────────────────────────────────────────────────────────
function applyFilters(fs, schools) {
  let r = schools;
  if (fs.phase)   r = r.filter(s => s.phase === fs.phase);
  if (fs.ofsted)  r = r.filter(s => s.ofsted === fs.ofsted);
  if (fs.ofstedMulti) r = r.filter(s => fs.ofstedMulti.includes(s.ofsted));
  if (fs.la)      r = r.filter(s => s.la?.toLowerCase().includes(fs.la));
  if (fs.region)  r = r.filter(s => s.region === fs.region);
  if (fs.type)    r = r.filter(s => s.type?.toLowerCase().includes(fs.type.toLowerCase()));
  if (fs.trust)   r = r.filter(s => (s.trust_name||s.trust||"").toLowerCase().includes(fs.trust));
  if (fs.name)    r = r.filter(s => s.name?.toLowerCase().includes(fs.name.toLowerCase()));
  if (fs.minFSM!=null)  r = r.filter(s => +s.fsm_pct >= fs.minFSM);
  if (fs.maxFSM!=null)  r = r.filter(s => +s.fsm_pct <= fs.maxFSM);
  if (fs.minAttainment8!=null) r = r.filter(s => +s.attainment8 >= fs.minAttainment8);
  if (fs.maxAttainment8!=null) r = r.filter(s => +s.attainment8 <= fs.maxAttainment8);
  if (fs.minProgress8!=null)   r = r.filter(s => +s.progress8 >= fs.minProgress8);
  if (fs.maxProgress8!=null)   r = r.filter(s => +s.progress8 <= fs.maxProgress8);
  if (fs.minKS2!=null)  r = r.filter(s => +s.ks2_rwm_exp >= fs.minKS2);
  if (fs.maxKS2!=null)  r = r.filter(s => +s.ks2_rwm_exp <= fs.maxKS2);
  if (fs.minPupils!=null) r = r.filter(s => +s.pupils >= fs.minPupils);
  if (fs.maxPupils!=null) r = r.filter(s => +s.pupils <= fs.maxPupils);
  if (fs.minSEN!=null)  r = r.filter(s => +s.sen_pct >= fs.minSEN);
  if (fs.maxSEN!=null)  r = r.filter(s => +s.sen_pct <= fs.maxSEN);
  return r;
}

// ─── GeoJSON conversion ───────────────────────────────────────────────────────
function toGeoJSON(schools, missionUrns) {
  return {
    type:"FeatureCollection",
    features: schools.filter(s=>s.latitude&&s.longitude).map(s=>({
      type:"Feature",
      geometry:{ type:"Point", coordinates:[+s.longitude,+s.latitude] },
      properties:{ urn:s.urn, phase:s.phase||"Other", isMission:missionUrns.has(s.urn)?1:0 },
    })),
  };
}

// ─── Stats helper ─────────────────────────────────────────────────────────────
function summariseSchools(schools) {
  if (!schools.length) return { phases:"—",avgFSM:"—",avgAtt8:"—",avgP8:"—",ofsted:"—",avgSEN:"—",avgPupils:"—" };
  const avgField = (arr, ...keys) => {
    const v = arr.map(s => { for(const k of keys){ const n=parseFloat(s[k]); if(!isNaN(n)&&n!==0) return n; } return null; }).filter(n=>n!==null);
    return v.length ? (v.reduce((a,b)=>a+b,0)/v.length).toFixed(1) : "n/a";
  };
  const phases = [...new Set(schools.map(s=>s.phase).filter(Boolean))].join(", ");
  const oc = schools.reduce((acc,s)=>{ if(s.ofsted) acc[s.ofsted]=(acc[s.ofsted]||0)+1; return acc; },{});
  return { phases, ofsted:Object.entries(oc).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}: ${v}`).join(" · "),
    avgFSM:   avgField(schools,"fsm_pct","edu_fsm_pct","ks4_fsm_pct"),
    avgAtt8:  avgField(schools,"attainment8","att8"),
    avgP8:    avgField(schools,"progress8","p8"),
    avgSEN:   avgField(schools,"sen_pct"),
    avgPupils:avgField(schools,"pupils"),
  };
}

// ─── AI cluster analysis ──────────────────────────────────────────────────────
async function aiClusterAnalysis(clusterName, schools, allMissionSchools) {
  const stats = summariseSchools(schools);
  const bench = summariseSchools(allMissionSchools);
  const system = `You are a senior DfE education analyst. Write a concise analytical paragraph (150-200 words) about this cluster of schools for a ministerial briefing. Be specific, evidence-based, note strengths and development areas. Use high-performance policy language. No bullet points.`;
  const msg = `Cluster: "${clusterName}" (${schools.length} schools)\nPhases: ${stats.phases} | FSM avg: ${stats.avgFSM}% | Att8: ${stats.avgAtt8} | P8: ${stats.avgP8} | Ofsted: ${stats.ofsted}\nBenchmark all mission schools (n=${allMissionSchools.length}): FSM ${bench.avgFSM}% | Att8 ${bench.avgAtt8} | P8 ${bench.avgP8}`;
  const raw = await callClaude(system, msg, 600);
  return raw || "AI analysis unavailable — check VITE_ANTHROPIC_KEY in Netlify environment variables.";
}

// ─── Performance bar component ────────────────────────────────────────────────
function PerfBar({ label, value, max, color, suffix="" }) {
  if (value === null || value === undefined || value === "" || isNaN(+value)) return null;
  const pct = Math.min(100, (+value / max) * 100);
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
        <span style={{ fontSize:10, color:"#64748b" }}>{label}</span>
        <span style={{ fontSize:11, fontWeight:700, color }}>{value}{suffix}</span>
      </div>
      <div style={{ height:6, background:"#f1f5f9", borderRadius:3, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:3, transition:"width 0.4s" }}/>
      </div>
    </div>
  );
}

// ─── Rich school popup card ───────────────────────────────────────────────────
function SchoolPopup({ school, missionSchools, missions, onAdd, onRemove, onClose }) {
  const [selMission, setSelMission] = useState(null);
  const [selCluster, setSelCluster] = useState("");
  const [newCluster, setNewCluster] = useState("");

  const assigned    = missionSchools.find(ms => ms.urn === school.urn);
  const pc          = PHASE_COLORS[school.phase] || PHASE_COLORS.default;
  const oc          = OFSTED_COLORS[school.ofsted] || "#94a3b8";
  const isSecondary = school.phase === "Secondary";
  const isPrimary   = school.phase === "Primary";

  // All existing clusters across all mission schools
  const allClusters = [...new Set(missionSchools.map(s=>s.cluster).filter(Boolean))];

  const doAdd = () => {
    const cluster = newCluster.trim() || selCluster || null;
    onAdd(school, selMission, cluster);
  };

  return (
    <div style={{ fontFamily:"'Outfit','Segoe UI',sans-serif", width:300, maxHeight:"80vh", overflowY:"auto" }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${pc}22,${pc}08)`, borderBottom:`2px solid ${pc}`, padding:"12px 14px 10px", position:"relative" }}>
        <button onClick={onClose} style={{ position:"absolute",top:8,right:8,background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:18,lineHeight:1,padding:"2px 5px" }}>×</button>
        <div style={{ fontSize:13, fontWeight:700, color:"#0f172a", lineHeight:1.3, marginBottom:6, paddingRight:20 }}>{school.name}</div>
        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
          <span style={{ fontSize:10, background:`${pc}22`, color:pc, border:`1px solid ${pc}55`, borderRadius:10, padding:"2px 8px", fontWeight:600 }}>{school.phase}</span>
          {school.ofsted && <span style={{ fontSize:10, background:`${oc}22`, color:oc, border:`1px solid ${oc}55`, borderRadius:10, padding:"2px 8px", fontWeight:600 }}>{school.ofsted}</span>}
          {school.type && <span style={{ fontSize:10, background:"#f1f5f9", color:"#64748b", borderRadius:10, padding:"2px 8px" }}>{school.type}</span>}
        </div>
      </div>

      <div style={{ padding:"10px 14px" }}>
        {/* Context */}
        <div style={{ fontSize:11, color:"#64748b", marginBottom:10, lineHeight:1.7 }}>
          {school.la && <div>📍 {school.la}</div>}
          {school.address && <div style={{ fontSize:10, color:"#94a3b8" }}>{school.address}</div>}
          {school.pupils && <div>👥 {school.pupils} pupils{school.capacity ? ` (capacity ${school.capacity})` : ""}</div>}
          {school.trust_name && <div>🏫 {school.trust_name}</div>}
        </div>

        {/* Contextual data */}
        <div style={{ background:"#f8fafc", borderRadius:8, padding:"8px 10px", marginBottom:10 }}>
          <div style={{ ...LS, marginBottom:6 }}>School Context</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"4px 12px" }}>
            {school.fsm_pct && <div style={{ fontSize:11 }}><span style={{ color:"#94a3b8" }}>FSM </span><span style={{ fontWeight:700, color:"#d97706" }}>{school.fsm_pct}%</span></div>}
            {school.sen_pct && <div style={{ fontSize:11 }}><span style={{ color:"#94a3b8" }}>SEN </span><span style={{ fontWeight:700, color:"#6366f1" }}>{school.sen_pct}%</span></div>}
            {school.eal_pct && <div style={{ fontSize:11 }}><span style={{ color:"#94a3b8" }}>EAL </span><span style={{ fontWeight:700, color:"#0ea5e9" }}>{school.eal_pct}%</span></div>}
            {school.edu_fsm_pct && <div style={{ fontSize:11 }}><span style={{ color:"#94a3b8" }}>FSM6 </span><span style={{ fontWeight:700, color:"#d97706" }}>{school.edu_fsm_pct}%</span></div>}
          </div>
        </div>

        {/* Performance */}
        {(() => {
          // Try multiple field name variants
          const att8  = school.attainment8 || school.att8;
          const p8    = school.progress8   || school.p8;
          const basics= school.basics_94   || school.basics;
          const ks2   = school.ks2_rwm_exp;
          const read  = school.ks2_read_avg;
          if (isSecondary && (att8 || p8)) return (
            <div style={{ marginBottom:10 }}>
              <div style={{ ...LS, marginBottom:6 }}>KS4 Performance (2024)</div>
              {att8 && <PerfBar label="Attainment 8" value={att8} max={80} color="#3b82f6"/>}
              {p8 && (
                <div style={{ marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:10, color:"#64748b" }}>Progress 8</span>
                    <span style={{ fontSize:11, fontWeight:700, color:+p8>=0?"#16a34a":"#dc2626" }}>{+p8>0?"+":""}{p8}</span>
                  </div>
                  <div style={{ height:6, background:"#f1f5f9", borderRadius:3, overflow:"hidden", position:"relative" }}>
                    <div style={{ position:"absolute", left:"50%", top:0, width:1, height:"100%", background:"#cbd5e1", zIndex:1 }}/>
                    <div style={{ position:"absolute", height:"100%",
                      left: +p8>=0?"50%":`${50+(+p8/3)*50}%`,
                      width:`${Math.abs(+p8/3)*50}%`,
                      background:+p8>=0?"#16a34a":"#dc2626", borderRadius:3 }}/>
                  </div>
                </div>
              )}
              {basics && <div style={{ fontSize:10, color:"#64748b", marginTop:4 }}>Basics 9-4: <strong style={{ color:"#374151" }}>{basics}%</strong></div>}
            </div>
          );
          if ((isPrimary || !isSecondary) && (ks2 || read)) return (
            <div style={{ marginBottom:10 }}>
              <div style={{ ...LS, marginBottom:6 }}>KS2 Performance (2024)</div>
              {ks2 && <PerfBar label="RWM Expected %" value={ks2} max={100} color="#10b981" suffix="%"/>}
              {read && <PerfBar label="Reading Score" value={read} max={120} color="#3b82f6"/>}
            </div>
          );
          return <div style={{ fontSize:10, color:"#94a3b8", fontStyle:"italic", marginBottom:8 }}>No performance data available for this school.</div>;
        })()}

        {/* Mission assignment */}
        {!assigned ? (
          <div style={{ borderTop:"1px solid #f1f5f9", paddingTop:10 }}>
            <div style={{ ...LS, marginBottom:6 }}>Add to Mission</div>
            {missions.length > 0 ? (
              <>
                <select value={selMission||""} onChange={e=>setSelMission(e.target.value||null)}
                  style={{ ...IS, width:"100%", marginBottom:6 }}>
                  <option value="">Select mission…</option>
                  {missions.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <div style={{ display:"flex", gap:6, marginBottom:6 }}>
                  <select value={selCluster} onChange={e=>setSelCluster(e.target.value)}
                    style={{ ...IS, flex:1 }}>
                    <option value="">No cluster</option>
                    {allClusters.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                  <input placeholder="New cluster…" value={newCluster} onChange={e=>setNewCluster(e.target.value)}
                    style={{ ...IS, flex:1 }}/>
                </div>
                <button onClick={doAdd}
                  style={{ width:"100%", padding:"8px", background:"#6366f1", border:"none", borderRadius:6, color:"#fff", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  + Add to mission
                </button>
              </>
            ) : (
              <div style={{ fontSize:11, color:"#94a3b8" }}>No missions created yet — go to the Missions tab first.</div>
            )}
          </div>
        ) : (
          <div style={{ borderTop:"1px solid #f1f5f9", paddingTop:10 }}>
            <div style={{ background:"#f0f4ff", borderRadius:8, padding:"8px 10px", marginBottom:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#4f46e5" }}>✓ Mission school</div>
              <div style={{ fontSize:10, color:"#64748b", marginTop:2 }}>
                {missions.find(m=>m.id===assigned.missionId)?.name || "No mission"}
                {assigned.cluster ? ` · ${assigned.cluster}` : " · unassigned cluster"}
              </div>
            </div>
            <button onClick={()=>onRemove(school.urn)}
              style={{ ...BS("#dc2626"), width:"100%", padding:"6px" }}>Remove from mission</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── School row in cluster panel ──────────────────────────────────────────────
function SchoolRow({ school, clusters, currentCluster, onAssign, onRemove }) {
  const pc = PHASE_COLORS[school.phase]||PHASE_COLORS.default;
  return (
    <div style={{ padding:"7px 12px", borderBottom:"1px solid #f8fafc", display:"flex", alignItems:"center", gap:8 }}>
      <span style={{ width:7,height:7,borderRadius:"50%",background:pc,flexShrink:0 }}/>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:11,fontWeight:600,color:"#0f172a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{school.name}</div>
        <div style={{ fontSize:10,color:"#94a3b8" }}>{school.la}{school.fsm_pct?` · ${school.fsm_pct}% FSM`:""}</div>
      </div>
      <select value={currentCluster||""} onChange={e=>onAssign(school.urn,e.target.value||null)}
        style={{ ...IS,fontSize:10,padding:"3px 6px",maxWidth:110 }}>
        <option value="">Unassigned</option>
        {clusters.map(c=><option key={c} value={c}>{c}</option>)}
      </select>
      <button onClick={()=>onRemove(school.urn)} style={{ background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:14,padding:"2px",flexShrink:0 }}>×</button>
    </div>
  );
}

// ─── Cluster panel ────────────────────────────────────────────────────────────
function ClusterPanel({ missionSchools, setMissionSchools, missions, selectedMissionId, setSelectedMissionId }) {
  const [newCluster,setNewCluster]=useState("");
  const [analysis,setAnalysis]=useState({});
  const [analysing,setAnalysing]=useState({});

  const clusters = useMemo(()=>{
    const map={};
    missionSchools.forEach(s=>{ const k=s.cluster||"__unassigned"; if(!map[k]) map[k]=[]; map[k].push(s); });
    return map;
  },[missionSchools]);

  const allClusters=[...new Set(missionSchools.map(s=>s.cluster).filter(Boolean))];

  const assignCluster=(urn,cluster)=>setMissionSchools(p=>p.map(s=>s.urn===urn?{...s,cluster}:s));
  const runAnalysis=async(cl)=>{
    setAnalysing(p=>({...p,[cl]:true}));
    const text=await aiClusterAnalysis(cl,clusters[cl]||[],missionSchools);
    setAnalysis(p=>({...p,[cl]:text}));
    setAnalysing(p=>({...p,[cl]:false}));
  };

  const addCluster=()=>{
    if(!newCluster.trim()) return;
    // Just register the cluster name — schools get assigned via their dropdowns
    // Force a re-render by adding a placeholder marker
    setNewCluster("");
  };

  if(!missionSchools.length) return(
    <div style={{ padding:"24px 16px",textAlign:"center",color:"#94a3b8",fontSize:12,lineHeight:1.8 }}>
      No mission schools selected yet.<br/>
      <span style={{ fontSize:11 }}>Search for schools and click any dot on the map to add.</span>
    </div>
  );

  const s=summariseSchools(missionSchools);

  return (
    <div>
      {/* Mission filter */}
      {missions.length>0&&(
        <div style={{ padding:"8px 12px",borderBottom:"1px solid #f1f5f9" }}>
          <div style={LS}>Filter by Mission</div>
          <select value={selectedMissionId||""} onChange={e=>setSelectedMissionId(e.target.value||null)}
            style={{ ...IS,width:"100%" }}>
            <option value="">All missions ({missionSchools.length})</option>
            {missions.map(m=>{
              const n=missionSchools.filter(s=>s.missionId===m.id).length;
              return <option key={m.id} value={m.id}>{m.name} ({n})</option>;
            })}
          </select>
        </div>
      )}

      {/* Summary stats */}
      <div style={{ padding:"10px 12px",borderBottom:"1px solid #f1f5f9" }}>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:6 }}>
          <div style={{ background:"#eef2ff",borderRadius:8,padding:"7px 10px",minWidth:60,textAlign:"center" }}>
            <div style={{ fontSize:20,fontWeight:800,color:"#4f46e5",lineHeight:1 }}>{missionSchools.length}</div>
            <div style={{ fontSize:9,color:"#94a3b8",marginTop:2,textTransform:"uppercase",letterSpacing:"0.08em" }}>Schools</div>
          </div>
          {s.avgFSM!=="n/a"&&<div style={{ background:"#fffbeb",borderRadius:8,padding:"7px 10px",minWidth:60,textAlign:"center" }}>
            <div style={{ fontSize:20,fontWeight:800,color:"#d97706",lineHeight:1 }}>{s.avgFSM}%</div>
            <div style={{ fontSize:9,color:"#94a3b8",marginTop:2,textTransform:"uppercase",letterSpacing:"0.08em" }}>Avg FSM</div>
          </div>}
          {s.avgP8!=="n/a"&&<div style={{ background:"#f0fdf4",borderRadius:8,padding:"7px 10px",minWidth:60,textAlign:"center" }}>
            <div style={{ fontSize:20,fontWeight:800,color:+s.avgP8>=0?"#16a34a":"#dc2626",lineHeight:1 }}>{+s.avgP8>0?"+":""}{s.avgP8}</div>
            <div style={{ fontSize:9,color:"#94a3b8",marginTop:2,textTransform:"uppercase",letterSpacing:"0.08em" }}>Avg P8</div>
          </div>}
          {s.avgAtt8!=="n/a"&&<div style={{ background:"#eff6ff",borderRadius:8,padding:"7px 10px",minWidth:60,textAlign:"center" }}>
            <div style={{ fontSize:20,fontWeight:800,color:"#3b82f6",lineHeight:1 }}>{s.avgAtt8}</div>
            <div style={{ fontSize:9,color:"#94a3b8",marginTop:2,textTransform:"uppercase",letterSpacing:"0.08em" }}>Avg Att8</div>
          </div>}
        </div>
        <div style={{ fontSize:10,color:"#64748b" }}>{s.phases}</div>
        {s.ofsted!=="—"&&<div style={{ fontSize:10,color:"#64748b",marginTop:2 }}>{s.ofsted}</div>}
      </div>

      {/* Add cluster */}
      <div style={{ padding:"8px 12px",borderBottom:"1px solid #f1f5f9",display:"flex",gap:6 }}>
        <input placeholder="New cluster name (e.g. NE1, MC2)…" value={newCluster} onChange={e=>setNewCluster(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&addCluster()} style={{ ...IS,flex:1,fontSize:11 }}/>
        <button onClick={addCluster} style={{ ...BS("#6366f1"),padding:"4px 10px" }}>Add</button>
      </div>

      {/* Unassigned */}
      {clusters["__unassigned"]?.length>0&&(
        <div style={{ borderBottom:"1px solid #f1f5f9" }}>
          <div style={{ padding:"7px 12px",background:"#fffbeb" }}>
            <span style={{ fontSize:11,fontWeight:700,color:"#92400e" }}>⚠ Unassigned ({clusters["__unassigned"].length})</span>
          </div>
          {clusters["__unassigned"].map(s=>(
            <SchoolRow key={s.urn} school={s} clusters={allClusters} onAssign={assignCluster}
              onRemove={urn=>setMissionSchools(p=>p.filter(x=>x.urn!==urn))}/>
          ))}
        </div>
      )}

      {/* Named clusters */}
      {allClusters.map(cl=>{
        const cs=summariseSchools(clusters[cl]||[]);
        return(
          <div key={cl} style={{ borderBottom:"1px solid #f1f5f9" }}>
            <div style={{ padding:"8px 12px",background:"#6366f108",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8 }}>
              <div>
                <span style={{ fontSize:12,fontWeight:700,color:"#4f46e5" }}>{cl}</span>
                <span style={{ fontSize:10,color:"#94a3b8",marginLeft:6 }}>{(clusters[cl]||[]).length} schools</span>
                {cs.avgFSM!=="n/a"&&<span style={{ fontSize:10,color:"#d97706",marginLeft:6 }}>FSM {cs.avgFSM}%</span>}
                {cs.avgP8!=="n/a"&&<span style={{ fontSize:10,color:+cs.avgP8>=0?"#16a34a":"#dc2626",marginLeft:6 }}>P8 {+cs.avgP8>0?"+":""}{cs.avgP8}</span>}
              </div>
              <button onClick={()=>runAnalysis(cl)} disabled={analysing[cl]}
                style={{ ...BS("#6366f1"),padding:"3px 9px",fontSize:10,opacity:analysing[cl]?0.6:1 }}>
                {analysing[cl]?"Analysing…":"AI Analysis"}
              </button>
            </div>
            {analysis[cl]&&(
              <div style={{ padding:"10px 12px",background:"#f0f4ff",borderBottom:"1px solid #e0e7ff",fontSize:11,color:"#1e3a8a",lineHeight:1.7 }}>{analysis[cl]}</div>
            )}
            {(clusters[cl]||[]).map(s=>(
              <SchoolRow key={s.urn} school={s} clusters={allClusters} currentCluster={cl} onAssign={assignCluster}
                onRemove={urn=>setMissionSchools(p=>p.filter(x=>x.urn!==urn))}/>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main SchoolsTab ──────────────────────────────────────────────────────────
export default function SchoolsTab({ missions, missionSchools, setMissionSchools }) {
  const [schools,setSchools]=useState([]);
  const [loading,setLoading]=useState(true);
  const [filtered,setFiltered]=useState([]);
  const [popup,setPopup]=useState(null);
  const [searchQuery,setSearchQuery]=useState("");
  const [aiSearching,setAiSearching]=useState(false);
  const [searchExplain,setSearchExplain]=useState("");
  const [activeFilters,setActiveFilters]=useState({});
  const [selectedMissionId,setSelectedMissionId]=useState(null);
  const [viewState,setViewState]=useState({latitude:52.8,longitude:-1.5,zoom:6});
  const mapRef=useRef(null);

  useEffect(()=>{
    fetch("/schools.json")
      .then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); })
      .then(data=>{ setSchools(data); setFiltered(data); setLoading(false); })
      .catch(()=>{
        fetch("https://raw.githubusercontent.com/andrewoneill45-ctrl/school-profile/main/public/schools.json")
          .then(r=>r.json()).then(data=>{ setSchools(data); setFiltered(data); setLoading(false); })
          .catch(()=>setLoading(false));
      });
  },[]);

  const missionUrns=useMemo(()=>new Set(missionSchools.map(s=>s.urn)),[missionSchools]);
  const geoJSON=useMemo(()=>toGeoJSON(filtered,missionUrns),[filtered,missionUrns]);

  const doSearch=async()=>{
    const q=searchQuery.trim();
    if(!q){ setFiltered(schools); setActiveFilters({}); setSearchExplain(""); return; }
    setAiSearching(true); setSearchExplain("");
    let fs=null;
    if(ANTHROPIC_KEY) fs=await aiParseSearch(q,schools);
    if(!fs) fs=builtInSearch(q,schools);
    if(fs&&Object.keys(fs).length){
      setActiveFilters(fs);
      const results=applyFilters(fs,schools);
      setFiltered(results);
      const labels=[];
      if(fs.phase) labels.push(fs.phase);
      if(fs.region) labels.push(fs.region);
      if(fs.la) labels.push(fs.la);
      if(fs.ofsted) labels.push(fs.ofsted);
      if(fs.ofstedMulti) labels.push(fs.ofstedMulti.join(" or "));
      if(fs.minFSM) labels.push(`FSM ≥${fs.minFSM}%`);
      if(fs.maxProgress8!=null) labels.push(`P8 ≤${fs.maxProgress8}`);
      if(fs.minProgress8!=null) labels.push(`P8 ≥${fs.minProgress8}`);
      setSearchExplain(`${results.length.toLocaleString()} schools${labels.length?" — "+labels.join(", "):""}`);
      if(results.length&&results[0].latitude&&mapRef.current)
        mapRef.current.flyTo({center:[+results[0].longitude,+results[0].latitude],zoom:results.length<50?10:results.length<500?8:7,duration:1200});
    } else {
      const results=schools.filter(s=>s.name?.toLowerCase().includes(q.toLowerCase()));
      setFiltered(results); setActiveFilters({name:q});
      setSearchExplain(`${results.length} schools matching "${q}"`);
      if(results.length&&results[0].latitude&&mapRef.current)
        mapRef.current.flyTo({center:[+results[0].longitude,+results[0].latitude],zoom:10,duration:1200});
    }
    setAiSearching(false);
  };

  const clearSearch=()=>{ setFiltered(schools); setActiveFilters({}); setSearchQuery(""); setSearchExplain(""); };

  const addToMission=(school,missionId,cluster)=>{
    if(missionSchools.find(ms=>ms.urn===school.urn)) return;
    // Try all known field name variants from different data sources
    const newSchool = {
      urn:         school.urn,
      name:        school.name,
      la:          school.la || school.la_name,
      phase:       school.phase,
      ofsted:      school.ofsted,
      type:        school.type,
      // FSM — try multiple field names
      fsm_pct:     school.edu_fsm_pct || school.fsm_pct || school.ks4_fsm_pct || null,
      // KS4 attainment
      attainment8: school.attainment8 || school.att8 || null,
      progress8:   school.progress8   || school.p8   || null,
      basics_94:   school.basics_94   || school.basics || null,
      // KS2
      ks2_rwm_exp: school.ks2_rwm_exp || null,
      ks2_read_avg:school.ks2_read_avg || null,
      // Context
      sen_pct:     school.sen_pct  || null,
      eal_pct:     school.eal_pct  || null,
      pupils:      school.pupils   || null,
      capacity:    school.capacity || null,
      trust_name:  school.trust_name || school.trust || null,
      address:     school.address  || null,
      lat:         school.latitude || school.lat,
      lon:         school.longitude|| school.lon,
      cluster:     cluster  || null,
      missionId:   missionId|| null,
      addedAt:     new Date().toISOString(),
    };
    setMissionSchools([...missionSchools, newSchool]);
    setPopup(null);
  };

  const removeFromMission=(urn)=>setMissionSchools(p=>p.filter(s=>s.urn!==urn));

  const onMapClick=useCallback((e)=>{
    const map=mapRef.current; if(!map) return;
    const features=map.queryRenderedFeatures(e.point,{layers:["schools-circles","schools-mission"]});
    if(!features.length){ setPopup(null); return; }
    const f=features[0];
    const school=schools.find(s=>s.urn===f.properties.urn);
    if(!school) return;
    setPopup({school,lng:f.geometry.coordinates[0],lat:f.geometry.coordinates[1]});
  },[schools]);

  const onMouseEnter=useCallback(()=>{ if(mapRef.current) mapRef.current.getCanvas().style.cursor="pointer"; },[]);
  const onMouseLeave=useCallback(()=>{ if(mapRef.current) mapRef.current.getCanvas().style.cursor=""; },[]);

  if(!MAPBOX_TOKEN) return(
    <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:"#64748b" }}>
      <div style={{ fontSize:40 }}>🗺</div>
      <div style={{ fontWeight:700,color:"#0f172a",fontSize:16 }}>Mapbox token required</div>
      <div style={{ fontSize:12 }}>Add VITE_MAPBOX_TOKEN to Netlify environment variables</div>
    </div>
  );

  const EXAMPLE_SEARCHES = ["secondary schools in Sunderland with high FSM","outstanding primaries north east","struggling secondaries Hartlepool","large academy trusts London P8 above 0","coasting schools yorkshire"];

  return(
    <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:"'Outfit','Segoe UI',sans-serif" }}>

      {/* Toolbar */}
      <div style={{ padding:"8px 16px",borderBottom:"1px solid #e2e8f0",background:"#f8fafc",display:"flex",alignItems:"center",gap:8,flexShrink:0,flexWrap:"wrap" }}>
        <div style={{ display:"flex",flex:1,minWidth:240,border:"1px solid #e2e8f0",borderRadius:8,overflow:"hidden",background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
          <input
            placeholder={ANTHROPIC_KEY?"AI search: try 'struggling secondaries in the north east with high FSM'…":"Search: school name, LA, or try 'primary schools in Newcastle outstanding'…"}
            value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSearch()}
            style={{ flex:1,padding:"8px 12px",fontSize:11,border:"none",outline:"none",fontFamily:"inherit",color:"#374151" }}
          />
          <button onClick={doSearch} disabled={aiSearching}
            style={{ padding:"8px 16px",background:aiSearching?"#94a3b8":"#6366f1",border:"none",color:"#fff",fontSize:11,cursor:aiSearching?"wait":"pointer",fontFamily:"inherit",fontWeight:600,whiteSpace:"nowrap",transition:"background 0.2s" }}>
            {aiSearching?"Searching…":ANTHROPIC_KEY?"AI Search":"Search"}
          </button>
        </div>
        {Object.keys(activeFilters).length>0&&<button onClick={clearSearch} style={{ ...BS("#94a3b8"),padding:"5px 10px" }}>✕ Clear</button>}
        <div style={{ fontSize:10,color:"#94a3b8",whiteSpace:"nowrap" }}>
          {loading?"Loading…":`${filtered.length.toLocaleString()} / ${schools.length.toLocaleString()} schools`}
        </div>
      </div>

      {/* Search result / examples */}
      {searchExplain ? (
        <div style={{ padding:"5px 16px",background:"#eef2ff",borderBottom:"1px solid #e0e7ff",fontSize:11,color:"#4f46e5",fontWeight:500 }}>{searchExplain}</div>
      ) : !loading && schools.length>0 && (
        <div style={{ padding:"4px 16px",borderBottom:"1px solid #f1f5f9",display:"flex",gap:6,flexWrap:"wrap",alignItems:"center" }}>
          <span style={{ fontSize:10,color:"#94a3b8" }}>Try:</span>
          {EXAMPLE_SEARCHES.slice(0,3).map(ex=>(
            <button key={ex} onClick={()=>{ setSearchQuery(ex); setTimeout(doSearch,50); }}
              style={{ fontSize:10,background:"#f1f5f9",border:"none",borderRadius:12,padding:"2px 9px",color:"#64748b",cursor:"pointer",fontFamily:"inherit" }}>
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      <div style={{ flex:1,display:"flex",overflow:"hidden" }}>

        {/* Map */}
        <div style={{ flex:1,position:"relative" }}>
          {loading&&(
            <div style={{ position:"absolute",inset:0,background:"rgba(248,250,252,0.95)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10,flexDirection:"column",gap:10 }}>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <div style={{ width:36,height:36,border:"3px solid #e2e8f0",borderTop:"3px solid #6366f1",borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/>
              <div style={{ fontSize:13,fontWeight:600,color:"#6366f1" }}>Loading school data…</div>
              <div style={{ fontSize:11,color:"#94a3b8" }}>26,000+ schools across England</div>
            </div>
          )}
          <Map ref={mapRef} {...viewState} onMove={e=>setViewState(e.viewState)}
            mapboxAccessToken={MAPBOX_TOKEN} mapStyle="mapbox://styles/mapbox/light-v11"
            style={{ width:"100%",height:"100%" }}
            onClick={onMapClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
            interactiveLayerIds={["schools-circles","schools-mission"]}
          >
            <NavigationControl position="top-right"/>
            {!loading&&geoJSON.features.length>0&&(
              <Source id="schools" type="geojson" data={geoJSON}>
                <Layer id="schools-circles" type="circle" filter={["==",["get","isMission"],0]}
                  paint={{
                    "circle-radius":["interpolate",["linear"],["zoom"],5,3,8,5,11,7],
                    "circle-color":["match",["get","phase"],"Secondary","#3b82f6","Primary","#10b981","Special","#f59e0b","All-through","#8b5cf6","#94a3b8"],
                    "circle-opacity":0.8,"circle-stroke-width":0.5,"circle-stroke-color":"#fff",
                  }}
                />
                <Layer id="schools-mission" type="circle" filter={["==",["get","isMission"],1]}
                  paint={{
                    "circle-radius":["interpolate",["linear"],["zoom"],5,7,8,10,11,13],
                    "circle-color":"#6366f1","circle-opacity":1,"circle-stroke-width":2.5,"circle-stroke-color":"#fff",
                  }}
                />
              </Source>
            )}
            {popup&&(
              <Popup latitude={popup.lat} longitude={popup.lng}
                onClose={()=>setPopup(null)} closeButton={false} closeOnClick={false}
                anchor="bottom" offset={12} maxWidth="320px">
                <SchoolPopup
                  school={popup.school} missionSchools={missionSchools} missions={missions}
                  onAdd={addToMission} onRemove={removeFromMission} onClose={()=>setPopup(null)}
                />
              </Popup>
            )}
          </Map>

          {/* Legend */}
          <div style={{ position:"absolute",bottom:20,left:16,background:"rgba(255,255,255,0.97)",borderRadius:10,padding:"10px 14px",fontSize:10,boxShadow:"0 2px 12px rgba(0,0,0,0.12)" }}>
            {[["Secondary","#3b82f6"],["Primary","#10b981"],["Special","#f59e0b"],["All-through","#8b5cf6"],["Mission School","#6366f1"]].map(([l,c])=>(
              <div key={l} style={{ display:"flex",alignItems:"center",gap:7,marginBottom:4 }}>
                <span style={{ width:9,height:9,borderRadius:"50%",background:c,display:"inline-block",
                  border:l==="Mission School"?"2px solid #fff":"none",
                  boxShadow:l==="Mission School"?"0 0 0 1.5px #6366f1":"none" }}/>
                <span style={{ color:"#374151",fontWeight:l==="Mission School"?700:400 }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ width:340,borderLeft:"1px solid #e2e8f0",overflowY:"auto",background:"#fff",flexShrink:0,display:"flex",flexDirection:"column" }}>
          <div style={{ padding:"12px 16px 10px",borderBottom:"1px solid #f1f5f9",background:"#f8fafc",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0 }}>
            <span style={{ fontSize:12,fontWeight:700,color:"#0f172a" }}>Mission Schools & Clusters</span>
            <span style={{ fontSize:10,color:"#6366f1",fontWeight:600 }}>{missionSchools.length} selected</span>
          </div>
          <div style={{ flex:1,overflowY:"auto" }}>
            <ClusterPanel missionSchools={missionSchools} setMissionSchools={setMissionSchools}
              missions={missions} selectedMissionId={selectedMissionId} setSelectedMissionId={setSelectedMissionId}/>
          </div>
        </div>
      </div>
    </div>
  );
}
