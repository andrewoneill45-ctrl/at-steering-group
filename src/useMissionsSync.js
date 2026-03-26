import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase.js";
import { INITIAL_MISSIONS } from "./Missions.jsx";

const MISSIONS_ROW = "achieve-thrive-missions";
const SCHOOLS_ROW  = "achieve-thrive-schools";
const POLL_MS      = 5000;

// Direct save — no debounce, no hooks, just upsert
async function saveRow(rowId, value) {
  console.log(`[sync] Saving ${rowId}, items: ${Array.isArray(value) ? value.length : "n/a"}`);
  const { error } = await supabase
    .from("programmes")
    .upsert({ id: rowId, data: value }, { onConflict: "id" });
  if (error) {
    console.error(`[sync] Save failed for ${rowId}:`, error);
    return false;
  }
  console.log(`[sync] Saved ${rowId} OK`);
  return true;
}

function useRowSync(rowId, initial) {
  const [data,       setData]       = useState(initial);
  const [syncStatus, setSyncStatus] = useState("local");
  const dataRef     = useRef(initial); // tracks latest value outside React cycle

  // Load once on mount
  useEffect(() => {
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

  // Poll every 5s
  useEffect(() => {
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

  // Setter: resolves updater fn, updates state immediately, saves to Supabase
  const setAndSave = useCallback((updater) => {
    // Resolve next value synchronously
    const next = typeof updater === "function"
      ? updater(dataRef.current)
      : updater;

    // Update ref immediately so rapid successive calls stack correctly
    dataRef.current = next;

    // Update React state
    setData(next);

    // Save to Supabase (async, fire and forget with status updates)
    setSyncStatus("saving");
    saveRow(rowId, next).then(ok => {
      setSyncStatus(ok ? "synced" : "error");
    });
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
