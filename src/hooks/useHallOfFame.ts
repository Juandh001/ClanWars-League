import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type {
  Season,
  SeasonClanStatsWithClan,
  SeasonWarriorStatsWithProfile,
  BadgeWithSeason
} from '../types/database'

interface HallOfFameData {
  season: Season
  clanChampions: SeasonClanStatsWithClan[]
  warriorChampions: SeasonWarriorStatsWithProfile[]
}

export function useHallOfFame() {
  const [data, setData] = useState<HallOfFameData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHallOfFame = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    setLoading(true)

    // Fetch all completed seasons
    const { data: seasons, error: seasonsError } = await supabase
      .from('seasons')
      .select('*')
      .eq('is_active', false)
      .order('number', { ascending: false })

    if (seasonsError) {
      setError(seasonsError.message)
      setLoading(false)
      return
    }

    const hallOfFameData: HallOfFameData[] = []

    for (const season of seasons || []) {
      // Fetch top 3 clans for this season
      const { data: clanStats } = await supabase
        .from('season_clan_stats')
        .select(`
          *,
          clan:clans(*)
        `)
        .eq('season_id', season.id)
        .lte('final_rank', 3)
        .order('final_rank', { ascending: true })

      // Fetch top 3 warriors for this season
      const { data: warriorStats } = await supabase
        .from('season_warrior_stats')
        .select(`
          *,
          profile:profiles(*),
          clan:clans(*)
        `)
        .eq('season_id', season.id)
        .lte('final_rank', 3)
        .order('final_rank', { ascending: true })

      hallOfFameData.push({
        season,
        clanChampions: (clanStats || []).map((stat: any) => ({
          ...stat,
          clan: Array.isArray(stat.clan) ? stat.clan[0] : stat.clan
        })),
        warriorChampions: (warriorStats || []).map((stat: any) => ({
          ...stat,
          profile: Array.isArray(stat.profile) ? stat.profile[0] : stat.profile,
          clan: Array.isArray(stat.clan) ? stat.clan[0] : stat.clan
        }))
      })
    }

    setData(hallOfFameData)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchHallOfFame()
  }, [fetchHallOfFame])

  return { data, loading, error, refetch: fetchHallOfFame }
}

export function useSeasonChampions(seasonId: string | undefined) {
  const [clanChampions, setClanChampions] = useState<SeasonClanStatsWithClan[]>([])
  const [warriorChampions, setWarriorChampions] = useState<SeasonWarriorStatsWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchChampions = useCallback(async () => {
    if (!seasonId || !isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    setLoading(true)

    // Fetch top 3 clans
    const { data: clanStats, error: clanError } = await supabase
      .from('season_clan_stats')
      .select(`
        *,
        clan:clans(*)
      `)
      .eq('season_id', seasonId)
      .lte('final_rank', 3)
      .order('final_rank', { ascending: true })

    if (clanError) {
      setError(clanError.message)
      setLoading(false)
      return
    }

    // Fetch top 3 warriors
    const { data: warriorStats, error: warriorError } = await supabase
      .from('season_warrior_stats')
      .select(`
        *,
        profile:profiles(*),
        clan:clans(*)
      `)
      .eq('season_id', seasonId)
      .lte('final_rank', 3)
      .order('final_rank', { ascending: true })

    if (warriorError) {
      setError(warriorError.message)
      setLoading(false)
      return
    }

    setClanChampions((clanStats || []).map((stat: any) => ({
      ...stat,
      clan: Array.isArray(stat.clan) ? stat.clan[0] : stat.clan
    })))

    setWarriorChampions((warriorStats || []).map((stat: any) => ({
      ...stat,
      profile: Array.isArray(stat.profile) ? stat.profile[0] : stat.profile,
      clan: Array.isArray(stat.clan) ? stat.clan[0] : stat.clan
    })))

    setLoading(false)
  }, [seasonId])

  useEffect(() => {
    fetchChampions()
  }, [fetchChampions])

  return { clanChampions, warriorChampions, loading, error, refetch: fetchChampions }
}
