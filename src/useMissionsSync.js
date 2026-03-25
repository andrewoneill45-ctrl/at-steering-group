import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase.js";
import { INITIAL_MISSIONS } from "./Missions.jsx";

const MISSIONS_ROW = "achieve-thrive-missions";
const SCHOOLS_ROW  = "achieve-thrive-schools";
const DEBOUNCE_MS  = 1500;
const POLL_MS      = 5000;

function useRowSync(rowId, initial) {
  const [data,       setData]       = useState(initial);
  const [syncStatus, setSyncStatus] = useState("local");
  const isSavingRef = useRef(false);
  const debounceRef = useRef(null);
  const latestData  = useRef(initial); // always holds latest value

  // Keep latestData in sync
  useEffect(() => { latestData.current = data; }, [data]);

  // Load on mount
  useEffect(() => {
    (async () => {
      try {
        const { data: row, error } = await supabase
          .from("programmes").select("data").eq("id", rowId).single();
        if (!error && row?.data) {
          setData(row.data);
          latestData.current = row.data;
          setSyncStatus("synced");
        } else {
          setSyncStatus("local");
        }
      } catch { setSyncStatus("error"); }
    })();
  }, [rowId]);

  // Poll
  useEffect(() => {
    const interval = setInterval(async () => {
      if (isSavingRef.current) return;
      try {
        const { data: row, error } = await supabase
          .from("programmes").select("data").eq("id", rowId).single();
        if (!error && row?.data) {
          setData(row.data);
          latestData.current = row.data;
          setSyncStatus("synced");
        }
      } catch {}
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [rowId]);

  // Save — supports both direct values AND functional updaters
  const setAndSave = useCallback((updater) => {
    // Resolve the next value immediately using latestData ref
    const next = typeof updater === "function"
      ? updater(latestData.current)
      : updater;

    latestData.current = next;
    setData(next);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSyncStatus("saving");

    debounceRef.current = setTimeout(async () => {
      isSavingRef.current = true;
      try {
        await supabase.from("programmes").upsert({ id: rowId, data: latestData.current });
        setSyncStatus("synced");
      } catch {
        setSyncStatus("error");
      } finally {
        isSavingRef.current = false;
      }
    }, DEBOUNCE_MS);
  }, [rowId]);

  return { data, setData: setAndSave, syncStatus };
}

export function useMissionsSync() {
  const { data: missions,      setData: setMissions,      syncStatus: missionsSyncStatus }  = useRowSync(MISSIONS_ROW, INITIAL_MISSIONS);
  const { data: missionSchools,setData: setMissionSchools,syncStatus: schoolsSyncStatus }   = useRowSync(SCHOOLS_ROW, []);

  return {
    missions,
    setMissions,
    missionsSyncStatus,
    missionSchools:    Array.isArray(missionSchools) ? missionSchools : [],
    setMissionSchools,
    schoolsSyncStatus,
  };
}
