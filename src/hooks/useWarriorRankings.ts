import { useState, useEffect, useCallback, useRef } from 'react'
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
      // Fetch all players who have a clan (regardless of matches played)
      const { data: membersData, error: membersError } = await supabase
        .from('clan_members')
        .select(`
          user_id,
          clan:clans(id, name, tag, logo_url)
        `)

      if (membersError) {
        setError(membersError.message)
        setLoading(false)
        return
      }

      // Get unique user IDs from clan members
      const warriorIds = (membersData || []).map((m: any) => m.user_id)

      if (warriorIds.length === 0) {
        setWarriors([])
        setLoading(false)
        return
      }

      // Fetch profiles for all clan members
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', warriorIds)

      if (profilesError) {
        setError(profilesError.message)
        setLoading(false)
        return
      }

      // Create a map of user_id to clan
      const clanMap = new Map<string, any>()
      ;(membersData || []).forEach((m: any) => {
        clanMap.set(m.user_id, m.clan)
      })

      const rankings: WarriorRanking[] = (profilesData || []).map((profile: any) => {
        const clan = clanMap.get(profile.id)
        return {
          ...profile,
          clan: clan || null,
          clan_tag: clan?.tag || null,
          clan_name: clan?.name || null,
          days_inactive: calculateDaysInactive(profile.last_seen),
          total_games: (profile.warrior_wins || 0) + (profile.warrior_losses || 0)
        }
      })

      // Sort by warrior_points descending, then by nickname for ties
      rankings.sort((a, b) => {
        if (b.warrior_points !== a.warrior_points) {
          return (b.warrior_points || 0) - (a.warrior_points || 0)
        }
        return a.nickname.localeCompare(b.nickname)
      })

      setWarriors(rankings)
    }

    setLoading(false)
  }, [seasonId])

  // Use a ref for the channel to ensure proper cleanup
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    fetchWarriors()

    // Create unique channel name to avoid conflicts
    const channelName = `warrior_rankings_${Date.now()}_${Math.random().toString(36).slice(2)}`

    // Subscribe to profile changes
    channelRef.current = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchWarriors()
      })
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
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
