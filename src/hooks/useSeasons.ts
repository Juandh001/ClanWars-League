import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Season } from '../types/database'

export function useSeasons() {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSeasons = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .order('number', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setSeasons(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSeasons()
  }, [fetchSeasons])

  return { seasons, loading, error, refetch: fetchSeasons }
}

export function useCurrentSeason() {
  const [season, setSeason] = useState<Season | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCurrentSeason = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('is_active', true)
      .single()

    if (error) {
      // No active season is not an error
      if (error.code !== 'PGRST116') {
        setError(error.message)
      }
    } else {
      setSeason(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCurrentSeason()

    // Subscribe to changes
    const subscription = supabase
      .channel('seasons_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seasons' }, () => {
        fetchCurrentSeason()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchCurrentSeason])

  return { season, loading, error, refetch: fetchCurrentSeason }
}

export function useSeasonActions() {
  const [loading, setLoading] = useState(false)

  const startNewSeason = async (name: string, number: number, durationDays: number = 30) => {
    if (!isSupabaseConfigured()) {
      return { error: new Error('Supabase not configured'), data: null }
    }

    setLoading(true)

    const { data, error } = await supabase.rpc('start_new_season', {
      season_name: name,
      season_number: number,
      duration_days: durationDays
    })

    setLoading(false)
    return { error, data }
  }

  const closeSeason = async (seasonId: string) => {
    if (!isSupabaseConfigured()) {
      return { error: new Error('Supabase not configured') }
    }

    setLoading(true)

    const { error } = await supabase.rpc('close_season', {
      season_id_param: seasonId
    })

    setLoading(false)
    return { error }
  }

  return { startNewSeason, closeSeason, loading }
}
