import { useState, useRef, useEffect } from "react";
import { ALL_MONTHS, TODAY_IDX, RAG, PALETTE, uid } from "./data.js";

// ─── Constants ────────────────────────────────────────────────────────────────
const IS  = { background:"#fff", border:"1px solid #e2e8f0", borderRadius:6, color:"#374151", padding:"5px 9px", fontSize:11, fontFamily:"inherit", outline:"none" };
const BS  = bg => ({ background:bg+"18", border:`1px solid ${bg}66`, borderRadius:6, color:bg, cursor:"pointer", padding:"5px 12px", fontSize:11, fontFamily:"inherit", fontWeight:600 });
const LS  = { fontSize:9, letterSpacing:"0.13em", textTransform:"uppercase", color:"#94a3b8", fontWeight:700 };
const SUB_ROW_H = 52;
const MISSION_COLORS = ["#6366f1","#0ea5e9","#059669","#d97706","#dc2626","#7c3aed","#0891b2","#65a30d"];

// ─── Zoom levels — months AND weeks ──────────────────────────────────────────
// For week mode: col = px per week; for month mode: col = px per month
const ZOOM_LEVELS = [
  { label:"6 Wks",  mode:"week",  weeks:6,   col:80 },
  { label:"3 Mo",   mode:"week",  weeks:13,  col:44 },
  { label:"6 Mo",   mode:"week",  weeks:26,  col:28 },
  { label:"1 Yr",   mode:"month", months:12, col:52 },
  { label:"2 Yrs",  mode:"month", months:24, col:40 },
  { label:"3 Yrs",  mode:"month", months:36, col:32 },
  { label:"4 Yrs",  mode:"month", months:48, col:24 },
];

// ─── Week helpers ─────────────────────────────────────────────────────────────
// Generate week slots starting from 2026-01-05 (first Mon of 2026)
const EPOCH = new Date(2026, 0, 5); // Mon 5 Jan 2026
function weekSlots(n) {
  const slots = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(EPOCH);
    d.setDate(EPOCH.getDate() + i * 7);
    slots.push({
      label: `W${String(Math.floor(i % 52) + 1).padStart(2,"0")}`,
      month: d.getMonth(),
      year:  d.getFullYear(),
      date:  new Date(d),
    });
  }
  return slots;
}

// Group week slots by month for the double-row header in week mode
function groupByMonth(slots) {
  const groups = [];
  slots.forEach((s, i) => {
    const key = `${s.year}-${s.month}`;
    if (!groups.length || groups[groups.length-1].key !== key) {
      groups.push({ key, label: `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][s.month]} ${String(s.year).slice(2)}`, start: i, count: 1 });
    } else {
      groups[groups.length-1].count++;
    }
  });
  return groups;
}

// TODAY in week index
const TODAY_WEEK_IDX = (() => {
  const now = new Date();
  const diff = Math.floor((now - EPOCH) / (7*24*60*60*1000));
  return Math.max(0, diff);
})();

// Convert week-mode phase (start/duration in weeks) ↔ display
// In week mode: phase.start = week index, phase.duration = weeks
// In month mode: phase.start = month index, phase.duration = months
// We store separately: phase.weekStart / phase.weekDuration for week zoom
// and phase.start / phase.duration for month zoom.
// Simple approach: store both; edit the active one.

// ─── Initial data ─────────────────────────────────────────────────────────────
export const INITIAL_MISSIONS = [
  {
    id:"m1", name:"Mission North East", subtitle:"Place-based school improvement",
    color:"#6366f1", rag:"G", owner:"", notes:"", collapsed:false, dependencies:[],
    swimlanes:[
      { id:"sl1", name:"DfE & Policy", color:"#6366f1", collapsed:false,
        subrows:[
          { id:"sr1", name:"Policy Design", phases:[], milestones:[] },
          { id:"sr2", name:"Legislation",   phases:[], milestones:[] },
        ]},
      { id:"sl2", name:"Schools & Trusts", color:"#0ea5e9", collapsed:false,
        subrows:[
          { id:"sr3", name:"School Improvement", phases:[], milestones:[] },
          { id:"sr4", name:"Trust Development",  phases:[], milestones:[] },
        ]},
      { id:"sl3", name:"Local Authority", color:"#059669", collapsed:false,
        subrows:[
          { id:"sr5", name:"Commissioning", phases:[], milestones:[] },
          { id:"sr6", name:"SEND Pathways", phases:[], milestones:[] },
        ]},
      { id:"sl4", name:"Community & Partners", color:"#d97706", collapsed:false,
        subrows:[
          { id:"sr7", name:"Engagement", phases:[], milestones:[] },
          { id:"sr8", name:"Evaluation",  phases:[], milestones:[] },
        ]},
    ],
  }
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function useWindowWidth() {
  const [w,setW]=useState(window.innerWidth);
  useEffect(()=>{const h=()=>setW(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  return w;
}

const RagBadge=({rag,small})=>(
  <span style={{display:"inline-flex",alignItems:"center",gap:4,background:RAG[rag].light,color:RAG[rag].text,border:`1px solid ${RAG[rag].border}`,borderRadius:20,padding:small?"2px 8px":"3px 10px",fontSize:small?10:11,fontWeight:600,whiteSpace:"nowrap",flexShrink:0}}>
    <span style={{width:6,height:6,borderRadius:"50%",background:RAG[rag].color}}/>{RAG[rag].label}
  </span>
);

function PanelShell({title,subtitle,color,onClose,children}){
  const mobile=useWindowWidth()<640;
  return(<>
    {mobile&&<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:99}}/>}
    <div style={{position:"fixed",right:0,top:0,bottom:0,width:mobile?"100%":340,background:"#fff",borderLeft:mobile?"none":"1px solid #e2e8f0",overflowY:"auto",zIndex:100,boxShadow:"-4px 0 24px rgba(0,0,0,0.12)",display:"flex",flexDirection:"column"}}>
      <div style={{borderTop:`4px solid ${color||"#6366f1"}`,padding:"20px 22px 16px",borderBottom:"1px solid #f1f5f9",flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{flex:1,paddingRight:10}}>
            <div style={{...LS,marginBottom:4}}>{subtitle}</div>
            <h2 style={{margin:0,fontSize:15,fontWeight:700,color:"#0f172a",lineHeight:1.3}}>{title}</h2>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:26,padding:"0 2px",lineHeight:1,flexShrink:0,minWidth:44,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
        </div>
      </div>
      <div style={{padding:"18px 22px",flex:1}}>{children}</div>
    </div>
  </>);
}

function FL({children}){return <div style={{...LS,marginBottom:5}}>{children}</div>;}
function TF({label,value,onChange,placeholder="",rows=1,bold=false,autoFocus=false}){
  return(<div style={{marginBottom:14}}><FL>{label}</FL>
    {rows>1
      ?<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{...IS,width:"100%",resize:"vertical",lineHeight:1.5}}/>
      :<input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{...IS,width:"100%",fontWeight:bold?600:"inherit"}} autoFocus={autoFocus}/>
    }
  </div>);
}
function RagSel({value,onChange}){
  return(<div style={{marginBottom:14}}><FL>RAG Status</FL>
    <div style={{display:"flex",gap:6}}>
      {["G","A","R"].map(k=>(
        <button key={k} onClick={()=>onChange(k)} style={{flex:1,padding:"8px 4px",borderRadius:8,cursor:"pointer",border:value===k?`2px solid ${RAG[k].color}`:"1px solid #e2e8f0",background:value===k?RAG[k].light:"#fff",color:value===k?RAG[k].text:"#94a3b8",fontFamily:"inherit",fontSize:11,fontWeight:value===k?"700":"400"}}>{RAG[k].label}</button>
      ))}
    </div>
  </div>);
}
function ColPick({value,onChange,diamond=false}){
  return(<div style={{marginBottom:14}}><FL>Colour</FL>
    <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:2}}>
      {PALETTE.map(c=>(
        <div key={c} onClick={()=>onChange(c)} style={{width:22,height:22,background:c,cursor:"pointer",borderRadius:diamond?0:4,transform:diamond?"rotate(45deg)":undefined,border:value===c?"3px solid #0f172a":"2px solid transparent"}}/>
      ))}
    </div>
  </div>);
}

function DepLines({mission,rowMap,COL,LBL,weekMode}){
  if(!(mission?.dependencies?.length)) return null;
  const lines=(mission.dependencies||[]).map(dep=>{
    const f=rowMap[dep.fromId],t=rowMap[dep.toId];
    if(!f||!t) return null;
    const x1=LBL+f.endCol*COL,y1=f.rowTop+SUB_ROW_H/2;
    const x2=LBL+t.startCol*COL,y2=t.rowTop+SUB_ROW_H/2;
    const mx=(x1+x2)/2,col=dep.color||"#94a3b8";
    return(<g key={dep.id}>
      <defs><marker id={`a-${dep.id}`} markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill={col} opacity={0.7}/></marker></defs>
      <path d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none" stroke={col} strokeWidth={1.5} strokeDasharray="4 3" markerEnd={`url(#a-${dep.id})`} opacity={0.7}/>
    </g>);
  }).filter(Boolean);
  if(!lines.length) return null;
  return(<svg style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:20,overflow:"visible"}} width="100%" height="100%">{lines}</svg>);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Missions({missions,setMissions,syncStatus,missionSchools=[],selectedPhaseId,setSelectedPhaseId}){
  const w=useWindowWidth(),mobile=w<640,tablet=w<900;
  const [zoomIdx,setZoomIdx]=useState(4); // default 2 Yrs
  const [sel,setSel]=useState(null);
  const [addingSR,setAddingSR]=useState(null);
  const [newSRName,setNewSRName]=useState("");
  const [addingSL,setAddingSL]=useState(null);
  const [newSLName,setNewSLName]=useState("");
  const [addingMission,setAddingMission]=useState(false);
  const [newMissionName,setNewMissionName]=useState("");
  const [addingDep,setAddingDep]=useState(null);
  // Ghost drag state (for click-drag to create)
  const [dragGhost,setDragGhost]=useState(null); // {mid,slid,srid,start,end,color}

  const zoom=ZOOM_LEVELS[zoomIdx];
  const weekMode=zoom.mode==="week";
  const COL=zoom.col;
  const LBL=mobile?140:tablet?190:248;

  // Slots array — weeks or months
  const SLOTS = weekMode ? weekSlots(zoom.weeks) : ALL_MONTHS.slice(0,zoom.months);
  const SLOT_COUNT = SLOTS.length;

  // Today indicator index
  const todayIdx = weekMode ? TODAY_WEEK_IDX : TODAY_IDX;

  // ── Updaters ──
  const updM =(mid,fn)=>setMissions(p=>p.map(m=>m.id!==mid?m:fn(m)));
  const updSL=(mid,slid,fn)=>updM(mid,m=>({...m,swimlanes:m.swimlanes.map(sl=>sl.id!==slid?sl:fn(sl))}));
  const updSR=(mid,slid,srid,fn)=>updSL(mid,slid,sl=>({...sl,subrows:sl.subrows.map(sr=>sr.id!==srid?sr:fn(sr))}));

  // ── Phase start/duration in current mode ──
  const phStart  = (ph) => weekMode ? (ph.weekStart??ph.start??0)    : (ph.start??0);
  const phDur    = (ph) => weekMode ? (ph.weekDuration??ph.duration??4) : (ph.duration??3);
  const phSetPos = (ph, start, duration) => weekMode
    ? { ...ph, weekStart:start, weekDuration:duration }
    : { ...ph, start, duration };

  // ── Add mission ──
  const doAddMission=()=>{
    if(!newMissionName.trim()) return;
    const idx=missions.length%MISSION_COLORS.length;
    setMissions(p=>[...p,{id:uid(),name:newMissionName.trim(),subtitle:"",color:MISSION_COLORS[idx],rag:"G",owner:"",notes:"",collapsed:false,dependencies:[],swimlanes:[]}]);
    setNewMissionName("");setAddingMission(false);
  };
  const doAddSL=(mid)=>{
    if(!newSLName.trim()) return;
    const m=missions.find(x=>x.id===mid);
    const idx=(m?.swimlanes?.length||0)%MISSION_COLORS.length;
    updM(mid,m=>({...m,swimlanes:[...m.swimlanes,{id:uid(),name:newSLName.trim(),color:MISSION_COLORS[idx],collapsed:false,subrows:[]}]}));
    setNewSLName("");setAddingSL(null);
  };
  const doAddSR=(mid,slid)=>{
    if(!newSRName.trim()) return;
    updSL(mid,slid,sl=>({...sl,subrows:[...sl.subrows,{id:uid(),name:newSRName.trim(),phases:[],milestones:[]}]}));
    setNewSRName("");setAddingSR(null);
  };
  const doAddDep=(mid,toId)=>{
    if(!addingDep||addingDep.fromId===toId){setAddingDep(null);return;}
    updM(mid,m=>({...m,dependencies:[...(m.dependencies||[]),{id:uid(),fromId:addingDep.fromId,toId,color:"#94a3b8"}]}));
    setAddingDep(null);
  };

  const handleUpdate=(type,ids,field,value)=>{
    const{mid,slid,srid,itemId}=ids;
    if(type==="mission")   updM(mid,m=>({...m,[field]:value}));
    if(type==="swimlane")  updSL(mid,slid,sl=>({...sl,[field]:value}));
    if(type==="subrow")    updSR(mid,slid,srid,sr=>({...sr,[field]:value}));
    if(type==="phase")     updSR(mid,slid,srid,sr=>({...sr,phases:sr.phases.map(p=>p.id!==itemId?p:{...p,[field]:value})}));
    if(type==="milestone") updSR(mid,slid,srid,sr=>({...sr,milestones:(sr.milestones||[]).map(ms=>ms.id!==itemId?ms:{...ms,[field]:value})}));
    if(type==="dep")       updM(mid,m=>({...m,dependencies:(m.dependencies||[]).map(d=>d.id!==itemId?d:{...d,[field]:value})}));
  };
  const doDelete=(type,ids)=>{
    const{mid,slid,srid,itemId}=ids;
    if(type==="mission"){if(!window.confirm("Delete this mission?"))return;setMissions(p=>p.filter(m=>m.id!==mid));}
    if(type==="swimlane"){if(!window.confirm("Delete swimlane and all sub-rows?"))return;updM(mid,m=>({...m,swimlanes:m.swimlanes.filter(sl=>sl.id!==slid)}));}
    if(type==="subrow"){if(!window.confirm("Delete this sub-row?"))return;updSL(mid,slid,sl=>({...sl,subrows:sl.subrows.filter(sr=>sr.id!==srid)}));}
    if(type==="phase")     updSR(mid,slid,srid,sr=>({...sr,phases:sr.phases.filter(p=>p.id!==itemId)}));
    if(type==="milestone") updSR(mid,slid,srid,sr=>({...sr,milestones:(sr.milestones||[]).filter(ms=>ms.id!==itemId)}));
    if(type==="dep")       updM(mid,m=>({...m,dependencies:(m.dependencies||[]).filter(d=>d.id!==itemId)}));
    setSel(null);
  };

  // ── Drag existing phase ──
  const handleDrag=(e,mid,slid,srid,phase,mode)=>{
    e.preventDefault();e.stopPropagation();
    const origStart=phStart(phase),origDur=phDur(phase);
    const sx=e.touches?e.touches[0].clientX:e.clientX;
    const onMove=ev=>{
      const cx=ev.touches?ev.touches[0].clientX:ev.clientX;
      const dm=Math.round((cx-sx)/COL);
      updSR(mid,slid,srid,sr=>({...sr,phases:sr.phases.map(p=>{
        if(p.id!==phase.id) return p;
        if(mode==="move")  return phSetPos(p,Math.max(0,origStart+dm),origDur);
        if(mode==="left")  return phSetPos(p,Math.max(0,origStart+dm),Math.max(1,origDur-dm));
        if(mode==="right") return phSetPos(p,origStart,Math.max(1,origDur+dm));
        return p;
      })}));
    };
    const onUp=()=>{
      window.removeEventListener("mousemove",onMove);window.removeEventListener("mouseup",onUp);
      window.removeEventListener("touchmove",onMove);window.removeEventListener("touchend",onUp);
    };
    window.addEventListener("mousemove",onMove);window.addEventListener("mouseup",onUp);
    window.addEventListener("touchmove",onMove,{passive:false});window.addEventListener("touchend",onUp);
  };

  // ── Click-drag to CREATE a new phase ──
  const handleRowDragCreate=(e,mid,slid,srid,slColor,timelineLeft)=>{
    if(addingDep) return;
    // Only trigger on direct background click (not on existing phase bars)
    if(e.target!==e.currentTarget && e.target.dataset.bg!=="1") return;
    e.preventDefault();
    const startX=e.clientX;
    const startSlot=Math.floor((startX-timelineLeft)/COL);
    if(startSlot<0||startSlot>=SLOT_COUNT) return;

    let endSlot=startSlot;
    setDragGhost({mid,slid,srid,start:startSlot,end:startSlot,color:slColor});

    const onMove=ev=>{
      const cur=Math.max(startSlot,Math.floor((ev.clientX-timelineLeft)/COL));
      endSlot=Math.min(cur,SLOT_COUNT-1);
      setDragGhost(g=>g?{...g,end:endSlot}:null);
    };
    const onUp=()=>{
      window.removeEventListener("mousemove",onMove);
      window.removeEventListener("mouseup",onUp);
      setDragGhost(null);
      const duration=Math.max(1,endSlot-startSlot+1);
      // Create the phase with a temp id
      const newId=uid();
      const newPhase=weekMode
        ? {id:newId,name:"New phase",weekStart:startSlot,weekDuration:duration,start:0,duration:Math.ceil(duration/4.33),rag:"G",color:slColor,notes:""}
        : {id:newId,name:"New phase",start:startSlot,duration,rag:"G",color:slColor,notes:""};
      updSR(mid,slid,srid,sr=>({...sr,phases:[...sr.phases,newPhase]}));
      // Auto-open the detail panel
      setSel({type:"phase",mid,slid,srid,itemId:newId,autoFocus:true});
    };
    window.addEventListener("mousemove",onMove);
    window.addEventListener("mouseup",onUp);
  };

  const buildRowMap=(mission)=>{
    const map={};let rowTop=weekMode?52:28;
    mission.swimlanes.forEach(sl=>{
      rowTop+=36;
      if(!sl.collapsed){
        sl.subrows.forEach(sr=>{
          (sr.phases||[]).forEach(ph=>{
            const s=phStart(ph),d=phDur(ph);
            map[ph.id]={rowTop,endCol:s+d,startCol:s};
          });
          (sr.milestones||[]).forEach(ms=>{
            const mi=weekMode?(ms.weekMonth??ms.month??0):(ms.month??0);
            map[ms.id]={rowTop,endCol:mi+1,startCol:mi};
          });
          rowTop+=SUB_ROW_H;
        });
        rowTop+=30;
      }
    });
    return map;
  };

  // ─── Detail panel ─────────────────────────────────────────────────────────
  const renderPanel=()=>{
    if(!sel) return null;
    const mission=missions.find(m=>m.id===sel.mid);if(!mission) return null;
    const sl=mission.swimlanes.find(s=>s.id===sel.slid);
    const sr=sl?.subrows?.find(s=>s.id===sel.srid);

    if(sel.type==="mission") return(
      <PanelShell title={mission.name} subtitle="Mission" color={mission.color} onClose={()=>setSel(null)}>
        <TF label="Mission Name" value={mission.name} onChange={v=>handleUpdate("mission",{mid:sel.mid},"name",v)} bold/>
        <TF label="Subtitle" value={mission.subtitle||""} onChange={v=>handleUpdate("mission",{mid:sel.mid},"subtitle",v)}/>
        <TF label="Owner" value={mission.owner} onChange={v=>handleUpdate("mission",{mid:sel.mid},"owner",v)} placeholder="Enter name…"/>
        <RagSel value={mission.rag} onChange={v=>handleUpdate("mission",{mid:sel.mid},"rag",v)}/>
        <TF label="Notes" value={mission.notes} onChange={v=>handleUpdate("mission",{mid:sel.mid},"notes",v)} rows={4}/>
        <ColPick value={mission.color} onChange={v=>handleUpdate("mission",{mid:sel.mid},"color",v)}/>
        {(mission.dependencies||[]).length>0&&(
          <div style={{marginBottom:14}}><FL>Dependencies</FL>
            {(mission.dependencies||[]).map(dep=>{
              const all=mission.swimlanes.flatMap(sl=>(sl.subrows||[]).flatMap(sr=>[...(sr.phases||[]).map(p=>({id:p.id,name:p.name})),...(sr.milestones||[]).map(ms=>({id:ms.id,name:ms.name}))]));
              const f=all.find(x=>x.id===dep.fromId),t=all.find(x=>x.id===dep.toId);
              return(<div key={dep.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 0",borderBottom:"1px solid #f1f5f9",fontSize:11}}>
                <span style={{flex:1,color:"#374151"}}>{f?.name||"?"} → {t?.name||"?"}</span>
                <button onClick={()=>doDelete("dep",{mid:sel.mid,itemId:dep.id})} style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:14}}>×</button>
              </div>);
            })}
          </div>
        )}
        <div style={{paddingTop:16,borderTop:"1px solid #f1f5f9"}}>
          <button onClick={()=>doDelete("mission",{mid:sel.mid})} style={{...BS("#dc2626"),width:"100%",padding:"8px"}}>🗑 Delete Mission</button>
        </div>
      </PanelShell>
    );

    if(sel.type==="swimlane"&&sl) return(
      <PanelShell title={sl.name} subtitle={mission.name} color={sl.color} onClose={()=>setSel(null)}>
        <TF label="Swimlane Name" value={sl.name} onChange={v=>handleUpdate("swimlane",{mid:sel.mid,slid:sel.slid},"name",v)} bold/>
        <ColPick value={sl.color} onChange={v=>handleUpdate("swimlane",{mid:sel.mid,slid:sel.slid},"color",v)}/>
        <div style={{paddingTop:16,borderTop:"1px solid #f1f5f9"}}>
          <button onClick={()=>doDelete("swimlane",{mid:sel.mid,slid:sel.slid})} style={{...BS("#dc2626"),width:"100%",padding:"8px"}}>🗑 Delete Swimlane</button>
        </div>
      </PanelShell>
    );

    if(sel.type==="subrow"&&sr) return(
      <PanelShell title={sr.name} subtitle={`${mission.name} / ${sl.name}`} color={sl.color} onClose={()=>setSel(null)}>
        <TF label="Sub-row Name" value={sr.name} onChange={v=>handleUpdate("subrow",{mid:sel.mid,slid:sel.slid,srid:sel.srid},"name",v)} bold/>
        <div style={{paddingTop:16,borderTop:"1px solid #f1f5f9"}}>
          <button onClick={()=>doDelete("subrow",{mid:sel.mid,slid:sel.slid,srid:sel.srid})} style={{...BS("#dc2626"),width:"100%",padding:"8px"}}>🗑 Delete Sub-row</button>
        </div>
      </PanelShell>
    );

    if(sel.type==="phase"&&sr){
      const phase=sr.phases.find(p=>p.id===sel.itemId);if(!phase) return null;
      const ps=phStart(phase),pd=phDur(phase);
      return(
        <PanelShell title={phase.name||"New phase"} subtitle={`${mission.name} / ${sl.name} / ${sr.name}`} color={sl.color} onClose={()=>setSel(null)}>
          <TF label="Phase Name" value={phase.name} onChange={v=>handleUpdate("phase",{mid:sel.mid,slid:sel.slid,srid:sel.srid,itemId:sel.itemId},"name",v)} bold autoFocus={!!sel.autoFocus}/>
          <RagSel value={phase.rag} onChange={v=>handleUpdate("phase",{mid:sel.mid,slid:sel.slid,srid:sel.srid,itemId:sel.itemId},"rag",v)}/>
          <ColPick value={phase.color} onChange={v=>handleUpdate("phase",{mid:sel.mid,slid:sel.slid,srid:sel.srid,itemId:sel.itemId},"color",v)}/>
          {weekMode ? (<>
            <div style={{marginBottom:14}}><FL>Start Week</FL>
              <select value={ps} onChange={e=>{
                const ns=+e.target.value;
                updSR(sel.mid,sel.slid,sel.srid,sr=>({...sr,phases:sr.phases.map(p=>p.id!==sel.itemId?p:phSetPos(p,ns,pd))}));
              }} style={{...IS,width:"100%"}}>
                {weekSlots(zoom.weeks).map((s,i)=><option key={i} value={i}>{s.label} — {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][s.month]} {s.year}</option>)}
              </select>
            </div>
            <div style={{marginBottom:14}}><FL>Duration (weeks)</FL>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <input type="range" min={1} max={zoom.weeks} value={pd} onChange={e=>{
                  const nd=+e.target.value;
                  updSR(sel.mid,sel.slid,sel.srid,sr=>({...sr,phases:sr.phases.map(p=>p.id!==sel.itemId?p:phSetPos(p,ps,nd))}));
                }} style={{flex:1}}/>
                <span style={{fontSize:13,fontWeight:600,color:"#374151",minWidth:36}}>{pd}wk</span>
              </div>
            </div>
          </>) : (<>
            <div style={{marginBottom:14}}><FL>Start Month</FL>
              <select value={ps} onChange={e=>{
                const ns=+e.target.value;
                updSR(sel.mid,sel.slid,sel.srid,sr=>({...sr,phases:sr.phases.map(p=>p.id!==sel.itemId?p:phSetPos(p,ns,pd))}));
              }} style={{...IS,width:"100%"}}>
                {ALL_MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div style={{marginBottom:14}}><FL>Duration (months)</FL>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <input type="range" min={1} max={48} value={pd} onChange={e=>{
                  const nd=+e.target.value;
                  updSR(sel.mid,sel.slid,sel.srid,sr=>({...sr,phases:sr.phases.map(p=>p.id!==sel.itemId?p:phSetPos(p,ps,nd))}));
                }} style={{flex:1}}/>
                <span style={{fontSize:13,fontWeight:600,color:"#374151",minWidth:36}}>{pd}mo</span>
              </div>
            </div>
          </>)}
          <TF label="Notes" value={phase.notes||""} onChange={v=>handleUpdate("phase",{mid:sel.mid,slid:sel.slid,srid:sel.srid,itemId:sel.itemId},"notes",v)} rows={3}/>
                    {/* School linking */}
          {(()=>{
            const phaseSchools=(phase.schoolUrns||[]);
            const missionId=mission.id;
            const assignedSchools=missionSchools.filter(ms=>ms.missionId===missionId);
            const allPhaseUrns=new Set(mission.swimlanes.flatMap(sl2=>(sl2.subrows||[]).flatMap(sr2=>(sr2.phases||[]).flatMap(p2=>p2.id!==phase.id?(p2.schoolUrns||[]):[]))));
            const suggested=assignedSchools.filter(s=>!allPhaseUrns.has(s.urn)&&!phaseSchools.includes(s.urn));
            const linked=missionSchools.filter(s=>phaseSchools.includes(s.urn));
            const toggleSchool=(urn)=>{
              const next=phaseSchools.includes(urn)?phaseSchools.filter(u=>u!==urn):[...phaseSchools,urn];
              handleUpdate("phase",{mid:sel.mid,slid:sel.slid,srid:sel.srid,itemId:sel.itemId},"schoolUrns",next);
            };
            return(
              <div style={{marginBottom:14}}>
                <FL>Linked Schools ({phaseSchools.length})</FL>
                {linked.length>0&&(
                  <div style={{maxHeight:120,overflowY:"auto",marginBottom:8}}>
                    {linked.map(s=>(
                      <div key={s.urn} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0",borderBottom:"1px solid #f8fafc"}}>
                        <span style={{flex:1,fontSize:11,color:"#0f172a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</span>
                        <span style={{fontSize:10,color:"#94a3b8",flexShrink:0}}>{s.la}</span>
                        <button onClick={()=>toggleSchool(s.urn)} style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:14,padding:"0 2px",flexShrink:0}}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                {suggested.length>0&&(
                  <div>
                    <div style={{fontSize:9,color:"#94a3b8",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>Suggested from {mission.name}</div>
                    <div style={{maxHeight:100,overflowY:"auto"}}>
                      {suggested.slice(0,10).map(s=>(
                        <div key={s.urn} onClick={()=>toggleSchool(s.urn)}
                          style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",marginBottom:2,borderRadius:6,background:"#f8fafc",cursor:"pointer",border:"1px solid #f1f5f9"}}
                          onMouseEnter={e=>e.currentTarget.style.background="#eef2ff"}
                          onMouseLeave={e=>e.currentTarget.style.background="#f8fafc"}>
                          <span style={{fontSize:10,color:"#6366f1",fontWeight:700,flexShrink:0}}>+</span>
                          <span style={{flex:1,fontSize:11,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</span>
                          <span style={{fontSize:9,color:"#94a3b8",flexShrink:0}}>{s.cluster||s.la}</span>
                        </div>
                      ))}
                      {suggested.length>10&&<div style={{fontSize:10,color:"#94a3b8",padding:"2px 8px"}}>+{suggested.length-10} more</div>}
                    </div>
                  </div>
                )}
                {assignedSchools.length===0&&phaseSchools.length===0&&(
                  <div style={{fontSize:11,color:"#94a3b8",fontStyle:"italic"}}>Add schools to {mission.name} via the Schools tab first.</div>
                )}
              </div>
            );
          })()}
<div style={{marginBottom:14}}><FL>Add Dependency Arrow</FL>
            <button onClick={()=>{setAddingDep({missionId:sel.mid,fromId:sel.itemId});setSel(null);}} style={{...BS("#6366f1"),width:"100%"}}>⬡ Draw arrow from this phase</button>
          </div>
          <div style={{paddingTop:16,borderTop:"1px solid #f1f5f9"}}>
            <button onClick={()=>doDelete("phase",{mid:sel.mid,slid:sel.slid,srid:sel.srid,itemId:sel.itemId})} style={{...BS("#dc2626"),width:"100%",padding:"8px"}}>🗑 Delete Phase</button>
          </div>
        </PanelShell>
      );
    }

    if(sel.type==="milestone"&&sr){
      const ms=(sr.milestones||[]).find(m=>m.id===sel.itemId);if(!ms) return null;
      const msIdx=weekMode?(ms.weekMonth??ms.month??0):(ms.month??0);
      return(
        <PanelShell title={ms.name||"Milestone"} subtitle={`${mission.name} / ${sl.name} / ${sr.name}`} color={ms.color} onClose={()=>setSel(null)}>
          <TF label="Milestone Name" value={ms.name} onChange={v=>handleUpdate("milestone",{mid:sel.mid,slid:sel.slid,srid:sel.srid,itemId:sel.itemId},"name",v)} bold/>
          <div style={{marginBottom:14}}><FL>{weekMode?"Week":"Month"}</FL>
            <select value={msIdx} onChange={e=>{
              const v=+e.target.value;
              const field=weekMode?"weekMonth":"month";
              handleUpdate("milestone",{mid:sel.mid,slid:sel.slid,srid:sel.srid,itemId:sel.itemId},field,v);
            }} style={{...IS,width:"100%"}}>
              {weekMode
                ?weekSlots(zoom.weeks).map((s,i)=><option key={i} value={i}>{s.label} — {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][s.month]} {s.year}</option>)
                :ALL_MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)
              }
            </select>
          </div>
          <ColPick value={ms.color} onChange={v=>handleUpdate("milestone",{mid:sel.mid,slid:sel.slid,srid:sel.srid,itemId:sel.itemId},"color",v)} diamond/>
          <TF label="Notes" value={ms.notes||""} onChange={v=>handleUpdate("milestone",{mid:sel.mid,slid:sel.slid,srid:sel.srid,itemId:sel.itemId},"notes",v)} rows={3}/>
          <div style={{marginBottom:14}}><FL>Add Dependency Arrow</FL>
            <button onClick={()=>{setAddingDep({missionId:sel.mid,fromId:sel.itemId});setSel(null);}} style={{...BS("#6366f1"),width:"100%"}}>⬡ Draw arrow from this milestone</button>
          </div>
          <div style={{paddingTop:16,borderTop:"1px solid #f1f5f9"}}>
            <button onClick={()=>doDelete("milestone",{mid:sel.mid,slid:sel.slid,srid:sel.srid,itemId:sel.itemId})} style={{...BS("#dc2626"),width:"100%",padding:"8px"}}>🗑 Delete Milestone</button>
          </div>
        </PanelShell>
      );
    }
    return null;
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",overflowY:"auto",position:"relative",background:"#f8fafc"}}>

      {/* Toolbar */}
      <div style={{position:"sticky",top:0,zIndex:30,background:"#f8fafc",borderBottom:"1px solid #e2e8f0",padding:"6px 16px",display:"flex",alignItems:"center",gap:6,flexShrink:0,flexWrap:"wrap"}}>
        <span style={{fontSize:10,color:"#94a3b8",fontWeight:600,letterSpacing:"0.1em",marginRight:2}}>ZOOM</span>
        {/* Week zooms */}
        <span style={{fontSize:9,color:"#c4b5fd",fontWeight:700,letterSpacing:"0.08em",marginRight:1}}>WEEKS</span>
        {ZOOM_LEVELS.filter(z=>z.mode==="week").map((z,i)=>(
          <button key={i} onClick={()=>setZoomIdx(i)} style={{padding:"3px 9px",borderRadius:16,border:`1px solid ${zoomIdx===i?"#8b5cf6":"#e2e8f0"}`,background:zoomIdx===i?"#f3e8ff":"#fff",color:zoomIdx===i?"#7c3aed":"#64748b",fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:zoomIdx===i?700:400}}>{z.label}</button>
        ))}
        <span style={{width:1,height:16,background:"#e2e8f0",margin:"0 4px"}}/>
        <span style={{fontSize:9,color:"#93c5fd",fontWeight:700,letterSpacing:"0.08em",marginRight:1}}>MONTHS</span>
        {ZOOM_LEVELS.filter(z=>z.mode==="month").map((z,i)=>{
          const realIdx=i+3;
          return(<button key={i} onClick={()=>setZoomIdx(realIdx)} style={{padding:"3px 9px",borderRadius:16,border:`1px solid ${zoomIdx===realIdx?"#6366f1":"#e2e8f0"}`,background:zoomIdx===realIdx?"#eef2ff":"#fff",color:zoomIdx===realIdx?"#4f46e5":"#64748b",fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:zoomIdx===realIdx?700:400}}>{z.label}</button>);
        })}
        {addingDep&&<>
          <span style={{marginLeft:8,fontSize:11,color:"#6366f1",fontWeight:600}}>⬡ Click a phase or milestone to connect…</span>
          <button onClick={()=>setAddingDep(null)} style={{...BS("#94a3b8"),padding:"3px 10px"}}>Cancel</button>
        </>}
        {!addingDep&&<div style={{marginLeft:"auto",fontSize:10,color:"#94a3b8",fontStyle:"italic"}}>
          Click &amp; drag on a row to draw a phase
        </div>}
      </div>

      <div style={{flex:1,overflowX:"auto",paddingBottom:60}}>
        {missions.map(mission=>{
          const rowMap=buildRowMap(mission);
          const boardWidth=LBL+SLOT_COUNT*COL+2;
          // Month groups for week header
          const monthGroups=weekMode?groupByMonth(SLOTS):null;

          return(
            <div key={mission.id} style={{marginBottom:40}}>
              {/* Mission header */}
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",background:`${mission.color}0d`,borderTop:`3px solid ${mission.color}`,borderBottom:`1px solid ${mission.color}33`,position:"sticky",left:0}}>
                <span onClick={()=>updM(mission.id,m=>({...m,collapsed:!m.collapsed}))} style={{color:mission.color,fontSize:9,cursor:"pointer",padding:"2px 4px"}}>{mission.collapsed?"▶":"▼"}</span>
                <div style={{width:13,height:13,borderRadius:3,background:mission.color,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <span style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>{mission.name}</span>
                  {mission.subtitle&&<span style={{fontSize:11,color:"#64748b",marginLeft:10}}>{mission.subtitle}</span>}
                </div>
                {mission.owner&&<span style={{fontSize:11,color:"#64748b",flexShrink:0}}>{mission.owner}</span>}
                <RagBadge rag={mission.rag} small/>
                <button onClick={()=>setSel({type:"mission",mid:mission.id})} style={{background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:14,padding:"2px 6px"}}>✎</button>
              </div>

              {!mission.collapsed&&(
                <div style={{minWidth:boardWidth,position:"relative"}}>

                  {/* Header: double-row in week mode */}
                  <div style={{position:"sticky",top:38,zIndex:25,background:"#fff",borderBottom:"2px solid #e2e8f0"}}>
                    {weekMode&&(
                      /* Month row */
                      <div style={{display:"flex",height:24}}>
                        <div style={{width:LBL,flexShrink:0,background:"#fff",borderRight:"2px solid #e2e8f0"}}/>
                        {monthGroups.map((g,i)=>(
                          <div key={i} style={{width:g.count*COL,flexShrink:0,fontSize:9,fontWeight:700,color:"#64748b",display:"flex",alignItems:"center",justifyContent:"center",borderLeft:"1px solid #e2e8f0",background:"#f8fafc",overflow:"hidden",letterSpacing:"0.05em"}}>
                            {g.count*COL>30?g.label:""}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Slot row */}
                    <div style={{display:"flex",height:26}}>
                      <div style={{width:LBL,flexShrink:0,background:"#fff",borderRight:"2px solid #e2e8f0",display:"flex",alignItems:"center",padding:"0 12px",fontSize:10,fontWeight:700,color:"#64748b",letterSpacing:"0.08em"}}>
                        {weekMode?"WORKSTREAM / WEEK":"SWIMLANE / WORKSTREAM"}
                      </div>
                      {SLOTS.map((s,i)=>{
                        const isToday=i===todayIdx;
                        const label=weekMode?s.label:s;
                        // In week mode only show label every 2nd week at tight zoom
                        const showLabel=weekMode?(COL>=28||i%2===0):true;
                        return(
                          <div key={i} style={{width:COL,flexShrink:0,fontSize:COL>=32?9:8,color:isToday?"#3b82f6":"#94a3b8",fontWeight:isToday?700:400,display:"flex",alignItems:"center",justifyContent:"center",borderLeft:"1px solid #f1f5f9",background:isToday?"#eff6ff":"transparent",overflow:"hidden"}}>
                            {showLabel?label:""}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{position:"relative"}}>
                    <DepLines mission={mission} rowMap={rowMap} COL={COL} LBL={LBL} weekMode={weekMode}/>
                    {todayIdx<SLOT_COUNT&&(
                      <div style={{position:"absolute",left:LBL+todayIdx*COL+COL/2,top:0,bottom:0,width:2,background:"#3b82f666",pointerEvents:"none",zIndex:15}}/>
                    )}

                    {mission.swimlanes.map((sl,slIdx)=>(
                      <div key={sl.id}>
                        {/* Swimlane header */}
                        <div style={{display:"flex",alignItems:"stretch",background:`${sl.color}12`,borderTop:`2px solid ${sl.color}44`,borderBottom:`1px solid ${sl.color}33`,minHeight:36,position:"sticky",left:0}}>
                          <div style={{width:LBL,flexShrink:0,borderLeft:`4px solid ${sl.color}`,borderRight:`2px solid ${sl.color}33`,padding:"0 8px 0 10px",display:"flex",alignItems:"center",gap:6}}>
                            <span onClick={()=>updSL(mission.id,sl.id,s=>({...s,collapsed:!s.collapsed}))} style={{color:sl.color,fontSize:8,cursor:"pointer",flexShrink:0}}>{sl.collapsed?"▶":"▼"}</span>
                            <span style={{fontSize:12,fontWeight:700,color:"#1e293b",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sl.name}</span>
                            <button onClick={()=>setSel({type:"swimlane",mid:mission.id,slid:sl.id})} style={{background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:12,padding:"1px 3px",flexShrink:0}}>✎</button>
                          </div>
                          <div style={{flex:1,display:"flex",alignItems:"center",padding:"0 12px"}}>
                            <span style={{fontSize:10,color:sl.color,fontWeight:600,opacity:0.8}}>
                              {sl.subrows.length} workstream{sl.subrows.length!==1?"s":""}
                              {sl.subrows.reduce((n,sr)=>n+(sr.phases||[]).length,0)>0?` · ${sl.subrows.reduce((n,sr)=>n+(sr.phases||[]).length,0)} phases`:""}
                            </span>
                          </div>
                        </div>

                        {!sl.collapsed&&(<>
                          {sl.subrows.map((sr,srIdx)=>(
                            <div key={sr.id}>
                              <div style={{display:"flex",alignItems:"stretch",borderBottom:"1px solid #f1f5f9",minHeight:SUB_ROW_H,background:srIdx%2===0?"#fff":"#fafbfc"}}>
                                {/* Label col */}
                                <div style={{width:LBL,flexShrink:0,borderLeft:`4px solid ${sl.color}`,borderRight:"1px solid #f1f5f9",padding:"0 6px 0 20px",display:"flex",alignItems:"center",gap:4,background:srIdx%2===0?`${sl.color}04`:`${sl.color}08`}}>
                                  <span style={{fontSize:11,color:"#475569",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontStyle:(sr.phases||[]).length===0&&!(sr.milestones||[]).length?"italic":"normal"}}>{sr.name}</span>
                                  <button onClick={()=>setSel({type:"subrow",mid:mission.id,slid:sl.id,srid:sr.id})} style={{background:"none",border:"none",color:"#e2e8f0",cursor:"pointer",fontSize:11,padding:"1px 2px",flexShrink:0}}>✎</button>
                                  <button title="Add milestone" onClick={()=>{
                                    const newId=uid();
                                    const ms=weekMode?{id:newId,name:"",weekMonth:Math.max(0,todayIdx),month:TODAY_IDX,color:"#f59e0b",notes:""}:{id:newId,name:"",month:TODAY_IDX,color:"#f59e0b",notes:""};
                                    updSR(mission.id,sl.id,sr.id,r=>({...r,milestones:[...(r.milestones||[]),ms]}));
                                    setSel({type:"milestone",mid:mission.id,slid:sl.id,srid:sr.id,itemId:newId,autoFocus:true});
                                  }} style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:4,color:"#d97706",cursor:"pointer",fontSize:10,padding:"1px 4px",fontFamily:"monospace",lineHeight:1.5,flexShrink:0}}>◆</button>
                                </div>
                                {/* Timeline — drag to create */}
                                <div
                                  data-bg="1"
                                  style={{position:"relative",display:"flex",flex:1,cursor:addingDep?"crosshair":"crosshair",userSelect:"none"}}
                                  onMouseDown={e=>{
                                    const rect=e.currentTarget.getBoundingClientRect();
                                    handleRowDragCreate(e,mission.id,sl.id,sr.id,sl.color,rect.left);
                                  }}
                                >
                                  {SLOTS.map((_,i)=>(
                                    <div key={i} data-bg="1" style={{width:COL,height:"100%",flexShrink:0,borderLeft:"1px solid #f1f5f9",background:i===todayIdx?"#eff6ff0a":"transparent",pointerEvents:"none"}}/>
                                  ))}

                                  {/* Ghost while dragging */}
                                  {dragGhost&&dragGhost.mid===mission.id&&dragGhost.slid===sl.id&&dragGhost.srid===sr.id&&(()=>{
                                    const s=dragGhost.start,e2=dragGhost.end;
                                    return(<div style={{position:"absolute",left:s*COL+2,width:Math.max(1,e2-s+1)*COL-4,top:8,height:SUB_ROW_H-16,background:`${dragGhost.color}44`,border:`2px dashed ${dragGhost.color}`,borderRadius:6,pointerEvents:"none",zIndex:8}}/>);
                                  })()}

                                  {/* Phase bars */}
                                  {(sr.phases||[]).map(phase=>{
                                    const ps=phStart(phase),pd=phDur(phase);
                                    if(ps>=SLOT_COUNT) return null;
                                    const isSel2=sel?.type==="phase"&&sel?.itemId===phase.id;
                                    const isDF=addingDep?.fromId===phase.id;
                                    const visEnd=Math.min(ps+pd,SLOT_COUNT);
                                    const bw=(visEnd-ps)*COL-4;
                                    return(
                                      <div key={phase.id}
                                        title={`${phase.name} | ${RAG[phase.rag].label}`}
                                        style={{position:"absolute",left:ps*COL+2,width:Math.max(bw,24),top:8,height:SUB_ROW_H-16,background:`linear-gradient(90deg,${phase.color}ee,${phase.color}99)`,border:`1px solid ${phase.color}`,borderLeft:`3px solid ${RAG[phase.rag].color}`,borderRadius:6,cursor:"grab",display:"flex",alignItems:"center",overflow:"hidden",boxShadow:isSel2?`0 0 0 2px ${RAG[phase.rag].color},0 2px 8px rgba(0,0,0,0.15)`:isDF?`0 0 0 3px #6366f1`:"0 1px 4px rgba(0,0,0,0.1)",userSelect:"none",zIndex:isSel2?5:2,touchAction:"none"}}
                                        onMouseDown={e=>{e.stopPropagation();if(addingDep)return;handleDrag(e,mission.id,sl.id,sr.id,phase,"move");}}
                                        onTouchStart={e=>{e.stopPropagation();if(addingDep)return;handleDrag(e,mission.id,sl.id,sr.id,phase,"move");}}
                                        onClick={e=>{e.stopPropagation();if(addingDep?.missionId===mission.id){doAddDep(mission.id,phase.id);return;}const newSel=isSel2?null:{type:"phase",mid:mission.id,slid:sl.id,srid:sr.id,itemId:phase.id};setSel(newSel);setSelectedPhaseId(newSel?phase.id:null);if(onPhaseSelect)onPhaseSelect(newSel?{phaseId:phase.id,schoolUrns:phase.schoolUrns||[]}:null);}}
                                      >
                                        <div onMouseDown={e=>{e.stopPropagation();if(!addingDep)handleDrag(e,mission.id,sl.id,sr.id,phase,"left");}} style={{position:"absolute",left:0,top:0,width:mobile?14:7,height:"100%",cursor:"ew-resize",zIndex:3,touchAction:"none"}}/>
                                        <span style={{fontSize:11,color:"#fff",padding:"0 10px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",pointerEvents:"none",textShadow:"0 1px 2px rgba(0,0,0,0.35)",flex:1,fontWeight:500}}>{phase.name}</span>
                                        {(phase.schoolUrns?.length>0)&&<span style={{fontSize:9,marginRight:6,flexShrink:0,pointerEvents:"none",background:"rgba(255,255,255,0.25)",borderRadius:8,padding:"1px 5px",fontWeight:700}}>🏫 {phase.schoolUrns.length}</span>}
                                        {phase.notes&&<span style={{fontSize:9,marginRight:6,flexShrink:0,pointerEvents:"none",opacity:0.85}}>📝</span>}
                                        <div onMouseDown={e=>{e.stopPropagation();if(!addingDep)handleDrag(e,mission.id,sl.id,sr.id,phase,"right");}} style={{position:"absolute",right:0,top:0,width:mobile?14:7,height:"100%",cursor:"ew-resize",zIndex:3,touchAction:"none"}}/>
                                      </div>
                                    );
                                  })}

                                  {/* Milestones */}
                                  {(sr.milestones||[]).map(ms=>{
                                    const mi=weekMode?(ms.weekMonth??ms.month??0):(ms.month??0);
                                    if(mi>=SLOT_COUNT) return null;
                                    const isSel2=sel?.type==="milestone"&&sel?.itemId===ms.id;
                                    const sz=14,cx=mi*COL+COL/2;
                                    return(
                                      <div key={ms.id} title={`◆ ${ms.name}`}
                                        onClick={e=>{e.stopPropagation();if(addingDep?.missionId===mission.id){doAddDep(mission.id,ms.id);return;}setSel(isSel2?null:{type:"milestone",mid:mission.id,slid:sl.id,srid:sr.id,itemId:ms.id});}}
                                        onMouseDown={e=>e.stopPropagation()}
                                        style={{position:"absolute",left:cx-sz/2,top:SUB_ROW_H/2-sz/2,width:sz,height:sz,transform:"rotate(45deg)",background:ms.color,border:isSel2?"2px solid #0f172a":`2px solid ${ms.color}cc`,cursor:"pointer",zIndex:10,boxShadow:isSel2?`0 0 0 3px ${ms.color}55,0 2px 8px rgba(0,0,0,0.2)`:"0 1px 4px rgba(0,0,0,0.18)"}}
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                          {/* Add sub-row */}
                          <div style={{padding:"5px 10px 5px 20px",background:`${sl.color}06`,borderBottom:`1px solid ${sl.color}22`}}>
                            {addingSR?.mid===mission.id&&addingSR?.slid===sl.id?(
                              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                                <input placeholder="Workstream name (e.g. Leadership, Curriculum)" value={newSRName} onChange={e=>setNewSRName(e.target.value)} style={{...IS,flex:1}} autoFocus onKeyDown={e=>e.key==="Enter"&&doAddSR(mission.id,sl.id)}/>
                                <button onClick={()=>doAddSR(mission.id,sl.id)} style={BS(sl.color)}>Add</button>
                                <button onClick={()=>setAddingSR(null)} style={BS("#94a3b8")}>Cancel</button>
                              </div>
                            ):(
                              <button onClick={()=>setAddingSR({mid:mission.id,slid:sl.id})} style={{background:"none",border:"none",color:sl.color,cursor:"pointer",fontSize:11,fontFamily:"inherit",opacity:0.7}}>+ Add workstream</button>
                            )}
                          </div>
                        </>)}
                      </div>
                    ))}

                    {/* Add swimlane */}
                    <div style={{padding:"7px 14px",background:"#f8fafc",borderTop:"1px solid #f1f5f9"}}>
                      {addingSL===mission.id?(
                        <div style={{display:"flex",gap:6,alignItems:"center"}}>
                          <input placeholder="Swimlane name (e.g. NHS, Local Authority)" value={newSLName} onChange={e=>setNewSLName(e.target.value)} style={{...IS,flex:1}} autoFocus onKeyDown={e=>e.key==="Enter"&&doAddSL(mission.id)}/>
                          <button onClick={()=>doAddSL(mission.id)} style={BS("#6366f1")}>Add</button>
                          <button onClick={()=>setAddingSL(null)} style={BS("#94a3b8")}>Cancel</button>
                        </div>
                      ):(
                        <button onClick={()=>setAddingSL(mission.id)} style={{background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>+ Add swimlane</button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add mission */}
        <div style={{padding:"14px 16px",borderTop:"1px solid #e2e8f0"}}>
          {addingMission?(
            <div style={{display:"flex",gap:8,alignItems:"center",maxWidth:500}}>
              <input placeholder="Mission name (e.g. Mission Coastal)" value={newMissionName} onChange={e=>setNewMissionName(e.target.value)} style={{...IS,flex:1,fontSize:13}} autoFocus onKeyDown={e=>e.key==="Enter"&&doAddMission()}/>
              <button onClick={doAddMission} style={BS("#6366f1")}>Add Mission</button>
              <button onClick={()=>setAddingMission(false)} style={BS("#94a3b8")}>Cancel</button>
            </div>
          ):(
            <button onClick={()=>setAddingMission(true)} style={{background:"none",border:"1px dashed #cbd5e1",borderRadius:8,color:"#94a3b8",cursor:"pointer",fontSize:12,fontFamily:"inherit",padding:"8px 20px"}}>+ Add Mission</button>
          )}
        </div>
      </div>

      {/* Sync chip */}
      <div style={{position:"fixed",bottom:16,right:sel?"356px":"16px",fontSize:10,fontFamily:"monospace",background:"#fff",padding:"4px 10px",borderRadius:20,border:`1px solid ${syncStatus==="synced"?"#bbf7d0":syncStatus==="saving"?"#fde68a":syncStatus==="error"?"#fecaca":"#e2e8f0"}`,color:syncStatus==="synced"?"#15803d":syncStatus==="saving"?"#92400e":syncStatus==="error"?"#991b1b":"#94a3b8",boxShadow:"0 1px 3px rgba(0,0,0,0.1)",transition:"all 0.3s",zIndex:50}}>
        {syncStatus==="synced"?"✓ Saved":syncStatus==="saving"?"● Saving…":syncStatus==="error"?"✗ Offline":"○ Local"}
      </div>

      {renderPanel()}
    </div>
  );
}
