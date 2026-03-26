import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase.js";
import { INITIAL_MISSIONS } from "./Missions.jsx";

const MISSIONS_ROW = "achieve-thrive-missions";
const SCHOOLS_ROW  = "achieve-thrive-schools";
const POLL_MS      = 5000;

async function saveRow(rowId, value) {
  if (!supabase) { console.error("[sync] No supabase client"); return false; }
  console.log(`[sync] Saving ${rowId}...`);
  
  // Use UPDATE since rows already exist
  const { error } = await supabase
    .from("programmes")
    .update({ data: value })
    .eq("id", rowId);
    
  if (error) {
    console.error(`[sync] Update failed, trying upsert:`, error);
    // Fallback to upsert
    const { error: err2 } = await supabase
      .from("programmes")
      .upsert({ id: rowId, data: value });
    if (err2) { console.error(`[sync] Upsert also failed:`, err2); return false; }
  }
  
  console.log(`[sync] Saved ${rowId} OK`);
  return true;
}

function useRowSync(rowId, initial) {
  const [data,       setData]       = useState(initial);
  const [syncStatus, setSyncStatus] = useState("local");
  const dataRef = useRef(initial);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      setSyncStatus("loading");
      try {
        const { data: row, error } = await supabase
          .from("programmes").select("data").eq("id", rowId).single();
        if (!error && row?.data != null) {
          setData(row.data);
          dataRef.current = row.data;
          setSyncStatus("synced");
        } else {
          setSyncStatus("local");
        }
      } catch (e) {
        console.error("[sync] Load error:", e);
        setSyncStatus("error");
      }
    })();
  }, [rowId]);

  useEffect(() => {
    if (!supabase) return;
    const id = setInterval(async () => {
      try {
        const { data: row, error } = await supabase
          .from("programmes").select("data").eq("id", rowId).single();
        if (!error && row?.data != null) {
          setData(row.data);
          dataRef.current = row.data;
          setSyncStatus("synced");
        }
      } catch {}
    }, POLL_MS);
    return () => clearInterval(id);
  }, [rowId]);

  const setAndSave = useCallback((updater) => {
    const next = typeof updater === "function"
      ? updater(dataRef.current)
      : updater;
    dataRef.current = next;
    setData(next);
    setSyncStatus("saving");
    saveRow(rowId, next).then(ok => setSyncStatus(ok ? "synced" : "error"));
  }, [rowId]);

  return { data, setData: setAndSave, syncStatus };
}

export function useMissionsSync() {
  const { data: missions,       setData: setMissions,       syncStatus: missionsSyncStatus  } = useRowSync(MISSIONS_ROW, INITIAL_MISSIONS);
  const { data: missionSchools, setData: setMissionSchools, syncStatus: schoolsSyncStatus   } = useRowSync(SCHOOLS_ROW, []);

  return {
    missions,
    setMissions,
    missionsSyncStatus,
    missionSchools:    Array.isArray(missionSchools) ? missionSchools : [],
    setMissionSchools,
    schoolsSyncStatus,
  };
}
