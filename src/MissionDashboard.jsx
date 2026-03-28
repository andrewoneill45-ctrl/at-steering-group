import { useState, useMemo, useEffect, useCallback } from "react";
import { RAG, ALL_MONTHS, TODAY_IDX } from "./data.js";

// ─── LA Attendance from EES API ────────────────────────────────────────────────
const TARGET_LAS = [
  {name:"Sunderland",code:"394"},{name:"Newcastle upon Tyne",code:"391"},
  {name:"South Tyneside",code:"393"},{name:"North Tyneside",code:"392"},
  {name:"Durham",code:"841"},{name:"Darlington",code:"840"},
  {name:"Middlesbrough",code:"806"},{name:"Stockton-on-Tees",code:"808"},
  {name:"Redcar and Cleveland",code:"807"},{name:"Hartlepool",code:"805"},
  {name:"Gateshead",code:"390"},{name:"Portsmouth",code:"851"},
];
const NAT_OVERALL=7.1, NAT_PERSISTENT=19.4;
const DATASET_ID="7588c2d6-9e8a-4d84-8f19-6b8d52a01fbd";

function AttendanceTab() {
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const [fetched,setFetched]=useState(false);

  const fetchData=useCallback(async()=>{
    if(fetched) return;
    setLoading(true); setError(null);
    try {
      const metaRes=await fetch(`https://api.education.gov.uk/statistics/v1/data-sets/${DATASET_ID}/meta`,{headers:{Accept:"application/json"}});
      if(!metaRes.ok) throw new Error("Meta "+metaRes.status);
      const meta=await metaRes.json();
      const inds=meta.indicators||[];
      const oInd=inds.find(i=>i.label?.toLowerCase().includes("overall absence rate"));
      const pInd=inds.find(i=>i.label?.toLowerCase().includes("persistent absence rate"));
      if(!oInd) throw new Error("Cannot find absence indicators in EES metadata");
      const laLevel=(meta.locations||[]).find(l=>l.level?.code==="LA"||l.level?.label?.toLowerCase().includes("local authority"));
      const laOpts=laLevel?.options||[];
      const matched=TARGET_LAS.map(la=>{
        const opt=laOpts.find(o=>o.oldCode===la.code||o.label?.toLowerCase()===la.name.toLowerCase()||o.label?.toLowerCase().includes(la.name.toLowerCase().split(" ")[0]));
        return opt?{...la,locId:opt.id}:null;
      }).filter(Boolean);
      if(!matched.length) throw new Error("No LAs matched. Try again or check EES dataset.");
      const natLevel=(meta.locations||[]).find(l=>l.level?.code==="NAT");
      const natOpt=natLevel?.options?.[0];
      const locIds=matched.map(l=>l.locId);
      if(natOpt) locIds.push(natOpt.id);
      const indIds=[oInd.id,pInd?.id].filter(Boolean);
      const qRes=await fetch(`https://api.education.gov.uk/statistics/v1/data-sets/${DATASET_ID}/query`,{
        method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},
        body:JSON.stringify({criteria:{geographicLevels:{comparator:"In",value:["LA","NAT"]},locations:{comparator:"In",value:locIds}},indicators:indIds,sort:[{field:"timePeriod",order:"Desc"}],page:1,pageSize:100}),
      });
      if(!qRes.ok) throw new Error("Query "+qRes.status);
      const qData=await qRes.json();
      const results={};
      var national=null;
      (qData.results||[]).forEach(row=>{
        const overall=parseFloat(row.values?.[oInd.id])||null;
        const persistent=parseFloat(row.values?.[pInd?.id])||null;
        const period=row.timePeriod?.label||"";
        if(row.geographicLevel==="NAT"){if(!national)national={overall,persistent,period};return;}
        const locId=Object.values(row.locations||{})[0]?.id;
        const la=matched.find(l=>l.locId===locId);
        if(la&&!results[la.name]) results[la.name]={overall,persistent,period};
      });
      setData({las:results,national,period:Object.values(results)[0]?.period});
      setFetched(true);
    } catch(e){
      console.error("Attendance:",e);
      setError(e.message);
    }
    setLoading(false);
  },[fetched]);

  useEffect(()=>{fetchData();},[fetchData]);

  const nat=data?.national||{overall:NAT_OVERALL,persistent:NAT_PERSISTENT};

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>LA Attendance Intelligence</div>
          <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>Live · EES API · {data?.period||"2023/24"} · North East + Portsmouth</div>
        </div>
        <div style={{display:"flex",gap:16,background:"#f8fafc",borderRadius:8,padding:"8px 14px",fontSize:10}}>
          <span style={{color:"#64748b"}}>National overall: <strong style={{color:"#374151"}}>{nat.overall}%</strong></span>
          <span style={{color:"#64748b"}}>National persistent: <strong style={{color:"#d97706"}}>{nat.persistent}%</strong></span>
        </div>
      </div>
      {loading&&<div style={{textAlign:"center",padding:40,color:"#6366f1",fontSize:12}}>Fetching from DfE EES API…</div>}
      {error&&(
        <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px",fontSize:11,color:"#991b1b",marginBottom:16}}>
          ⚠ {error}
          <button onClick={()=>{setFetched(false);setError(null);}} style={{marginLeft:10,fontSize:10,background:"none",border:"1px solid #fca5a5",borderRadius:4,color:"#991b1b",cursor:"pointer",padding:"2px 8px"}}>Retry</button>
        </div>
      )}
      {data&&Object.keys(data.las).length>0&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
          {TARGET_LAS.filter(la=>data.las[la.name]).map(la=>{
            const d=data.las[la.name];
            const overAbove=d.overall>nat.overall;
            const perAbove=d.persistent>nat.persistent;
            return(
              <div key={la.code} style={{background:"#fff",borderRadius:10,border:"1px solid #e8ecf0",padding:"12px 14px",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#0f172a",marginBottom:8}}>{la.name}</div>
                <div style={{display:"flex",gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:9,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2}}>Overall absence</div>
                    <div style={{fontSize:20,fontWeight:800,color:overAbove?"#dc2626":"#16a34a",lineHeight:1}}>{d.overall!=null?d.overall+"%":"—"}</div>
                    {d.overall!=null&&<div style={{fontSize:9,color:"#94a3b8",marginTop:2}}>{overAbove?"▲":"▼"} {Math.abs(d.overall-nat.overall).toFixed(1)}pp vs national</div>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:9,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2}}>Persistent absence</div>
                    <div style={{fontSize:20,fontWeight:800,color:perAbove?"#d97706":"#16a34a",lineHeight:1}}>{d.persistent!=null?d.persistent+"%":"—"}</div>
                    {d.persistent!=null&&<div style={{fontSize:9,color:"#94a3b8",marginTop:2}}>{perAbove?"▲":"▼"} {Math.abs(d.persistent-nat.persistent).toFixed(1)}pp vs national</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!loading&&!error&&(!data||!Object.keys(data.las).length)&&(
        <div style={{textAlign:"center",padding:30,color:"#94a3b8",fontSize:11}}>
          {fetched?"No LA data returned from EES API.":"Click the tab to load attendance data."}
        </div>
      )}
    </div>
  );
}

export default function MissionDashboard({ missions, missionSchools, themes }) {
  const [activeTab, setActiveTab] = useState("overview");

  const totalSchools = missionSchools.length;
  const allAvgFSM  = avgMetric(missionSchools, getFSM);
  const allAvgP8   = avgMetric(missionSchools, getP8);
  const allAvgAtt8 = avgMetric(missionSchools, getAtt8);
  const allClusters = [...new Set(missionSchools.map(s=>s.cluster).filter(Boolean))];

  // Gantt health
  const allProjects = themes.flatMap(t=>t.projects);
  const redCount   = allProjects.filter(p=>p.rag==="R").length;
  const amberCount = allProjects.filter(p=>p.rag==="A").length;
  const greenCount = allProjects.filter(p=>p.rag==="G").length;

  if (!missions.length) return (
    <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:"#64748b",fontFamily:"'Outfit','Segoe UI',sans-serif" }}>
      <div style={{ fontSize:40 }}>🗺</div>
      <div style={{ fontWeight:700,color:"#0f172a",fontSize:16 }}>No mission data yet</div>
      <div style={{ fontSize:12,maxWidth:300,textAlign:"center",lineHeight:1.6 }}>
        Create missions in the Missions tab, then add schools from the Schools tab to see aggregated analysis here.
      </div>
    </div>
  );

  return (
    <div style={{ flex:1,overflowY:"auto",fontFamily:"'Outfit','Segoe UI',sans-serif" }}>
      <div style={{ padding:"24px 32px",maxWidth:1400,margin:"0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:11,fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",color:"#94a3b8",marginBottom:8 }}>
            Mission Dashboard — {new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"})}
          </div>
          <div style={{ fontSize:22,fontWeight:800,color:"#0f172a",letterSpacing:"-0.5px",marginBottom:16 }}>Place-based Programme Overview</div>

          {/* Top metrics */}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12,marginBottom:20 }}>
            <MetricCard label="Missions" value={missions.length} color="#6366f1"/>
            <MetricCard label="Schools" value={totalSchools} color="#0ea5e9"/>
            <MetricCard label="Clusters" value={allClusters.length} color="#8b5cf6"/>
            {allAvgFSM!=null&&<MetricCard label="Avg FSM" value={`${allAvgFSM}%`} color="#d97706"/>}
            {allAvgP8!=null&&<MetricCard label="Avg P8" value={allAvgP8>0?`+${allAvgP8}`:allAvgP8} color={allAvgP8>=0?"#16a34a":"#dc2626"}/>}
            {allAvgAtt8!=null&&<MetricCard label="Avg Att8" value={allAvgAtt8} color="#3b82f6"/>}
          </div>

          {/* Overall phase + Ofsted + IMD */}
          {missionSchools.length>0&&(
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:8 }}>
              <div style={{ background:"#fff",borderRadius:10,border:"1px solid #e8ecf0",padding:"12px 16px" }}>
                <div style={LS}>Phase Profile</div>
                <PhaseBar schools={missionSchools}/>
              </div>
              <div style={{ background:"#fff",borderRadius:10,border:"1px solid #e8ecf0",padding:"12px 16px" }}>
                <div style={LS}>Ofsted Profile</div>
                <OfstedBar schools={missionSchools}/>
              </div>
              <div style={{ background:"#fff",borderRadius:10,border:"1px solid #e8ecf0",padding:"12px 16px" }}>
                <IMDProfile schools={missionSchools} title="Place Deprivation (IMD)"/>
              </div>
            </div>
          )}

          {/* Gantt health strip */}
          <div style={{ background:"#fff",borderRadius:10,border:"1px solid #e8ecf0",padding:"12px 16px",display:"flex",alignItems:"center",gap:16 }}>
            <div style={{ fontSize:11,fontWeight:700,color:"#0f172a" }}>Delivery Programme Health</div>
            <div style={{ flex:1,display:"flex",height:8,borderRadius:4,overflow:"hidden",background:"#f1f5f9" }}>
              <div style={{ width:`${(greenCount/Math.max(allProjects.length,1))*100}%`,background:"#16a34a" }}/>
              <div style={{ width:`${(amberCount/Math.max(allProjects.length,1))*100}%`,background:"#d97706" }}/>
              <div style={{ width:`${(redCount/Math.max(allProjects.length,1))*100}%`,background:"#dc2626" }}/>
            </div>
            <div style={{ display:"flex",gap:10,fontSize:10,flexShrink:0 }}>
              <span style={{ color:"#16a34a",fontWeight:600 }}>✓ {greenCount}</span>
              <span style={{ color:"#d97706",fontWeight:600 }}>⚠ {amberCount}</span>
              <span style={{ color:"#dc2626",fontWeight:600 }}>✗ {redCount}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex",gap:4,marginBottom:20,borderBottom:"1px solid #e8ecf0",paddingBottom:0 }}>
          {[{id:"overview",label:"Mission Overview"},{id:"clusters",label:"Cluster Analysis"},{id:"gantt",label:"Delivery Signals"},{id:"attendance",label:"Attendance"}].map(({id,label})=>(
            <button key={id} onClick={()=>setActiveTab(id)} style={{
              padding:"8px 16px",border:"none",background:"none",cursor:"pointer",fontFamily:"inherit",
              fontSize:12,fontWeight:activeTab===id?700:400,
              color:activeTab===id?"#4f46e5":"#64748b",
              borderBottom:activeTab===id?"2px solid #4f46e5":"2px solid transparent",
              marginBottom:-1,
            }}>{label}</button>
          ))}
        </div>

        {/* Tab: Mission Overview */}
        {activeTab==="overview"&&(
          <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(380px,1fr))",gap:20 }}>
            {missions.map(mission=>(
              <MissionCard key={mission.id} mission={mission} schools={missionSchools}/>
            ))}
            {missionSchools.filter(s=>!s.missionId).length>0&&(
              <div style={{ background:"#fff",borderRadius:12,border:"1px solid #fde68a",padding:"16px" }}>
                <div style={{ fontSize:13,fontWeight:700,color:"#92400e",marginBottom:8 }}>⚠ Unassigned Schools</div>
                <div style={{ fontSize:12,color:"#64748b",marginBottom:10 }}>{missionSchools.filter(s=>!s.missionId).length} schools not assigned to a mission</div>
                <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                  {missionSchools.filter(s=>!s.missionId).slice(0,5).map(s=>(
                    <div key={s.urn} style={{ fontSize:11,color:"#374151" }}>{s.name} · {s.la}</div>
                  ))}
                  {missionSchools.filter(s=>!s.missionId).length>5&&<div style={{ fontSize:10,color:"#94a3b8" }}>…and {missionSchools.filter(s=>!s.missionId).length-5} more</div>}
                </div>
              </div>
            )}
          </div>
          </div>
        )}

        {/* Tab: Cluster Analysis */}
        {activeTab==="clusters"&&(
          <div>
            {allClusters.length===0 ? (
              <div style={{ textAlign:"center",padding:"40px",color:"#94a3b8",fontSize:12 }}>
                No clusters created yet. Assign schools to clusters in the Schools tab or cluster panel.
              </div>
            ) : (
              <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:16 }}>
                {allClusters.map(cl=>{
                  const cs=missionSchools.filter(s=>s.cluster===cl);
                  const cFSM=avgMetric(cs,getFSM),cP8=avgMetric(cs,getP8),cAtt8=avgMetric(cs,getAtt8);
                  const mission=missions.find(m=>m.id===cs[0]?.missionId);
                  return(
                    <div key={cl} style={{ background:"#fff",borderRadius:12,border:"1px solid #e8ecf0",overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
                      <div style={{ background:"#6366f10d",borderBottom:"2px solid #6366f133",padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                        <div>
                          <span style={{ fontSize:14,fontWeight:700,color:"#4f46e5" }}>{cl}</span>
                          {mission&&<span style={{ fontSize:10,color:"#64748b",marginLeft:8 }}>{mission.name}</span>}
                        </div>
                        <span style={{ fontSize:11,color:"#6366f1",fontWeight:600 }}>{cs.length} schools</span>
                      </div>
                      <div style={{ padding:"12px 14px" }}>
                        <div style={{ display:"flex",gap:8,marginBottom:10,flexWrap:"wrap" }}>
                          {cFSM!=null&&<MetricCard label="FSM" value={`${cFSM}%`} color="#d97706" small/>}
                          {cP8!=null&&<MetricCard label="P8" value={cP8>0?`+${cP8}`:cP8} color={cP8>=0?"#16a34a":"#dc2626"} small/>}
                          {cAtt8!=null&&<MetricCard label="Att8" value={cAtt8} color="#3b82f6" small/>}
                        </div>
                        <PhaseBar schools={cs}/>
                        <div style={{ marginTop:8 }}>
                          <OfstedBar schools={cs}/>
                        </div>
                        <div style={{ marginTop:8,maxHeight:120,overflowY:"auto" }}>
                          {cs.map(s=>(
                            <div key={s.urn} style={{ fontSize:10,color:"#374151",padding:"2px 0",borderBottom:"1px solid #f8fafc",display:"flex",justifyContent:"space-between" }}>
                              <span style={{ overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1 }}>{s.name}</span>
                              {(s.progress8||s.p8)&&<span style={{ color:+(s.progress8||s.p8)>=0?"#16a34a":"#dc2626",fontWeight:600,flexShrink:0,marginLeft:6 }}>P8 {+(s.progress8||s.p8)>0?"+":""}{s.progress8||s.p8}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Delivery Signals */}
        {activeTab==="gantt"&&(
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,alignItems:"start" }}>
            <GanttSignals themes={themes} missions={missions} missionSchools={missionSchools}/>

            {/* Theme health by mission relevance */}
            <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e8ecf0",overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
              <div style={{ padding:"13px 18px",borderBottom:"1px solid #f1f5f9" }}>
                <span style={{ fontSize:12,fontWeight:700,color:"#0f172a" }}>All Delivery Themes</span>
              </div>
              <div style={{ padding:"8px 0" }}>
                {themes.map(t=>{
                  const pRags=t.projects.map(p=>p.rag);
                  const g=pRags.filter(r=>r==="G").length;
                  const a=pRags.filter(r=>r==="A").length;
                  const r=pRags.filter(r=>r==="R").length;
                  const worst=r>0?"R":a>0?"A":"G";
                  return(
                    <div key={t.id} style={{ padding:"9px 18px",borderBottom:"1px solid #f8fafc",display:"flex",alignItems:"center",gap:10 }}>
                      <div style={{ width:3,height:32,background:t.color,borderRadius:2,flexShrink:0 }}/>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:11,fontWeight:600,color:"#0f172a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{t.name}</div>
                        <div style={{ fontSize:10,color:"#94a3b8",marginTop:1 }}>{t.projects.length} projects</div>
                      </div>
                      <div style={{ display:"flex",gap:6,fontSize:10 }}>
                        <span style={{ color:"#16a34a",fontWeight:600 }}>✓{g}</span>
                        {a>0&&<span style={{ color:"#d97706",fontWeight:600 }}>⚠{a}</span>}
                        {r>0&&<span style={{ color:"#dc2626",fontWeight:600 }}>✗{r}</span>}
                      </div>
                      <div style={{ width:8,height:8,borderRadius:"50%",background:RAG[worst].color,flexShrink:0 }}/>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Attendance */}
        {activeTab==="attendance"&&<AttendanceTab/>}

      </div>
    </div>
  );
}
