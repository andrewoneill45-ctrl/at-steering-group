import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase.js'
import { INITIAL_THEMES } from './data.js'

const PROGRAMME_ID = 'achieve-thrive-2026'
const POLL_INTERVAL = 5000 // check every 5 seconds

export function useSync() {
  const [themes, setThemesState] = useState(INITIAL_THEMES)
  const [syncStatus, setSyncStatus] = useState('local')
  const saveTimer = useRef(null)
  const isSavingRef = useRef(false)
  const lastUpdatedAt = useRef(null)

  // ── Debounced save ──
  const saveToSupabase = useCallback(async (newThemes) => {
    if (!supabase) return
    setSyncStatus('saving')
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('programmes')
        .upsert({ id: PROGRAMME_ID, data: newThemes, updated_at: now })
      if (error) throw error
      lastUpdatedAt.current = now
      setSyncStatus('synced')
    } catch (err) {
      console.warn('Supabase save failed:', err.message)
      setSyncStatus('error')
    }
  }, [])

  // ── Load latest from Supabase ──
  const loadFromSupabase = useCallback(async (isInitial = false) => {
    if (!supabase) return
    try {
      const { data, error } = await supabase
        .from('programmes').select('data, updated_at').eq('id', PROGRAMME_ID).single()
      if (error) throw error

      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        // On poll: only update if remote is newer than our last save
        if (!isInitial && isSavingRef.current) return
        if (!isInitial && data.updated_at === lastUpdatedAt.current) return

        lastUpdatedAt.current = data.updated_at
        setThemesState(data.data)
        setSyncStatus('synced')
      } else if (isInitial) {
        // First run — seed with initial data
        await supabase.from('programmes').upsert({
          id: PROGRAMME_ID, data: INITIAL_THEMES, updated_at: new Date().toISOString()
        })
        setSyncStatus('synced')
      }
    } catch (err) {
      if (isInitial) {
        console.warn('Supabase load failed:', err.message)
        setSyncStatus('local')
      }
    }
  }, [])

  // ── Load on mount + poll every 5s ──
  useEffect(() => {
    if (!supabase) { setSyncStatus('local'); return }

    loadFromSupabase(true)

    const interval = setInterval(() => loadFromSupabase(false), POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [loadFromSupabase])

  // ── Public setter — updates state + queues debounced save ──
  const setThemes = useCallback((updater) => {
    setThemesState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        isSavingRef.current = true
        await saveToSupabase(next)
        setTimeout(() => { isSavingRef.current = false }, POLL_INTERVAL + 1000)
      }, 1500)
      return next
    })
  }, [saveToSupabase])

  return { themes, setThemes, syncStatus }
}
