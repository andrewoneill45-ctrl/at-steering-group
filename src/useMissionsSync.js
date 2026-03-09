import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase.js'
import { INITIAL_MISSIONS } from './Missions.jsx'

const MISSIONS_ID = 'achieve-thrive-missions'
const POLL_INTERVAL = 5000

export function useMissionsSync() {
  const [missions, setMissionsState] = useState(INITIAL_MISSIONS)
  const [syncStatus, setSyncStatus] = useState('local')
  const saveTimer = useRef(null)
  const isSavingRef = useRef(false)
  const lastUpdatedAt = useRef(null)

  const saveToSupabase = useCallback(async (data) => {
    if (!supabase) return
    setSyncStatus('saving')
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('programmes')
        .upsert({ id: MISSIONS_ID, data, updated_at: now })
      if (error) throw error
      lastUpdatedAt.current = now
      setSyncStatus('synced')
    } catch (err) {
      console.warn('Missions save failed:', err.message)
      setSyncStatus('error')
    }
  }, [])

  const loadFromSupabase = useCallback(async (isInitial = false) => {
    if (!supabase) return
    try {
      const { data, error } = await supabase
        .from('programmes').select('data, updated_at').eq('id', MISSIONS_ID).single()
      if (error) throw error
      if (data?.data && Array.isArray(data.data)) {
        if (!isInitial && isSavingRef.current) return
        if (!isInitial && data.updated_at === lastUpdatedAt.current) return
        lastUpdatedAt.current = data.updated_at
        setMissionsState(data.data)
        setSyncStatus('synced')
      } else if (isInitial) {
        await supabase.from('programmes').upsert({
          id: MISSIONS_ID, data: INITIAL_MISSIONS, updated_at: new Date().toISOString()
        })
        setSyncStatus('synced')
      }
    } catch (err) {
      if (isInitial) { setSyncStatus('local') }
    }
  }, [])

  useEffect(() => {
    if (!supabase) { setSyncStatus('local'); return }
    loadFromSupabase(true)
    const interval = setInterval(() => loadFromSupabase(false), POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [loadFromSupabase])

  const setMissions = useCallback((updater) => {
    setMissionsState(prev => {
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

  return { missions, setMissions, missionsSyncStatus: syncStatus }
}
