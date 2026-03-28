/**
 * MissionDashboard.jsx — Achieve & Thrive 2026
 * Redesigned: mission phase RAGs, richer metrics, scatter plots, cluster analysis
 */
import { useState, useMemo, useEffect, useCallback } from "react";
import { RAG, ALL_MONTHS, TODAY_IDX } from "./data.js";
import StatsPanel from "./StatsPanel.jsx";

// ─── Constants ─────────────────────────────────────────────────────────────────
const LS  = { fontSize:9, letterSpacing:"0.13em", textTransform:"uppercase", color:"#94a3b8", fontWeight:700 };
const IMD_COLORS = [null,"#7f0000","#b30000","#d7301f","#ef6548","#fc8d59","#fdbb84","#a1d99b","#74c476","#41ab5d","#006d2c"];
const NAT_ATT8 = 46.4, NAT_BASICS = 60.2;

// ─── Helper functions ───────────────────────────────────────────────────────────
function pct(arr, fn) {
  const v = arr.filter(fn);
  return arr.length ? Math.round(v.length / arr.length * 100) : null;
}
function avg(arr, fn) {
  const v = arr.map(fn).filter(n => n != null && !isNaN(n) && n !== 0);
  return v.length ? +(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1) : null;
}
function getFSM(s)     { return parseFloat(s.fsm_pct) || null; }
function getAtt8(s)    { return parseFloat(s.attainment8 || s.att8) || null; }
function getBasics(s)  { return parseFloat(s.basics_94) || null; }
function getEAL(s)     { return parseFloat(s.eal_pct) || null; }
function getKS2(s)     { return parseFloat(s.ks2_rwm_exp) || null; }

// Extract all phase RAGs from missions
function getMissionPhaseRAGs(missions) {
  const all = [];
  missions.forEach(m => {
    (m.swimlanes||[]).forEach(sl => {
      (sl.subrows||[]).forEach(sr => {
        (sr.phases||[]).forEach(ph => {
          all.push({ missionName: m.name, missionColor: m.color, phaseName: ph.name, rag: ph.rag, notes: ph.notes||"", phaseId: ph.id });
        });
      });
    });
  });
  return all;
}

// ─── Sub-components ─────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, color="#6366f1", small, highlight }) {
  return (
    <div style={{ background: highlight ? `${color}18` : `${color}0d`, border:`1px solid ${color}${highlight?"44":"22"}`, borderRadius:10, padding:small?"8px 10px":"14px 18px", minWidth:small?70:100, textAlign:"center", flex:"0 0 auto" }}>
      <div style={{ fontSize:small?15:24, fontWeight:800, color, lineHeight:1 }}>{value ?? "—"}</div>
      {sub && <div style={{ fontSize:9, color, fontWeight:600, marginTop:2 }}>{sub}</div>}
      <div style={{ fontSize:8, color:"#94a3b8", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginTop:3 }}>{label}</div>
    </div>
  );
}

function RAGDot({ rag, size=8 }) {
  const c = rag==="R"?"#dc2626":rag==="A"?"#d97706":"#16a34a";
  return <span style={{ display:"inline-block", width:size, height:size, borderRadius:"50%", background:c, flexShrink:0 }}/>;
}

function Sparkbar({ value, max=100, color="#6366f1", national, label }) {
  const pct = Math.min((value||0)/max*100, 100);
  const natPct = national ? Math.min(national/max*100, 100) : null;
  return (
    <div style={{ marginBottom:6 }}>
      {label && <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"#94a3b8", marginBottom:2 }}>
        <span>{label}</span>
        <span style={{ fontWeight:700, color:"#374151" }}>{value != null ? value+"%" : "—"}</span>
      </div>}
      <div style={{ height:6, background:"#f1f5f9", borderRadius:3, position:"relative", overflow:"visible" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:3, transition:"width 0.4s" }}/>
        {natPct && <div style={{ position:"absolute", top:-2, left:`${natPct}%`, width:1, height:10, background:"#64748b", transform:"translateX(-50%)" }} title={`National: ${national}%`}/>}
      </div>
    </div>
  );
}

function IMDProfile({ schools }) {
  const withIMD = schools.filter(s=>s.imd_decile);
  if (!withIMD.length) return null;
  const counts = Array(11).fill(0);
  withIMD.forEach(s => counts[s.imd_decile]++);
  const mostDep = withIMD.filter(s=>s.imd_decile<=2).length;
  return (
    <div>
      <div style={{ ...LS, marginBottom:4 }}>IMD Deprivation</div>
      <div style={{ display:"flex", gap:1, height:10, borderRadius:4, overflow:"hidden", marginBottom:3 }}>
        {[1,2,3,4,5,6,7,8,9,10].map(d=>(
          <div key={d} title={`Decile ${d}: ${counts[d]}`} style={{ flex:counts[d]||0.1, background:IMD_COLORS[d] }}/>
        ))}
      </div>
      <div style={{ fontSize:9, color:"#dc2626", fontWeight:600 }}>{Math.round(mostDep/withIMD.length*100)}% in most deprived 20%</div>
    </div>
  );
}

// Inline SVG scatter plot — no library needed
function ScatterPlot({ schools, xKey, yKey, xLabel, yLabel, xNat, yNat, color="#6366f1" }) {
  const pts = schools.map(s => ({ x: parseFloat(s[xKey]), y: parseFloat(s[yKey]), name: s.name }))
    .filter(p => !isNaN(p.x) && !isNaN(p.y) && p.x > 0 && p.y > 0);
  if (pts.length < 2) return <div style={{ fontSize:10, color:"#94a3b8", padding:20, textAlign:"center" }}>Insufficient data for scatter plot</div>;

  const W=280, H=160, PAD=30;
  const xs = pts.map(p=>p.x), ys = pts.map(p=>p.y);
  const xMin=Math.min(...xs)*0.95, xMax=Math.max(...xs)*1.05;
  const yMin=Math.min(...ys)*0.95, yMax=Math.max(...ys)*1.05;
  const sx = x => PAD + (x-xMin)/(xMax-xMin)*(W-PAD*2);
  const sy = y => H-PAD - (y-yMin)/(yMax-yMin)*(H-PAD*2);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow:"visible" }}>
      {/* Axes */}
      <line x1={PAD} y1={H-PAD} x2={W-PAD} y2={H-PAD} stroke="#e2e8f0" strokeWidth={1}/>
      <line x1={PAD} y1={PAD} x2={PAD} y2={H-PAD} stroke="#e2e8f0" strokeWidth={1}/>
      {/* National reference lines */}
      {xNat && xNat>xMin && xNat<xMax && <line x1={sx(xNat)} y1={PAD} x2={sx(xNat)} y2={H-PAD} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3,3"/>}
      {yNat && yNat>yMin && yNat<yMax && <line x1={PAD} y1={sy(yNat)} x2={W-PAD} y2={sy(yNat)} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3,3"/>}
      {/* Points */}
      {pts.map((p,i) => (
        <g key={i}>
          <circle cx={sx(p.x)} cy={sy(p.y)} r={4} fill={color} fillOpacity={0.7} stroke="#fff" strokeWidth={1}/>
          <title>{p.name}: {xLabel} {p.x.toFixed(1)}%, {yLabel} {p.y.toFixed(1)}</title>
        </g>
      ))}
      {/* Axis labels */}
      <text x={W/2} y={H} fontSize={7} textAnchor="middle" fill="#94a3b8">{xLabel}</text>
      <text x={8} y={H/2} fontSize={7} textAnchor="middle" fill="#94a3b8" transform={`rotate(-90,8,${H/2})`}>{yLabel}</text>
    </svg>
  );
}

function MissionCard({ mission, missionSchools }) {
  const s = missionSchools.filter(x => x.missionId === mission.id);
  const clusters = [...new Set(s.map(x=>x.cluster).filter(Boolean))];
  const avgFSM    = avg(s, getFSM);
  const avgAtt8   = avg(s, getAtt8);
  const avgBasics = avg(s, getBasics);
  const pctMostDep = s.filter(x=>x.imd_decile<=2).length;
  const pctDepPct = s.filter(x=>x.imd_decile).length ? Math.round(pctMostDep/s.filter(x=>x.imd_decile).length*100) : null;

  // Phase RAGs for this mission
  const phaseRAGs = getMissionPhaseRAGs([mission]);
  const rRags = phaseRAGs.filter(p=>p.rag==="R");
  const aRags = phaseRAGs.filter(p=>p.rag==="A");
  const gRags = phaseRAGs.filter(p=>p.rag==="G");
  const worstRAG = rRags.length?"R":aRags.length?"A":"G";

  return (
    <div style={{ background:"#fff", borderRadius:12, border:`2px solid ${mission.color}33`, overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
      {/* Header */}
      <div style={{ background:`${mission.color}0d`, borderBottom:`2px solid ${mission.color}22`, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:10, height:10, borderRadius:"50%", background:mission.color, display:"inline-block" }}/>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:"#0f172a" }}>{mission.name}</div>
            {mission.subtitle && <div style={{ fontSize:10, color:"#64748b" }}>{mission.subtitle}</div>}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <RAGDot rag={worstRAG} size={10}/>
          <span style={{ fontSize:11, fontWeight:700, color:mission.color }}>{s.length} schools</span>
        </div>
      </div>

      <div style={{ padding:"14px 16px" }}>
        {/* Key metrics row */}
        <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
          {avgFSM!=null && <MetricCard label="Avg FSM" value={`${avgFSM}%`} color="#d97706" small/>}
          {avgAtt8!=null && <MetricCard label="Att8" value={avgAtt8} sub={NAT_ATT8 ? (avgAtt8>NAT_ATT8?"▲ nat":"▼ nat") : null} color={avgAtt8>=NAT_ATT8?"#16a34a":"#dc2626"} small/>}
          {avgBasics!=null && <MetricCard label="Basics 9-4" value={`${avgBasics}%`} sub={avgBasics>=NAT_BASICS?"▲ nat":"▼ nat"} color={avgBasics>=NAT_BASICS?"#16a34a":"#dc2626"} small/>}
          {pctDepPct!=null && <MetricCard label="Most deprived" value={`${pctDepPct}%`} color="#7c3aed" small/>}
          <MetricCard label="Clusters" value={clusters.length} color={mission.color} small/>
        </div>

        {/* Attainment bars */}
        <div style={{ marginBottom:12 }}>
          {avgAtt8!=null && <Sparkbar value={avgAtt8} max={70} color={mission.color} national={NAT_ATT8} label="Avg Attainment 8"/>}
          {avgBasics!=null && <Sparkbar value={avgBasics} max={100} color={mission.color} national={NAT_BASICS} label="Basics 9-4 %"/>}
          {avgFSM!=null && <Sparkbar value={avgFSM} max={80} color="#d97706" label="FSM %"/>}
        </div>

        {/* Cluster breakdown */}
        {clusters.length > 0 && (
          <div style={{ marginBottom:12 }}>
            <div style={{ ...LS, marginBottom:6 }}>Clusters</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {clusters.map(cl => {
                const cs = s.filter(x=>x.cluster===cl);
                const cAtt8 = avg(cs, getAtt8);
                const cFSM = avg(cs, getFSM);
                return (
                  <div key={cl} style={{ background:`${mission.color}0d`, border:`1px solid ${mission.color}33`, borderRadius:8, padding:"6px 10px", flex:"1 0 auto" }}>
                    <div style={{ fontSize:12, fontWeight:800, color:mission.color }}>{cl}</div>
                    <div style={{ fontSize:10, color:"#64748b" }}>{cs.length} schools</div>
                    {cFSM!=null && <div style={{ fontSize:9, color:"#d97706" }}>FSM {cFSM}%</div>}
                    {cAtt8!=null && <div style={{ fontSize:9, color:"#374151" }}>Att8 {cAtt8}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Phase delivery signals */}
        <div>
          <div style={{ ...LS, marginBottom:6 }}>Delivery Phases</div>
          <div style={{ display:"flex", gap:6, fontSize:10 }}>
            <span style={{ color:"#16a34a", fontWeight:700 }}>✓ {gRags.length} on track</span>
            {aRags.length>0 && <span style={{ color:"#d97706", fontWeight:700 }}>⚠ {aRags.length} at risk</span>}
            {rRags.length>0 && <span style={{ color:"#dc2626", fontWeight:700 }}>✗ {rRags.length} in trouble</span>}
          </div>
          {rRags.map(p => (
            <div key={p.phaseId} style={{ fontSize:10, color:"#dc2626", marginTop:3 }}>✗ {p.phaseName}</div>
          ))}
          {aRags.map(p => (
            <div key={p.phaseId} style={{ fontSize:10, color:"#d97706", marginTop:3 }}>⚠ {p.phaseName}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClusterCard({ cl, schools, mission, missions }) {
  const s = schools.filter(x=>x.cluster===cl);
  const avgFSM    = avg(s, getFSM);
  const avgAtt8   = avg(s, getAtt8);
  const avgBasics = avg(s, getBasics);
  const avgEAL    = avg(s, getEAL);
  const m = mission || missions.find(m=>m.id===s[0]?.missionId);

  return (
    <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e8ecf0", overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ background:"#6366f10d", borderBottom:"2px solid #6366f122", padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <span style={{ fontSize:15, fontWeight:800, color:"#4f46e5" }}>{cl}</span>
          {m && <span style={{ fontSize:10, color:"#64748b", marginLeft:8 }}>{m.name}</span>}
        </div>
        <span style={{ fontSize:11, color:"#6366f1", fontWeight:700 }}>{s.length} schools</span>
      </div>
      <div style={{ padding:"12px 14px" }}>
        {/* Metric cards */}
        <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
          {avgFSM!=null && <MetricCard label="FSM" value={`${avgFSM}%`} color="#d97706" small/>}
          {avgAtt8!=null && <MetricCard label="Att8" value={avgAtt8} color={avgAtt8>=NAT_ATT8?"#16a34a":"#dc2626"} small/>}
          {avgBasics!=null && <MetricCard label="Basics" value={`${avgBasics}%`} color={avgBasics>=NAT_BASICS?"#16a34a":"#dc2626"} small/>}
          {avgEAL!=null && <MetricCard label="EAL" value={`${avgEAL}%`} color="#8b5cf6" small/>}
        </div>

        {/* Attainment bars */}
        {avgAtt8!=null && <Sparkbar value={avgAtt8} max={70} color="#6366f1" national={NAT_ATT8} label="Att8"/>}
        {avgBasics!=null && <Sparkbar value={avgBasics} max={100} color="#0ea5e9" national={NAT_BASICS} label="Basics 9-4"/>}
        {avgFSM!=null && <Sparkbar value={avgFSM} max={80} color="#d97706" label="FSM"/>}

        {/* Scatter: FSM vs Att8 */}
        {s.filter(x=>getAtt8(x)&&getFSM(x)).length >= 3 && (
          <div style={{ marginTop:10 }}>
            <div style={{ ...LS, marginBottom:4 }}>FSM% vs Attainment 8</div>
            <ScatterPlot schools={s} xKey="fsm_pct" yKey="attainment8" xLabel="FSM%" yLabel="Att8" xNat={42} yNat={NAT_ATT8} color="#6366f1"/>
          </div>
        )}

        {/* School list */}
        <div style={{ marginTop:10, maxHeight:140, overflowY:"auto" }}>
          <div style={{ ...LS, marginBottom:4 }}>Schools</div>
          {s.map(school => (
            <div key={school.urn} style={{ fontSize:10, color:"#374151", padding:"3px 0", borderBottom:"1px solid #f8fafc", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{school.name}</span>
              <div style={{ display:"flex", gap:6, flexShrink:0, marginLeft:6 }}>
                {school.basics_94!=null && <span style={{ color:"#0ea5e9", fontWeight:600 }}>{school.basics_94}%</span>}
                {school.attainment8!=null && <span style={{ color:"#6366f1", fontWeight:600 }}>{school.attainment8}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DeliverySignals({ missions }) {
  const allPhaseRAGs = getMissionPhaseRAGs(missions);
  const red   = allPhaseRAGs.filter(p=>p.rag==="R");
  const amber = allPhaseRAGs.filter(p=>p.rag==="A");
  const green = allPhaseRAGs.filter(p=>p.rag==="G");

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, alignItems:"start" }}>
      {/* Signal board */}
      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e8ecf0", overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ padding:"13px 18px", borderBottom:"1px solid #f1f5f9", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontSize:12, fontWeight:700, color:"#0f172a" }}>Mission Phase Signals</span>
          <div style={{ display:"flex", gap:10, fontSize:11 }}>
            <span style={{ color:"#16a34a", fontWeight:700 }}>✓ {green.length}</span>
            <span style={{ color:"#d97706", fontWeight:700 }}>⚠ {amber.length}</span>
            <span style={{ color:"#dc2626", fontWeight:700 }}>✗ {red.length}</span>
          </div>
        </div>
        <div style={{ padding:"8px 0", maxHeight:400, overflowY:"auto" }}>
          {[...red, ...amber].map((p,i) => (
            <div key={i} style={{ padding:"8px 18px", borderBottom:"1px solid #f8fafc", display:"flex", alignItems:"center", gap:10 }}>
              <RAGDot rag={p.rag}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#0f172a" }}>{p.phaseName}</div>
                <div style={{ fontSize:10, color:"#64748b" }}>{p.missionName}</div>
                {p.notes && <div style={{ fontSize:9, color:"#94a3b8", marginTop:1 }}>{p.notes}</div>}
              </div>
              <span style={{ fontSize:10, fontWeight:700, color:p.rag==="R"?"#dc2626":"#d97706", flexShrink:0 }}>{p.rag==="R"?"In Trouble":"At Risk"}</span>
            </div>
          ))}
          {red.length===0 && amber.length===0 && (
            <div style={{ padding:"20px 18px", fontSize:11, color:"#94a3b8", textAlign:"center" }}>All mission phases on track ✓</div>
          )}
        </div>
      </div>

      {/* Mission-by-mission RAG summary */}
      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e8ecf0", overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ padding:"13px 18px", borderBottom:"1px solid #f1f5f9" }}>
          <span style={{ fontSize:12, fontWeight:700, color:"#0f172a" }}>Mission Delivery Status</span>
        </div>
        <div style={{ padding:"8px 0" }}>
          {missions.map(m => {
            const rags = getMissionPhaseRAGs([m]);
            const r=rags.filter(p=>p.rag==="R").length;
            const a=rags.filter(p=>p.rag==="A").length;
            const g=rags.filter(p=>p.rag==="G").length;
            const worst = r>0?"R":a>0?"A":"G";
            return (
              <div key={m.id} style={{ padding:"10px 18px", borderBottom:"1px solid #f8fafc", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:3, height:36, background:m.color, borderRadius:2, flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#0f172a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.name}</div>
                  <div style={{ display:"flex", gap:8, marginTop:3, fontSize:10 }}>
                    <span style={{ color:"#16a34a", fontWeight:600 }}>✓{g}</span>
                    {a>0 && <span style={{ color:"#d97706", fontWeight:600 }}>⚠{a}</span>}
                    {r>0 && <span style={{ color:"#dc2626", fontWeight:600 }}>✗{r}</span>}
                  </div>
                </div>
                <RAGDot rag={worst} size={12}/>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Attendance Tab ─────────────────────────────────────────────────────────────
const TARGET_LAS=[{name:"Sunderland",code:"394"},{name:"Newcastle upon Tyne",code:"391"},{name:"South Tyneside",code:"393"},{name:"North Tyneside",code:"392"},{name:"Durham",code:"841"},{name:"Darlington",code:"840"},{name:"Middlesbrough",code:"806"},{name:"Stockton-on-Tees",code:"808"},{name:"Redcar and Cleveland",code:"807"},{name:"Hartlepool",code:"805"},{name:"Gateshead",code:"390"},{name:"Portsmouth",code:"851"}];
const NAT_OVERALL=7.1,NAT_PERSISTENT=19.4;
const DS_OVERALL="019d209b-b031-7497-8205-af255b581d91";
const DS_PERSISTENT="019d209c-08dc-74b6-9edb-52d521406fcf";

function AttendanceTab() {
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

        const laIdToName={};
        (laLevel?.options||[]).forEach(o=>{
          const byCode=TARGET_LAS.find(l=>String(o.oldCode)===String(l.code));
          const byLabel=TARGET_LAS.find(l=>o.label?.toLowerCase()===l.name.toLowerCase());
          const matched=byCode||byLabel;
          if(matched) laIdToName[o.id]=matched.name;
        });

        const results={};
        (d1.results||[]).forEach(row=>{
          const overall=parseFloat(row.values?.["jgLjA"]);
          if(isNaN(overall)||!overall) return;
          const laId=row.locations?.LA;
          const laName=laIdToName[laId];
          if(laName&&!results[laName])results[laName]={overall:+overall.toFixed(1),persistent:null};
        });
        (d2.results||[]).forEach(row=>{
          const persistent=parseFloat(row.values?.["TuAuP"]);
          if(isNaN(persistent)||!persistent) return;
          const laId=row.locations?.LA;
          const laName=laIdToName[laId];
          if(laName&&results[laName]&&!results[laName].persistent)results[laName].persistent=+persistent.toFixed(1);
        });
        setData({las:results,period:"2024/25"});
      }catch(e){console.error("Attendance:",e);setError(e.message);}
      setLoading(false);
    })();
  },[]);

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>LA Attendance Intelligence</div>
          <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>Live · EES API · {data?.period||"2024/25"} · North East + Portsmouth</div>
        </div>
        <div style={{display:"flex",gap:16,background:"#f8fafc",borderRadius:8,padding:"8px 14px",fontSize:10}}>
          <span style={{color:"#64748b"}}>National overall: <strong style={{color:"#374151"}}>{NAT_OVERALL}%</strong></span>
          <span style={{color:"#64748b"}}>Persistent: <strong style={{color:"#d97706"}}>{NAT_PERSISTENT}%</strong></span>
        </div>
      </div>
      {loading&&<div style={{textAlign:"center",padding:40,color:"#6366f1",fontSize:12}}>Fetching from DfE EES API…</div>}
      {error&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px",fontSize:11,color:"#991b1b"}}>⚠ {error}</div>}
      {data&&Object.keys(data.las).length>0&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
          {TARGET_LAS.filter(la=>data.las[la.name]).map(la=>{
            const d=data.las[la.name];
            const overAbove=d.overall>NAT_OVERALL;
            const perAbove=d.persistent>NAT_PERSISTENT;
            return(
              <div key={la.code} style={{background:"#fff",borderRadius:10,border:"1px solid #e8ecf0",padding:"12px 14px"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#0f172a",marginBottom:8}}>{la.name}</div>
                <div style={{display:"flex",gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:8,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",marginBottom:2}}>Overall</div>
                    <div style={{fontSize:20,fontWeight:800,color:overAbove?"#dc2626":"#16a34a",lineHeight:1}}>{d.overall}%</div>
                    <div style={{fontSize:8,color:"#94a3b8",marginTop:1}}>{overAbove?"▲":"▼"} {Math.abs(d.overall-NAT_OVERALL).toFixed(1)}pp</div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:8,color:"#94a3b8",fontWeight:700,textTransform:"uppercase",marginBottom:2}}>Persistent</div>
                    <div style={{fontSize:20,fontWeight:800,color:perAbove?"#d97706":"#16a34a",lineHeight:1}}>{d.persistent!=null?d.persistent+"%":"—"}</div>
                    {d.persistent!=null&&<div style={{fontSize:8,color:"#94a3b8",marginTop:1}}>{perAbove?"▲":"▼"} {Math.abs(d.persistent-NAT_PERSISTENT).toFixed(1)}pp</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!loading&&!error&&(!data||!Object.keys(data.las).length)&&<div style={{textAlign:"center",padding:30,color:"#94a3b8",fontSize:11}}>No data returned.</div>}
    </div>
  );
}


// ─── Analytics Tab ──────────────────────────────────────────────────────────────
function AnalyticsTab({ missionSchools }) {
  const [allSchools, setAllSchools] = useState([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (allSchools.length) return;
    fetch('/schools.json')
      .then(r => r.json())
      .then(d => setAllSchools(d))
      .catch(e => console.error('schools.json load failed:', e));
  }, []);

  if (!allSchools.length) return (
    <div style={{ textAlign:'center', padding:40, color:'#94a3b8', fontSize:12 }}>
      Loading school data…
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#0f172a' }}>Mission School Analytics</div>
        <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>
          AI-powered analysis of your {missionSchools.length} mission schools vs all {allSchools.length.toLocaleString()} schools in England
        </div>
      </div>
      <button onClick={() => setShow(true)} style={{
        background:'#4f46e5', color:'#fff', border:'none', borderRadius:8,
        padding:'10px 20px', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit'
      }}>
        Open Analytics Panel ✦
      </button>
      {show && (
        <StatsPanel
          filtered={missionSchools}
          allSchools={allSchools}
          onClose={() => setShow(false)}
          activeFilters={{ mission: 'Mission Schools' }}
        />
      )}
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────────
export default function MissionDashboard({ missions, missionSchools, themes }) {
  const [activeTab, setActiveTab] = useState("overview");

  // Derive all phase RAGs from missions for traffic lights
  const allPhaseRAGs = useMemo(() => getMissionPhaseRAGs(missions), [missions]);
  const totalR = allPhaseRAGs.filter(p=>p.rag==="R").length;
  const totalA = allPhaseRAGs.filter(p=>p.rag==="A").length;
  const totalG = allPhaseRAGs.filter(p=>p.rag==="G").length;
  const totalPhases = allPhaseRAGs.length;

  const allClusters = useMemo(() => [...new Set(missionSchools.map(s=>s.cluster).filter(Boolean))], [missionSchools]);

  // Aggregate metrics
  const avgFSM    = avg(missionSchools, getFSM);
  const avgAtt8   = avg(missionSchools, getAtt8);
  const avgBasics = avg(missionSchools, getBasics);
  const pctMostDep = missionSchools.filter(s=>s.imd_decile).length ?
    Math.round(missionSchools.filter(s=>s.imd_decile<=2).length / missionSchools.filter(s=>s.imd_decile).length * 100) : null;
  const pctGoodOutstanding = missionSchools.filter(s=>s.ofsted).length ?
    pct(missionSchools.filter(s=>s.ofsted), s=>["Outstanding","Good"].includes(s.ofsted)) : null;

  if (!missions.length) return (
    <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:"#64748b",fontFamily:"'Outfit','Segoe UI',sans-serif" }}>
      <div style={{ fontSize:32 }}>🎯</div>
      <div style={{ fontSize:16,fontWeight:700,color:"#0f172a" }}>No missions yet</div>
      <div style={{ fontSize:13 }}>Go to Mission Planner to create your first mission.</div>
    </div>
  );

  return (
    <div style={{ flex:1,overflowY:"auto",padding:"24px",fontFamily:"'Outfit','Segoe UI',sans-serif",background:"#f8fafc" }}>

      {/* Header */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11,color:"#94a3b8",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.1em" }}>
          MISSION DASHBOARD — {new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}).toUpperCase()}
        </div>
        <h1 style={{ fontSize:22,fontWeight:800,color:"#0f172a",margin:"4px 0 0" }}>Place-based Programme Overview</h1>
      </div>

      {/* Top metrics */}
      <div style={{ display:"flex",gap:10,marginBottom:20,flexWrap:"wrap" }}>
        <MetricCard label="Missions" value={missions.length} color="#6366f1"/>
        <MetricCard label="Schools" value={missionSchools.length} color="#0ea5e9"/>
        <MetricCard label="Clusters" value={allClusters.length} color="#8b5cf6"/>
        {avgFSM!=null && <MetricCard label="Avg FSM%" value={`${avgFSM}%`} color="#d97706"/>}
        {avgAtt8!=null && <MetricCard label="Avg Att8" value={avgAtt8} sub={avgAtt8>=NAT_ATT8?"▲ nat":"▼ nat"} color={avgAtt8>=NAT_ATT8?"#16a34a":"#dc2626"} highlight={avgAtt8<NAT_ATT8}/>}
        {avgBasics!=null && <MetricCard label="Basics 9-4" value={`${avgBasics}%`} sub={avgBasics>=NAT_BASICS?"▲ nat":"▼ nat"} color={avgBasics>=NAT_BASICS?"#16a34a":"#dc2626"} highlight={avgBasics<NAT_BASICS}/>}
        {pctMostDep!=null && <MetricCard label="Most deprived" value={`${pctMostDep}%`} sub="IMD 1-2" color="#7c3aed"/>}
        {pctGoodOutstanding!=null && <MetricCard label="Good/Outstg" value={`${pctGoodOutstanding}%`} color="#16a34a"/>}
      </div>

      {/* Mission phase health bar — driven by phase RAGs */}
      {totalPhases > 0 && (
        <div style={{ background:"#fff",borderRadius:10,border:"1px solid #e8ecf0",padding:"12px 18px",marginBottom:20,display:"flex",alignItems:"center",gap:16 }}>
          <span style={{ fontSize:11,fontWeight:700,color:"#0f172a",flexShrink:0 }}>Mission Phase Health</span>
          <div style={{ flex:1,height:8,borderRadius:4,overflow:"hidden",display:"flex",gap:1 }}>
            {totalG>0 && <div style={{ flex:totalG,background:"#16a34a" }}/>}
            {totalA>0 && <div style={{ flex:totalA,background:"#d97706" }}/>}
            {totalR>0 && <div style={{ flex:totalR,background:"#dc2626" }}/>}
          </div>
          <div style={{ display:"flex",gap:12,fontSize:11,flexShrink:0 }}>
            <span style={{ color:"#16a34a",fontWeight:700 }}>✓ {totalG}</span>
            <span style={{ color:"#d97706",fontWeight:700 }}>⚠ {totalA}</span>
            <span style={{ color:"#dc2626",fontWeight:700 }}>✗ {totalR}</span>
          </div>
          <div style={{ fontSize:10,color:"#94a3b8",flexShrink:0 }}>{totalPhases} phases across {missions.length} missions</div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex",gap:4,marginBottom:20,borderBottom:"1px solid #e8ecf0" }}>
        {[
          {id:"overview",label:"Mission Overview"},
          {id:"clusters",label:"Cluster Analysis"},
          {id:"gantt",label:"Delivery Signals"},
          {id:"attendance",label:"Attendance"},
          {id:"analytics",label:"Analytics ✦"},
        ].map(({id,label})=>(
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
      {activeTab==="overview" && (
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(400px,1fr))",gap:20 }}>
          {missions.map(m => <MissionCard key={m.id} mission={m} missionSchools={missionSchools}/>)}
        </div>
      )}

      {/* Tab: Cluster Analysis */}
      {activeTab==="clusters" && (
        <div>
          {allClusters.length===0 ? (
            <div style={{ textAlign:"center",padding:"40px",color:"#94a3b8",fontSize:12 }}>
              No clusters yet. Assign schools to clusters in the Schools tab.
            </div>
          ) : (
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:16 }}>
              {allClusters.map(cl => (
                <ClusterCard key={cl} cl={cl} schools={missionSchools} missions={missions}/>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Delivery Signals */}
      {activeTab==="gantt" && <DeliverySignals missions={missions}/>}

      {/* Tab: Attendance */}
      {activeTab==="attendance" && <AttendanceTab/>}

      {/* Tab: Analytics */}
      {activeTab==="analytics" && (
        <AnalyticsTab missionSchools={missionSchools}/>
      )}

    </div>
  );
}
