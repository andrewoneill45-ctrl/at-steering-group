import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase.js'
import { INITIAL_THEMES } from './data.js'

const PROGRAMME_ID = 'achieve-thrive-2026'

// ─── Supabase schema (run once in Supabase SQL editor) ───────────────────────
// CREATE TABLE IF NOT EXISTS programmes (
//   id TEXT PRIMARY KEY,
//   data JSONB NOT NULL,
//   updated_at TIMESTAMPTZ DEFAULT NOW()
// );
// ALTER TABLE programmes ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "public read/write" ON programmes
//   FOR ALL USING (true) WITH CHECK (true);
// INSERT INTO programmes (id, data) VALUES ('achieve-thrive-2026', '[]'::jsonb)
//   ON CONFLICT DO NOTHING;
// ─────────────────────────────────────────────────────────────────────────────

export function useSync() {
  const [themes, setThemesState] = useState(INITIAL_THEMES)
  const [syncStatus, setSyncStatus] = useState('local') // 'local' | 'synced' | 'saving' | 'error'
  const saveTimer = useRef(null)
  const latestThemes = useRef(themes)

  // Keep ref in sync
  useEffect(() => { latestThemes.current = themes }, [themes])

  // ── Load from Supabase on mount ──
  useEffect(() => {
    if (!supabase) {
      setSyncStatus('local')
      return
    }

    async function load() {
      try {
        const { data, error } = await supabase
          .from('programmes')
          .select('data')
          .eq('id', PROGRAMME_ID)
          .single()

        if (error) throw error

        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          setThemesState(data.data)
          setSyncStatus('synced')
        } else {
          // First run — push initial data up
          await supabase.from('programmes').upsert({
            id: PROGRAMME_ID,
            data: INITIAL_THEMES,
            updated_at: new Date().toISOString()
          })
          setSyncStatus('synced')
        }
      } catch (err) {
        console.warn('Supabase load failed, using local data:', err.message)
        setSyncStatus('local')
      }
    }

    load()

    // ── Real-time subscription — other devices' changes appear instantly ──
    const channel = supabase
      .channel('programme-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'programmes',
        filter: `id=eq.${PROGRAMME_ID}`
      }, (payload) => {
        // Ignore our own saves echoing back
        if (isSavingRef.current) return
        if (payload.new?.data) {
          setThemesState(payload.new.data)
          setSyncStatus('synced')
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── Debounced save — waits 1.5s after last change before writing ──
  const saveToSupabase = useCallback(async (newThemes) => {
    if (!supabase) return
    setSyncStatus('saving')
    try {
      const { error } = await supabase
        .from('programmes')
        .upsert({
          id: PROGRAMME_ID,
          data: newThemes,
          updated_at: new Date().toISOString()
        })
      if (error) throw error
      setSyncStatus('synced')
    } catch (err) {
      console.warn('Supabase save failed:', err.message)
      setSyncStatus('error')
    }
  }, [])

  // Track whether we triggered the last save, so we ignore our own real-time echo
  const isSavingRef = useRef(false)

  // ── Public setter — updates local state + queues a save ──
  const setThemes = useCallback((updater) => {
    setThemesState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        isSavingRef.current = true
        await saveToSupabase(next)
        setTimeout(() => { isSavingRef.current = false }, 2000)
      }, 1500)
      return next
    })
  }, [saveToSupabase])

  return { themes, setThemes, syncStatus }
}
