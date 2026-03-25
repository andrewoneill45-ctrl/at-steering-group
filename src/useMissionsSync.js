import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase.js";
import { INITIAL_MISSIONS } from "./Missions.jsx";

const MISSIONS_ROW  = "achieve-thrive-missions";
const SCHOOLS_ROW   = "achieve-thrive-schools";
const DEBOUNCE_MS   = 1500;
const POLL_MS       = 5000;

// ── Generic Supabase row sync ─────────────────────────────────────────────────
function useRowSync(rowId, initial, defaultVal = null) {
  const [data,       setData]       = useState(initial);
  const [syncStatus, setSyncStatus] = useState("local");
  const isSavingRef  = useRef(false);
  const debounceRef  = useRef(null);
  const firstLoad    = useRef(true);

  // Load on mount
  useEffect(() => {
    (async () => {
      try {
        const { data: rows, error } = await supabase
          .from("programmes")
          .select("data")
          .eq("id", rowId)
          .single();

        if (!error && rows?.data) {
          setData(rows.data);
          setSyncStatus("synced");
        } else {
          setSyncStatus("local");
        }
      } catch {
        setSyncStatus("error");
      } finally {
        firstLoad.current = false;
      }
    })();
  }, [rowId]);

  // Poll for remote changes
  useEffect(() => {
    const interval = setInterval(async () => {
      if (isSavingRef.current) return;
      try {
        const { data: rows, error } = await supabase
          .from("programmes")
          .select("data,updated_at")
          .eq("id", rowId)
          .single();

        if (!error && rows?.data) {
          setData(rows.data);
          setSyncStatus("synced");
        }
      } catch {}
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [rowId]);

  // Save on change (debounced)
  const setAndSave = useCallback((updater) => {
    setData(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSyncStatus("saving");
      debounceRef.current = setTimeout(async () => {
        isSavingRef.current = true;
        try {
          await supabase.from("programmes").upsert({ id: rowId, data: next });
          setSyncStatus("synced");
        } catch {
          setSyncStatus("error");
        } finally {
          isSavingRef.current = false;
        }
      }, DEBOUNCE_MS);
      return next;
    });
  }, [rowId]);

  return { data, setData: setAndSave, syncStatus };
}

// ── Combined hook ─────────────────────────────────────────────────────────────
export function useMissionsSync() {
  const {
    data: missions,
    setData: setMissions,
    syncStatus: missionsSyncStatus,
  } = useRowSync(MISSIONS_ROW, INITIAL_MISSIONS);

  const {
    data: missionSchools,
    setData: setMissionSchools,
    syncStatus: schoolsSyncStatus,
  } = useRowSync(SCHOOLS_ROW, []);

  return {
    missions,
    setMissions,
    missionsSyncStatus,
    missionSchools:    missionSchools ?? [],
    setMissionSchools,
    schoolsSyncStatus,
  };
}
