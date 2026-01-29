import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Profile, Clan, WarriorRanking } from '../types/database'

interface WarriorWithClan extends Profile {
  clan_members?: { clan: Clan }[]
}

export function useWarriorRankings(seasonId?: string | null) {
  const [warriors, setWarriors] = useState<WarriorRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWarriors = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    setLoading(true)

    // If seasonId is provided, fetch from season_warrior_stats
    if (seasonId) {
      const { data, error } = await supabase
        .from('season_warrior_stats')
        .select(`
          *,
          profile:profiles(*),
          clan:clans(*)
        `)
        .eq('season_id', seasonId)
        .order('final_rank', { ascending: true })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const rankings: WarriorRanking[] = (data || []).map((stat: any) => ({
        ...stat.profile,
        clan: stat.clan,
        clan_tag: stat.clan?.tag,
        clan_name: stat.clan?.name,
        warrior_points: stat.points,
        warrior_wins: stat.wins,
        warrior_losses: stat.losses,
        max_win_streak: stat.max_win_streak,
        days_inactive: calculateDaysInactive(stat.profile?.last_seen),
        total_games: stat.matches_played
      }))

      setWarriors(rankings)
    } else {
      // Fetch current season warriors from profiles
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          clan_members(
            clan:clans(*)
          )
        `)
        .or('warrior_wins.gt.0,warrior_losses.gt.0')
        .order('warrior_points', { ascending: false })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const rankings: WarriorRanking[] = (data as WarriorWithClan[] || []).map((profile) => {
        const clan = profile.clan_members?.[0]?.clan
        return {
          ...profile,
          clan: clan,
          clan_tag: clan?.tag,
          clan_name: clan?.name,
          days_inactive: calculateDaysInactive(profile.last_seen),
          total_games: (profile.warrior_wins || 0) + (profile.warrior_losses || 0)
        }
      })

      setWarriors(rankings)
    }

    setLoading(false)
  }, [seasonId])

  useEffect(() => {
    fetchWarriors()

    // Subscribe to profile changes
    const subscription = supabase
      .channel('warrior_rankings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchWarriors()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchWarriors])

  return { warriors, loading, error, refetch: fetchWarriors }
}

function calculateDaysInactive(lastSeen: string | null | undefined): number {
  if (!lastSeen) return 999
  const lastSeenDate = new Date(lastSeen)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - lastSeenDate.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}
