import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase.js'
import { INITIAL_THEMES } from './data.js'

const PROGRAMME_ID = 'achieve-thrive-2026'

export function useSync() {
  const [themes, setThemesState] = useState(INITIAL_THEMES)
  const [syncStatus, setSyncStatus] = useState('local')
  const saveTimer = useRef(null)
  const isSavingRef = useRef(false)  // declared FIRST so all closures can reference it

  // ── Debounced save ──
  const saveToSupabase = useCallback(async (newThemes) => {
    if (!supabase) return
    setSyncStatus('saving')
    try {
      const { error } = await supabase
        .from('programmes')
        .upsert({ id: PROGRAMME_ID, data: newThemes, updated_at: new Date().toISOString() })
      if (error) throw error
      setSyncStatus('synced')
    } catch (err) {
      console.warn('Supabase save failed:', err.message)
      setSyncStatus('error')
    }
  }, [])

  // ── Load on mount + real-time subscription ──
  useEffect(() => {
    if (!supabase) { setSyncStatus('local'); return }

    async function load() {
      try {
        const { data, error } = await supabase
          .from('programmes').select('data').eq('id', PROGRAMME_ID).single()
        if (error) throw error
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          setThemesState(data.data)
          setSyncStatus('synced')
        } else {
          await supabase.from('programmes').upsert({
            id: PROGRAMME_ID, data: INITIAL_THEMES, updated_at: new Date().toISOString()
          })
          setSyncStatus('synced')
        }
      } catch (err) {
        console.warn('Supabase load failed:', err.message)
        setSyncStatus('local')
      }
    }

    load()

    // Real-time: receive changes from OTHER devices only
    const channel = supabase
      .channel('programme-changes')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'programmes',
        filter: `id=eq.${PROGRAMME_ID}`
      }, (payload) => {
        if (isSavingRef.current) return  // ignore our own echo
        if (payload.new?.data) {
          setThemesState(payload.new.data)
          setSyncStatus('synced')
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])  // eslint-disable-line

  // ── Public setter — updates state + queues debounced save ──
  const setThemes = useCallback((updater) => {
    setThemesState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        isSavingRef.current = true
        await saveToSupabase(next)
        setTimeout(() => { isSavingRef.current = false }, 3000)
      }, 1500)
      return next
    })
  }, [saveToSupabase])

  return { themes, setThemes, syncStatus }
}
