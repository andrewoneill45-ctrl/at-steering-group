/**
 * SchoolsTab.jsx — Achieve & Thrive 2026
 * Full England school map using Mapbox GL native layers (GeoJSON Source+Layer)
 * for performance with 26,000+ schools. AI search + cluster analysis.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Map, { Source, Layer, Popup, NavigationControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN  = import.meta.env.VITE_MAPBOX_TOKEN  || "";
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY || "";

const IS = { background:"#fff", border:"1px solid #e2e8f0", borderRadius:6, color:"#374151", padding:"5px 9px", fontSize:11, fontFamily:"inherit", outline:"none" };
const BS = bg => ({ background:bg+"18", border:`1px solid ${bg}66`, borderRadius:6, color:bg, cursor:"pointer", padding:"5px 12px", fontSize:11, fontFamily:"inherit", fontWeight:600 });
const LS = { fontSize:9, letterSpacing:"0.13em", textTransform:"uppercase", color:"#94a3b8", fontWeight:700, marginBottom:5 };

const PHASE_COLORS = {
  "Secondary":"#3b82f6","Primary":"#10b981","Special":"#f59e0b","All-through":"#8b5cf6","default":"#94a3b8",
};

async function callClaude(system, userMsg, maxTokens=800) {
  if (!ANTHROPIC_KEY) return null;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "x-api-key":ANTHROPIC_KEY, "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true" },
    body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:maxTokens, system, messages:[{role:"user",content:userMsg}] }),
  });
  const d = await res.json();
  return d.content?.map(c=>c.text||"").join("") || "";
}

async function aiParseSearch(query, schools) {
  const sampleLAs = [...new Set(schools.map(s=>s.la).filter(Boolean))].slice(0,50);
  const system = `You are a search filter parser for English schools data. Convert the query into a JSON filter object.
Keys: phase ("Primary"|"Secondary"|"Special"|"All-through"), ofsted ("Outstanding"|"Good"|"Requires improvement"|"Inadequate"), la (LA name lowercase partial), name (school name partial), minFSM/maxFSM (0-100), minAttainment8/maxAttainment8 (0-80), minProgress8/maxProgress8 (-3 to 3), minPupils/maxPupils.
Sample LAs: ${sampleLAs.join(", ")}.
Return ONLY valid JSON, no markdown.`;
  const raw = await callClaude(system, query, 300);
  if (!raw) return null;
  try { return JSON.parse(raw.replace(/```json?|```/g,"")); } catch { return null; }
}

function builtInSearch(query, schools) {
  const q = query.toLowerCase().trim();
  const filters = {};
  if (/\bprimary\b/i.test(q))     filters.phase = "Primary";
  if (/\bsecondary\b/i.test(q))   filters.phase = "Secondary";
  if (/\bspecial\b/i.test(q))     filters.phase = "Special";
  if (/all.through/i.test(q))     filters.phase = "All-through";
  if (/outstanding/i.test(q))                 filters.ofsted = "Outstanding";
  if (/\bgood\b/i.test(q))                    filters.ofsted = "Good";
  if (/requires improvement|ri\b/i.test(q))   filters.ofsted = "Requires improvement";
  if (/inadequate|special measures/i.test(q)) filters.ofsted = "Inadequate";
  const fsmAbove = q.match(/(?:above|over|>)\s*(\d+)%?\s*fsm|fsm\s*(?:above|over|>)\s*(\d+)|high.?fsm/i);
  const fsmBelow = q.match(/(?:below|under|<)\s*(\d+)%?\s*fsm|fsm\s*(?:below|under|<)\s*(\d+)/i);
  if (fsmAbove && fsmAbove[1]) filters.minFSM = +fsmAbove[1];
  else if (fsmAbove) filters.minFSM = 35;
  if (fsmBelow && fsmBelow[1]) filters.maxFSM = +fsmBelow[1];
  if (/disadvantaged/i.test(q) && !filters.minFSM) filters.minFSM = 35;
  const knownLAs = [...new Set(schools.map(s=>s.la).filter(Boolean))];
  const locationQ = q.replace(/primary|secondary|special|all.through|outstanding|good|requires improvement|inadequate|high fsm|disadvantaged|above|below|over|under|fsm|progress\s*8|p8|schools?/gi,"").trim();
  if (locationQ.length > 2) {
    const matched = knownLAs.find(la => la.toLowerCase().includes(locationQ) || locationQ.includes(la.toLowerCase()));
    if (matched) { filters.la = matched.toLowerCase(); }
    else {
      for (const word of locationQ.split(/\s+/).filter(w=>w.length>3)) {
        const m = knownLAs.find(la => la.toLowerCase().includes(word));
        if (m) { filters.la = m.toLowerCase(); break; }
      }
    }
  }
  return Object.keys(filters).length ? filters : null;
}

async function aiClusterAnalysis(clusterName, schools, allMissionSchools) {
  const stats = summariseSchools(schools);
  const bench = summariseSchools(allMissionSchools);
  const system = `You are a senior DfE education analyst. Write a concise analytical paragraph (150-200 words) about this cluster of schools for a ministerial briefing. Be specific, evidence-based, note strengths and development areas. Use high-performance policy language. No bullet points.`;
  const msg = `Cluster: "${clusterName}" (${schools.length} schools)\nPhases: ${stats.phases} | FSM avg: ${stats.avgFSM}% | Att8: ${stats.avgAtt8} | P8: ${stats.avgP8} | Ofsted: ${stats.ofsted}\nBenchmark all mission schools (n=${allMissionSchools.length}): FSM ${bench.avgFSM}% | Att8 ${bench.avgAtt8} | P8 ${bench.avgP8}`;
  const raw = await callClaude(system, msg, 600);
  return raw || "AI analysis unavailable — check VITE_ANTHROPIC_KEY is set in Netlify.";
}

function summariseSchools(schools) {
  if (!schools.length) return { phases:"—",avgFSM:"—",avgAtt8:"—",avgP8:"—",ofsted:"—",avgSEN:"—",avgPupils:"—" };
  const avg = (arr,key) => { const v=arr.map(s=>+s[key]).filter(n=>!isNaN(n)&&n>0); return v.length?(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1):"n/a"; };
  const phases = [...new Set(schools.map(s=>s.phase).filter(Boolean))].join(", ");
  const oc = schools.reduce((acc,s)=>{ if(s.ofsted) acc[s.ofsted]=(acc[s.ofsted]||0)+1; return acc; },{});
  return { phases, ofsted:Object.entries(oc).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}: ${v}`).join(", "),
    avgFSM:avg(schools,"fsm_pct"), avgAtt8:avg(schools,"attainment8"), avgP8:avg(schools,"progress8"), avgSEN:avg(schools,"sen_pct"), avgPupils:avg(schools,"pupils") };
}

function applyFilters(fs, schools) {
  let r = schools;
  if (fs.phase)    r = r.filter(s=>s.phase===fs.phase);
  if (fs.ofsted)   r = r.filter(s=>s.ofsted===fs.ofsted);
  if (fs.la)       r = r.filter(s=>s.la?.toLowerCase().includes(fs.la));
  if (fs.name)     r = r.filter(s=>s.name?.toLowerCase().includes(fs.name.toLowerCase()));
  if (fs.minFSM!=null)  r = r.filter(s=>+s.fsm_pct>=fs.minFSM);
  if (fs.maxFSM!=null)  r = r.filter(s=>+s.fsm_pct<=fs.maxFSM);
  if (fs.minAttainment8!=null) r = r.filter(s=>+s.attainment8>=fs.minAttainment8);
  if (fs.maxAttainment8!=null) r = r.filter(s=>+s.attainment8<=fs.maxAttainment8);
  if (fs.minProgress8!=null)   r = r.filter(s=>+s.progress8>=fs.minProgress8);
  if (fs.maxProgress8!=null)   r = r.filter(s=>+s.progress8<=fs.maxProgress8);
  if (fs.minPupils!=null) r = r.filter(s=>+s.pupils>=fs.minPupils);
  if (fs.maxPupils!=null) r = r.filter(s=>+s.pupils<=fs.maxPupils);
  return r;
}

function toGeoJSON(schools, missionUrns) {
  return {
    type:"FeatureCollection",
    features: schools.filter(s=>s.latitude&&s.longitude).map(s=>({
      type:"Feature",
      geometry:{ type:"Point", coordinates:[+s.longitude,+s.latitude] },
      properties:{ urn:s.urn, name:s.name||"", phase:s.phase||"Other", ofsted:s.ofsted||"", la:s.la||"",
        fsm_pct:+s.fsm_pct||0, attainment8:+s.attainment8||0, progress8:+s.progress8||0,
        sen_pct:+s.sen_pct||0, pupils:+s.pupils||0, isMission:missionUrns.has(s.urn)?1:0 },
    })),
  };
}

function StatPill({label,value,color="#6366f1"}) {
  return(
    <div style={{background:`${color}12`,border:`1px solid ${color}33`,borderRadius:8,padding:"8px 12px",minWidth:70,textAlign:"center"}}>
      <div style={{fontSize:18,fontWeight:800,color,lineHeight:1}}>{value}</div>
      <div style={{fontSize:9,color:"#64748b",marginTop:3,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase"}}>{label}</div>
    </div>
  );
}

function SchoolPopup({school,missionSchools,onAdd,onRemove,onClose}) {
  const assigned = missionSchools.find(ms=>ms.urn===school.urn);
  const oc = {"Outstanding":"#6366f1","Good":"#16a34a","Requires improvement":"#d97706","Inadequate":"#dc2626"}[school.ofsted]||"#94a3b8";
  const pc = PHASE_COLORS[school.phase]||PHASE_COLORS.default;
  return(
    <div style={{fontFamily:"'Outfit','Segoe UI',sans-serif",minWidth:240,maxWidth:280,position:"relative"}}>
      <div style={{borderBottom:"1px solid #f1f5f9",paddingBottom:8,marginBottom:8}}>
        <div style={{fontSize:13,fontWeight:700,color:"#0f172a",lineHeight:1.3,marginBottom:4,paddingRight:20}}>{school.name}</div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          <span style={{fontSize:10,background:`${pc}18`,color:pc,border:`1px solid ${pc}44`,borderRadius:10,padding:"1px 7px",fontWeight:600}}>{school.phase}</span>
          {school.ofsted&&<span style={{fontSize:10,background:`${oc}18`,color:oc,border:`1px solid ${oc}44`,borderRadius:10,padding:"1px 7px",fontWeight:600}}>{school.ofsted}</span>}
        </div>
      </div>
      <div style={{fontSize:11,color:"#64748b",marginBottom:8,lineHeight:1.7}}>
        <div>{school.la}</div>
        {school.pupils&&<div>{school.pupils} pupils{school.fsm_pct?` · ${school.fsm_pct}% FSM`:""}</div>}
        {school.attainment8&&<div>Att8: {school.attainment8}{school.progress8?` · P8: ${school.progress8}`:""}</div>}
      </div>
      {assigned?(
        <div>
          <div style={{fontSize:10,color:"#6366f1",fontWeight:600,marginBottom:6}}>✓ Mission school{assigned.cluster?` · ${assigned.cluster}`:" · unassigned"}</div>
          <button onClick={()=>onRemove(school.urn)} style={{...BS("#dc2626"),width:"100%",padding:"6px"}}>Remove from mission</button>
        </div>
      ):(
        <button onClick={()=>onAdd(school)} style={{background:"#6366f1",border:"none",borderRadius:6,color:"#fff",cursor:"pointer",width:"100%",padding:"7px",fontSize:11,fontWeight:600,fontFamily:"inherit"}}>+ Add to mission</button>
      )}
      <button onClick={onClose} style={{position:"absolute",top:-2,right:0,background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:18,lineHeight:1,padding:"2px 4px"}}>×</button>
    </div>
  );
}

function SchoolRow({school,clusters,currentCluster,onAssign,onRemove}) {
  const pc = PHASE_COLORS[school.phase]||PHASE_COLORS.default;
  return(
    <div style={{padding:"7px 12px",borderBottom:"1px solid #f8fafc",display:"flex",alignItems:"center",gap:8}}>
      <span style={{width:7,height:7,borderRadius:"50%",background:pc,flexShrink:0}}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:11,fontWeight:600,color:"#0f172a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{school.name}</div>
        <div style={{fontSize:10,color:"#94a3b8"}}>{school.la}{school.fsm_pct?` · ${school.fsm_pct}% FSM`:""}</div>
      </div>
      <select value={currentCluster||""} onChange={e=>onAssign(school.urn,e.target.value||null)} style={{...IS,fontSize:10,padding:"3px 6px",maxWidth:110}}>
        <option value="">Unassigned</option>
        {clusters.map(c=><option key={c} value={c}>{c}</option>)}
      </select>
      <button onClick={()=>onRemove(school.urn)} style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:14,padding:"2px",flexShrink:0}}>×</button>
    </div>
  );
}

function ClusterPanel({missionSchools,setMissionSchools,missions,selectedMissionId,setSelectedMissionId}) {
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

  if(!missionSchools.length) return(
    <div style={{padding:"24px 16px",textAlign:"center",color:"#94a3b8",fontSize:12,lineHeight:1.8}}>
      No mission schools selected yet.<br/><span style={{fontSize:11}}>Click any school on the map to add it.</span>
    </div>
  );

  const s=summariseSchools(missionSchools);
  return(
    <div style={{padding:"12px 0"}}>
      {missions.length>0&&(
        <div style={{padding:"0 12px 10px",borderBottom:"1px solid #f1f5f9"}}>
          <div style={LS}>Assign to Mission</div>
          <select value={selectedMissionId||""} onChange={e=>setSelectedMissionId(e.target.value||null)} style={{...IS,width:"100%"}}>
            <option value="">No mission selected</option>
            {missions.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      )}
      <div style={{padding:"10px 12px",borderBottom:"1px solid #f1f5f9"}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
          <StatPill label="Schools" value={missionSchools.length} color="#6366f1"/>
          {s.avgFSM!=="n/a"&&<StatPill label="Avg FSM%" value={s.avgFSM} color="#d97706"/>}
          {s.avgP8!=="n/a"&&<StatPill label="Avg P8" value={s.avgP8} color="#0ea5e9"/>}
          {s.avgAtt8!=="n/a"&&<StatPill label="Avg Att8" value={s.avgAtt8} color="#059669"/>}
        </div>
        <div style={{fontSize:10,color:"#64748b"}}>{s.phases}{s.ofsted?` · ${s.ofsted}`:""}</div>
      </div>
      <div style={{padding:"8px 12px",borderBottom:"1px solid #f1f5f9",display:"flex",gap:6}}>
        <input placeholder="New cluster name…" value={newCluster} onChange={e=>setNewCluster(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"&&newCluster.trim()){ setMissionSchools(p=>p); setNewCluster(""); }}} style={{...IS,flex:1,fontSize:11}}/>
        <button onClick={()=>{ if(newCluster.trim()){ /* cluster names are just used in dropdowns */ setNewCluster(""); }}} style={{...BS("#6366f1"),padding:"4px 10px"}}>Add</button>
      </div>
      {clusters["__unassigned"]?.length>0&&(
        <div style={{borderBottom:"1px solid #f1f5f9"}}>
          <div style={{padding:"7px 12px",background:"#fffbeb",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:11,fontWeight:700,color:"#92400e"}}>⚠ Unassigned ({clusters["__unassigned"].length})</span>
          </div>
          {clusters["__unassigned"].map(s=>(
            <SchoolRow key={s.urn} school={s} clusters={allClusters} onAssign={assignCluster} onRemove={urn=>setMissionSchools(p=>p.filter(x=>x.urn!==urn))}/>
          ))}
        </div>
      )}
      {allClusters.map(cl=>{
        const cs=summariseSchools(clusters[cl]||[]);
        return(
          <div key={cl} style={{borderBottom:"1px solid #f1f5f9"}}>
            <div style={{padding:"8px 12px",background:"#6366f108",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
              <div>
                <span style={{fontSize:12,fontWeight:700,color:"#4f46e5"}}>{cl}</span>
                <span style={{fontSize:10,color:"#94a3b8",marginLeft:6}}>{(clusters[cl]||[]).length} schools</span>
                {cs.avgFSM!=="n/a"&&<span style={{fontSize:10,color:"#94a3b8",marginLeft:6}}>FSM {cs.avgFSM}%</span>}
              </div>
              <button onClick={()=>runAnalysis(cl)} disabled={analysing[cl]} style={{...BS("#6366f1"),padding:"3px 9px",fontSize:10,opacity:analysing[cl]?0.6:1}}>
                {analysing[cl]?"Analysing…":"AI Analysis"}
              </button>
            </div>
            {analysis[cl]&&(
              <div style={{padding:"10px 12px",background:"#f0f4ff",borderBottom:"1px solid #e0e7ff",fontSize:11,color:"#1e3a8a",lineHeight:1.7}}>{analysis[cl]}</div>
            )}
            {(clusters[cl]||[]).map(s=>(
              <SchoolRow key={s.urn} school={s} clusters={allClusters} currentCluster={cl} onAssign={assignCluster} onRemove={urn=>setMissionSchools(p=>p.filter(x=>x.urn!==urn))}/>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function SchoolsTab({missions,missionSchools,setMissionSchools}) {
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
          .then(r=>r.json())
          .then(data=>{ setSchools(data); setFiltered(data); setLoading(false); })
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
      const parts=[];
      if(fs.phase) parts.push(fs.phase);
      if(fs.la) parts.push(fs.la);
      if(fs.ofsted) parts.push(fs.ofsted);
      if(fs.minFSM) parts.push(`FSM ≥${fs.minFSM}%`);
      if(fs.minProgress8!=null) parts.push(`P8 ≥${fs.minProgress8}`);
      setSearchExplain(`${results.length.toLocaleString()} schools${parts.length?" — "+parts.join(", "):""}`);
      if(results.length&&results[0].latitude&&mapRef.current)
        mapRef.current.flyTo({center:[+results[0].longitude,+results[0].latitude],zoom:9,duration:1200});
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

  const addToMission=(school)=>{
    if(missionSchools.find(ms=>ms.urn===school.urn)) return;
    setMissionSchools(p=>[...p,{
      urn:school.urn, name:school.name, la:school.la, phase:school.phase, ofsted:school.ofsted,
      fsm_pct:school.fsm_pct, attainment8:school.attainment8, progress8:school.progress8,
      sen_pct:school.sen_pct, pupils:school.pupils,
      lat:school.latitude, lon:school.longitude,
      cluster:null, missionId:selectedMissionId,
    }]);
    setPopup(null);
  };

  const removeFromMission=(urn)=>setMissionSchools(p=>p.filter(s=>s.urn!==urn));

  const onMapClick=useCallback((e)=>{
    const map=mapRef.current; if(!map) return;
    const features=map.queryRenderedFeatures(e.point,{layers:["schools-circles","schools-mission"]});
    if(!features.length){ setPopup(null); return; }
    const f=features[0];
    const school=schools.find(s=>s.urn===f.properties.urn)||f.properties;
    setPopup({school,lng:f.geometry.coordinates[0],lat:f.geometry.coordinates[1]});
  },[schools]);

  const onMouseEnter=useCallback(()=>{ if(mapRef.current) mapRef.current.getCanvas().style.cursor="pointer"; },[]);
  const onMouseLeave=useCallback(()=>{ if(mapRef.current) mapRef.current.getCanvas().style.cursor=""; },[]);

  if(!MAPBOX_TOKEN) return(
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:"#64748b"}}>
      <div style={{fontSize:40}}>🗺</div>
      <div style={{fontWeight:700,color:"#0f172a",fontSize:16}}>Mapbox token required</div>
      <div style={{fontSize:12}}>Add <code>VITE_MAPBOX_TOKEN</code> to Netlify environment variables</div>
    </div>
  );

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:"'Outfit','Segoe UI',sans-serif"}}>
      <div style={{padding:"8px 16px",borderBottom:"1px solid #e2e8f0",background:"#f8fafc",display:"flex",alignItems:"center",gap:8,flexShrink:0,flexWrap:"wrap"}}>
        <div style={{display:"flex",flex:1,minWidth:240,gap:0,border:"1px solid #e2e8f0",borderRadius:8,overflow:"hidden",background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
          <input
            placeholder={ANTHROPIC_KEY?"AI search: 'secondary schools in Sunderland with high FSM'…":"Search: 'primary schools in Newcastle' or school name…"}
            value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSearch()}
            style={{flex:1,padding:"8px 12px",fontSize:11,border:"none",outline:"none",fontFamily:"inherit",color:"#374151"}}
          />
          <button onClick={doSearch} disabled={aiSearching} style={{padding:"8px 16px",background:"#6366f1",border:"none",color:"#fff",fontSize:11,cursor:aiSearching?"wait":"pointer",fontFamily:"inherit",fontWeight:600,whiteSpace:"nowrap"}}>
            {aiSearching?"Searching…":ANTHROPIC_KEY?"AI Search":"Search"}
          </button>
        </div>
        {Object.keys(activeFilters).length>0&&<button onClick={clearSearch} style={{...BS("#94a3b8"),padding:"5px 10px"}}>✕ Clear</button>}
        <div style={{fontSize:10,color:"#94a3b8",whiteSpace:"nowrap"}}>
          {loading?"Loading…":`${filtered.length.toLocaleString()} / ${schools.length.toLocaleString()} schools`}
        </div>
      </div>

      {searchExplain&&(
        <div style={{padding:"5px 16px",background:"#eef2ff",borderBottom:"1px solid #e0e7ff",fontSize:11,color:"#4f46e5",fontWeight:500}}>{searchExplain}</div>
      )}

      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        <div style={{flex:1,position:"relative"}}>
          {loading&&(
            <div style={{position:"absolute",inset:0,background:"rgba(248,250,252,0.95)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10,flexDirection:"column",gap:10}}>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <div style={{width:36,height:36,border:"3px solid #e2e8f0",borderTop:"3px solid #6366f1",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
              <div style={{fontSize:13,fontWeight:600,color:"#6366f1"}}>Loading school data…</div>
              <div style={{fontSize:11,color:"#94a3b8"}}>26,000+ schools across England</div>
            </div>
          )}
          <Map ref={mapRef} {...viewState} onMove={e=>setViewState(e.viewState)}
            mapboxAccessToken={MAPBOX_TOKEN} mapStyle="mapbox://styles/mapbox/light-v11"
            style={{width:"100%",height:"100%"}}
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
                    "circle-color":"#6366f1","circle-opacity":1,"circle-stroke-width":2,"circle-stroke-color":"#fff",
                  }}
                />
              </Source>
            )}
            {popup&&(
              <Popup latitude={popup.lat} longitude={popup.lng} onClose={()=>setPopup(null)}
                closeButton={false} closeOnClick={false} anchor="bottom" offset={10}>
                <SchoolPopup school={popup.school} missionSchools={missionSchools}
                  onAdd={addToMission} onRemove={removeFromMission} onClose={()=>setPopup(null)}/>
              </Popup>
            )}
          </Map>
          <div style={{position:"absolute",bottom:20,left:16,background:"rgba(255,255,255,0.96)",borderRadius:10,padding:"10px 14px",fontSize:10,boxShadow:"0 2px 12px rgba(0,0,0,0.12)"}}>
            {[["Secondary","#3b82f6"],["Primary","#10b981"],["Special","#f59e0b"],["All-through","#8b5cf6"],["Mission School","#6366f1"]].map(([l,c])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
                <span style={{width:9,height:9,borderRadius:"50%",background:c,display:"inline-block",border:l==="Mission School"?"2px solid #fff":"none",boxShadow:l==="Mission School"?"0 0 0 1.5px #6366f1":"none"}}/>
                <span style={{color:"#374151",fontWeight:l==="Mission School"?700:400}}>{l}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{width:340,borderLeft:"1px solid #e2e8f0",overflowY:"auto",background:"#fff",flexShrink:0,display:"flex",flexDirection:"column"}}>
          <div style={{padding:"12px 16px 10px",borderBottom:"1px solid #f1f5f9",background:"#f8fafc",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <span style={{fontSize:12,fontWeight:700,color:"#0f172a"}}>Mission Schools & Clusters</span>
            <span style={{fontSize:10,color:"#6366f1",fontWeight:600}}>{missionSchools.length} selected</span>
          </div>
          <div style={{flex:1,overflowY:"auto"}}>
            <ClusterPanel missionSchools={missionSchools} setMissionSchools={setMissionSchools}
              missions={missions} selectedMissionId={selectedMissionId} setSelectedMissionId={setSelectedMissionId}/>
          </div>
        </div>
      </div>
    </div>
  );
}
