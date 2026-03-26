import { useState } from "react"
import SteeringGroup from './SteeringGroup.jsx'
import { useSync } from './useSync.js'
import { useMissionsSync } from './useMissionsSync.js'

const PASSWORD   = "St33ring2026"
const STORAGE_KEY = "at_steering_auth"

function PasswordGate({ onUnlock }) {
  const [input, setInput] = useState("")
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  const attempt = () => {
    if (input === PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "1")
      onUnlock()
    } else {
      setError(true); setShake(true); setInput("")
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:"#0f172a", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Outfit','Segoe UI',sans-serif" }}>
      <div style={{ background:"#fff", borderRadius:16, padding:"48px 40px", width:"100%", maxWidth:380, margin:"0 16px",
        boxShadow:"0 25px 50px rgba(0,0,0,0.4)", animation: shake ? "shake 0.4s ease" : "none" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
          @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
        `}</style>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:32 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:"linear-gradient(135deg,#3b82f6,#6366f1)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:15, fontWeight:700 }}>AT</div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:"#0f172a", lineHeight:1 }}>Achieve & Thrive 2026</div>
            <div style={{ fontSize:11, color:"#94a3b8", marginTop:3 }}>Steering Group</div>
          </div>
        </div>
        <div style={{ fontSize:20, fontWeight:700, color:"#0f172a", marginBottom:6 }}>Enter password</div>
        <div style={{ fontSize:13, color:"#64748b", marginBottom:24 }}>This tool is for the AT 2026 Steering Group only.</div>
        <input type="password" placeholder="Password" value={input}
          onChange={e => { setInput(e.target.value); setError(false) }}
          onKeyDown={e => e.key === "Enter" && attempt()} autoFocus
          style={{ width:"100%", padding:"12px 14px", borderRadius:8, fontSize:14,
            border: `1.5px solid ${error ? "#dc2626" : "#e2e8f0"}`,
            outline:"none", fontFamily:"inherit", marginBottom:8,
            background: error ? "#fef2f2" : "#fff", color:"#0f172a" }}/>
        {error && <div style={{ fontSize:12, color:"#dc2626", marginBottom:12 }}>Incorrect password. Please try again.</div>}
        <button onClick={attempt} style={{ width:"100%", padding:"12px", borderRadius:8, border:"none",
          background:"linear-gradient(135deg,#3b82f6,#6366f1)", color:"#fff", fontSize:14, fontWeight:600,
          cursor:"pointer", fontFamily:"inherit", marginTop: error ? 0 : 8 }}>Sign in</button>
      </div>
    </div>
  )
}

export default function App() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(STORAGE_KEY) === "1")
  const { themes, setThemes, syncStatus } = useSync()
  const { missions, setMissions, missionsSyncStatus, missionSchools, setMissionSchools, schoolsSyncStatus } = useMissionsSync()

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />
  return <SteeringGroup
    themes={themes} setThemes={setThemes} syncStatus={syncStatus}
    missions={missions} setMissions={setMissions} missionsSyncStatus={missionsSyncStatus}
    missionSchools={missionSchools} setMissionSchools={setMissionSchools} schoolsSyncStatus={schoolsSyncStatus}
  />
}
