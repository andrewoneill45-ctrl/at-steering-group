/**
 * MissionDashboard.jsx — Achieve & Thrive 2026
 * Aggregated view of mission schools + cluster analysis + Gantt signals
 */

import { useState, useMemo, useEffect } from "react";
import { RAG, ALL_MONTHS, TODAY_IDX } from "./data.js";
import BriefingGenerator from "./BriefingGenerator.jsx";

const LS = { fontSize:9, letterSpacing:"0.13em", textTransform:"uppercase", color:"#94a3b8", fontWeight:700, marginBottom:5 };
const PHASE_COLORS = { "Secondary":"#3b82f6","Primary":"#10b981","Special":"#f59e0b","All-through":"#8b5cf6","default":"#94a3b8" };
const IMD_COLORS = [null,"#7f0000","#b30000","#d7301f","#ef6548","#fc8d59","#fdbb84","#a1d99b","#74c476","#41ab5d","#006d2c"];
const OFSTED_COLORS = { "Outstanding":"#6366f1","Good":"#16a34a","Requires improvement":"#d97706","Inadequate":"#dc2626" };

function avg(arr, key) {
  const v = arr.map(s => parseFloat(s[key])).filter(n => !isNaN(n) && n !== 0 && n !== null);
  return v.length ? +(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1) : null;
}

// Try multiple field name variants for key metrics
function getAtt8(s)  { return parseFloat(s.attainment8 || s.att8) || null; }
function getP8(s)    { return parseFloat(s.progress8   || s.p8)   || null; }
function getFSM(s)   { return parseFloat(s.fsm_pct || s.edu_fsm_pct || s.ks4_fsm_pct) || null; }

function avgMetric(arr, fn) {
  const v = arr.map(fn).filter(n => n !== null && !isNaN(n) && n !== 0);
  return v.length ? +(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1) : null;
}

function IMDProfile({ schools, title }) {
  if (!schools.length) return null;
  const withIMD = schools.filter(s=>s.imd_decile);
  if (!withIMD.length) return null;
  const counts = Array(11).fill(0);
  withIMD.forEach(s => { if(s.imd_decile) counts[s.imd_decile]++; });
  const mostDep = withIMD.filter(s=>s.imd_decile<=2).length;
  const pctMost = Math.round(mostDep/withIMD.length*100);
  return (
    <div style={{ marginTop:10 }}>
      <div style={{ ...LS, marginBottom:6 }}>{title || "IMD Deprivation Profile"}</div>
      <div style={{ display:"flex",gap:2,height:16,borderRadius:6,overflow:"hidden",marginBottom:4 }}>
        {[1,2,3,4,5,6,7,8,9,10].map(d=>(
          <div key={d} title={`Decile ${d}: ${counts[d]} schools`}
            style={{ flex:counts[d]||0.1, background:IMD_COLORS[d], transition:"flex 0.3s", cursor:"default" }}/>
        ))}
      </div>
      <div style={{ display:"flex",justifyContent:"space-between",fontSize:9,color:"#94a3b8",marginBottom:4 }}>
        <span>Most deprived</span><span>Least deprived</span>
      </div>
      <div style={{ display:"flex",gap:12,fontSize:10,flexWrap:"wrap" }}>
        <span style={{ color:"#dc2626",fontWeight:600 }}>{pctMost}% in most deprived 20%</span>
        <span style={{ color:"#64748b" }}>{withIMD.length} schools with IMD data</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, color, small }) {
  return (
    <div style={{ background:`${color}0f`, border:`1px solid ${color}33`, borderRadius:12, padding:small?"10px 14px":"14px 18px", textAlign:"center", flex:1, minWidth:small?70:90 }}>
      <div style={{ fontSize:small?20:28, fontWeight:800, color, lineHeight:1, letterSpacing:"-1px" }}>{value ?? "—"}</div>
      {sub && <div style={{ fontSize:10, color, opacity:0.8, marginTop:2, fontWeight:600 }}>{sub}</div>}
      <div style={{ fontSize:9, color:"#94a3b8", marginTop:4, textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</div>
    </div>
  );
}

function OfstedBar({ schools }) {
  const counts = { Outstanding:0, Good:0, "Requires improvement":0, Inadequate:0, Unknown:0 };
  schools.forEach(s => { if(OFSTED_COLORS[s.ofsted]) counts[s.ofsted]++; else counts.Unknown++; });
  const total = schools.length;
  if (!total) return null;
  return (
    <div>
      <div style={{ display:"flex", height:10, borderRadius:5, overflow:"hidden", marginBottom:6 }}>
        {Object.entries(counts).filter(([,n])=>n>0).map(([k,n])=>(
          <div key={k} style={{ width:`${(n/total)*100}%`, background:OFSTED_COLORS[k]||"#e2e8f0", transition:"width 0.3s" }} title={`${k}: ${n}`}/>
        ))}
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {Object.entries(counts).filter(([,n])=>n>0).map(([k,n])=>(
          <div key={k} style={{ display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ width:7, height:7, borderRadius:"50%", background:OFSTED_COLORS[k]||"#e2e8f0", display:"inline-block" }}/>
            <span style={{ fontSize:10, color:"#64748b" }}>{k}: {n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhaseBar({ schools }) {
  const counts = {};
  schools.forEach(s => { const k=s.phase||"Other"; counts[k]=(counts[k]||0)+1; });
  const total = schools.length;
  if (!total) return null;
  return (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
      {Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([k,n])=>(
        <div key={k} style={{ display:"flex", alignItems:"center", gap:4, background:`${PHASE_COLORS[k]||PHASE_COLORS.default}18`, borderRadius:10, padding:"3px 8px" }}>
          <span style={{ width:7,height:7,borderRadius:"50%",background:PHASE_COLORS[k]||PHASE_COLORS.default,display:"inline-block" }}/>
          <span style={{ fontSize:10, color:PHASE_COLORS[k]||PHASE_COLORS.default, fontWeight:600 }}>{k}: {n}</span>
        </div>
      ))}
    </div>
  );
}

// Gantt signal card — flags themes/projects that are red/amber
function GanttSignals({ themes, missions, missionSchools }) {
  const redProjects   = themes.flatMap(t=>t.projects.filter(p=>p.rag==="R").map(p=>({...p,themeName:t.name,themeColor:t.color})));
  const amberProjects = themes.flatMap(t=>t.projects.filter(p=>p.rag==="A").map(p=>({...p,themeName:t.name,themeColor:t.color})));

  // Phase overruns — phases that started but haven't ended yet (past their end date)
  const overduePhases = themes.flatMap(t=>t.projects.flatMap(p=>
    (p.phases||[]).filter(ph=>ph.start+ph.duration < TODAY_IDX).map(ph=>({
      ...ph, projectName:p.name, themeName:t.name, themeColor:t.color
    }))
  ));

  // Upcoming milestones in next 3 months
  const upcomingMs = themes.flatMap(t=>t.projects.flatMap(p=>
    (p.milestones||[]).filter(ms=>ms.month>=TODAY_IDX&&ms.month<=TODAY_IDX+3).map(ms=>({
      ...ms, projectName:p.name, themeName:t.name
    }))
  ));

  const total = redProjects.length + amberProjects.length;

  return (
    <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e8ecf0", overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ padding:"13px 18px", borderBottom:"1px solid #f1f5f9", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:12, fontWeight:700, color:"#0f172a" }}>Gantt Signals</span>
        {total>0 && <span style={{ fontSize:10, color:"#dc2626", fontWeight:600 }}>{redProjects.length} red · {amberProjects.length} amber</span>}
      </div>
      <div style={{ padding:"8px 0" }}>
        {total===0 && overduePhases.length===0 && upcomingMs.length===0 && (
          <div style={{ padding:"12px 18px", fontSize:11, color:"#94a3b8", fontStyle:"italic" }}>No issues flagged — all delivery themes on track.</div>
        )}

        {redProjects.map(p=>(
          <div key={p.id} style={{ display:"flex",gap:10,padding:"8px 18px",borderLeft:"3px solid #dc2626",borderBottom:"1px solid #fef2f2",alignItems:"flex-start" }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11,fontWeight:600,color:"#0f172a" }}>{p.name}</div>
              <div style={{ fontSize:10,color:"#94a3b8" }}>{p.themeName}</div>
              {p.status&&<div style={{ fontSize:10,color:"#dc2626",marginTop:2 }}>{p.status}</div>}
            </div>
            <span style={{ fontSize:9,fontWeight:700,color:"#dc2626",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"2px 7px",flexShrink:0,marginTop:1 }}>IN TROUBLE</span>
          </div>
        ))}

        {amberProjects.map(p=>(
          <div key={p.id} style={{ display:"flex",gap:10,padding:"8px 18px",borderLeft:"3px solid #d97706",borderBottom:"1px solid #fffbeb",alignItems:"flex-start" }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11,fontWeight:600,color:"#0f172a" }}>{p.name}</div>
              <div style={{ fontSize:10,color:"#94a3b8" }}>{p.themeName}</div>
              {p.status&&<div style={{ fontSize:10,color:"#d97706",marginTop:2 }}>{p.status}</div>}
            </div>
            <span style={{ fontSize:9,fontWeight:700,color:"#d97706",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"2px 7px",flexShrink:0,marginTop:1 }}>AT RISK</span>
          </div>
        ))}

        {overduePhases.length>0&&(
          <div style={{ padding:"6px 18px 4px" }}>
            <div style={{ ...LS, color:"#dc2626" }}>Overdue Phases ({overduePhases.length})</div>
            {overduePhases.slice(0,3).map(ph=>(
              <div key={ph.id} style={{ fontSize:11,color:"#374151",padding:"3px 0",borderBottom:"1px solid #f8fafc" }}>
                <span style={{ fontWeight:600 }}>{ph.name}</span>
                <span style={{ color:"#94a3b8",fontSize:10 }}> · {ph.projectName}</span>
                <span style={{ color:"#dc2626",fontSize:10 }}> · ended {ALL_MONTHS[ph.start+ph.duration-1]}</span>
              </div>
            ))}
          </div>
        )}

        {upcomingMs.length>0&&(
          <div style={{ padding:"6px 18px 4px" }}>
            <div style={{ ...LS, color:"#d97706" }}>Upcoming Milestones (next 3 months)</div>
            {upcomingMs.slice(0,4).map(ms=>(
              <div key={ms.id} style={{ fontSize:11,color:"#374151",padding:"3px 0",borderBottom:"1px solid #f8fafc",display:"flex",alignItems:"center",gap:6 }}>
                <span style={{ color:ms.color||"#f59e0b",fontSize:10 }}>◆</span>
                <span style={{ fontWeight:600 }}>{ms.name}</span>
                <span style={{ color:"#94a3b8",fontSize:10 }}>{ms.projectName}</span>
                <span style={{ marginLeft:"auto",fontSize:10,color:"#d97706",fontWeight:600 }}>{ALL_MONTHS[ms.month]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Mission summary card
function MissionCard({ mission, schools, onNavigate }) {
  const s = schools.filter(x=>x.missionId===mission.id);
  const clusters = [...new Set(s.map(x=>x.cluster).filter(Boolean))];
  const avgFSM  = avgMetric(s, getFSM);
  const avgP8   = avgMetric(s, getP8);
  const avgAtt8 = avgMetric(s, getAtt8);

  return (
    <div style={{ background:"#fff", borderRadius:12, border:`1px solid ${mission.color}44`, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
      {/* Header */}
      <div style={{ background:`${mission.color}0d`, borderBottom:`2px solid ${mission.color}`, padding:"12px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
          <div style={{ width:10,height:10,borderRadius:2,background:mission.color,flexShrink:0 }}/>
          <span style={{ fontSize:14,fontWeight:700,color:"#0f172a" }}>{mission.name}</span>
          {mission.subtitle&&<span style={{ fontSize:11,color:"#64748b" }}>{mission.subtitle}</span>}
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:11,color:mission.color,fontWeight:600 }}>{s.length} schools</span>
          <span style={{ fontSize:11,color:"#94a3b8" }}>·</span>
          <span style={{ fontSize:11,color:"#64748b" }}>{clusters.length} cluster{clusters.length!==1?"s":""}</span>
        </div>
      </div>

      <div style={{ padding:"12px 16px" }}>
        {/* Metrics */}
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          {avgFSM!=null&&<MetricCard label="Avg FSM" value={`${avgFSM}%`} color="#d97706" small/>}
          {avgP8!=null&&<MetricCard label="Avg P8" value={avgP8>0?`+${avgP8}`:avgP8} color={avgP8>=0?"#16a34a":"#dc2626"} small/>}
          {avgAtt8!=null&&<MetricCard label="Avg Att8" value={avgAtt8} color="#3b82f6" small/>}
          <MetricCard label="Schools" value={s.length} color="#6366f1" small/>
        </div>

        {/* Phase breakdown */}
        {s.length>0&&<div style={{ marginBottom:10 }}>
          <div style={LS}>Phase breakdown</div>
          <PhaseBar schools={s}/>
        </div>}

        {/* Ofsted breakdown */}
        {s.length>0&&<div style={{ marginBottom:10 }}>
          <div style={LS}>Ofsted profile</div>
          <OfstedBar schools={s}/>
        </div>}

        {/* Clusters */}
        {clusters.length>0&&(
          <div>
            <div style={LS}>Clusters</div>
            <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
              {clusters.map(cl=>{
                const cs=s.filter(x=>x.cluster===cl);
                const cFSM=avg(cs,"fsm_pct");
                const cP8=avg(cs,"progress8");
                return(
                  <div key={cl} style={{ background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,padding:"6px 10px",fontSize:11 }}>
                    <div style={{ fontWeight:700,color:"#4f46e5" }}>{cl}</div>
                    <div style={{ fontSize:10,color:"#64748b" }}>{cs.length} schools{cFSM!=null?` · FSM ${cFSM}%`:""}
                      {cP8!=null?<span style={{ color:cP8>=0?"#16a34a":"#dc2626" }}> · P8 {cP8>0?"+":""}{cP8}</span>:null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <IMDProfile schools={s} title="Place Deprivation Profile"/>

        {/* Delivery phase breakdown */}
        {(()=>{
          const phases=mission.swimlanes.flatMap(sl=>(sl.subrows||[]).flatMap(sr=>(sr.phases||[]).filter(p=>(p.schoolUrns||[]).length>0)));
          if(!phases.length) return null;
          return(
            <div style={{marginTop:10}}>
              <div style={{...LS,marginBottom:6}}>School-to-Phase Assignments</div>
              {phases.map(p=>(
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"1px solid #f8fafc"}}>
                  <span style={{width:8,height:8,borderRadius:2,background:p.color,flexShrink:0}}/>
                  <span style={{flex:1,fontSize:11,color:"#374151",fontWeight:600}}>{p.name}</span>
                  <span style={{fontSize:10,background:"#eef2ff",color:"#4f46e5",borderRadius:10,padding:"1px 7px",fontWeight:700}}>🏫 {p.schoolUrns.length}</span>
                </div>
              ))}
            </div>
          );
        })()}

        {s.length===0&&(
          <div style={{ fontSize:11,color:"#94a3b8",fontStyle:"italic" }}>No schools assigned to this mission yet — go to the Schools tab to add them.</div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const TARGET_LAS=[{name:"Sunderland",code:"394"},{name:"Newcastle upon Tyne",code:"391"},{name:"South Tyneside",code:"393"},{name:"North Tyneside",code:"392"},{name:"Durham",code:"841"},{name:"Darlington",code:"840"},{name:"Middlesbrough",code:"806"},{name:"Stockton-on-Tees",code:"808"},{name:"Redcar and Cleveland",code:"807"},{name:"Hartlepool",code:"805"},{name:"Gateshead",code:"390"},{name:"Portsmouth",code:"851"}];
const NAT_OVERALL=7.1,NAT_PERSISTENT=19.4;
const DS_OVERALL="019d209b-b031-7497-8205-af255b581d91";
const DS_PERSISTENT="019d209c-08dc-74b6-9edb-52d521406fcf";

function AttendanceTab(){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);

  useEffect(()=>{
    setLoading(true);setError(null);
    (async()=>{
      try{
        const mr=await fetch(`https://api.education.gov.uk/statistics/v1/data-sets/${DS_OVERALL}/meta`,{headers:{Accept:"application/json"}});
        if(!mr.ok) throw new Error("Meta "+mr.status);
        const meta=await mr.json();
        const laLevel=(meta.locations||[]).find(l=>l.level?.code==="LA");
        const laOpts=laLevel?.options||[];
        const matched=TARGET_LAS.map(la=>{
          const opt=laOpts.find(o=>o.oldCode===la.code||o.label?.toLowerCase()===la.name.toLowerCase()||o.label?.toLowerCase().includes(la.name.toLowerCase().split(" ")[0]));
          return opt?{...la,locId:opt.id}:null;
        }).filter(Boolean);
        if(!matched.length) throw new Error("No LAs matched in EES metadata");
        const natLevel=(meta.locations||[]).find(l=>l.level?.code==="NAT");
        const natOpt=natLevel?.options?.[0];
        const locIds=matched.map(l=>l.locId);
        if(natOpt) locIds.push(natOpt.id);

        // Fetch all LA overall absence for 2024/25, filter client-side by old LA code
        const q1=await fetch(`https://api.education.gov.uk/statistics/v1/data-sets/${DS_OVERALL}/query`,{
          method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},
          body:JSON.stringify({criteria:{geographicLevels:{in:["LA"]},filters:{in:["L1KsW","Y0dTH"]},timePeriods:{eq:{period:"2024/2025",code:"AY"}}},indicators:["jgLjA"],page:1,pageSize:500}),
        });
        if(!q1.ok) throw new Error("Query1 "+q1.status);
        const d1=await q1.json();

        const q2=await fetch(`https://api.education.gov.uk/statistics/v1/data-sets/${DS_PERSISTENT}/query`,{
          method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},
          body:JSON.stringify({criteria:{geographicLevels:{in:["LA"]},filters:{in:["qYfzj","X5Vmf"]},timePeriods:{eq:{period:"2024/2025",code:"AY"}}},indicators:["TuAuP"],page:1,pageSize:500}),
        });
        if(!q2.ok) throw new Error("Query2 "+q2.status);
        const d2=await q2.json();

        // Build lookup from EES LA location ID to LA name using oldCode and label
        const laIdToName={};
        (laLevel?.options||[]).forEach(o=>{
          const byCode=TARGET_LAS.find(l=>o.oldCode===l.code);
          const byLabel=TARGET_LAS.find(l=>o.label?.toLowerCase()===l.name.toLowerCase());
          const matched=byCode||byLabel;
          if(matched) laIdToName[o.id]=matched.name;
        });

        const results={};
        const period1="2024/25";
        (d1.results||[]).forEach(row=>{
          const overall=parseFloat(row.values?.["jgLjA"]);
          if(isNaN(overall)||!overall) return;
          const laId=row.locations?.LA;
          const laName=laIdToName[laId];
          if(laName&&!results[laName])results[laName]={overall:+overall.toFixed(1),persistent:null,period:period1};
        });
        (d2.results||[]).forEach(row=>{
          const persistent=parseFloat(row.values?.["TuAuP"]);
          if(isNaN(persistent)||!persistent) return;
          const laId=row.locations?.LA;
          const laName=laIdToName[laId];
          if(laName&&results[laName]&&!results[laName].persistent)results[laName].persistent=+persistent.toFixed(1);
        });
        setData({las:results,national:{overall:NAT_OVERALL,persistent:NAT_PERSISTENT},period:period1});
      }catch(e){console.error("Attendance:",e);setError(e.message);}
      setLoading(false);
    })();
  },[]);

  const nat=data?.national||{overall:NAT_OVERALL,persistent:NAT_PERSISTENT};
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div><div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>LA Attendance Intelligence</div><div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>Live · EES API · {data?.period||"2024/25"} · North East + Portsmouth</div></div>
        <div style={{display:"flex",gap:16,background:"#f8fafc",borderRadius:8,padding:"8px 14px",fontSize:10}}>
          <span style={{color:"#64748b"}}>National overall: <strong style={{color:"#374151"}}>{nat.overall}%</strong></span>
          <span style={{color:"#64748b"}}>Persistent: <strong style={{color:"#d97706"}}>{nat.persistent}%</strong></span>
        </div>
      </div>
      {loading&&<div style={{textAlign:"center",padding:40,color:"#6366f1",fontSize:12}}>Fetching from DfE EES API…</div>}
      {error&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px",fontSize:11,color:"#991b1b",marginBottom:16}}>⚠ {error}<button onClick={()=>window.location.reload()} style={{marginLeft:10,fontSize:10,background:"none",border:"1px solid #fca5a5",borderRadius:4,color:"#991b1b",cursor:"pointer",padding:"2px 8px"}}>Retry</button></div>}
      {data&&Object.keys(data.las).length>0&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
          {TARGET_LAS.filter(la=>data.las[la.name]).map(la=>{
            const d=data.las[la.name];const overAbove=d.overall>nat.overall;const perAbove=d.persistent>nat.persistent;
            return(<div key={la.code} style={{background:"#fff",borderRadius:10,border:"1px solid #e8ecf0",padding:"12px 14px",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#0f172a",marginBottom:8}}>{la.name}</div>
              <div style={{display:"flex",gap:10}}>
                <div style={{flex:1}}><div style={{fontSize:9,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2}}>Overall absence</div><div style={{fontSize:20,fontWeight:800,color:overAbove?"#dc2626":"#16a34a",lineHeight:1}}>{d.overall!=null?d.overall+"%":"—"}</div>{d.overall!=null&&<div style={{fontSize:9,color:"#94a3b8",marginTop:2}}>{overAbove?"▲":"▼"} {Math.abs(d.overall-nat.overall).toFixed(1)}pp vs national</div>}</div>
                <div style={{flex:1}}><div style={{fontSize:9,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2}}>Persistent</div><div style={{fontSize:20,fontWeight:800,color:perAbove?"#d97706":"#16a34a",lineHeight:1}}>{d.persistent!=null?d.persistent+"%":"—"}</div>{d.persistent!=null&&<div style={{fontSize:9,color:"#94a3b8",marginTop:2}}>{perAbove?"▲":"▼"} {Math.abs(d.persistent-nat.persistent).toFixed(1)}pp vs national</div>}</div>
              </div>
            </div>);
          })}
        </div>
      )}
      {!loading&&!error&&(!data||!Object.keys(data.las).length)&&<div style={{textAlign:"center",padding:30,color:"#94a3b8",fontSize:11}}>No data returned.</div>}
    </div>
  );
}



// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function MissionDashboard({ missions, missionSchools, themes }) {
  const [activeTab, setActiveTab] = useState("overview");

  const totalSchools = missionSchools.length;
  const allAvgFSM  = avgMetric(missionSchools, getFSM);
  const allAvgP8   = avgMetric(missionSchools, getP8);
  const allAvgAtt8 = avgMetric(missionSchools, getAtt8);
  const allClusters = [...new Set(missionSchools.map(s=>s.cluster).filter(Boolean))];

  const allProjects = themes.flatMap(t=>t.projects);
  const redCount   = allProjects.filter(p=>p.rag==="R").length;
  const amberCount = allProjects.filter(p=>p.rag==="A").length;
  const greenCount = allProjects.filter(p=>p.rag==="G").length;

  if (!missions.length) return (
    <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:"#64748b",fontFamily:"'Outfit','Segoe UI',sans-serif" }}>
      <div style={{ fontSize:32 }}>🎯</div>
      <div style={{ fontSize:16,fontWeight:700,color:"#0f172a" }}>No missions yet</div>
      <div style={{ fontSize:13 }}>Go to Mission Planner to create your first mission.</div>
    </div>
  );

  return (
    <div style={{ flex:1,overflowY:"auto",padding:"24px",fontFamily:"'Outfit','Segoe UI',sans-serif",background:"#f8fafc" }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11,color:"#94a3b8",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.1em" }}>MISSION DASHBOARD — {new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}).toUpperCase()}</div>
        <h1 style={{ fontSize:22,fontWeight:800,color:"#0f172a",margin:"4px 0 0" }}>Place-based Programme Overview</h1>
      </div>
      <div style={{ display:"flex",gap:12,marginBottom:20,flexWrap:"wrap" }}>
        <MetricCard label="Missions" value={missions.length} color="#6366f1"/>
        <MetricCard label="Schools" value={totalSchools} color="#0ea5e9"/>
        <MetricCard label="Clusters" value={allClusters.length} color="#8b5cf6"/>
        {allAvgFSM!=null&&<MetricCard label="Avg FSM" value={`${allAvgFSM}%`} color="#d97706"/>}
        {allAvgAtt8!=null&&<MetricCard label="Avg Att8" value={allAvgAtt8} color="#3b82f6"/>}
        {allAvgP8!=null&&<MetricCard label="Avg P8" value={allAvgP8>0?`+${allAvgP8}`:allAvgP8} color={allAvgP8>=0?"#16a34a":"#dc2626"}/>}
      </div>
      {missionSchools.length>0&&(
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:20 }}>
          <div style={{ background:"#fff",borderRadius:10,border:"1px solid #e8ecf0",padding:"12px 16px" }}><PhaseBar schools={missionSchools}/></div>
          <div style={{ background:"#fff",borderRadius:10,border:"1px solid #e8ecf0",padding:"12px 16px" }}><OfstedBar schools={missionSchools}/></div>
          <div style={{ background:"#fff",borderRadius:10,border:"1px solid #e8ecf0",padding:"12px 16px" }}><IMDProfile schools={missionSchools} title="Place Deprivation (IMD)"/></div>
        </div>
      )}
      <div style={{ background:"#fff",borderRadius:10,border:"1px solid #e8ecf0",padding:"12px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:16 }}>
        <span style={{ fontSize:11,fontWeight:700,color:"#0f172a",flexShrink:0 }}>Delivery Programme Health</span>
        <div style={{ flex:1,height:8,borderRadius:4,overflow:"hidden",display:"flex",gap:1 }}>
          {greenCount>0&&<div style={{ flex:greenCount,background:"#16a34a",borderRadius:"4px 0 0 4px" }}/>}
          {amberCount>0&&<div style={{ flex:amberCount,background:"#d97706" }}/>}
          {redCount>0&&<div style={{ flex:redCount,background:"#dc2626",borderRadius:"0 4px 4px 0" }}/>}
        </div>
        <div style={{ display:"flex",gap:12,fontSize:11,flexShrink:0 }}>
          <span style={{ color:"#16a34a",fontWeight:600 }}>✓ {greenCount}</span>
          <span style={{ color:"#d97706",fontWeight:600 }}>⚠ {amberCount}</span>
          <span style={{ color:"#dc2626",fontWeight:600 }}>✗ {redCount}</span>
        </div>
      </div>
      <div style={{ display:"flex",gap:4,marginBottom:20,borderBottom:"1px solid #e8ecf0",paddingBottom:0 }}>
        {[{id:"overview",label:"Mission Overview"},{id:"clusters",label:"Cluster Analysis"},{id:"gantt",label:"Delivery Signals"},{id:"attendance",label:"Attendance"}].map(({id,label})=>(
          <button key={id} onClick={()=>setActiveTab(id)} style={{ padding:"8px 16px",border:"none",background:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:activeTab===id?700:400,color:activeTab===id?"#4f46e5":"#64748b",borderBottom:activeTab===id?"2px solid #4f46e5":"2px solid transparent",marginBottom:-1 }}>{label}</button>
        ))}
      </div>
      {activeTab==="overview"&&(
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(380px,1fr))",gap:20 }}>
          {missions.map(mission=>(<MissionCard key={mission.id} mission={mission} schools={missionSchools}/>))}
          {missionSchools.filter(s=>!s.missionId).length>0&&(
            <div style={{ background:"#fff",borderRadius:12,border:"1px solid #fde68a",padding:"16px" }}>
              <div style={{ fontSize:13,fontWeight:700,color:"#92400e",marginBottom:8 }}>⚠ Unassigned Schools</div>
              <div style={{ fontSize:12,color:"#64748b",marginBottom:10 }}>{missionSchools.filter(s=>!s.missionId).length} schools not assigned to a mission</div>
              <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                {missionSchools.filter(s=>!s.missionId).slice(0,5).map(s=>(<div key={s.urn} style={{ fontSize:11,color:"#374151" }}>{s.name} · {s.la}</div>))}
                {missionSchools.filter(s=>!s.missionId).length>5&&<div style={{ fontSize:10,color:"#94a3b8" }}>…and {missionSchools.filter(s=>!s.missionId).length-5} more</div>}
              </div>
            </div>
          )}
        </div>
      )}
      {activeTab==="clusters"&&(
        <div>
          {allClusters.length===0 ? (
            <div style={{ textAlign:"center",padding:"40px",color:"#94a3b8",fontSize:12 }}>No clusters created yet.</div>
          ) : (
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:16 }}>
              {allClusters.map(cl=>{
                const cs=missionSchools.filter(s=>s.cluster===cl);
                const cFSM=avgMetric(cs,getFSM),cP8=avgMetric(cs,getP8),cAtt8=avgMetric(cs,getAtt8);
                const mission=missions.find(m=>m.id===cs[0]?.missionId);
                return(
                  <div key={cl} style={{ background:"#fff",borderRadius:12,border:"1px solid #e8ecf0",overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div style={{ background:"#6366f10d",borderBottom:"2px solid #6366f133",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                      <div><span style={{ fontSize:14,fontWeight:700,color:"#4f46e5" }}>{cl}</span>{mission&&<span style={{ fontSize:10,color:"#64748b",marginLeft:8 }}>{mission.name}</span>}</div>
                      <span style={{ fontSize:11,color:"#6366f1",fontWeight:600 }}>{cs.length} schools</span>
                    </div>
                    <div style={{ padding:"12px 14px" }}>
                      <div style={{ display:"flex",gap:8,marginBottom:10,flexWrap:"wrap" }}>
                        {cFSM!=null&&<MetricCard label="FSM" value={`${cFSM}%`} color="#d97706" small/>}
                        {cP8!=null&&<MetricCard label="P8" value={cP8>0?`+${cP8}`:cP8} color={cP8>=0?"#16a34a":"#dc2626"} small/>}
                        {cAtt8!=null&&<MetricCard label="Att8" value={cAtt8} color="#3b82f6" small/>}
                      </div>
                      <PhaseBar schools={cs}/>
                      <div style={{ marginTop:8 }}><OfstedBar schools={cs}/></div>
                      <div style={{ marginTop:8,maxHeight:120,overflowY:"auto" }}>
                        {cs.map(s=>(<div key={s.urn} style={{ fontSize:10,color:"#374151",padding:"2px 0",borderBottom:"1px solid #f8fafc",display:"flex",justifyContent:"space-between" }}><span style={{ overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1 }}>{s.name}</span>{(s.progress8||s.p8)&&<span style={{ color:+(s.progress8||s.p8)>=0?"#16a34a":"#dc2626",fontWeight:600,flexShrink:0,marginLeft:6 }}>P8 {+(s.progress8||s.p8)>0?"+":""}{s.progress8||s.p8}</span>}</div>))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {activeTab==="gantt"&&(
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,alignItems:"start" }}>
          <GanttSignals themes={themes} missions={missions} missionSchools={missionSchools}/>
          <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e8ecf0",overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ padding:"13px 18px",borderBottom:"1px solid #f1f5f9" }}><span style={{ fontSize:12,fontWeight:700,color:"#0f172a" }}>All Delivery Themes</span></div>
            <div style={{ padding:"8px 0" }}>
              {themes.map(t=>{
                const pRags=t.projects.map(p=>p.rag);
                const g=pRags.filter(r=>r==="G").length,a=pRags.filter(r=>r==="A").length,r=pRags.filter(r=>r==="R").length;
                const worst=r>0?"R":a>0?"A":"G";
                return(<div key={t.id} style={{ padding:"9px 18px",borderBottom:"1px solid #f8fafc",display:"flex",alignItems:"center",gap:10 }}>
                  <div style={{ width:3,height:32,background:t.color,borderRadius:2,flexShrink:0 }}/>
                  <div style={{ flex:1,minWidth:0 }}><div style={{ fontSize:11,fontWeight:600,color:"#0f172a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{t.name}</div><div style={{ fontSize:10,color:"#94a3b8",marginTop:1 }}>{t.projects.length} projects</div></div>
                  <div style={{ display:"flex",gap:6,fontSize:10 }}><span style={{ color:"#16a34a",fontWeight:600 }}>✓{g}</span>{a>0&&<span style={{ color:"#d97706",fontWeight:600 }}>⚠{a}</span>}{r>0&&<span style={{ color:"#dc2626",fontWeight:600 }}>✗{r}</span>}</div>
                  <div style={{ width:8,height:8,borderRadius:"50%",background:RAG[worst].color,flexShrink:0 }}/>
                </div>);
              })}
            </div>
          </div>
        </div>
      )}
      {activeTab==="attendance"&&<AttendanceTab/>}
    </div>
  );
}
