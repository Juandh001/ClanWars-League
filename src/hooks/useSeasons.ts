import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Season } from '../types/database'

// Flag to prevent multiple simultaneous season rotations
let isRotating = false

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

// Helper function to check and rotate seasons automatically
async function checkAndRotateSeason(): Promise<Season | null> {
  if (!isSupabaseConfigured() || isRotating) return null

  isRotating = true

  try {
    // Get the current active season
    const { data: activeSeason } = await supabase
      .from('seasons')
      .select('*')
      .eq('is_active', true)
      .single()

    // If no active season, create Season 1
    if (!activeSeason) {
      const { data: latestSeason } = await supabase
        .from('seasons')
        .select('number')
        .order('number', { ascending: false })
        .limit(1)
        .single()

      const nextNumber = (latestSeason?.number || 0) + 1

      const { data: newSeasonId, error } = await supabase.rpc('start_new_season', {
        season_name: `Season ${nextNumber}`,
        season_number: nextNumber,
        duration_days: 30
      })

      if (!error && newSeasonId) {
        // Fetch the newly created season
        const { data } = await supabase
          .from('seasons')
          .select('*')
          .eq('id', newSeasonId)
          .single()
        return data
      }
      return null
    }

    // DISABLED: Auto-rotation based on client date caused premature closures
    // Problem: Client timezone/date can differ from server, causing incorrect rotations
    // Solution: Admins must manually close seasons via AdminPage

    // Check if current season has expired
    // const now = new Date()
    // const endDate = new Date(activeSeason.end_date)

    // if (now > endDate) {
    //   // Season expired, create a new one
    //   const nextNumber = activeSeason.number + 1

    //   const { data: newSeasonId, error } = await supabase.rpc('start_new_season', {
    //     season_name: `Season ${nextNumber}`,
    //     season_number: nextNumber,
    //     duration_days: 30
    //   })

    //   if (!error && newSeasonId) {
    //     // Fetch the newly created season
    //     const { data } = await supabase
    //       .from('seasons')
    //       .select('*')
    //       .eq('id', newSeasonId)
    //       .single()
    //     return data
    //   }
    // }

    return activeSeason
  } finally {
    isRotating = false
  }
}

export function useCurrentSeason() {
  const [season, setSeason] = useState<Season | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasCheckedRotation = useRef(false)

  const fetchCurrentSeason = useCallback(async (checkRotation = false) => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    setLoading(true)

    // Only check for rotation once per app load
    if (checkRotation && !hasCheckedRotation.current) {
      hasCheckedRotation.current = true
      const rotatedSeason = await checkAndRotateSeason()
      if (rotatedSeason) {
        setSeason(rotatedSeason)
        setLoading(false)
        return
      }
    }

    // Normal fetch
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

  // Use a ref for the channel to ensure proper cleanup
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    // DISABLED: Auto-rotation caused premature season closures due to client timezone/date issues
    // Seasons should only be closed manually by admins
    fetchCurrentSeason(false)

    // Create unique channel name to avoid conflicts
    const channelName = `seasons_changes_${Date.now()}_${Math.random().toString(36).slice(2)}`

    // Subscribe to changes
    channelRef.current = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seasons' }, () => {
        fetchCurrentSeason(false)
      })
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [fetchCurrentSeason])

  return { season, loading, error, refetch: () => fetchCurrentSeason(false) }
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

  const updateSeason = async (seasonId: string, updates: {
    name?: string
    start_date?: string
    end_date?: string
  }) => {
    if (!isSupabaseConfigured()) {
      return { error: new Error('Supabase not configured') }
    }

    setLoading(true)

    const { error } = await supabase
      .from('seasons')
      .update(updates)
      .eq('id', seasonId)

    setLoading(false)
    return { error }
  }

  return { startNewSeason, closeSeason, updateSeason, loading }
}
