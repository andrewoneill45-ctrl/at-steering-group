import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase.js";
import { INITIAL_MISSIONS } from "./Missions.jsx";

const MISSIONS_ROW = "achieve-thrive-missions";
const SCHOOLS_ROW  = "achieve-thrive-schools";
const POLL_MS      = 5000;

function useRowSync(rowId, initial) {
  const [data,       setData]       = useState(initial);
  const [syncStatus, setSyncStatus] = useState("local");
  const latestData  = useRef(initial);
  const isSavingRef = useRef(false);
  const debounceRef = useRef(null);

  // Always track latest data in ref so saves use current value
  const updateData = useCallback((next) => {
    latestData.current = next;
    setData(next);
  }, []);

  // Load on mount
  useEffect(() => {
    (async () => {
      setSyncStatus("loading");
      try {
        const { data: row, error } = await supabase
          .from("programmes").select("data").eq("id", rowId).single();
        if (!error && row?.data) {
          updateData(row.data);
          setSyncStatus("synced");
        } else {
          setSyncStatus("local");
        }
      } catch {
        setSyncStatus("error");
      }
    })();
  }, [rowId]);

  // Poll for remote changes (only when not saving)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (isSavingRef.current) return;
      try {
        const { data: row, error } = await supabase
          .from("programmes").select("data").eq("id", rowId).single();
        if (!error && row?.data) {
          updateData(row.data);
          setSyncStatus("synced");
        }
      } catch {}
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [rowId, updateData]);

  // Save immediately (no debounce for correctness)
  const save = useCallback(async (value) => {
    isSavingRef.current = true;
    setSyncStatus("saving");
    try {
      const { error } = await supabase
        .from("programmes")
        .upsert({ id: rowId, data: value }, { onConflict: "id" });
      if (error) throw error;
      setSyncStatus("synced");
    } catch (e) {
      console.error(`Save failed for ${rowId}:`, e);
      setSyncStatus("error");
    } finally {
      isSavingRef.current = false;
    }
  }, [rowId]);

  // Public setter — resolves functional updaters, updates state, saves
  const setAndSave = useCallback((updater) => {
    const next = typeof updater === "function"
      ? updater(latestData.current)
      : updater;
    updateData(next);
    // Debounce saves for rapid changes (e.g. dragging), immediate for single ops
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(next), 800);
  }, [updateData, save]);

  return { data, setData: setAndSave, syncStatus };
}

export function useMissionsSync() {
  const {
    data: missions, setData: setMissions, syncStatus: missionsSyncStatus
  } = useRowSync(MISSIONS_ROW, INITIAL_MISSIONS);

  const {
    data: missionSchools, setData: setMissionSchools, syncStatus: schoolsSyncStatus
  } = useRowSync(SCHOOLS_ROW, []);

  return {
    missions,
    setMissions,
    missionsSyncStatus,
    missionSchools:    Array.isArray(missionSchools) ? missionSchools : [],
    setMissionSchools,
    schoolsSyncStatus,
  };
}
