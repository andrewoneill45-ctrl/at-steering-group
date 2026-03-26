/**
 * BriefingGenerator.jsx — Achieve & Thrive 2026
 * Generates ministerial briefings as PDF and Word documents
 * One-click from Mission Dashboard
 */

import { useState } from "react";

const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY || "";

const BS = bg => ({ background:bg+"18", border:`1px solid ${bg}66`, borderRadius:6, color:bg, cursor:"pointer", padding:"6px 14px", fontSize:11, fontFamily:"inherit", fontWeight:600 });

const IMD_LABEL = d => d<=2?"Most deprived (decile "+d+")":d<=4?"More deprived (decile "+d+")":d<=6?"Average (decile "+d+")":d<=8?"Less deprived (decile "+d+")":"Least deprived (decile "+d+")";

// ─── Data helpers ─────────────────────────────────────────────────────────────
function avg(arr, ...keys) {
  const v = arr.map(s => { for(const k of keys){ const n=parseFloat(s[k]); if(!isNaN(n)&&n!==0) return n; } return null; }).filter(n=>n!==null);
  return v.length ? +(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1) : null;
}

function buildMissionData(mission, missionSchools, themes) {
  const schools = missionSchools.filter(s => s.missionId === mission.id);
  const clusters = [...new Set(schools.map(s=>s.cluster).filter(Boolean))];

  // Performance
  const secSchools = schools.filter(s=>s.phase==="Secondary");
  const priSchools = schools.filter(s=>s.phase==="Primary");
  const avgFSM  = avg(schools, "fsm_pct", "edu_fsm_pct");
  const avgP8   = avg(secSchools, "progress8", "p8");
  const avgAtt8 = avg(secSchools, "attainment8", "att8");
  const avgKS2  = avg(priSchools, "ks2_rwm_exp");

  // IMD
  const withIMD = schools.filter(s=>s.imd_decile);
  const imdDeciles = Array(11).fill(0);
  withIMD.forEach(s => { if(s.imd_decile) imdDeciles[s.imd_decile]++; });
  const pctMostDeprived = withIMD.length ? Math.round(withIMD.filter(s=>s.imd_decile<=2).length/withIMD.length*100) : null;
  const avgIMDRank = withIMD.filter(s=>s.imd_rank).length ?
    Math.round(withIMD.filter(s=>s.imd_rank).reduce((a,s)=>a+(s.imd_rank||0),0)/withIMD.filter(s=>s.imd_rank).length) : null;

  // Ofsted
  const ofstedCounts = schools.reduce((acc,s)=>{ if(s.ofsted) acc[s.ofsted]=(acc[s.ofsted]||0)+1; return acc; },{});

  // Phase breakdown
  const phaseCounts = schools.reduce((acc,s)=>{ if(s.phase) acc[s.phase]=(acc[s.phase]||0)+1; return acc; },{});

  // Gantt signals from themes
  const allProjects = themes.flatMap(t=>t.projects);
  const redProjects   = allProjects.filter(p=>p.rag==="R");
  const amberProjects = allProjects.filter(p=>p.rag==="A");

  // Phase-school links
  const phases = mission.swimlanes.flatMap(sl=>(sl.subrows||[]).flatMap(sr=>(sr.phases||[]).filter(p=>(p.schoolUrns||[]).length>0)));

  return {
    mission, schools, clusters, secSchools, priSchools,
    avgFSM, avgP8, avgAtt8, avgKS2,
    withIMD, imdDeciles, pctMostDeprived, avgIMDRank,
    ofstedCounts, phaseCounts, redProjects, amberProjects, phases,
  };
}

// ─── AI narrative generator ───────────────────────────────────────────────────
async function generateNarrative(data) {
  if (!ANTHROPIC_KEY) return null;

  const { mission, schools, avgFSM, avgP8, avgAtt8, avgKS2, pctMostDeprived, avgIMDRank, ofstedCounts, clusters, redProjects, amberProjects } = data;

  const system = `You are Andrew O'Neill, Schools Policy and Delivery Adviser at the Department for Education, writing a ministerial briefing for Secretary of State Bridget Phillipson. Write in the first person plural (we/our). Use high-performance, evidence-based language appropriate for a Secretary of State. Be direct, specific, and analytical. No bullet points. Maximum 200 words per mission.`;

  const msg = `Write a ministerial briefing paragraph for ${mission.name} (${mission.subtitle||"place-based school improvement"}).

Data:
- ${schools.length} schools across ${clusters.length} clusters: ${clusters.join(", ")}
- Phase breakdown: ${Object.entries(data.phaseCounts).map(([k,v])=>`${v} ${k}`).join(", ")}
- Average FSM: ${avgFSM||"n/a"}%
- Average Progress 8: ${avgP8||"n/a"} | Average Attainment 8: ${avgAtt8||"n/a"}
- KS2 RWM average: ${avgKS2||"n/a"}%
- Place deprivation: ${pctMostDeprived||"n/a"}% of schools in most deprived 20% nationally (avg IMD rank ${avgIMDRank?.toLocaleString()||"n/a"} of 32,844)
- Ofsted: ${Object.entries(ofstedCounts).map(([k,v])=>`${v} ${k}`).join(", ")||"n/a"}
- Delivery programme: ${redProjects.length} projects in trouble, ${amberProjects.length} at risk

Write one analytical paragraph identifying the strategic priorities and what this data tells us about the opportunity and challenge in this mission area.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "x-api-key":ANTHROPIC_KEY, "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true" },
    body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:400, system, messages:[{role:"user",content:msg}] }),
  });
  const d = await res.json();
  return d.content?.map(c=>c.text||"").join("") || null;
}

// ─── PDF Generator ────────────────────────────────────────────────────────────
async function generatePDF(allData, narratives, date) {
  // Load jsPDF via script tag (most reliable in browser)
  await new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
  const doc = new window.jspdf.jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });

  const W = 210, M = 16, TW = W - 2*M;
  const NAVY = [15,23,42], TEAL = [99,102,241], GREY = [100,116,139], LIGHT = [241,245,249];
  let y = 0;

  const addPage = () => { doc.addPage(); y = 0; };
  const checkY = (need=20) => { if (y + need > 275) addPage(); };

  // ── Cover band ──
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 36, "F");

  // DfE logo area
  doc.setFillColor(...TEAL);
  doc.roundedRect(M, 8, 20, 20, 3, 3, "F");
  doc.setTextColor(255,255,255);
  doc.setFontSize(10); doc.setFont("helvetica","bold");
  doc.text("AT", M+10, 20, {align:"center"});

  doc.setFontSize(14); doc.setFont("helvetica","bold");
  doc.text("Achieve & Thrive 2026", M+26, 15);
  doc.setFontSize(8); doc.setFont("helvetica","normal");
  doc.text("MINISTERIAL BRIEFING — MISSIONS PROGRAMME", M+26, 21);
  doc.text(`Andrew O'Neill, Schools Policy & Delivery Adviser  ·  ${date}`, M+26, 27);

  y = 44;

  // ── Classification ──
  doc.setFillColor(254,243,199);
  doc.rect(M, y, TW, 6, "F");
  doc.setTextColor(146,64,14);
  doc.setFontSize(7); doc.setFont("helvetica","bold");
  doc.text("OFFICIAL — FOR MINISTERIAL USE", W/2, y+4, {align:"center"});
  y += 10;

  // ── Programme summary ──
  const allSchools = allData.flatMap(d=>d.schools);
  const allFSM = avg(allSchools,"fsm_pct","edu_fsm_pct");
  const allP8  = avg(allSchools.filter(s=>s.phase==="Secondary"),"progress8","p8");
  const allPctDep = allSchools.filter(s=>s.imd_decile).length ?
    Math.round(allSchools.filter(s=>s.imd_decile&&s.imd_decile<=2).length/allSchools.filter(s=>s.imd_decile).length*100) : null;

  doc.setTextColor(...NAVY);
  doc.setFontSize(11); doc.setFont("helvetica","bold");
  doc.text("Programme Overview", M, y); y+=6;

  // Stats row
  const stats = [
    ["Missions", allData.length],
    ["Schools", allSchools.length],
    ["Avg FSM", allFSM ? `${allFSM}%` : "—"],
    ["Avg P8", allP8 ? (allP8>0?"+":"")+allP8 : "—"],
    ["In most deprived 20%", allPctDep ? `${allPctDep}%` : "—"],
  ];
  const sw = TW / stats.length;
  stats.forEach(([label,val],i) => {
    const x = M + i*sw;
    doc.setFillColor(...LIGHT);
    doc.roundedRect(x, y, sw-2, 16, 2, 2, "F");
    doc.setTextColor(...TEAL);
    doc.setFontSize(14); doc.setFont("helvetica","bold");
    doc.text(String(val), x+sw/2-1, y+9, {align:"center"});
    doc.setTextColor(...GREY);
    doc.setFontSize(6); doc.setFont("helvetica","normal");
    doc.text(label.toUpperCase(), x+sw/2-1, y+14, {align:"center"});
  });
  y += 22;

  // ── Per mission ──
  for (let i=0; i<allData.length; i++) {
    const d = allData[i];
    const { mission, schools, clusters, avgFSM, avgP8, avgAtt8, avgKS2, pctMostDeprived, avgIMDRank, ofstedCounts, phaseCounts, phases, redProjects, amberProjects } = d;
    const narrative = narratives[mission.id];

    checkY(60);

    // Mission header bar
    doc.setFillColor(...NAVY);
    doc.rect(M, y, TW, 8, "F");
    doc.setTextColor(255,255,255);
    doc.setFontSize(10); doc.setFont("helvetica","bold");
    doc.text(mission.name.toUpperCase(), M+4, y+5.5);
    if (mission.subtitle) {
      doc.setFontSize(7); doc.setFont("helvetica","normal");
      doc.text(mission.subtitle, M+4+doc.getTextWidth(mission.name.toUpperCase()+" "), y+5.5);
    }
    doc.setTextColor(...GREY);
    doc.setFontSize(7);
    doc.text(`${schools.length} schools · ${clusters.length} clusters`, W-M-2, y+5.5, {align:"right"});
    y += 12;

    // Key metrics row
    const mStats = [
      ["Schools", schools.length, TEAL],
      ["Avg FSM", avgFSM ? `${avgFSM}%` : "—", [217,119,6]],
      ["Avg P8", avgP8 ? (avgP8>0?"+":"")+avgP8 : "—", avgP8&&avgP8>=0?[22,163,74]:[220,38,38]],
      ["Avg Att8", avgAtt8 || "—", [59,130,246]],
      ["Deprived 20%", pctMostDeprived ? `${pctMostDeprived}%` : "—", [220,38,38]],
      ["IMD Rank avg", avgIMDRank ? avgIMDRank.toLocaleString() : "—", [99,102,241]],
    ];
    const msw = TW / mStats.length;
    mStats.forEach(([label,val,col],j) => {
      const x = M + j*msw;
      doc.setFillColor(col[0],col[1],col[2],0.08);
      doc.setDrawColor(col[0],col[1],col[2]);
      doc.roundedRect(x, y, msw-1.5, 14, 1.5, 1.5, "FD");
      doc.setTextColor(...col);
      doc.setFontSize(11); doc.setFont("helvetica","bold");
      doc.text(String(val), x+msw/2-0.75, y+7, {align:"center"});
      doc.setTextColor(...GREY);
      doc.setFontSize(5.5); doc.setFont("helvetica","normal");
      doc.text(label.toUpperCase(), x+msw/2-0.75, y+12, {align:"center"});
    });
    y += 18;

    // Two column section
    const colW = (TW-4)/2;

    // Left: Phase & Ofsted
    checkY(30);
    doc.setTextColor(...NAVY); doc.setFontSize(7); doc.setFont("helvetica","bold");
    doc.text("SCHOOL PROFILE", M, y); y+=4;

    Object.entries(phaseCounts).forEach(([phase,n]) => {
      doc.setFillColor(...LIGHT);
      doc.rect(M, y, colW*(n/schools.length), 4, "F");
      doc.setTextColor(...GREY); doc.setFontSize(6); doc.setFont("helvetica","normal");
      doc.text(`${phase}: ${n}`, M+2, y+3);
      y += 5;
    });

    // Ofsted
    y += 2;
    doc.setTextColor(...NAVY); doc.setFontSize(7); doc.setFont("helvetica","bold");
    doc.text("OFSTED PROFILE", M, y); y+=4;
    const ofstedOrder = ["Outstanding","Good","Requires improvement","Inadequate"];
    const ofstedColors = { "Outstanding":[99,102,241],"Good":[22,163,74],"Requires improvement":[217,119,6],"Inadequate":[220,38,38] };
    ofstedOrder.forEach(rating => {
      const n = ofstedCounts[rating] || 0;
      if (!n) return;
      const col = ofstedColors[rating] || GREY;
      doc.setFillColor(...col);
      doc.rect(M, y, colW*(n/schools.length), 4, "F");
      doc.setTextColor(...GREY); doc.setFontSize(6);
      doc.text(`${rating}: ${n}`, M+2, y+3);
      y += 5;
    });

    // Right column: IMD
    let ry = y - (Object.keys(phaseCounts).length + ofstedOrder.filter(r=>ofstedCounts[r]).length)*5 - 16;
    const rx = M + colW + 4;
    doc.setTextColor(...NAVY); doc.setFontSize(7); doc.setFont("helvetica","bold");
    doc.text("PLACE DEPRIVATION (IMD 2019)", rx, ry); ry+=4;

    // IMD bar
    const imdColors = [null,[127,0,0],[179,0,0],[215,48,31],[239,101,72],[252,141,89],[253,187,132],[161,217,155],[116,196,118],[65,171,93],[0,109,44]];
    let bx = rx;
    const totalIMD = d.withIMD.length || 1;
    for (let dec=1; dec<=10; dec++) {
      const n = d.imdDeciles[dec] || 0;
      const bw = colW * (n/totalIMD);
      if (bw > 0) {
        doc.setFillColor(...imdColors[dec]);
        doc.rect(bx, ry, bw, 6, "F");
      }
      bx += bw;
    }
    ry += 8;
    doc.setTextColor(...GREY); doc.setFontSize(6);
    doc.text("Most deprived", rx, ry);
    doc.text("Least deprived", rx+colW, ry, {align:"right"});
    ry += 4;
    if (pctMostDeprived) {
      doc.setTextColor(220,38,38); doc.setFontSize(6.5); doc.setFont("helvetica","bold");
      doc.text(`${pctMostDeprived}% of schools in most deprived 20% nationally`, rx, ry); ry+=5;
    }
    if (avgIMDRank) {
      doc.setTextColor(...GREY); doc.setFontSize(6); doc.setFont("helvetica","normal");
      doc.text(`Average IMD rank: ${avgIMDRank.toLocaleString()} of 32,844 LSOAs`, rx, ry); ry+=5;
    }

    y = Math.max(y, ry) + 4;

    // AI Narrative
    if (narrative) {
      checkY(30);
      doc.setFillColor(238,242,255);
      const lines = doc.splitTextToSize(narrative, TW-8);
      const boxH = lines.length*4+8;
      doc.roundedRect(M, y, TW, boxH, 2, 2, "F");
      doc.setTextColor(...TEAL); doc.setFontSize(6.5); doc.setFont("helvetica","bold");
      doc.text("STRATEGIC ANALYSIS", M+4, y+5);
      doc.setTextColor(30,58,138); doc.setFontSize(7); doc.setFont("helvetica","normal");
      doc.text(lines, M+4, y+10);
      y += boxH + 6;
    }

    // Delivery programme
    if (redProjects.length || amberProjects.length) {
      checkY(20);
      doc.setTextColor(...NAVY); doc.setFontSize(7); doc.setFont("helvetica","bold");
      doc.text("DELIVERY PROGRAMME SIGNALS", M, y); y+=4;
      [...redProjects.slice(0,3).map(p=>["✗",p.name,"In Trouble",[220,38,38]]),
       ...amberProjects.slice(0,3).map(p=>["⚠",p.name,"At Risk",[217,119,6]])
      ].forEach(([icon,name,label,col]) => {
        doc.setFillColor(col[0],col[1],col[2],0.08);
        doc.rect(M, y, TW, 5, "F");
        doc.setTextColor(...col); doc.setFontSize(6.5); doc.setFont("helvetica","bold");
        doc.text(`${icon} ${label}:`, M+2, y+3.5);
        doc.setTextColor(...NAVY); doc.setFont("helvetica","normal");
        doc.text(name, M+22, y+3.5);
        y += 6;
      });
      y += 2;
    }

    // Phase-school links
    if (phases.length) {
      checkY(20);
      doc.setTextColor(...NAVY); doc.setFontSize(7); doc.setFont("helvetica","bold");
      doc.text("SCHOOL-PHASE ASSIGNMENTS", M, y); y+=4;
      phases.slice(0,5).forEach(p => {
        doc.setTextColor(...GREY); doc.setFontSize(6.5); doc.setFont("helvetica","normal");
        doc.text(`• ${p.name}: ${p.schoolUrns.length} school${p.schoolUrns.length!==1?"s":""}`, M+2, y); y+=4;
      });
      y += 4;
    }

    if (i < allData.length-1) {
      doc.setDrawColor(...LIGHT);
      doc.line(M, y, W-M, y);
      y += 8;
    }
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let p=1; p<=pageCount; p++) {
    doc.setPage(p);
    doc.setFillColor(...LIGHT);
    doc.rect(0, 284, W, 13, "F");
    doc.setTextColor(...GREY); doc.setFontSize(6.5); doc.setFont("helvetica","normal");
    doc.text(`Achieve & Thrive 2026 · Schools Policy & Delivery · Andrew O'Neill`, M, 290);
    doc.text(`Page ${p} of ${pageCount}`, W-M, 290, {align:"right"});
  }

  doc.save(`AT2026_Mission_Briefing_${date.replace(/\s/g,"_")}.pdf`);
}

// ─── Word Generator ───────────────────────────────────────────────────────────
async function generateWord(allData, narratives, date) {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel,
          AlignmentType, BorderStyle, WidthType, ShadingType } = await import("https://esm.sh/docx@8.5.0");

  const NAVY_HEX = "0F172A";
  const TEAL_HEX = "6366F1";
  const GREY_HEX = "64748B";

  const h = (text, level=1, color=NAVY_HEX) => new Paragraph({
    heading: level===1 ? HeadingLevel.HEADING_1 : level===2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
    children:[new TextRun({ text, color, bold:true, size: level===1?26:level===2?22:18 })],
    spacing:{ before:200, after:80 },
  });

  const p = (text, opts={}) => new Paragraph({
    children:[new TextRun({ text, size:18, color:GREY_HEX, ...opts })],
    spacing:{ after:80 },
  });

  const divider = () => new Paragraph({
    border:{ bottom:{ color:"E2E8F0", space:1, style:BorderStyle.SINGLE, size:6 }},
    spacing:{ after:120 },
    children:[],
  });

  const sections = [];

  // Title
  sections.push(
    new Paragraph({
      children:[new TextRun({ text:"ACHIEVE & THRIVE 2026", color:NAVY_HEX, bold:true, size:32, allCaps:true })],
      spacing:{ after:80 },
    }),
    new Paragraph({
      children:[new TextRun({ text:"MINISTERIAL BRIEFING — MISSIONS PROGRAMME", color:TEAL_HEX, bold:true, size:20, allCaps:true })],
      spacing:{ after:80 },
    }),
    new Paragraph({
      children:[new TextRun({ text:`Andrew O'Neill, Schools Policy & Delivery Adviser  ·  ${date}`, color:GREY_HEX, size:16 })],
      spacing:{ after:200 },
    }),
    divider()
  );

  // Per mission
  for (const d of allData) {
    const { mission, schools, clusters, avgFSM, avgP8, avgAtt8, avgKS2, pctMostDeprived, avgIMDRank, ofstedCounts, phaseCounts, phases, redProjects, amberProjects } = d;
    const narrative = narratives[mission.id];

    sections.push(
      new Paragraph({
        children:[new TextRun({ text:mission.name.toUpperCase(), color:NAVY_HEX, bold:true, size:28, allCaps:true })],
        spacing:{ before:240, after:60 },
      }),
    );
    if (mission.subtitle) sections.push(p(mission.subtitle, { italic:true }));
    sections.push(p(`${schools.length} schools · ${clusters.length} clusters: ${clusters.join(", ")||"none assigned"}`));

    // Key metrics table
    const metricRows = [
      ["Average FSM", avgFSM ? `${avgFSM}%` : "—", "Average Progress 8", avgP8 ? (avgP8>0?"+":"")+avgP8 : "—"],
      ["Average Attainment 8", avgAtt8 || "—", "KS2 RWM average", avgKS2 ? `${avgKS2}%` : "—"],
      ["In most deprived 20%", pctMostDeprived ? `${pctMostDeprived}%` : "—", "Average IMD rank", avgIMDRank ? `${avgIMDRank.toLocaleString()} / 32,844` : "—"],
    ];

    sections.push(new Table({
      width:{ size:100, type:WidthType.PERCENTAGE },
      rows: metricRows.map(row => new TableRow({
        children: row.map((cell,i) => new TableCell({
          shading: i%2===0 ? { fill:"F8FAFC", type:ShadingType.CLEAR } : { fill:"FFFFFF", type:ShadingType.CLEAR },
          borders:{ top:{style:BorderStyle.NONE},bottom:{style:BorderStyle.SINGLE,size:2,color:"F1F5F9"},left:{style:BorderStyle.NONE},right:{style:BorderStyle.NONE} },
          children:[new Paragraph({
            children:[new TextRun({ text:cell, size:i%2===0?16:18, color:i%2===0?GREY_HEX:NAVY_HEX, bold:i%2!==0 })],
          })],
        }))
      })),
    }));
    sections.push(new Paragraph({ children:[], spacing:{ after:120 } }));

    // School profile
    h("School Profile", 3); // just for ref — add directly
    sections.push(new Paragraph({ children:[new TextRun({ text:"SCHOOL PROFILE", color:TEAL_HEX, bold:true, size:16, allCaps:true })], spacing:{after:60} }));
    sections.push(p(`Phase breakdown: ${Object.entries(phaseCounts).map(([k,v])=>`${v} ${k}`).join(", ")||"—"}`));
    sections.push(p(`Ofsted: ${Object.entries(ofstedCounts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${v} ${k}`).join(", ")||"—"}`));

    // IMD
    sections.push(new Paragraph({ children:[new TextRun({ text:"PLACE DEPRIVATION (IMD 2019)", color:TEAL_HEX, bold:true, size:16, allCaps:true })], spacing:{before:120,after:60} }));
    if (pctMostDeprived) sections.push(p(`${pctMostDeprived}% of schools are located in the most deprived 20% of areas nationally.`));
    if (avgIMDRank) sections.push(p(`Average IMD rank across mission schools: ${avgIMDRank.toLocaleString()} of 32,844 LSOAs.`));

    // AI narrative
    if (narrative) {
      sections.push(new Paragraph({ children:[new TextRun({ text:"STRATEGIC ANALYSIS", color:TEAL_HEX, bold:true, size:16, allCaps:true })], spacing:{before:120,after:60} }));
      sections.push(new Paragraph({
        children:[new TextRun({ text:narrative, size:18, color:NAVY_HEX, italics:true })],
        spacing:{ after:120 },
      }));
    }

    // Delivery signals
    if (redProjects.length || amberProjects.length) {
      sections.push(new Paragraph({ children:[new TextRun({ text:"DELIVERY PROGRAMME SIGNALS", color:TEAL_HEX, bold:true, size:16, allCaps:true })], spacing:{before:120,after:60} }));
      redProjects.slice(0,4).forEach(pr => sections.push(p(`✗ In Trouble: ${pr.name}${pr.status?" — "+pr.status:""}`)));
      amberProjects.slice(0,4).forEach(pr => sections.push(p(`⚠ At Risk: ${pr.name}${pr.status?" — "+pr.status:""}`)));
    }

    // Phase assignments
    if (phases.length) {
      sections.push(new Paragraph({ children:[new TextRun({ text:"SCHOOL-PHASE ASSIGNMENTS", color:TEAL_HEX, bold:true, size:16, allCaps:true })], spacing:{before:120,after:60} }));
      phases.forEach(ph => sections.push(p(`• ${ph.name}: ${ph.schoolUrns.length} school${ph.schoolUrns.length!==1?"s":""}`)));
    }

    sections.push(divider());
  }

  const doc = new Document({
    sections:[{ properties:{}, children: sections }],
    styles:{ default:{ document:{ run:{ font:"Arial", size:18, color:GREY_HEX } } } },
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url; a.download=`AT2026_Mission_Briefing_${date.replace(/\s/g,"_")}.docx`;
  a.click(); URL.revokeObjectURL(url);
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BriefingGenerator({ missions, missionSchools, themes }) {
  const [generating, setGenerating] = useState(false);
  const [status,     setStatus]     = useState("");
  const [narratives, setNarratives] = useState({});

  const date = new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});

  const missionsWithSchools = missions.filter(m => missionSchools.some(s=>s.missionId===m.id));

  const generate = async (format) => {
    if (!missionsWithSchools.length) {
      setStatus("No missions with schools — add schools via the Schools tab first.");
      return;
    }
    setGenerating(true);

    // Build data for all missions
    setStatus("Building mission data…");
    const allData = missionsWithSchools.map(m => buildMissionData(m, missionSchools, themes));

    // Generate AI narratives
    const narrs = {...narratives};
    if (ANTHROPIC_KEY) {
      for (const d of allData) {
        if (!narrs[d.mission.id]) {
          setStatus(`Generating narrative for ${d.mission.name}…`);
          narrs[d.mission.id] = await generateNarrative(d) || "";
        }
      }
      setNarratives(narrs);
    }

    // Generate output
    try {
      if (format === "pdf" || format === "both") {
        setStatus("Generating PDF…");
        await generatePDF(allData, narrs, date);
      }
      if (format === "word" || format === "both") {
        setStatus("Generating Word document…");
        await generateWord(allData, narrs, date);
      }
      setStatus("✓ Done — check your downloads");
    } catch (e) {
      console.error("Briefing generation error:", e);
      setStatus(`Error: ${e.message}`);
    }
    setGenerating(false);
  };

  return (
    <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e8ecf0", overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ padding:"13px 18px", borderBottom:"1px solid #f1f5f9", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <span style={{ fontSize:12, fontWeight:700, color:"#0f172a" }}>Ministerial Briefing Generator</span>
          <div style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>
            {missionsWithSchools.length} mission{missionsWithSchools.length!==1?"s":""} · {missionSchools.length} schools · {date}
          </div>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {!ANTHROPIC_KEY && (
            <span style={{ fontSize:10, color:"#d97706", fontStyle:"italic" }}>No AI key — narratives skipped</span>
          )}
          <button onClick={()=>generate("pdf")} disabled={generating}
            style={{ ...BS("#6366f1"), opacity:generating?0.6:1 }}>
            {generating&&status.includes("PDF")?"Generating…":"⬇ PDF"}
          </button>
          <button onClick={()=>generate("word")} disabled={generating}
            style={{ ...BS("#0ea5e9"), opacity:generating?0.6:1 }}>
            {generating&&status.includes("Word")?"Generating…":"⬇ Word"}
          </button>
          <button onClick={()=>generate("both")} disabled={generating}
            style={{ background:"#0f172a", border:"none", borderRadius:6, color:"#fff", cursor:generating?"wait":"pointer", padding:"6px 14px", fontSize:11, fontFamily:"inherit", fontWeight:600, opacity:generating?0.6:1 }}>
            {generating?"Generating…":"⬇ Both"}
          </button>
        </div>
      </div>
      {status && (
        <div style={{ padding:"8px 18px", background: status.startsWith("✓")?"#f0fdf4":status.startsWith("Error")?"#fef2f2":"#eef2ff",
          fontSize:11, color: status.startsWith("✓")?"#15803d":status.startsWith("Error")?"#991b1b":"#4f46e5", fontWeight:500 }}>
          {status}
        </div>
      )}
    </div>
  );
}
